export function StatTile({ label, value, delta }: { label: string; value: string; delta?: string }) {
  return (
    <div className="rounded-card bg-surface p-5">
      <p className="text-small text-muted">{label}</p>
      <p className="num text-h2">{value}</p>
      {delta ? <p className="text-small text-muted">{delta}</p> : null}
    </div>
  );
}
