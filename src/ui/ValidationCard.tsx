import { formatBytes } from "../domain/format";
import type { ValidationReport } from "../domain/types";

export function ValidationItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function ValidationReportCard({ report }: { report?: ValidationReport }) {
  if (!report) {
    return null;
  }

  return (
    <section className="validationCard" aria-label="Package validation">
      <ValidationItem label="manifest" value={report.manifestId} />
      <ValidationItem label="pet.json" value={formatBytes(report.manifestBytes)} />
      <ValidationItem label="spritesheet" value={formatBytes(report.spritesheetBytes)} />
    </section>
  );
}
