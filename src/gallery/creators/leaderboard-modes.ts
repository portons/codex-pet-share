import type { CreatorLeaderboardSort } from "../../domain/types";

export type LeaderboardMode = CreatorLeaderboardSort;
export type LeaderboardModeConfig = { id: LeaderboardMode; label: string; icon: "heart" | "eye" | "upload" };

export const leaderboardModesById = {
  likes: { id: "likes", label: "Likes", icon: "heart" },
  views: { id: "views", label: "Views", icon: "eye" },
  uploads: { id: "uploads", label: "Uploads", icon: "upload" }
} satisfies Record<LeaderboardMode, LeaderboardModeConfig>;

export const leaderboardModes = Object.values(leaderboardModesById);
