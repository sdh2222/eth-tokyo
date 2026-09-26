import { formatBpsShare, formatWadUsd } from "../../desk/book";
import { useBook } from "../../hooks/useBook";
import { formatCountdown, useClock } from "../../hooks/useClock";
import { InventoryCells, SpreadStrip, WindowCells } from "../../ui/cells";

// /dev/standard: the one design standard for every app page, for approval. It is the
// Landing (web/src/pages/landing.css on claude/relaxed-gauss-w2ckxo), and this sheet is
// itself built only from those parts (web/src/ui/standard.css).

function Row({ label, a, b }: { label: string; a: React.ReactNode; b?: React.ReactNode }) {
  return (
    <div className={b === undefined ? "wl-row wl-row-1" : "wl-row"}>
      <p className="wl-row-label">{label}</p>
      <div>{a}</div>
      {b === undefined ? null : <div>{b}</div>}
    </div>
  );
}

function Head({ a, b }: { a: string; b?: string }) {
  return (
    <div className={b === undefined ? "wl-row wl-row-1 wl-row-head" : "wl-row wl-row-head"}>
      <span />
      <p className="wl-panel-label">{a}</p>
      {b === undefined ? null : <p className="wl-panel-label">{b}</p>}
    </div>
  );
}

function Spec() {
  return (
    <section className="wl-section">
      <p className="wl-label">The standard</p>
      <h2 className="wl-h2">Every page is one Landing section.</h2>
      <div className="wl-rows">
        <Head a="Part" b="Rule" />
        <Row label="Label" a={<p className="wl-label">Dashboard</p>} b="LisaTerminal Paper 16, water #0077af. One per section, over the question." />
        <Row label="Question" a={<p className="wl-h2">Is the desk trading?</p>} b="40–64 px, 500, line 0.95, −0.03 em. The page's one L1: a question or a statement." />
        <Row label="Value" a={<p className="wl-value">$4,000.80</p>} b="28–40 px, 500, line 1.05, −0.03 em. The answers in the rows." />
        <Row label="Ours" a={<p className="wl-value wl-ours">The DAO</p>} b="Water #0077af. At most one value per section." />
        <Row label="Row label" a={<p className="wl-row-label">Who sets the price</p>} b="16 px at 60 %. The left column, 220 px." />
        <Row label="Statement" a={<p className="wl-statement">Nothing needs you.</p>} b="32–48 px on a 1 px ink rule. The closing line of a section." />
        <Row label="Body" a="Body is 16 px, line 24. Everything that is not above is body." b="Die Grotesk C 400 and 500 only." />
        <Row
          label="Dither"
          a={<SpreadStrip sellBps={2} buyBps={8} fenceSellBps={3} fenceBuyBps={10} />}
          b="Cells, not bars: sky #6ec1ea squares, #d9d9d9 dots, ink marks. One square per unit. They appear once when seen."
        />
        <Row
          label="Actions"
          a={
            <div className="wl-actions">
              <button type="button" className="wl-button">
                Open a desk
              </button>
              <button type="button" className="wl-link">
                How it works
              </button>
            </div>
          }
          b="One ink button per page, sky on hover. The rest are underlined words. Stop and Cut off are the red outline."
        />
        <Row
          label="Status"
          a={
            <span className="wl-status" data-tone="good">
              Live
            </span>
          }
          b="A dot and a word. Never a coloured fill, never colour alone."
        />
        <Row
          label="Colour"
          a={
            <p>
              <span className="wl-swatch" style={{ background: "#111111" }} />
              ink
              <span className="wl-swatch" style={{ background: "#0077af", marginLeft: 24 }} />
              water
              <span className="wl-swatch" style={{ background: "#6ec1ea", marginLeft: 24 }} />
              dither
            </p>
          }
          b="White ground. Rules: 1 px ink under a head, 1 px #e5e5e5 between rows. No cards, no fills, no shadows."
        />
        <Row
          label="Space"
          a="Label → question 16 · question → rows 72 · row padding 24 · columns 48 · statement 48 · actions 40 · sections 120"
          b="Only these."
        />
      </div>
    </section>
  );
}

function Example() {
  const book = useBook();
  const now = useClock();
  const b = book.data;
  if (!b || !b.quote) return null;
  const updatedAt = Number(b.oracle.updatedAt);
  const windowLeft = updatedAt > now ? 0 : updatedAt + 600 - now;
  return (
    <section className="wl-section">
      <p className="wl-label">Dashboard · {b.name}</p>
      <h2 className="wl-h2">
        The desk is live. It buys ETH at ${formatWadUsd(b.quote.bid)} and sells at ${formatWadUsd(b.quote.ask)}.
      </h2>
      <div className="wl-rows">
        <Head a="Bid · a counterparty sells ETH" b="Ask · a counterparty buys ETH" />
        <Row
          label="Price"
          a={<p className="wl-value">{`$${formatWadUsd(b.quote.bid)}`}</p>}
          b={<p className="wl-value">{`$${formatWadUsd(b.quote.ask)}`}</p>}
        />
        <Row
          label="Width"
          a={
            <figure className="wl-figure">
              <SpreadStrip sellBps={b.spread?.sellBps ?? 0} buyBps={b.spread?.buyBps ?? 0} fenceSellBps={b.terms?.sellBps} fenceBuyBps={b.terms?.buyBps} />
              <figcaption className="wl-ours">{`${b.spread?.buyBps ?? 0} bp under, ${b.spread?.sellBps ?? 0} bp over the mid`}</figcaption>
            </figure>
          }
          b={
            <p>
              Set by the risk agent, inside the terms of {b.terms?.buyBps} bp and {b.terms?.sellBps} bp. <a href="/agent">Risk agent</a>
            </p>
          }
        />
        <Row
          label="Price window"
          a={
            <figure className="wl-figure">
              <WindowCells secondsLeft={windowLeft} />
              <figcaption>{`${formatCountdown(Math.max(0, windowLeft))} left`}</figcaption>
            </figure>
          }
          b="Fills are allowed for 10 minutes after each oracle update."
        />
      </div>
      <div className="wl-rows">
        <Head a="ETH" b="USDC" />
        <Row label="In the Safe" a={<p className="wl-value">900 WETH</p>} b={<p className="wl-value">400,000 USDC</p>} />
        <Row
          label="ETH share"
          a={
            <figure className="wl-figure">
              <InventoryCells shareBps={b.inventory.wBps} stopBps={b.inventory.wStarBps} />
              <figcaption>{formatBpsShare(b.inventory.wBps)}</figcaption>
            </figure>
          }
          b={`The desk stops selling ETH at ${formatBpsShare(b.inventory.wStarBps)}. The line marks it.`}
        />
      </div>
      <p className="wl-statement">Nothing needs you.</p>
    </section>
  );
}

export function Standard() {
  return (
    <div className="wl-page">
      <Spec />
      <Example />
    </div>
  );
}
