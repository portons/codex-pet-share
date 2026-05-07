import { ReactNode } from "react";

export type DownloadCommandMode = "cli" | "curl";

type DownloadCommandRowProps = {
  command: string;
  copied: boolean;
  copyIcon: ReactNode;
  helperText: string;
  mode: DownloadCommandMode;
  onCopy: () => void;
  onModeChange: (mode: DownloadCommandMode) => void;
};

const commandModes: Array<DownloadCommandMode> = ["cli", "curl"];

function commandModeLabel(mode: DownloadCommandMode) {
  return mode === "cli" ? "CLI" : "curl";
}

export function DownloadCommandRow({
  command,
  copied,
  copyIcon,
  helperText,
  mode,
  onCopy,
  onModeChange
}: DownloadCommandRowProps) {
  return (
    <>
      <p className="commandHelperText">{helperText}</p>
      <div className="shareCopyRow downloadCommandRow">
        <div>
          <div className="commandModeSwitch" aria-label="Command type">
            {commandModes.map((commandMode) => (
              <button
                className={commandMode === mode ? "active" : ""}
                key={commandMode}
                type="button"
                aria-pressed={commandMode === mode}
                onClick={() => {
                  if (commandMode !== mode) {
                    onModeChange(commandMode);
                  }
                }}
              >
                {commandModeLabel(commandMode)}
              </button>
            ))}
          </div>
          <div className="terminalCommandLine" aria-label="Command">
            <span aria-hidden="true">$</span>
            <code>{command}</code>
          </div>
        </div>
        <button className="btn btnSm commandCopyButton" type="button" onClick={onCopy}>
          {copyIcon}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </>
  );
}
