# Ragnarok Online Environment Assets

This app includes a generated Ragnarok Online-style Prontera center playground
environment for the Three.js pet playground.

## Current Asset Set

Generated app assets live under:

- `public/assets/biomes/ro-prontera/prontera-plaza.json`
- `public/assets/biomes/ro-prontera/prontera-minimap.webp`
- `public/assets/biomes/ro-prontera/textures/*.webp`

Runtime code lives in:

- `src/playground/core/roBiome.ts`
- `src/playground/core/roPronteraBiome.generated.ts`
- `src/playground/core/createPlaygroundScene.ts`
- `src/playground/hooks/usePlaygroundMinimap.ts`

The checked-in biome is a centered Prontera plaza slice containing the fountain
and surrounding walkable space. The generated data includes:

- terrain and model meshes grouped by texture
- browser-ready WebP textures
- a top-down minimap image derived from the generated geometry
- GAT-derived blocked zones used by pet movement
- the generated floor half-size used by the playground bounds

## Generator

Run:

```bash
node scripts/generate-ro-biome.mjs
```

The generator downloads `prontera.gnd`, `prontera.gat`, `prontera.rsw`, model
files, and referenced textures from Divine Pride's public Ragnarok data mirror
into `/tmp/petshare-ro-real-assets`, parses them, and writes the browser assets
above.

It intentionally keeps the raw map/model/texture source files in `/tmp`; only
the generated browser assets are committed.

## Implementation Notes

- The crop is centered on Prontera's fountain model and excludes model geometry
  whose bounds overflow the playable square.
- The runtime stage adds a warm outside-bounds plane and a lower underlay under
  the RO ground so transparent terrain/model holes do not reveal the old green
  floor.
- The pet starts on the plaza path south of the fountain.
- `RO_PRONTERA_BLOCKED_ZONES` comes from the GAT grid and is used by
  `movementFrame.ts` to prevent walking into blocked plaza objects.
- `prontera-minimap.webp` is generated from top-facing mesh triangles and then
  used by `usePlaygroundMinimap.ts` as the map background.

## Verification

Before shipping changes to this environment, run:

```bash
npx tsc -b --pretty false
npm run build
```

Then open the playground in a browser and verify:

- the fountain/plaza texture loads with no blank stage replacing it
- all biome texture requests resolve
- the pet cannot walk outside the bounds
- the outside-bounds area is the warm dark stage color
- the RO-style minimap loads and tracks the local player marker
