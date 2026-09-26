import { Link } from "react-router-dom";
import { SourceBadge } from "./SourceBadge";
import type { FillRecord } from "../desk/types";
import { formatBps, formatPrice, formatVsMidBps, formatWeth } from "../lib/format";
import { formatWhen } from "../lib/time";

const SCALE = 10n ** 30n;

export function FillTable({
  fills,
  weth,
  midWad,
  now,
  limit = 10,
}: {
  fills: FillRecord[];
  weth: string;
  midWad: bigint;
  now: number;
  limit?: number;
}) {
  const rows = fills.slice(0, limit).flatMap((fill) => {
    const bought = fill.tokenOut.toLowerCase() === weth.toLowerCase();
    const sold = fill.tokenIn.toLowerCase() === weth.toLowerCase();
    if (!bought && !sold) return [];
    const wethAmt = bought ? fill.amountOut : fill.amountIn;
    const usdcAmt = bought ? fill.amountIn : fill.amountOut;
    const price = wethAmt === 0n ? 0n : (usdcAmt * SCALE) / wethAmt;
    const vs = midWad === 0n ? null : formatVsMidBps(price, midWad);
    return [{ fill, side: bought ? "bought ETH" : "sold ETH", size: wethAmt, price, vs }];
  });

  if (rows.length === 0) {
    return <p className="text-body">No fills yet. Market makers see this desk on the Trade page.</p>;
  }

  return (
    <table className="w-full text-left">
      <thead>
        <tr className="text-small text-muted">
          <th>Time</th>
          <th>MM</th>
          <th>Side</th>
          <th>Size</th>
          <th>Price</th>
          <th>Vs mid</th>
          <th>Spread</th>
          <th>Verify</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.fill.tx}>
            <td className="py-3 text-body">{formatWhen(row.fill.blockTime, now)}</td>
            <td className="text-body">{row.fill.name}</td>
            <td className="text-body">{row.side}</td>
            <td className="num text-body">{formatWeth(row.size)}</td>
            <td className="num text-body">{formatPrice(row.price)}</td>
            <td className="num text-body">{row.vs === null ? "—" : `${row.vs} bps`}</td>
            <td className="text-body">
              {formatBps(row.fill.spreadBps)} <SourceBadge source={row.fill.spreadSource} />
            </td>
            <td>
              <Link className="text-body" to={`/fills/${row.fill.tx}`}>
                Verify
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
