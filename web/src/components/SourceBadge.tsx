const LABEL = { 0: "Tier", 1: "Agent", 2: "Size floor" } as const;
const COLOR = { 0: "text-muted", 1: "text-agent", 2: "text-program" } as const;

export function SourceBadge({ source }: { source: 0 | 1 | 2 }) {
  return (
    <span className={`rounded-pill bg-surface px-3 py-1 text-micro ${COLOR[source]}`}>
      {LABEL[source]}
    </span>
  );
}
