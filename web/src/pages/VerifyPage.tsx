import { useState } from "react";
import { useParams } from "react-router-dom";
import sepoliaConfig from "@config";
import { formatWadUsd } from "../desk/book";
import { buysEth } from "../desk/fills";
import { emptyConfig } from "../desk/fixture/state";
import type { DeskConfig, FillRecord } from "../desk/types";
import { useClock } from "../hooks/useClock";
import { useDeskPort, useFills, useLiveStrategy } from "../hooks/useDesk";
import { formatAddr, formatHash, formatShare, formatUsdc, formatWeth } from "../lib/format";
import { formatWhen } from "../lib/time";
import { Badge, Card, Dl, Empty, Header, Page, Status, type Tone } from "../ui/v";

// Verify a fill (IA: "Was this fill priced by the rule?"). Vercel-style: the verdict card,
// the recompute as a table, the trade as a key and value list, then the raw event.

const cfg = sepoliaConfig as DeskConfig;
const WETH = cfg.tokens.weth.toLowerCase();

function amountText(fill: FillRecord, leg: "in" | "out"): string {
  const token = leg === "in" ? fill.tokenIn : fill.tokenOut;
  const amount = leg === "in" ? fill.amountIn : fill.amountOut;
  return token.toLowerCase() === WETH ? formatWeth(amount) : formatUsdc(amount);
}

// The event exactly as the fill emitted it, one field per line.
function rawEvent(fill: FillRecord): [string, string][] {
  return [
    ["tx", fill.tx],
    ["blockNumber", fill.blockNumber.toString()],
    ["blockTime", String(fill.blockTime)],
    ["orderHash", fill.orderHash],
    ["nameHash", fill.nameHash],
    ["taker", fill.taker],
    ["dnsName", fill.dnsName],
    ["tokenIn", fill.tokenIn],
    ["tokenOut", fill.tokenOut],
    ["amountIn", fill.amountIn.toString()],
    ["amountOut", fill.amountOut.toString()],
    ["midWad", fill.midWad.toString()],
    ["spreadBps", String(fill.spreadBps)],
    ["spreadSource", String(fill.spreadSource)],
    ["wBeforeWad", fill.wBeforeWad.toString()],
  ];
}

export function VerifyPage() {
  const { tx = "" } = useParams();
  const strategy = useLiveStrategy();
  const fills = useFills(strategy.data ?? null);
  const port = useDeskPort();
  const now = useClock();
  const [copied, setCopied] = useState(false);
  const fill = (fills.data ?? []).find((row) => row.tx.toLowerCase() === tx.toLowerCase());
  const check = fill ? port.verifyFill(fill, emptyConfig()) : null;
  const steps = check?.steps ?? [];

  let verdict: { tone: Tone; title: string; hint: string } = {
    tone: "gray",
    title: "Fill not found",
    hint: "No fill with this hash on the desk yet. Check the hash, or come back after the next block.",
  };
  if (fills.isLoading) {
    verdict = { tone: "gray", title: "Reading the fills", hint: "Looking up this fill on the desk." };
  } else if (check && check.steps.length === 0) {
    verdict = {
      tone: "gray",
      title: "Recompute is not available for this fill",
      hint: "The desk did not return the recompute steps, so this page can't compare them.",
    };
  } else if (check?.matches) {
    verdict = {
      tone: "green",
      title: "Matches on-chain",
      hint: "Recomputed from the inputs the fill emitted: oracle mid, spread and ETH share.",
    };
  } else if (check) {
    verdict = { tone: "red", title: "Does not match", hint: "The recomputed amounts differ from what the fill emitted." };
  }

  function copyLink() {
    void navigator.clipboard.writeText(window.location.href).then(() => setCopied(true));
  }

  return (
    <Page>
      <Header
        title="Verify fill"
        description={<span className="v-mono">{formatHash(tx)}</span>}
        actions={
          <button type="button" className="v-btn v-btn-secondary" onClick={copyLink} aria-live="polite">
            {copied ? "Link copied" : "Copy link"}
          </button>
        }
      />

      {check ? (
        <Card>
          <div className="v-stack v-stack-8">
            <h2 className="v-figure">
              <Status tone={verdict.tone}>{verdict.title}</Status>
            </h2>
            <p className="v-muted">{verdict.hint}</p>
          </div>
        </Card>
      ) : (
        <Card>
          <Empty title={verdict.title} description={verdict.hint} />
        </Card>
      )}

      {fill && steps.length > 0 ? (
        <Card title="Recompute" flush>
          <div className="v-table-wrap">
            <table className="v-table">
              <thead>
                <tr>
                  <th>Step</th>
                  <th>Formula</th>
                  <th className="v-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step, index) => (
                  <tr key={`${index}:${step.label}`}>
                    <td>{`${index + 1}. ${step.label}`}</td>
                    <td className="v-muted">{step.formula}</td>
                    <td className="v-right v-mono">{step.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {fill ? (
        <Card title="Trade">
          <Dl
            items={[
              ["Counterparty", fill.name],
              [
                "Wallet",
                <a key="wallet" className="v-mono" href={`${cfg.explorer}/address/${fill.taker}`} target="_blank" rel="noreferrer">
                  {formatAddr(fill.taker)}
                </a>,
              ],
              ["Side", <Badge key="side" tone={buysEth(fill) ? "red" : "green"}>{buysEth(fill) ? "Bought ETH" : "Sold ETH"}</Badge>],
              ["Paid", amountText(fill, "in")],
              ["Received", amountText(fill, "out")],
              ["Oracle mid", `$${formatWadUsd(fill.midWad)}`],
              ["Spread", `${fill.spreadBps} bp`],
              ["ETH share before", formatShare(fill.wBeforeWad)],
              ["Block", `${fill.blockNumber.toString()} · ${formatWhen(fill.blockTime, now)}`],
              [
                "Transaction",
                <a key="tx" className="v-mono" href={`${cfg.explorer}/tx/${fill.tx}`} target="_blank" rel="noreferrer">
                  {formatHash(fill.tx)}
                </a>,
              ],
            ]}
          />
        </Card>
      ) : null}

      {fill ? (
        <details className="v-details">
          <summary>Raw event</summary>
          <div className="v-code">
            {rawEvent(fill).map(([key, value]) => (
              <div key={key}>{`${key}: ${value}`}</div>
            ))}
          </div>
        </details>
      ) : null}
    </Page>
  );
}
