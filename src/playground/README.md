# Playground Module Map

`PetPlaygroundModal.tsx` composes the playable scene. Feature code lives in
subfolders so room networking, sprite animation, world simulation, and UI can be
changed independently.

- `animation/`: spritesheet state machine, atlas frame selection, UV updates,
  sprint trails, after-images, and dust.
- `core/`: shared scene constants, Three.js scene setup, image loading,
  projection math, and controls hint copy.
- `hooks/`: React state hooks used only by the playground.
- `room/`: room gate, realtime room UI, remote actors, overlay positioning, and
  room mode types.
- `ui/`: header, chat, pet/NPC pickers, touch controls, and popovers.
- `world/`: ball, trampoline, and NPC simulation systems.

Provider-specific realtime code belongs in `src/realtime/adapters/*`, not in
this feature folder.
