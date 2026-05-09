import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { petCodexInstallUrl, petImportCommand } from "../domain/pets";
import type { Pet } from "../domain/types";
import { Icon } from "../ui/Icon";
import { copyText } from "../ui/clipboard";
import { DownloadCommandRow, type DownloadCommandMode } from "./DownloadCommandRow";

export function DownloadModal({ pet, onClose }: { pet: Pet; onClose: () => void }) {
  const [copied, setCopied] = useState("");
  const [commandMode, setCommandMode] = useState<DownloadCommandMode>("cli");
  const dialogRef = useRef<HTMLElement | null>(null);
  const primaryActionRef = useRef<HTMLAnchorElement | null>(null);
  const command = petImportCommand(pet, commandMode);
  const codexInstallUrl = petCodexInstallUrl(pet);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    primaryActionRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  async function copyCommand() {
    setCopied(await copyText(command) ? "command" : "failed");
    window.setTimeout(() => setCopied(""), 1400);
  }

  function changeCommandMode(mode: DownloadCommandMode) {
    setCommandMode(mode);
    setCopied("");
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((node) => !node.hasAttribute("disabled") && node.getAttribute("aria-hidden") !== "true");
    if (!focusable.length) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!dialog.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="modalBackdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="authModal shareModal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Download ${pet.displayName}`}
        onKeyDown={handleDialogKeyDown}
      >
        <div className="modalHeader">
          <div className="modalTitle compact">
            <p className="metaText">Download</p>
            <h2>{pet.displayName}</h2>
            <p className="shareCreator">by {pet.ownerName}</p>
          </div>
          <button className="btn btnSm btnGhost modalCloseButton" type="button" onClick={onClose}>
            <Icon name="close" size={12} />
            Close
          </button>
        </div>
        <div className="shareStack">
          <p className="downloadInstructions">
            Download the package, then unzip it into <code>$HOME/.codex/pets/{pet.id}</code>.
          </p>
          <a className="btn btnPrimary btnLg" ref={primaryActionRef} href={pet.downloadUrl} download>
            <Icon name="package" size={15} />
            Download package
          </a>
          <a className="btn btnLg" href={codexInstallUrl}>
            <Icon name="terminal" size={15} />
            Open in Codex
          </a>
          <div className="downloadOptionDivider">
            <span>OR</span>
          </div>
          <DownloadCommandRow
            command={command}
            copied={copied === "command"}
            copyIcon={<Icon name={copied === "command" ? "check" : "copy"} size={13} />}
            helperText="Alternatively, copy and paste this command into your terminal."
            mode={commandMode}
            onCopy={copyCommand}
            onModeChange={changeCommandMode}
          />
          {copied === "failed" && (
            <p className="status" role="alert">
              Copy failed.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
