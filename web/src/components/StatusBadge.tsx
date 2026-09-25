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
  Live: "bg-treasury-tint text-treasury",
  Stopped: "bg-surface text-muted",
  NotOpen: "bg-surface text-muted",
  Expired: "bg-ens-tint text-ens",
  NoTerms: "bg-mm-tint text-mm",
  WrongResolver: "bg-ens-tint text-ens",
  NoAddress: "bg-ens-tint text-ens",
  Stale: "bg-mm-tint text-mm",
};

export function StatusBadge({ kind }: { kind: StatusKind }) {
  return (
    <span className={`rounded-pill px-3 py-1 text-micro font-medium ${TONE[kind]}`}>{LABEL[kind]}</span>
  );
}
