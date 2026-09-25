import { useState } from "react";
import { useAccount } from "wagmi";
import { AmountInput } from "../components/AmountInput";
import {
  BUY_ETH,
  NOT_ON_LIST,
  PER_FILL,
  SELL_ETH,
  SLIPPAGE,
  TOO_MANY_DECIMALS,
  TRADING_AS,
} from "../copy/en";
import { useDeskState, useLiveStrategy } from "../hooks/useDesk";
import { formatBps, formatUsdc } from "../lib/format";

type Side = "buy" | "sell";
type Unit = "ETH" | "USDC";

export function parseAmount(text: string, decimals: number): { ok: true; value: bigint } | { ok: false; reason: "empty" | "decimals" } {
  if (text === "" || text === ".") return { ok: false, reason: "empty" };
  if (!/^\d+(\.\d+)?$/.test(text)) return { ok: false, reason: "decimals" };
  const [whole, frac = ""] = text.split(".");
  if (frac.length > decimals) return { ok: false, reason: "decimals" };
  const digits = `${whole}${frac.padEnd(decimals, "0")}`;
  return { ok: true, value: BigInt(digits) };
}

export function legFor(side: Side, unit: Unit): { leg: "weth" | "usdc"; exact: "exactIn" | "exactOut" } {
  if (side === "buy" && unit === "ETH") return { leg: "weth", exact: "exactOut" };
  if (side === "buy" && unit === "USDC") return { leg: "usdc", exact: "exactIn" };
  if (side === "sell" && unit === "ETH") return { leg: "weth", exact: "exactIn" };
  return { leg: "usdc", exact: "exactOut" };
}

export function TradePage() {
  const { address } = useAccount();
  const live = useLiveStrategy();
  const state = useDeskState(live.data ?? null);
  const [side, setSide] = useState<Side>("buy");
  const [unit, setUnit] = useState<Unit>("ETH");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("10");
  const mm = state.data?.mms.find((item) => address && item.address.toLowerCase() === address.toLowerCase());
  const named = mm && (mm.status === "ok" || mm.terms);
  const parsed = parseAmount(amount, unit === "ETH" ? 18 : 6);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-h1">Trade</h1>
      {named && mm?.terms ? (
        <p className="text-body">
          {TRADING_AS} {mm.name} · tier {formatBps(mm.terms.tierBps)} · cap {formatUsdc(mm.terms.cap)} {PER_FILL}
        </p>
      ) : (
        <p className="text-body">{NOT_ON_LIST}</p>
      )}
      <div className="flex gap-2" role="group" aria-label="Side">
        <button type="button" aria-pressed={side === "buy"} className="rounded-control px-3 py-2 text-body" onClick={() => setSide("buy")}>
          {BUY_ETH}
        </button>
        <button type="button" aria-pressed={side === "sell"} className="rounded-control px-3 py-2 text-body" onClick={() => setSide("sell")}>
          {SELL_ETH}
        </button>
      </div>
      <AmountInput
        value={amount}
        onChange={setAmount}
        unit={unit}
        onUnit={() => setUnit(unit === "ETH" ? "USDC" : "ETH")}
        {...(parsed.ok === false && parsed.reason === "decimals" ? { error: TOO_MANY_DECIMALS } : {})}
      />
      <details>
        <summary className="text-body">{SLIPPAGE}</summary>
        <input
          className="mt-2 rounded-control border border-border px-3 py-2 text-body"
          type="text"
          inputMode="numeric"
          value={slippage}
          onChange={(event) => setSlippage(event.target.value.replace(/\D/g, ""))}
        />
      </details>
    </div>
  );
}
