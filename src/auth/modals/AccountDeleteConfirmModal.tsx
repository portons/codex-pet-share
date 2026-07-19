import { useState } from "react";
import { Icon } from "../../ui/Icon";
import { Spinner } from "../../ui/Spinner";

type AccountDeletePetAction = "anonymous" | "delete";

export function AccountDeleteConfirmModal({
  busy,
  status,
  onConfirm,
  onClose
}: {
  busy: boolean;
  status: string;
  onConfirm: (deletePets: boolean) => void | Promise<void>;
  onClose: () => void;
}) {
  const [petAction, setPetAction] = useState<AccountDeletePetAction | null>(null);
  return (
    <div
      className="modalBackdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <section className="authModal accountDeleteModal" role="dialog" aria-modal="true" aria-label="Delete account">
        <div className="modalHeader">
          <div className="modalTitle compact">
            <p className="metaText">Delete account</p>
            <h2>Choose pet handling</h2>
          </div>
          <button className="btn btnSm btnGhost modalCloseButton" type="button" onClick={onClose} disabled={busy}>
            <Icon name="close" size={12} />
            Close
          </button>
        </div>
        <div className="stackForm">
          <p className="modalBodyCopy">Your account will be removed after you confirm. Choose what happens to uploaded pets first.</p>
          <div className="accountDeleteOptions" role="radiogroup" aria-label="Uploaded pets">
            <button
              className={`accountDeleteOption ${petAction === "anonymous" ? "isSelected" : ""}`}
              type="button"
              role="radio"
              aria-checked={petAction === "anonymous"}
              disabled={busy}
              onClick={() => setPetAction("anonymous")}
            >
              <Icon name="user" size={16} />
              <span>
                <strong>Leave pets under Anonymous</strong>
                <small>Uploaded pets stay public without your username.</small>
              </span>
            </button>
            <button
              className={`accountDeleteOption ${petAction === "delete" ? "isSelected" : ""}`}
              type="button"
              role="radio"
              aria-checked={petAction === "delete"}
              disabled={busy}
              onClick={() => setPetAction("delete")}
            >
              <Icon name="trash" size={16} />
              <span>
                <strong>Delete uploaded pets</strong>
                <small>Uploaded pets and their package assets are removed.</small>
              </span>
            </button>
          </div>
          <div className="modalActionRow">
            <button
              className="btn btnDanger btnLg"
              type="button"
              disabled={busy || !petAction}
              onClick={() => petAction && void onConfirm(petAction === "delete")}
            >
              {busy ? <Spinner size={14} /> : <Icon name="trash" size={14} />}
              {busy ? "Deleting" : "Delete account"}
            </button>
            <button className="btn btnLg" type="button" disabled={busy} onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
        {status && (
          <p className="status" role="alert">
            {status}
          </p>
        )}
      </section>
    </div>
  );
}
