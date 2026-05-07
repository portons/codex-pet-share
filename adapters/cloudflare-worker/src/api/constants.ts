import type { PetKind } from "../core/types";

export const allowedTags = [
  "cute",
  "weird",
  "minimal",
  "animated",
  "pixel",
  "hand-drawn",
  "retro",
  "game",
  "object",
  "animal",
  "person",
  "creature",
  "clippy",
  "robot",
  "anime",
  "spooky",
  "soft",
  "chaotic",
  "utility",
  "mascot",
  "celeb",
  "nsfw"
] as const;

export const allowedPetKinds: readonly PetKind[] = ["object", "animal", "person", "creature"];
export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const roomIdPattern = /^[a-z0-9]{8}$/;
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
