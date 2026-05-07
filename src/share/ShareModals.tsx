import { useState } from "react";
import { petCompositeUrl, petShareUrl, socialShareUrls } from "../domain/share";
import type { EntityShareTarget, Pet } from "../domain/types";
import { Icon } from "../ui/Icon";
import { copyText } from "../ui/clipboard";

export function ShareModal({ pet, onClose }: { pet: Pet; onClose: () => void }) {
  const [copied, setCopied] = useState("");
  const shareUrl = petShareUrl(pet);
  const shareLinks = socialShareUrls(pet.displayName, shareUrl);

  async function copy(label: string, value: string) {
    setCopied(await copyText(value) ? label : "failed");
    window.setTimeout(() => setCopied(""), 1400);
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
      <section className="authModal shareModal" role="dialog" aria-modal="true" aria-label={`Share ${pet.displayName}`}>
        <div className="modalHeader">
          <div className="modalTitle compact">
            <p className="metaText">Share</p>
            <h2>{pet.displayName}</h2>
            <p className="shareCreator">by {pet.ownerName}</p>
          </div>
          <button className="btn btnSm btnGhost modalCloseButton" type="button" onClick={onClose}>
            <Icon name="close" size={12} />
            Close
          </button>
        </div>
        <div className="shareStack">
          <img
            className="sharePreviewImage"
            src={petCompositeUrl(pet.id)}
            onError={(event) => {
              // Fallback to the user-uploaded share.png if a composite hasn't
              // been baked yet (e.g. brand-new pet between deploys).
              const img = event.currentTarget;
              if (img.dataset.fallback !== "1") {
                img.dataset.fallback = "1";
                img.src = pet.shareImageUrl;
              }
            }}
            alt=""
          />
          <div className="socialShareActions">
            <a className="btn btnPrimary btnLg" href={shareLinks.x} target="_blank" rel="noreferrer">
              Share on X
            </a>
            <a className="btn btnLg" href={shareLinks.bluesky} target="_blank" rel="noreferrer">
              Share on Bluesky
            </a>
            <a className="btn btnLg" href={shareLinks.facebook} target="_blank" rel="noreferrer">
              Share on Facebook
            </a>
            <a className="btn btnLg" href={shareLinks.linkedin} target="_blank" rel="noreferrer">
              Share on LinkedIn
            </a>
          </div>
          <ShareCopyRow label="Link" value={shareUrl} copied={copied === "link"} onCopy={() => copy("link", shareUrl)} />
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

export function EntityShareModal({ target, onClose }: { target: EntityShareTarget; onClose: () => void }) {
  const [copied, setCopied] = useState("");
  const shareLinks = socialShareUrls(target.shareText, target.shareUrl);

  async function copy(label: string, value: string) {
    setCopied(await copyText(value) ? label : "failed");
    window.setTimeout(() => setCopied(""), 1400);
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
      <section className="authModal shareModal" role="dialog" aria-modal="true" aria-label={target.ariaLabel}>
        <div className="modalHeader">
          <div className="modalTitle compact">
            <p className="metaText">Share {target.kind === "creator" ? "creator" : "collection"}</p>
            <h2>{target.title}</h2>
            {target.subtitle && <p className="shareCreator">{target.subtitle}</p>}
          </div>
          <button className="btn btnSm btnGhost modalCloseButton" type="button" onClick={onClose}>
            <Icon name="close" size={12} />
            Close
          </button>
        </div>
        <div className="shareStack">
          <img className="sharePreviewImage" src={target.imageUrl} alt="" />
          <div className="socialShareActions">
            <a className="btn btnPrimary btnLg" href={shareLinks.x} target="_blank" rel="noreferrer">
              Share on X
            </a>
            <a className="btn btnLg" href={shareLinks.bluesky} target="_blank" rel="noreferrer">
              Share on Bluesky
            </a>
            <a className="btn btnLg" href={shareLinks.facebook} target="_blank" rel="noreferrer">
              Share on Facebook
            </a>
            <a className="btn btnLg" href={shareLinks.linkedin} target="_blank" rel="noreferrer">
              Share on LinkedIn
            </a>
          </div>
          <ShareCopyRow label="Link" value={target.shareUrl} copied={copied === "link"} onCopy={() => copy("link", target.shareUrl)} />
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

function ShareCopyRow({
  label,
  value,
  copied,
  onCopy
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="shareCopyRow">
      <div>
        <span className="fieldLabel">{label}</span>
        <code>{value}</code>
      </div>
      <button className="btn btnSm" type="button" onClick={onCopy}>
        <Icon name={copied ? "check" : "copy"} size={13} />
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
