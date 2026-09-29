import { useState } from "react";
import { Link } from "react-router-dom";
import sepoliaConfig from "@config";
import { PROGRAM_HEX } from "../desk/fixture/program";
import type { DeskPort } from "../desk/port";
import type { DeskConfig, Hex, StrategyInfo } from "../desk/types";
import { useDeskPort, useLiveStrategy } from "../hooks/useDesk";
import { formatHash } from "../lib/format";
import { Card, Empty, Header, Page } from "../ui/v";

// Program (IA: "What exactly did the Safe sign?"). Vercel-style: plain English first, then the
// instruction table 7 and the raw bytes 5 (SC-23). Hovering an instruction row or its byte line
// keeps the pair in ink and dims the rest, so the two stay linked.

const liveMode = import.meta.env.VITE_DESK_MODE === "live";

// The facts every desk program fixes (docs/agent-design.md), shown when the port can't
// describe the bytes.
const PROGRAM_FACTS = [
  "Pair: WETH / USDC.",
  "Price: the oracle mid, with the taker's own desk.spread widths, else its desk.terms widths.",
  "The desk stops selling ETH at or below 70% ETH.",
  "A fill is allowed for 10 minutes (50 blocks) after each oracle update.",
  "Tokens stay in the Safe until a fill.",
];

// The live program in plain English (Controls lists the same lines).
export function programLines(port: DeskPort, strategy: StrategyInfo): string[] {
  const described = port.describeProgram(strategy.decoded, sepoliaConfig as DeskConfig);
  return described.length > 0 ? described : PROGRAM_FACTS;
}

const OPCODE_NAMES: Record<number, string> = {
  13: "Deadline",
  20: "Salt",
  34: "Name gate",
  35: "Price",
};

// Long args are shortened in the table; the raw bytes beside it have every byte.
const ARGS_SHOWN = 34;

type InstructionRow = { id: string; opcode: string; does: string; args: string; bytes: string };

// Every instruction in order: one opcode byte, one length byte, then the args.
// Only zero bytes after an instruction are the padding of the shipped order, not instructions.
function instructions(program: Hex): InstructionRow[] {
  const body = program.slice(2);
  const rows: InstructionRow[] = [];
  let i = 0;
  while (i + 4 <= body.length && !/^0+$/.test(body.slice(i))) {
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
        <Header title="Program" description="Reading the program…" />
      </Page>
    );
  }
  if (!strategy) {
    return (
      <Page>
        <Header title="Program" description="What the Safe signed and shipped to Aqua." />
        <Card>
          <Empty
            picture
            title="No desk is open"
            description="No program is shipped to Aqua. Opening a desk ships one in one Safe transaction."
            action={
              <Link className="v-btn" to="/open">
                Open a desk
              </Link>
            }
          />
        </Card>
      </Page>
    );
  }

  // Fixture strategies carry no bytes; the fixture program stands in for them.
  const program: Hex = liveMode || strategy.program !== "0x" ? strategy.program : PROGRAM_HEX;
  const lines = programLines(port, strategy);
  const rows = instructions(program);
  const byteCount = rows.reduce((sum, row) => sum + row.bytes.length / 2, 0);
  const block = strategy.shippedAt.block.toLocaleString("en-US");
  // The hovered pair stays in ink; every other row and line dims.
  const dim = (id: string) => (hovered !== null && hovered !== id ? "v-muted" : undefined);
  const hover = (id: string) => ({
    "data-active": hovered === id ? "true" : undefined,
    onMouseEnter: () => setHovered(id),
    onMouseLeave: () => setHovered(null),
  });

  return (
    <Page>
      <Header
        title="Program"
        description={
          <>
            <span className="v-mono" title={strategy.strategyHash}>
              {formatHash(strategy.strategyHash)}
            </span>
            {` · shipped in block ${block}`}
          </>
        }
        actions={
          <a
            className="v-btn v-btn-secondary"
            href={`${sepoliaConfig.explorer}/tx/${strategy.shippedAt.tx}`}
            target="_blank"
            rel="noreferrer"
          >
            Ship transaction
          </a>
        }
      />

      <Card title="In plain English" footer="On each fill the router reads the taker's own desk.spread, else that name's desk.terms.">
        <ol className="v-stack v-stack-8">
          {lines.map((line, index) => (
            <li key={line}>
              <span className="v-muted v-num">{`${index + 1}.`}</span> {line}
            </li>
          ))}
        </ol>
      </Card>

      <div className="v-grid">
        <Card className="v-col-7" title="Instructions" flush>
          {rows.length === 0 ? (
            <Empty title="No instructions" description="The program bytes are empty." />
          ) : (
            <div className="v-table-wrap">
              <table className="v-table">
                <thead>
                  <tr>
                    <th>Opcode</th>
                    <th>Sets</th>
                    <th>Args</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className={dim(row.id)} {...hover(row.id)}>
                      <td className="v-mono">{row.opcode}</td>
                      <td>{row.does}</td>
                      <td className="v-mono" title={row.args}>
                        {shortArgs(row.args)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="v-col-5" title="Raw bytes" actions={<span className="v-label v-num">{`${byteCount} bytes`}</span>}>
          <div className="v-code">
            {rows.map((row, index) => (
              <div key={row.id} className={dim(row.id)} {...hover(row.id)}>
                {index === 0 ? `0x${row.bytes}` : row.bytes}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Page>
  );
}
