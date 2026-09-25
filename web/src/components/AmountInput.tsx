export function AmountInput({
  value,
  onChange,
  unit,
  onUnit,
  max,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  unit: string;
  onUnit?: () => void;
  max?: string;
  error?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <input
          className="rounded-control border border-border px-3 py-2 text-body"
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => {
            const next = event.target.value.replace(/[^0-9.]/g, "");
            const [whole = "", ...rest] = next.split(".");
            onChange(rest.length === 0 ? whole : `${whole}.${rest.join("")}`);
          }}
        />
        {onUnit ? (
          <button type="button" className="text-body" onClick={onUnit}>
            {unit}
          </button>
        ) : (
          <span className="text-body">{unit}</span>
        )}
        {max ? <span className="text-small text-muted">{max}</span> : null}
      </div>
      {error ? <p className="text-small text-danger">{error}</p> : null}
    </div>
  );
}
