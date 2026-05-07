import { useEffect, useRef, type Dispatch, type RefObject, type SetStateAction } from "react";
import * as THREE from "three";
import type { Pet } from "../../domain/types";
import { FLOOR_HALF, SPRITE_HEIGHT, SPRITE_WIDTH, type StateId } from "../core/config";
import { createPlaygroundScene } from "../core/createPlaygroundScene";
import { attachCameraDragControls, attachKeyboardControls, attachZoomControls } from "../core/inputControls";
import { loadImage } from "../core/loadImage";
import { PetSpriteAnimator, applyPetSpriteVisuals, createSpriteEffects, type DustSpawnOptions } from "../animation";
import { updateRemoteScene } from "../room/updateRemoteScene";
import { disposeRemoteActors } from "../room/disposeRemoteActors";
import { broadcastRoomFrame } from "../room/roomFrameBroadcast";
import type { RemoteNpc, RemotePet } from "../room/remoteActors";
import type { RoomMode } from "../room/types";
import {
  makeBallSystem,
  makeNpcSystem,
  makeTrampolineSystem,
  type BallSystem,
  type NpcSystem,
  type TrampolineSystem
} from "../world/toys";
import { applyMovementInput, updateCameraFollow, updateCameraZoom, updateLocalShadow } from "../core/movementFrame";
import {
  handleBallSpawnInput,
  handleLocalTrampolineBounce,
  handleTrampolinePlaceInput,
  updateBallToyFrame,
  updateNpcToyFrame
} from "../world/toyFrame";

export type PlaygroundSceneStatus = "loading" | "ready" | "error";

