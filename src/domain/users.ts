import { petAssetUrl } from "./http";
import type { User } from "./types";

export function normalizeAvatarUrl(avatarUrl: string | null | undefined) {
  return avatarUrl ? petAssetUrl(avatarUrl) : null;
}

export function normalizeUser(user: User): User {
  return {
    ...user,
    avatarUrl: normalizeAvatarUrl(user.avatarUrl)
  };
}

export function normalizeNullableUser(user: User | null) {
  return user ? normalizeUser(user) : null;
}
