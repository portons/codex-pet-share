export type AuthProvider = {
  id: "google" | "x";
  label: string;
};

export type AuthMode = "login" | "register" | "forgot" | "reset";

export type ApiKeySummary = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
};
