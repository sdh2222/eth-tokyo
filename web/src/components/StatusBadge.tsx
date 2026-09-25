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

export function StatusBadge({ kind }: { kind: StatusKind }) {
  return (
    <span className="rounded-pill bg-surface px-3 py-1 text-micro text-text">{LABEL[kind]}</span>
  );
}
