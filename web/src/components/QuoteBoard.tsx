import { SourceBadge } from "./SourceBadge";
import { StatusBadge, type StatusKind } from "./StatusBadge";
import type { DeskState } from "../desk/types";
import { formatBps, formatPrice, formatUsdc } from "../lib/format";
import { formatWhen } from "../lib/time";
import { NOW } from "../desk/fixture/state";

const STATUS: Record<DeskState["mms"][number]["status"], StatusKind> = {
  ok: "Live",
  expired: "Expired",
  "no-terms": "NoTerms",
  "wrong-resolver": "WrongResolver",
  "no-addr": "NoAddress",
};

export function QuoteBoard({ mms, now = NOW }: { mms: DeskState["mms"]; now?: number }) {
  return (
    <section>
      <ul className="flex flex-col gap-3 lg:hidden">
        {mms.map((mm) => {
          const open = mm.status === "ok";
          return (
            <li key={mm.address} className={open ? "rounded-card bg-surface p-5" : "rounded-card bg-surface p-5 opacity-40"}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-body">{mm.name}</p>
                <StatusBadge kind={STATUS[mm.status]} />
              </div>
              <p className="num mt-3 text-h3">{open ? formatPrice(mm.bidWad) : "—"}</p>
              <p className="text-small text-muted">They buy ETH at</p>
              <p className="num mt-3 text-h3">{open ? formatPrice(mm.askWad) : "—"}</p>
              <p className="text-small text-muted">They sell ETH at</p>
            </li>
          );
        })}
      </ul>
      <div className="hidden overflow-x-auto lg:block">
      <table className="w-full text-left">
        <thead>
          <tr className="text-small text-muted">
            <th className="py-3 pr-4">Name</th>
            <th className="py-3 pr-4">Status</th>
            <th className="py-3 pr-4">Tier</th>
            <th className="py-3 pr-4">Agent spread</th>
            <th className="py-3 pr-4">Spread used</th>
            <th className="py-3 pr-4">They buy ETH at</th>
            <th className="py-3 pr-4">They sell ETH at</th>
            <th className="py-3">Cap per fill</th>
          </tr>
        </thead>
        <tbody>
          {mms.map((mm) => {
            const open = mm.status === "ok";
            const source: 0 | 1 | 2 = mm.spread?.valid ? 1 : mm.terms ? 0 : 2;
            return (
              <tr key={mm.address} className={open ? "" : "opacity-40"}>
                <td className="border-t border-border py-3 pr-4 text-body">{mm.name}</td>
                <td className="border-t border-border py-3 pr-4"><StatusBadge kind={STATUS[mm.status]} /></td>
                <td className="border-t border-border py-3 pr-4 text-body">{mm.terms ? formatBps(mm.terms.tierBps) : "—"}</td>
                <td className="border-t border-border py-3 pr-4 text-body">
                  {mm.spread?.valid ? `${formatBps(mm.spread.bps)} until ${formatWhen(mm.spread.validUntil, now)}` : "none"}
                </td>
                <td className="border-t border-border py-3 pr-4 text-body">
                  {formatBps(mm.sPolicy)} <SourceBadge source={source} />
                </td>
                <td className="num border-t border-border py-3 pr-4 text-h3">{open ? formatPrice(mm.bidWad) : "—"}</td>
                <td className="num border-t border-border py-3 pr-4 text-h3">{open ? formatPrice(mm.askWad) : "—"}</td>
                <td className="border-t border-border py-3 text-body">{mm.terms ? formatUsdc(mm.terms.cap) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      <p className="mt-3 text-small text-muted">Prices for a 1 ETH fill. Larger fills can carry a size floor.</p>
    </section>
  );
}
