import { useState } from "react";
import { DownloadCommandRow, type DownloadCommandMode } from "../../downloads/DownloadCommandRow";
import { trackEvent } from "../../domain/analytics";
import { petCodexInstallUrl, petImportCommand } from "../../domain/pets";
import type { Pet, User } from "../../domain/types";
import { copyText } from "../../ui/clipboard";
import { Icon } from "../../ui/Icon";
import { ValidationReportCard } from "../../ui/ValidationCard";

export function DetailInstallPanel({ pet, user }: { pet: Pet; user: User | null }) {
  const [copiedDownloadCommand, setCopiedDownloadCommand] = useState(false);
  const [downloadCommandMode, setDownloadCommandMode] = useState<DownloadCommandMode>("cli");

  const downloadCommand = petImportCommand(pet, downloadCommandMode);
  const codexInstallUrl = petCodexInstallUrl(pet);

  async function copyDownloadCommand() {
    trackEvent("download_command_copy", { route: "detail", petId: pet.id, value: downloadCommandMode, user });
    const copied = await copyText(downloadCommand);
    setCopiedDownloadCommand(copied);
    window.setTimeout(() => setCopiedDownloadCommand(false), 1400);
  }

  function changeDownloadCommandMode(mode: DownloadCommandMode) {
    trackEvent("download_command_mode", { route: "detail", petId: pet.id, value: mode, user });
    setDownloadCommandMode(mode);
    setCopiedDownloadCommand(false);
  }

  function handleCodexInstall() {
    trackEvent("detail_codex_install_click", { route: "detail", petId: pet.id, user });
  }

  function handleZipDownload() {
    trackEvent("detail_zip_download_click", { route: "detail", petId: pet.id, user });
  }

  return (
    <article className="detailInstall" aria-label="Install">
      <header className="detailSectionHeader">
        <span className="detailSectionLabel">Codex install</span>
        <span className="detailSectionHint">Ask Codex to install this pet.</span>
      </header>
      <a className="btn btnPrimary btnLg detailInstallPrimary" href={codexInstallUrl} onClick={handleCodexInstall}>
        <Icon name="terminal" size={15} />
        Install in Codex
      </a>
      <DownloadCommandRow
        command={downloadCommand}
        copied={copiedDownloadCommand}
        copyIcon={<Icon name={copiedDownloadCommand ? "check" : "copy"} size={13} />}
        helperText="Terminal install command"
        mode={downloadCommandMode}
        onCopy={copyDownloadCommand}
        onModeChange={changeDownloadCommandMode}
      />
      <a className="detailInstallSecondary" href={pet.downloadUrl} download onClick={handleZipDownload}>
        <Icon name="package" size={13} />
        Download sprite kit <code>.codex-pet.zip</code>
      </a>
      <ValidationReportCard report={pet.validationReport} />
    </article>
  );
}
