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
      <table className="w-full text-left">
        <thead>
          <tr className="text-small text-muted">
            <th>Name</th>
            <th>Status</th>
            <th>Tier</th>
            <th>Agent spread</th>
            <th>Spread used</th>
            <th>Bid</th>
            <th>Ask</th>
            <th>Cap per fill</th>
          </tr>
        </thead>
        <tbody>
          {mms.map((mm) => {
            const open = mm.status === "ok";
            const source: 0 | 1 | 2 = mm.spread?.valid ? 1 : mm.terms ? 0 : 2;
            return (
              <tr key={mm.address} className={open ? "" : "opacity-40"}>
                <td className="py-3 text-body">{mm.name}</td>
                <td><StatusBadge kind={STATUS[mm.status]} /></td>
                <td className="text-body">{mm.terms ? formatBps(mm.terms.tierBps) : "—"}</td>
                <td className="text-body">
                  {mm.spread?.valid ? `${formatBps(mm.spread.bps)} until ${formatWhen(mm.spread.validUntil, now)}` : "none"}
                </td>
                <td className="text-body">
                  {formatBps(mm.sPolicy)} <SourceBadge source={source} />
                </td>
                <td className="num text-h3">{open ? formatPrice(mm.bidWad) : "—"}</td>
                <td className="num text-h3">{open ? formatPrice(mm.askWad) : "—"}</td>
                <td className="text-body">{mm.terms ? formatUsdc(mm.terms.cap) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-small text-muted">Prices for a 1 ETH fill. Larger fills can carry a size floor.</p>
    </section>
  );
}
