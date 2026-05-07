import * as THREE from "three";
import type { RemoteNpc, RemotePet } from "./remoteActors";

type RemoteActor = RemotePet | RemoteNpc;

function disposeActor(scene: THREE.Scene | null, actor: RemoteActor) {
  scene?.remove(actor.sprite);
  actor.mat.dispose();
  actor.tex.dispose();
  if (actor.loadingOrb) {
    scene?.remove(actor.loadingOrb);
    (actor.loadingOrb.material as THREE.SpriteMaterial).dispose();
  }
}

export function disposeRemoteActors({
  scene,
  remotePets,
  remoteNpcs
}: {
  scene: THREE.Scene | null;
  remotePets: Map<string, RemotePet>;
  remoteNpcs: Map<string, RemoteNpc>;
}) {
  for (const remote of remotePets.values()) {
    disposeActor(scene, remote);
  }
  remotePets.clear();
  for (const remote of remoteNpcs.values()) {
    disposeActor(scene, remote);
  }
  remoteNpcs.clear();
}