export function usePlaygroundSceneLoop({
  pet,
  roomMode,
  status,
  canvasRef,
  wrapperRef,
  overlayLayerRef,
  clearPressedKeysRef,
  ballsSystemRef,
  npcSystemRef,
  trampSystemRef,
  sceneRef,
  spriteRef,
  spriteTextureRef,
  loadingOrbTextureRef,
  clearParticlesRef,
  remotePetsRef,
  remoteNpcsRef,
  setStatus,
  setErrorMessage,
  setActiveState
}: {
  pet: Pet;
  roomMode?: RoomMode;
  status: PlaygroundSceneStatus;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  wrapperRef: RefObject<HTMLDivElement | null>;
  overlayLayerRef: RefObject<HTMLDivElement | null>;
  clearPressedKeysRef: RefObject<(() => void) | null>;
  ballsSystemRef: RefObject<BallSystem | null>;
  npcSystemRef: RefObject<NpcSystem | null>;
  trampSystemRef: RefObject<TrampolineSystem | null>;
  sceneRef: RefObject<THREE.Scene | null>;
  spriteRef: RefObject<THREE.Sprite | null>;
  spriteTextureRef: RefObject<THREE.Texture | null>;
  loadingOrbTextureRef: RefObject<THREE.Texture | null>;
  clearParticlesRef: RefObject<(() => void) | null>;
  remotePetsRef: RefObject<Map<string, RemotePet>>;
  remoteNpcsRef: RefObject<Map<string, RemoteNpc>>;
  setStatus: Dispatch<SetStateAction<PlaygroundSceneStatus>>;
  setErrorMessage: Dispatch<SetStateAction<string>>;
  setActiveState: Dispatch<SetStateAction<StateId>>;
}) {
  const lastPosBroadcastRef = useRef(0);
  const npcWasOverPadRef = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    let alive = true;
    let raf = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let texture: THREE.Texture | null = null;
    const pressed = new Set<string>();
    let resizeObserver: ResizeObserver | null = null;
    let clearStreaksFn: (() => void) | null = null;
    let spawnDust: ((x: number, z: number, count: number, opts?: DustSpawnOptions) => void) | null = null;
    let spawnAfterImageFor: ((sourceSprite: THREE.Sprite, sourceTex: THREE.Texture) => void) | null = null;
    let spawnSprintStreaks: ((fromX: number, fromZ: number, worldDirX: number, worldDirZ: number, runSpeed: number) => void) | null = null;
    const isCoarsePointer = typeof window !== "undefined"
      && window.matchMedia
      && window.matchMedia("(pointer: coarse)").matches;
    const zoomState = { value: isCoarsePointer ? 1.4 : 1 };
    const yawState = { value: 0 };
    const inputCleanups: Array<() => void> = [];
    const disposables: Array<{ dispose: () => void }> = [];

    (async () => {
      try {
        const img = await loadImage(pet.spritesheetUrl);
        if (!alive) return;
        const sceneSetup = createPlaygroundScene(canvas, img);
        texture = sceneSetup.texture;
        spriteTextureRef.current = texture;

        const scene = sceneSetup.scene;
        sceneRef.current = scene;
        const camera = sceneSetup.camera;

        renderer = sceneSetup.renderer;

        const { sprite, spriteMat, shadow } = sceneSetup;
        spriteRef.current = sprite;
        disposables.push(...sceneSetup.disposables);
        loadingOrbTextureRef.current = sceneSetup.loadingOrbTexture;

        const spriteEffects = createSpriteEffects({
          scene,
          localSprite: sprite,
          getLocalTexture: () => texture
        });
        disposables.push(...spriteEffects.disposables);
        spawnAfterImageFor = spriteEffects.spawnAfterImageFor;
        spawnSprintStreaks = spriteEffects.spawnSprintStreaksWorld;
        clearStreaksFn = spriteEffects.clear;
        spawnDust = spriteEffects.spawnDust;
        clearParticlesRef.current = spriteEffects.clear;

        function applySize() {
          const w = wrapper!.clientWidth || 1;
          const h = wrapper!.clientHeight || 1;
          renderer!.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        }
        applySize();
        resizeObserver = new ResizeObserver(applySize);
        resizeObserver.observe(wrapper);

        zoomState.value = isCoarsePointer ? 1.4 : 1;
        inputCleanups.push(
          attachKeyboardControls({ pressed, clearPressedKeysRef }),
          attachZoomControls({ canvas, wrapper, zoomState }),
          attachCameraDragControls({ canvas, yawState })
        );

        if (!alive) {
          renderer.dispose();
          return;
        }
        setStatus("ready");

        const animator = new PetSpriteAnimator(performance.now());
        let zoomDisplay = zoomState.value;
        let lastBallSpawnAt = -Infinity;
        let lastPadPlaceAt = -Infinity;

        let last = performance.now();
        const tick = () => {
          if (!alive || !renderer) return;
          const now = performance.now();
          let dt = Math.min(0.05, (now - last) / 1000);
          last = now;
          dt = animator.clampDelta(now, dt);

          const { dx, dz, moving, sprinting, runSpeed, worldDx, worldDz } = applyMovementInput({
            pressed,
            sprite,
            yaw: yawState.value,
            dt
          });

          if (sprinting && animator.onGround) {
            spriteEffects.tickSprintStreaks({
              now,
              dt,
              fromX: sprite.position.x,
              fromZ: sprite.position.z,
              worldDirX: worldDx,
              worldDirZ: worldDz,
              screenDirX: dx,
              screenDirZ: dz,
              runSpeed
            });
          } else {
            spriteEffects.resetStreakTimer();
          }

          if (sprinting && animator.onGround) {
            spriteEffects.tickAfterImages(now, dt);
          } else {
            spriteEffects.resetAfterImageTimer();
          }

          spriteEffects.update(dt);

          const spriteFrame = animator.advance({
            now,
            dt,
            pressed,
            dx,
            dz,
            moving,
            sprinting,
            petX: sprite.position.x,
            petZ: sprite.position.z,
            spawnDust: spriteEffects.spawnDust
          });
          applyPetSpriteVisuals(sprite, spriteMat, texture!, spriteFrame);

          zoomDisplay = updateCameraZoom({ pressed, zoomTarget: zoomState, zoomDisplay, dt });
          updateCameraFollow({ camera, sprite, yaw: yawState.value, zoomDisplay });

          const petVelX = moving ? worldDx * runSpeed : 0;
          const petVelZ = moving ? worldDz * runSpeed : 0;

          lastBallSpawnAt = handleBallSpawnInput({
            pressed,
            now,
            lastBallSpawnAt,
            ballsSystem: ballsSystemRef.current,
            roomMode,
            sprite,
            moving,
            worldDx,
            worldDz,
            sprinting,
            jumpFacing: animator.jumpFacing
          });
          lastPadPlaceAt = handleTrampolinePlaceInput({
            pressed,
            now,
            lastPadPlaceAt,
            trampSystem: trampSystemRef.current,
            roomMode,
            sprite
          });
          handleLocalTrampolineBounce({
            now,
            trampSystem: trampSystemRef.current,
            sprite,
            animator
          });
          updateNpcToyFrame({
            now,
            dt,
            sprite,
            npcSystem: npcSystemRef.current,
            trampSystem: trampSystemRef.current,
            npcWasOverPad: npcWasOverPadRef.current
          });
          trampSystemRef.current?.update(dt);
          updateBallToyFrame({
            dt,
            sprite,
            moving,
            worldDx,
            worldDz,
            runSpeed,
            npcSystem: npcSystemRef.current,
            ballsSystem: ballsSystemRef.current,
            roomMode,
            remotePets: remotePetsRef.current
          });
          updateLocalShadow({
            shadow,
            camera,
            sprite,
            onGround: animator.onGround,
            yPos: animator.yPos
          });

          if (roomMode) {
            lastPosBroadcastRef.current = broadcastRoomFrame({
              roomMode,
              now,
              lastPosBroadcastAt: lastPosBroadcastRef.current,
              animator,
              sprinting,
              sprite,
              petVelX,
              petVelZ,
              ballsSystem: ballsSystemRef.current,
              npcSystem: npcSystemRef.current
            });
            updateRemoteScene({
              roomMode,
              remotePets: remotePetsRef.current,
              remoteNpcs: remoteNpcsRef.current,
              now,
              dt,
              camera,
              renderer,
              localSprite: sprite,
              overlayLayer: overlayLayerRef.current,
              spawnAfterImageFor,
              spawnSprintStreaks,
              spawnDust
            });
          }

          renderer.render(scene, camera);

          if (animator.stateId !== lastSurfaced) {
            lastSurfaced = animator.stateId;
            setActiveState(animator.stateId);
          }

          raf = requestAnimationFrame(tick);
        };
        let lastSurfaced: StateId | null = null;

        raf = requestAnimationFrame(tick);
      } catch (err) {
        if (!alive) return;
        setErrorMessage(err instanceof Error ? err.message : "Could not load the pet sprite.");
        setStatus("error");
      }
    })();

    return () => {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      for (const cleanup of inputCleanups) cleanup();
      inputCleanups.length = 0;
      resizeObserver?.disconnect();
      clearStreaksFn?.();
      ballsSystemRef.current = null;
      npcSystemRef.current = null;
      trampSystemRef.current = null;
      disposeRemoteActors({
        scene: sceneRef.current,
        remotePets: remotePetsRef.current,
        remoteNpcs: remoteNpcsRef.current
      });
      for (const d of disposables) {
        try { d.dispose(); } catch { /* idempotent */ }
      }
      disposables.length = 0;
      texture?.dispose();
      renderer?.dispose();
      sceneRef.current = null;
      spriteRef.current = null;
      spriteTextureRef.current = null;
      loadingOrbTextureRef.current = null;
      clearParticlesRef.current = null;
    };
  }, [pet.spritesheetUrl]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    ballsSystemRef.current = makeBallSystem(scene);
    trampSystemRef.current = makeTrampolineSystem(scene);
    npcSystemRef.current = makeNpcSystem(scene, FLOOR_HALF, SPRITE_WIDTH, SPRITE_HEIGHT);

    return () => {
      ballsSystemRef.current?.dispose(); ballsSystemRef.current = null;
      npcSystemRef.current?.dispose(); npcSystemRef.current = null;
      trampSystemRef.current?.dispose(); trampSystemRef.current = null;
    };
  }, [status]);
}
