export function PanelTitle({ title, label }: { title: string; label?: string }) {
  return (
    <div className="spriteEditorPanelTitle">
      <h3>{title}</h3>
      {label ? <span>{label}</span> : null}
    </div>
  );
}

export function StageHeading({ title, label }: { title: string; label: string }) {
  return (
    <div className="spriteEditorStageHeading">
      <h3>{title}</h3>
      <span>{label}</span>
    </div>
  );
}

export function RangeField({
  label,
  min,
  max,
  step,
  value,
  valueLabel,
  disabled,
  onChange
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  valueLabel: string;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="spriteEditorRangeField">
      <span>
        {label}
        <strong>{valueLabel}</strong>
      </span>
      <input
        aria-label={label}
        disabled={disabled}
        max={max}
        min={min}
        step={step}
        type="range"
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
}

export function SegmentedControl<TValue extends string>({
  label,
  value,
  values,
  disabled,
  onChange
}: {
  label: string;
  value: TValue;
  values: ReadonlyArray<{ id: TValue; label: string }>;
  disabled: boolean;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="spriteEditorSegmentedField">
      <span>{label}</span>
      <div className="spriteEditorSegmented" style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
        {values.map((item) => (
          <button
            aria-pressed={value === item.id}
            className={value === item.id ? "active" : ""}
            disabled={disabled}
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
