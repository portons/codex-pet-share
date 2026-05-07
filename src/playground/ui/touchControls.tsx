import type { MouseEvent, PointerEvent } from "react";

function dispatchKey(code: string, key: string, type: "keydown" | "keyup") {
  document.dispatchEvent(
    new KeyboardEvent(type, { code, key, bubbles: true, cancelable: true })
  );
}

const TOUCH_KEY_LABELS: Record<string, string> = {
  KeyW: "w",
  KeyA: "a",
  KeyS: "s",
  KeyD: "d",
  KeyB: "b",
  KeyT: "t",
  KeyE: "e",
  KeyQ: "q",
  Space: " "
};

export function TouchControls() {
  function holdProps(code: string) {
    const key = TOUCH_KEY_LABELS[code] ?? code;
    return {
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        dispatchKey(code, key, "keydown");
      },
      onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        dispatchKey(code, key, "keyup");
      },
      onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        dispatchKey(code, key, "keyup");
      },
      onContextMenu: (event: MouseEvent<HTMLButtonElement>) => event.preventDefault()
    };
  }

  function tapProps(code: string) {
    const key = TOUCH_KEY_LABELS[code] ?? code;
    return {
      onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        dispatchKey(code, key, "keydown");
        window.setTimeout(() => dispatchKey(code, key, "keyup"), 80);
      },
      onContextMenu: (event: MouseEvent<HTMLButtonElement>) => event.preventDefault()
    };
  }

  return (
    <div className="playgroundTouchControls" aria-label="On-screen controls">
      <div className="playgroundDpad" role="group" aria-label="Movement">
        <button type="button" className="playgroundDpadBtn playgroundDpadUp" {...holdProps("KeyW")} aria-label="Move up">▲</button>
        <button type="button" className="playgroundDpadBtn playgroundDpadLeft" {...holdProps("KeyA")} aria-label="Move left">◀</button>
        <button type="button" className="playgroundDpadBtn playgroundDpadRight" {...holdProps("KeyD")} aria-label="Move right">▶</button>
        <button type="button" className="playgroundDpadBtn playgroundDpadDown" {...holdProps("KeyS")} aria-label="Move down">▼</button>
      </div>
      <div className="playgroundActionButtons" role="group" aria-label="Actions">
        <button type="button" className="playgroundActionBtn playgroundActionJump" {...tapProps("Space")} aria-label="Jump">JUMP</button>
        <button type="button" className="playgroundActionBtn" {...tapProps("KeyB")} aria-label="Throw ball">BALL</button>
        <button type="button" className="playgroundActionBtn" {...tapProps("KeyT")} aria-label="Place pad">PAD</button>
        <button type="button" className="playgroundActionBtn playgroundActionGhost" {...tapProps("KeyE")} aria-label="Wave">WAVE</button>
      </div>
    </div>
  );
}
