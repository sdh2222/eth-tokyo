import { useState } from "react";
import { Link } from "react-router-dom";
import sepoliaConfig from "@config";
import { PROGRAM_HEX } from "../desk/fixture/program";
import type { DeskConfig, Hex } from "../desk/types";
import { useDeskPort, useLiveStrategy } from "../hooks/useDesk";
import { formatHash } from "../lib/format";
import { Empty, Page, PageHead, Section, Window } from "../ui/plain";

// Program (IA: "What exactly did the Safe sign?"). Plain page kit.
// Screens SC-23: plain English 12 columns, the argument table 7 and the raw terminal 5.
// Hover on a byte segment highlights its row, and hover on a row highlights its segment.

const liveMode = import.meta.env.VITE_DESK_MODE === "live";

// The facts every desk program fixes (docs/agent-design.md), shown when the port can't
// describe the bytes.
const PROGRAM_FACTS = [
  "Pair: WETH / USDC.",
  "Price: the oracle mid, with the terms or agent widths on each side.",
  "The desk stops selling ETH at or below 70% ETH.",
  "A fill is allowed for 10 minutes (50 blocks) after each oracle update.",
  "Tokens stay in the Safe until a fill.",
];

const OPCODE_NAMES: Record<number, string> = {
  13: "Deadline",
  20: "Salt",
  34: "Name gate",
  35: "Price",
};

// Long args are shortened in the table; the raw terminal beside it has every byte.
const ARGS_SHOWN = 34;

type InstructionRow = { id: string; opcode: string; does: string; args: string; bytes: string };

// Every instruction in order: one opcode byte, one length byte, then the args.
function instructions(program: Hex): InstructionRow[] {
  const body = program.slice(2);
  const rows: InstructionRow[] = [];
  let i = 0;
  while (i + 4 <= body.length) {
    const opcode = Number.parseInt(body.slice(i, i + 2), 16);
    const len = Number.parseInt(body.slice(i + 2, i + 4), 16);
    const end = i + 4 + len * 2;
    rows.push({
      id: String(rows.length),
      opcode: `0x${body.slice(i, i + 2)}`,
      does: OPCODE_NAMES[opcode] ?? "—",
      args: `0x${body.slice(i + 4, end)}`,
      bytes: body.slice(i, end),
    });
    i = end;
  }
  return rows;
}

// Terminal rows: the label padded with no-break spaces so values line up in the mono face,
// and a long value wraps under it on a phone.
function pad(label: string): string {
  return label.padEnd(13, "\u00a0");
}

function shortArgs(args: string): string {
  return args.length > ARGS_SHOWN ? `${args.slice(0, 18)}…${args.slice(-12)}` : args;
}

export function ProgramPage() {
  const port = useDeskPort();
  const live = useLiveStrategy();
  const strategy = live.data ?? null;
  const [hovered, setHovered] = useState<string | null>(null);

  if (live.isLoading) {
    return (
      <Page>
        <PageHead title="Program" lede="Reading the program…" />
      </Page>
    );
  }
  if (!strategy) {
    return (
      <Page>
        <PageHead title="Program" lede="What the Safe signed and shipped to Aqua." />
        <Empty
          title="No program is live. The Safe has not shipped a desk program to Aqua."
          action={
            <Link className="wk-link" to="/open">
              Open a desk
            </Link>
          }
        />
      </Page>
    );
  }

  // Fixture strategies carry no bytes; the fixture program stands in for them.
  const program: Hex = liveMode || strategy.program !== "0x" ? strategy.program : PROGRAM_HEX;
  const described = port.describeProgram(strategy.decoded, sepoliaConfig as DeskConfig);
  const lines = described.length > 0 ? described : PROGRAM_FACTS;
  const rows = instructions(program);
  const explorer = sepoliaConfig.explorer;
  const byteCount = (program.length - 2) / 2;
  const hover = (id: string) => ({
    onMouseEnter: () => setHovered(id),
    onMouseLeave: () => setHovered(null),
  });

  return (
    <Page>
      <PageHead title="Program" lede="What the Safe signed and shipped to Aqua." />

      <div className="wk-grid">
        <Section title="In plain English" className="wk-span-12">
          <ol className="wk-list">
            {lines.map((line, index) => (
              <li key={line}>
                <span>
                  <span className="wk-label wk-num">{`${index + 1}.`}</span> {line}
                </span>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Instructions" className="wk-span-7">
          {rows.length === 0 ? (
            <Empty title="No instructions in this program. The program bytes are empty." />
          ) : (
            <div className="wk-table-wrap">
              <table className="wk-table">
                <thead>
                  <tr>
                    <th>Opcode</th>
                    <th>Sets</th>
                    <th>Args</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} data-selected={hovered === row.id} {...hover(row.id)}>
                      <td className="wk-num">{row.opcode}</td>
                      <td>{row.does}</td>
                      <td className="wk-num" title={row.args}>
                        {shortArgs(row.args)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Raw bytes" className="wk-span-5">
          <Window title="Program bytes" meta={`${byteCount} bytes`}>
            <span>0x</span>
            {rows.map((row) => (
              <span key={row.id} className={hovered === row.id ? "wk-mark" : undefined} {...hover(row.id)}>
                {row.bytes}
              </span>
            ))}
          </Window>
        </Section>

        <Section title="Signature" className="wk-span-12">
          <Window title="Signed by the Safe" meta="Sepolia">
            <div>{`${pad("STRATEGY HASH")} ${strategy.strategyHash}`}</div>
            <div>{`${pad("SHIPPED IN")} block ${strategy.shippedAt.block.toLocaleString("en-US")}`}</div>
            <div>
              {`${pad("SHIP TX")} `}
              <a href={`${explorer}/tx/${strategy.shippedAt.tx}`} target="_blank" rel="noreferrer">
                {formatHash(strategy.shippedAt.tx)}
              </a>
            </div>
          </Window>
        </Section>
      </div>
    </Page>
  );
}
