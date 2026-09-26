import { useEffect, useRef, useState, type ReactNode } from "react";

// Dither cells, lifted from the Landing (claude/relaxed-gauss-w2ckxo: Timeline, SpreadStrip).
// One square per unit: sky is on, a 2 px gray dot is off, ink is the mark. Styles are the
// `wk-cell-*` rules in plain.css. The squares appear once, when first seen, then change in
// place: live numbers do not move (UI-13).

const CELL = 10;
const STEP = 14;

// Latches once the element is a third in view (the Landing's useSeen).
export function useSeen<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setSeen(true);
      },
      { threshold: 0.33 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [seen]);
  return [ref, seen] as const;
}

type Kind = "on" | "ink" | "off" | "mark" | "fence";

function Cell({ kind, x, y, delay }: { kind: Kind; x: number; y: number; delay: number }) {
  if (kind === "off") return <rect className="wk-cell-off" x={x + 4} y={y + 4} width={2} height={2} />;
  if (kind === "fence") {
    return <rect className="wk-cell-fence" x={x + 0.5} y={y + 0.5} width={CELL - 1} height={CELL - 1} />;
  }
  if (kind === "mark") return <rect className="wk-cell-mark" x={x} y={y} width={CELL} height={CELL} />;
  return (
    <rect
      className={kind === "ink" ? "wk-cell-on wk-cell-ink" : "wk-cell-on"}
      x={x}
      y={y}
      width={CELL}
      height={CELL}
      style={{ transitionDelay: `${delay}ms` }}
    />
  );
}

function CellGrid({
  cols,
  rows,
  kindAt,
  delayAt,
  label,
  extra,
}: {
  cols: number;
  rows: number;
  kindAt: (col: number, row: number) => Kind;
  delayAt: (col: number, row: number) => number;
  label: string;
  extra?: ReactNode;
}) {
  const [ref, seen] = useSeen<SVGSVGElement>();
  const cells = [];
  for (let col = 0; col < cols; col += 1) {
    for (let row = 0; row < rows; row += 1) {
      cells.push(
        <Cell key={`${col}-${row}`} kind={kindAt(col, row)} x={col * STEP} y={row * STEP} delay={delayAt(col, row)} />,
      );
    }
  }
  return (
    <svg
      ref={ref}
      className="wk-cells"
      data-seen={seen}
      width={cols * STEP - (STEP - CELL)}
      height={rows * STEP - (STEP - CELL)}
      viewBox={`0 0 ${cols * STEP - (STEP - CELL)} ${rows * STEP - (STEP - CELL)}`}
      role="img"
      aria-label={label}
    >
      {cells}
      {extra}
    </svg>
  );
}

// The spread around the oracle mid, one square per basis point (the Landing's SpreadStrip):
// the ink mark is the mid, sky squares to the left are the bid width and to the right the
// ask width, and an ink outline marks each end of the terms fence.
export function SpreadStrip({
  sellBps,
  buyBps,
  fenceSellBps,
  fenceBuyBps,
}: {
  sellBps: number;
  buyBps: number;
  fenceSellBps?: number | undefined;
  fenceBuyBps?: number | undefined;
}) {
  const span = Math.max(sellBps, buyBps, fenceSellBps ?? 0, fenceBuyBps ?? 0) + 2;
  const cols = span * 2 + 1;
  const kindAt = (col: number): Kind => {
    const bp = col - span;
    if (bp === 0) return "mark";
    if (bp > 0) {
      if (bp <= sellBps) return "on";
      return bp === fenceSellBps ? "fence" : "off";
    }
    if (-bp <= buyBps) return "on";
    return -bp === fenceBuyBps ? "fence" : "off";
  };
  const fence = fenceSellBps !== undefined && fenceBuyBps !== undefined;
  return (
    <figure className="wk-stack wk-stack-8 wk-spread">
      <CellGrid
        cols={cols}
        rows={1}
        kindAt={kindAt}
        delayAt={(col) => Math.abs(col - span) * 60}
        label={`Bid ${buyBps} bp under the mid, ask ${sellBps} bp over it${
          fence ? `, inside the ${fenceBuyBps} and ${fenceSellBps} bp terms` : ""
        }`}
      />
      <figcaption className="wk-cells-legend">
        <span>{`bid −${buyBps} bp`}</span>
        <span>mid</span>
        <span>{`ask +${sellBps} bp`}</span>
      </figcaption>
    </figure>
  );
}

// The Safe's ETH share, one square per percent (4 rows of 25). Sky is ETH, the gray dots
// are USDC, and the ink line is the stop: the desk sells no ETH at or below it.
export function InventoryCells({ shareBps, stopBps }: { shareBps: number; stopBps: number }) {
  const rows = 4;
  const cols = 25;
  const filled = Math.round(shareBps / 100);
  const stopX = (stopBps / 100 / rows) * STEP - (STEP - CELL) / 2 - 1;
  return (
    <CellGrid
      cols={cols}
      rows={rows}
      kindAt={(col, row) => (col * rows + row < filled ? "on" : "off")}
      delayAt={(col, row) => col * 24 + row * 12}
      label={`ETH is ${(shareBps / 100).toFixed(1)}% of the Safe; the stop is ${(stopBps / 100).toFixed(0)}%`}
      extra={<rect className="wk-cell-mark" x={stopX} y={-0} width={2} height={rows * STEP - (STEP - CELL)} />}
    />
  );
}

// What is left of the price window, one square per minute of the 10.
export function WindowCells({ secondsLeft, windowSeconds = 600 }: { secondsLeft: number; windowSeconds?: number }) {
  const cols = Math.round(windowSeconds / 60);
  const left = Math.max(0, Math.min(cols, Math.ceil(secondsLeft / 60)));
  return (
    <CellGrid
      cols={cols}
      rows={1}
      kindAt={(col) => (col < left ? "on" : "off")}
      delayAt={(col) => col * 40}
      label={`${left} of ${cols} minutes left in the price window`}
    />
  );
}
