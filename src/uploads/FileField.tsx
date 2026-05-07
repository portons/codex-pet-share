import { Icon, type IconName } from "../ui/Icon";

export function FileField({
  accept,
  file,
  help,
  icon,
  label,
  onFile,
  onInvalidFile
}: {
  accept: string;
  file: File | null;
  help: string;
  icon: IconName;
  label: string;
  onFile: (file: File | null) => void;
  onInvalidFile: (message: string) => void;
}) {
  function acceptsFile(nextFile: File) {
    if (label === "pet.json") {
      return nextFile.name === "pet.json" || nextFile.type === "application/json";
    }
    return nextFile.name === "spritesheet.webp" || nextFile.type === "image/webp";
  }

  function handleFile(nextFile: File | null) {
    if (!nextFile) {
      onFile(null);
      return;
    }
    if (!acceptsFile(nextFile)) {
      onInvalidFile(`Drop ${label}.`);
      return;
    }
    onInvalidFile("");
    onFile(nextFile);
  }

  return (
    <label
      className="fileField"
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        handleFile(event.dataTransfer.files?.[0] || null);
      }}
    >
      <span className="fileIcon">
        <Icon name={icon} size={18} />
      </span>
      <span className="fileCopy">
        <span className="fieldLabel">{label}</span>
        <small>{file?.name || help}</small>
      </span>
      <input type="file" accept={accept} onChange={(event) => handleFile(event.target.files?.[0] || null)} />
    </label>
  );
}
