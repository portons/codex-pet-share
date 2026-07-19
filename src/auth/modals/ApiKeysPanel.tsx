import { useState, type FormEvent } from "react";
import { Icon } from "../../ui/Icon";
import { Spinner } from "../../ui/Spinner";
import type { ApiKeySummary } from "../forms/types";

export function ApiKeysPanel({
  keys,
  loading,
  busy,
  name,
  secret,
  status,
  onName,
  onCreate,
  onRevoke
}: {
  keys: ApiKeySummary[];
  loading: boolean;
  busy: string;
  name: string;
  secret: string;
  status: string;
  onName: (value: string) => void;
  onCreate: (event: FormEvent) => void | Promise<void>;
  onRevoke: (id: string) => void | Promise<void>;
}) {
  const [copied, setCopied] = useState(false);

  async function copySecret() {
    if (!secret) return;
    await navigator.clipboard?.writeText(secret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <section className="settingsApiKeys">
      <div className="settingsSectionHeader">
        <span className="fieldLabel">API keys</span>
        <small>Agent uploads</small>
      </div>
      <form className="apiKeyCreateRow" onSubmit={onCreate}>
        <label>
          <span className="fieldLabel">Name</span>
          <input
            className="input"
            value={name}
            onChange={(event) => onName(event.target.value)}
            maxLength={80}
            disabled={Boolean(busy)}
          />
        </label>
        <button className="btn btnPrimary btnLg" type="submit" disabled={Boolean(busy)}>
          {busy === "create" ? <Spinner size={14} /> : <Icon name="terminal" size={14} />}
          {busy === "create" ? "Creating" : "Create key"}
        </button>
      </form>
      {secret ? (
        <div className="apiKeySecretBox">
          <code>{secret}</code>
          <button className="btn btnSm" type="button" onClick={copySecret}>
            <Icon name={copied ? "check" : "copy"} size={13} />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : null}
      <div className="apiKeyList">
        {loading ? (
          <p className="metaText">Loading keys</p>
        ) : keys.length ? keys.map((key) => (
          <div className="apiKeyRow" key={key.id}>
            <span>
              <strong>{key.name}</strong>
              <small>{key.lastUsedAt ? `Last used ${formatCompactDate(key.lastUsedAt)}` : `Created ${formatCompactDate(key.createdAt)}`}</small>
            </span>
            <button className="btn btnDanger btnSm" type="button" disabled={Boolean(busy)} onClick={() => onRevoke(key.id)}>
              {busy === key.id ? <Spinner size={13} /> : <Icon name="trash" size={13} />}
              Revoke
            </button>
          </div>
        )) : (
          <p className="metaText">No active keys</p>
        )}
      </div>
      {status ? (
        <p className="status" role="alert">
          {status}
        </p>
      ) : null}
    </section>
  );
}

function formatCompactDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
