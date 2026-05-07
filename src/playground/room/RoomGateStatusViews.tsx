import type { Pet } from "../../domain/types";

export function RoomLoadingGate({ roomId, roomDisplayName }: { roomId: string; roomDisplayName?: string }) {
  return (
    <div className="modalBackdrop" role="presentation">
      <section className="authModal roomSignInGate" role="dialog" aria-modal="true">
        <span className="roomGateCallsign">
          <span className="roomDot" aria-hidden="true" />
          <span>tuning frequency · {roomDisplayName || roomId}</span>
        </span>
      </section>
    </div>
  );
}

export function RoomFullGate({
  roomId,
  onRetry,
  onClose
}: {
  roomId: string;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <div className="modalBackdrop" role="presentation">
      <section className="authModal roomSignInGate" role="dialog" aria-modal="true">
        <span className="roomGateCallsign">
          <span className="roomDot" aria-hidden="true" style={{ background: "var(--warning, #c97a18)", boxShadow: "0 0 0 3px rgba(201, 122, 24, 0.16)" }} />
          <span>at capacity · {roomId}</span>
        </span>
        <h2>This room is full</h2>
        <p>Up to 8 pets can share a room at once. Try again in a moment — someone might leave.</p>
        <div className="formActions">
          <button className="btn btnPrimary" type="button" onClick={onRetry}>
            Try again
          </button>
          <button className="btn btnGhost" type="button" onClick={onClose}>Cancel</button>
        </div>
      </section>
    </div>
  );
}

export function RoomErrorGate({
  roomId,
  message,
  onClose
}: {
  roomId: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="modalBackdrop" role="presentation" onClick={onClose}>
      <section className="authModal roomSignInGate" role="dialog" aria-modal="true">
        <span className="roomGateCallsign">
          <span className="roomDot" aria-hidden="true" style={{ background: "var(--danger)", boxShadow: "0 0 0 3px rgba(217, 45, 32, 0.16)" }} />
          <span>signal lost · {roomId}</span>
        </span>
        <h2>Room unavailable</h2>
        <p>{message}</p>
        <div className="formActions">
          <button className="btn btnPrimary" type="button" onClick={onClose}>Close</button>
        </div>
      </section>
    </div>
  );
}

export function RoomConnectingGate({
  roomId,
  roomDisplayName,
  status
}: {
  roomId: string;
  roomDisplayName?: string;
  status: { rooms: { hostDisplayName: string }; pet: Pet };
}) {
  return (
    <div className="modalBackdrop" role="presentation">
      <section className="authModal roomSignInGate" role="dialog" aria-modal="true">
        <span className="roomGateCallsign">
          <span className="roomDot" aria-hidden="true" />
          <span>connecting · {roomDisplayName || roomId}</span>
        </span>
        <h2>Joining {roomDisplayName ? `“${roomDisplayName}”` : `${status.rooms.hostDisplayName}'s playground`}…</h2>
        <p>Hold tight while we put your pet on the floor.</p>
      </section>
    </div>
  );
}
