import { useState } from "react";
import { useParams } from "react-router-dom";
import sepoliaConfig from "@config";
import { formatWadUsd } from "../desk/book";
import { emptyConfig } from "../desk/fixture/state";
import type { DeskConfig, FillRecord } from "../desk/types";
import { useClock } from "../hooks/useClock";
import { useDeskPort, useFills, useLiveStrategy } from "../hooks/useDesk";
import { formatAddr, formatHash, formatShare, formatUsdc, formatWeth } from "../lib/format";
import { formatWhen } from "../lib/time";
import { Callout, Facts, Page, PageHead, Section, Window, type Tone } from "../ui/plain";

// Verify a fill (IA: "Was this fill priced by the rule?"). Plain page kit.
// Screens SC-22: the verdict is 12 columns, and the formula terminal is 12 columns under it.

const cfg = sepoliaConfig as DeskConfig;
const WETH = cfg.tokens.weth.toLowerCase();

function buysEth(fill: FillRecord): boolean {
  return fill.tokenOut.toLowerCase() === WETH;
}

function amountText(fill: FillRecord, leg: "in" | "out"): string {
  const token = leg === "in" ? fill.tokenIn : fill.tokenOut;
  const amount = leg === "in" ? fill.amountIn : fill.amountOut;
  return token.toLowerCase() === WETH ? formatWeth(amount) : formatUsdc(amount);
}

// The fill's own price in USD per ETH (wad): USDC has 6 decimals, WETH 18.
function fillPrice(fill: FillRecord): bigint {
  const eth = buysEth(fill) ? fill.amountOut : fill.amountIn;
  const usdc = buysEth(fill) ? fill.amountIn : fill.amountOut;
  return eth === 0n ? 0n : (usdc * 10n ** 12n * 10n ** 18n) / eth;
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
    tone: "neutral",
    title: "Fill not found",
    hint: "No fill with this hash on the desk yet. Check the hash, or come back after the next block.",
  };
  if (fills.isLoading) {
    verdict = { tone: "neutral", title: "Reading the fills", hint: "Looking up this fill on the desk." };
  } else if (check && check.steps.length === 0) {
    verdict = {
      tone: "neutral",
      title: "Recompute is not available for this fill",
      hint: "The desk did not return the recompute steps, so this page can't compare them.",
    };
  } else if (check?.matches) {
    verdict = {
      tone: "success",
      title: "Matches on-chain",
      hint: "Recomputed from the inputs the fill emitted: oracle mid, spread and ETH share.",
    };
  } else if (check) {
    verdict = { tone: "danger", title: "Does not match", hint: "The recomputed amounts differ from what the fill emitted." };
  }

  function copyLink() {
    void navigator.clipboard.writeText(window.location.href).then(() => setCopied(true));
  }

  return (
    <Page>
      <PageHead
        kicker="Verify"
        title={`Fill ${formatHash(tx)}`}
        lede={
          fill
            ? `${fill.name} · ${buysEth(fill) ? "Bought ETH" : "Sold ETH"} · ${formatWhen(fill.blockTime, now)}`
            : "Was this fill priced by the rule?"
        }
        actions={
          <button type="button" className="wm-link" onClick={copyLink} aria-live="polite">
            {copied ? "Link copied" : "Copy link"}
          </button>
        }
      />

      <div className="wm-grid">
        <Section title="Verdict" className="wm-span-12">
          <Callout tone={verdict.tone}>
            <span className="wm-big">{verdict.title}</span>
            <span>{verdict.hint}</span>
          </Callout>
        </Section>

        {fill && steps.length > 0 ? (
          <Section title="Recompute" className="wm-span-12">
            <p className="wm-muted">Every fill emits its inputs, so anyone can recompute the price and amounts.</p>
            <Window title="Recompute" meta={`${steps.length} steps`}>
              {steps.map((step, index) => (
                <div key={`${index}:${step.label}`} className="wm-window-line">
                  <span>{`${index + 1}. ${step.label}`}</span>
                  <span>{`${step.formula} = ${step.value}`}</span>
                </div>
              ))}
            </Window>
          </Section>
        ) : null}

        {fill ? (
          <Section title="The trade" className="wm-span-12">
            <div className="wm-quote">
              <div className="wm-stack wm-stack-4">
                <span className="wm-label">Fill price</span>
                <span className="wm-big">
                  <span className="wm-mark">{`$${formatWadUsd(fillPrice(fill))}`}</span>
                </span>
              </div>
              <div className="wm-stack wm-stack-4">
                <span className="wm-label">Oracle mid</span>
                <span className="wm-big">{`$${formatWadUsd(fill.midWad)}`}</span>
              </div>
            </div>
            <Facts
              items={[
                ["Counterparty", fill.name],
                [
                  "Wallet",
                  <a key="wallet" href={`${cfg.explorer}/address/${fill.taker}`} target="_blank" rel="noreferrer">
                    {formatAddr(fill.taker)}
                  </a>,
                ],
                ["Side", buysEth(fill) ? "Bought ETH" : "Sold ETH"],
                ["Paid", amountText(fill, "in")],
                ["Received", amountText(fill, "out")],
                ["Oracle mid", `$${formatWadUsd(fill.midWad)}`],
                ["Spread", `${fill.spreadBps} bp`],
                ["ETH share before", formatShare(fill.wBeforeWad)],
                ["Block", fill.blockNumber.toString()],
                [
                  "Transaction",
                  <a key="tx" href={`${cfg.explorer}/tx/${fill.tx}`} target="_blank" rel="noreferrer">
                    {formatHash(fill.tx)}
                  </a>,
                ],
              ]}
            />
            <details className="wm-raw">
              <summary>Raw event</summary>
              <Window title="Fill event">
                {rawEvent(fill).map(([key, value]) => (
                  <div key={key} className="wm-window-line">
                    <span>{key}</span>
                    <span>{value}</span>
                  </div>
                ))}
              </Window>
            </details>
          </Section>
        ) : null}
      </div>
    </Page>
  );
}
