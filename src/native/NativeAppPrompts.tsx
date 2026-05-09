import { useEffect, useRef, useState } from "react";
import { apiUrl, readJson } from "../domain/http";
import { navigate } from "../domain/routing";
import type { Pet } from "../domain/types";
import { Icon } from "../ui/Icon";

type NativeNotificationStatus = {
  native: boolean;
  status: "available" | "requesting" | "enabled" | "denied";
  polling: boolean;
};

type GalleryResponse = {
  pets: Pet[];
};

type ZeroNativeBridge = {
  invoke: <T>(command: string, payload?: unknown) => Promise<T>;
};

declare global {
  interface Window {
    zero?: ZeroNativeBridge;
  }
}

export function NativeAppPrompts() {
  const [nativeStatus, setNativeStatus] = useState<NativeNotificationStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [freshPet, setFreshPet] = useState<Pet | null>(null);
  const latestPetIdRef = useRef("");
  const dismissedPetIdRef = useRef("");

  useEffect(() => {
    const bridge = nativeBridge();
    if (!bridge) return;
    const activeBridge = bridge;
    let cancelled = false;

    async function refreshStatus() {
      try {
        const nextStatus = await activeBridge.invoke<NativeNotificationStatus>("codex-pets.notifications.status", {});
        if (!cancelled && nextStatus.native) {
          setNativeStatus(nextStatus);
          setStatusError("");
        }
      } catch (error) {
        if (!cancelled) {
          setStatusError(error instanceof Error ? error.message : "Native notifications are unavailable.");
        }
      }
    }

    void refreshStatus();
    const interval = window.setInterval(() => void refreshStatus(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!nativeBridge()) return;

    let cancelled = false;

    async function checkNewestPet() {
      const pollPath = `/api/pets?page=1&pageSize=1&sort=new&nativePollAt=${Date.now()}`;
      const body = await readJson<GalleryResponse>(
        await fetch(apiUrl(pollPath), { headers: { accept: "application/json" } })
      );
      const newest = body.pets[0];
      if (cancelled || !newest) return;
      const previousId = latestPetIdRef.current;
      latestPetIdRef.current = newest.id;
      if (previousId && previousId !== newest.id && dismissedPetIdRef.current !== newest.id) {
        setFreshPet(newest);
      }
    }

    void checkNewestPet().catch(() => {});
    const interval = window.setInterval(() => void checkNewestPet().catch(() => {}), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  if (!nativeStatus && !statusError && !freshPet) {
    return null;
  }

  const showNotificationPrompt = nativeStatus && nativeStatus.status !== "enabled";

  return (
    <div className="nativeAppPrompts" aria-live="polite">
      {freshPet && (
        <section className="nativePrompt" aria-label="New pet uploaded">
          <div>
            <p className="nativePromptEyebrow">New pet uploaded</p>
            <strong>{freshPet.displayName}</strong>
          </div>
          <div className="nativePromptActions">
            <button
              className="btn btnPrimary btnSm"
              type="button"
              onClick={() => {
                const petId = freshPet.id;
                dismissedPetIdRef.current = petId;
                setFreshPet(null);
                navigate(`/pets/${petId}`);
              }}
            >
              <Icon name="sparkle" size={12} />
              Open
            </button>
            <button
              className="btn btnSm"
              type="button"
              onClick={() => {
                dismissedPetIdRef.current = freshPet.id;
                setFreshPet(null);
              }}
            >
              Dismiss
            </button>
          </div>
        </section>
      )}
      {showNotificationPrompt && (
        <section className="nativePrompt" aria-label="macOS notification settings">
          <div>
            <p className="nativePromptEyebrow">macOS alerts</p>
            <strong>{notificationPromptTitle(nativeStatus.status)}</strong>
            <p>{notificationPromptCopy(nativeStatus.status)}</p>
          </div>
          {nativeStatus.status === "available" && (
            <button className="btn btnPrimary btnSm" type="button" onClick={enableNativeNotifications}>
              <Icon name="sparkle" size={12} />
              Enable
            </button>
          )}
        </section>
      )}
      {statusError && (
        <section className="nativePrompt nativePromptError" aria-label="Native notification error">
          <div>
            <p className="nativePromptEyebrow">macOS alerts</p>
            <strong>Unavailable</strong>
            <p>{statusError}</p>
          </div>
        </section>
      )}
    </div>
  );

  async function enableNativeNotifications() {
    const bridge = nativeBridge();
    if (!bridge) return;
    setNativeStatus((current) => current ? { ...current, status: "requesting" } : current);
    setStatusError("");
    try {
      const requested = await bridge.invoke<NativeNotificationStatus>("codex-pets.notifications.enable", {});
      setNativeStatus(requested);
      for (let attempt = 0; attempt < 12; attempt += 1) {
        await delay(1000);
        const nextStatus = await bridge.invoke<NativeNotificationStatus>("codex-pets.notifications.status", {});
        setNativeStatus(nextStatus);
        if (nextStatus.status === "enabled" || nextStatus.status === "denied") {
          return;
        }
      }
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Native notifications are unavailable.");
    }
  }
}

function nativeBridge() {
  return typeof window !== "undefined" && window.zero?.invoke ? window.zero : null;
}

function notificationPromptTitle(status: NativeNotificationStatus["status"]) {
  if (status === "requesting") return "Waiting for permission";
  if (status === "denied") return "Alerts are blocked";
  return "Enable new-pet alerts";
}

function notificationPromptCopy(status: NativeNotificationStatus["status"]) {
  if (status === "requesting") return "Use the macOS permission sheet to allow Codex Pets alerts.";
  if (status === "denied") return "Allow Codex Pets notifications in System Settings to receive upload alerts.";
  return "Get a macOS alert when someone adds a pet.";
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
