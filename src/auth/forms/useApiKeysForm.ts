import { useState, type FormEvent } from "react";
import { readJson } from "../../domain/http";
import type { AuthSession, User } from "../../domain/types";
import type { ApiKeySummary } from "./types";

export function useApiKeysForm({
  user,
  apiFetch
}: {
  user: User | null;
  apiFetch: (path: string, init?: RequestInit, authSession?: AuthSession | null) => Promise<Response>;
}) {
  const [apiKeys, setApiKeys] = useState<ApiKeySummary[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [apiKeyBusy, setApiKeyBusy] = useState("");
  const [newApiKeyName, setNewApiKeyName] = useState("Codex uploader");
  const [newApiKeySecret, setNewApiKeySecret] = useState("");
  const [apiKeyStatus, setApiKeyStatus] = useState("");

  async function loadApiKeys() {
    if (!user || apiKeysLoading) return;
    setApiKeysLoading(true);
    setApiKeyStatus("");
    try {
      const body = await readJson<{ apiKeys: ApiKeySummary[] }>(await apiFetch("/api/auth/api-keys"));
      setApiKeys(body.apiKeys);
    } catch (error) {
      setApiKeyStatus(error instanceof Error ? error.message : "Could not load API keys.");
    } finally {
      setApiKeysLoading(false);
    }
  }

  async function createApiKey(event: FormEvent) {
    event.preventDefault();
    if (!user || apiKeyBusy) return;
    const name = newApiKeyName.trim();
    if (!name) {
      setApiKeyStatus("API key name is required.");
      return;
    }
    setApiKeyBusy("create");
    setApiKeyStatus("");
    setNewApiKeySecret("");
    try {
      const body = await readJson<{ apiKey: ApiKeySummary & { key: string } }>(
        await apiFetch("/api/auth/api-keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name })
        })
      );
      setApiKeys((current) => [body.apiKey, ...current]);
      setNewApiKeySecret(body.apiKey.key);
      setNewApiKeyName("Codex uploader");
      setApiKeyStatus("API key created. Copy it now; it will not be shown again.");
    } catch (error) {
      setApiKeyStatus(error instanceof Error ? error.message : "Could not create API key.");
    } finally {
      setApiKeyBusy("");
    }
  }

  async function revokeApiKey(id: string) {
    if (!user || apiKeyBusy) return;
    setApiKeyBusy(id);
    setApiKeyStatus("");
    try {
      await readJson<{ ok: true }>(await apiFetch(`/api/auth/api-keys/${id}`, { method: "DELETE" }));
      setApiKeys((current) => current.filter((key) => key.id !== id));
      setApiKeyStatus("API key revoked.");
    } catch (error) {
      setApiKeyStatus(error instanceof Error ? error.message : "Could not revoke API key.");
    } finally {
      setApiKeyBusy("");
    }
  }

  return {
    apiKeys,
    apiKeysLoading,
    apiKeyBusy,
    newApiKeyName,
    setNewApiKeyName,
    newApiKeySecret,
    setNewApiKeySecret,
    apiKeyStatus,
    setApiKeyStatus,
    loadApiKeys,
    createApiKey,
    revokeApiKey
  };
}
