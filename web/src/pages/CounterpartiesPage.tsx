import { AddressCell } from "../components/AddressCell";
import { Skeleton } from "../components/Skeleton";
import { StatusBadge, type StatusKind } from "../components/StatusBadge";
import { CP_HELP, ENS_UNAVAILABLE } from "../copy/en";
import type { EnsNameView } from "../ens/read";
import { useEnsDesk } from "../hooks/useEnsDesk";
import { formatBps, formatUsdc } from "../lib/format";
import { formatWhen } from "../lib/time";

const STATUS: Record<EnsNameView["status"], StatusKind | null> = {
  ok: null,
  expired: "Expired",
  "no-terms": "NoTerms",
  "wrong-resolver": "WrongResolver",
  "no-addr": "NoAddress",
};

function expiresCell(mm: EnsNameView, now: number): string {
  if (!mm.expiryOk) return "Expired";
  return formatWhen(Number(mm.expiry), now);
}

export function CounterpartiesPage() {
  const ens = useEnsDesk();
  const now = Math.floor(Date.now() / 1000);

  if (ens.isPending) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-h1">Counterparties</h1>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (ens.isError || !ens.data) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-h1">Counterparties</h1>
        <p className="text-body">{ENS_UNAVAILABLE}</p>
        <button type="button" className="text-body" onClick={() => void ens.refetch()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-h1">Counterparties</h1>
      <p className="rounded-card border border-border bg-surface p-5 text-body">{CP_HELP}</p>
      <div className="overflow-x-auto rounded-card border border-border px-5">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Address</th>
              <th>Expires</th>
              <th>Tier</th>
              <th>Cap per fill</th>
              <th>Agent spread</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ens.data.clients.map((mm) => {
              const kind = STATUS[mm.status];
              return (
                <tr key={mm.name}>
                  <td>{mm.name}</td>
                  <td>{mm.addr === "0x0000000000000000000000000000000000000000" ? "—" : <AddressCell address={mm.addr} />}</td>
                  <td>{expiresCell(mm, now)}</td>
                  <td>{mm.tierBps === null ? "—" : formatBps(mm.tierBps)}</td>
                  <td className="num">{mm.cap === null ? "—" : formatUsdc(mm.cap)}</td>
                  <td>{mm.spreadBps === null ? "—" : formatBps(mm.spreadBps)}</td>
                  <td>{kind ? <StatusBadge kind={kind} /> : "ok"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
