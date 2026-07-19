export function ConfirmCloseDialog({
  onKeepDraft,
  onContinueEditing,
  onDiscard
}: {
  onKeepDraft: () => void;
  onContinueEditing: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="spriteEditorConfirmOverlay" role="alertdialog" aria-modal="true" aria-label="Unsaved sprite draft">
      <div className="spriteEditorConfirmPanel">
        <h3>Close without submitting?</h3>
        <p>You have sprite edits that have not been submitted. They are saved locally as a draft for this pet, but the pet package will not change until you save.</p>
        <div className="spriteEditorConfirmActions">
          <button className="btn btnPrimary btnLg" type="button" onClick={onKeepDraft}>
            Close and keep draft
          </button>
          <button className="btn btnLg" type="button" onClick={onContinueEditing}>
            Continue editing
          </button>
          <button className="btn btnSm btnGhost" type="button" onClick={onDiscard}>
            Discard draft
          </button>
        </div>
      </div>
    </div>
  );
}
