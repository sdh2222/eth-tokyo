const LABEL = {
  Live: "Live",
  Stopped: "Stopped",
  NotOpen: "Not open",
  Expired: "Expired",
  NoTerms: "No terms",
  WrongResolver: "Wrong resolver",
  NoAddress: "No address",
  Stale: "Stale",
} as const;

export type StatusKind = keyof typeof LABEL;

const TONE: Record<StatusKind, string> = {
  Live: "bg-surface text-text",
  Stopped: "bg-surface text-muted",
  NotOpen: "bg-surface text-muted",
  Expired: "bg-surface text-danger",
  NoTerms: "bg-surface text-warning",
  WrongResolver: "bg-surface text-danger",
  NoAddress: "bg-surface text-danger",
  Stale: "bg-surface text-warning",
};

export function StatusBadge({ kind }: { kind: StatusKind }) {
  return (
    <span className={`rounded-pill px-3 py-1 text-micro font-medium ${TONE[kind]}`}>{LABEL[kind]}</span>
  );
}
