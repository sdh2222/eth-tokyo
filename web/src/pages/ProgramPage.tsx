import { Card } from "@astryxdesign/core/Card";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Table, proportional } from "@astryxdesign/core/Table";
import type { TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import sepoliaConfig from "@config";
import { PROGRAM_HEX } from "../desk/fixture/program";
import type { DeskConfig, Hex } from "../desk/types";
import { useDeskPort, useLiveStrategy } from "../hooks/useDesk";
import { formatHash } from "../lib/format";

// Program (IA: "What exactly did the Safe sign?").
// Same frame as DeskPage (the Astryx `dashboard` template): Heading 1 + secondary Text, then
// Cards with Heading 4 titles. Instructions Table from `TableRichCellTable`, raw bytes from
// `CodeBlockJSONConfig`, the signature from `MetadataListItemShowcase`.

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

type InstructionRow = { id: string; opcode: string; does: string; args: string };

const instructionColumns: TableColumn<InstructionRow>[] = [
  { key: "opcode", header: "Opcode", width: proportional(1) },
  { key: "does", header: "Sets", width: proportional(2) },
  { key: "args", header: "Args", width: proportional(5) },
];

// Every instruction in order: one opcode byte, one length byte, then the args.
function instructions(program: Hex): InstructionRow[] {
  const body = program.slice(2);
  const rows: InstructionRow[] = [];
  let i = 0;
  while (i + 4 <= body.length) {
    const opcode = Number.parseInt(body.slice(i, i + 2), 16);
    const len = Number.parseInt(body.slice(i + 2, i + 4), 16);
    rows.push({
      id: String(rows.length),
      opcode: `0x${body.slice(i, i + 2)}`,
      does: OPCODE_NAMES[opcode] ?? "—",
      args: `0x${body.slice(i + 4, i + 4 + len * 2)}`,
    });
    i += 4 + len * 2;
  }
  return rows;
}

export function ProgramPage() {
  const port = useDeskPort();
  const live = useLiveStrategy();
  const strategy = live.data ?? null;

  if (live.isLoading) return <Text type="body">Reading the program…</Text>;
  if (!strategy) {
    return (
      <EmptyState
        title="No program is live"
        description="The Safe has not shipped a desk program to Aqua."
        actions={<Link href="/open">Open a desk</Link>}
      />
    );
  }

  // Fixture strategies carry no bytes; the fixture program stands in for them.
  const program: Hex = liveMode || strategy.program !== "0x" ? strategy.program : PROGRAM_HEX;
  const described = port.describeProgram(strategy.decoded, sepoliaConfig as DeskConfig);
  const lines = described.length > 0 ? described : PROGRAM_FACTS;
  const rows = instructions(program);
  const explorer = sepoliaConfig.explorer;

  return (
    <VStack gap={6}>
      <VStack gap={2}>
        <Heading level={1}>Program</Heading>
        <Text type="body" color="secondary">
          What the Safe signed and shipped to Aqua.
        </Text>
      </VStack>

      <Card>
        <VStack gap={4}>
          <Heading level={4}>In plain English</Heading>
          <List listStyle="decimal" hasDividers>
            {lines.map((line) => (
              <ListItem key={line} label={line} />
            ))}
          </List>
        </VStack>
      </Card>

      <Card>
        <VStack gap={4}>
          <Heading level={4}>Instructions</Heading>
          <Table<InstructionRow>
            data={rows}
            columns={instructionColumns}
            idKey="id"
            density="compact"
            dividers="rows"
            textOverflow="truncate"
            emptyState={
              <EmptyState
                isCompact
                title="No instructions in this program"
                description="The program bytes are empty."
              />
            }
          />
          <CodeBlock
            code={program}
            language="plaintext"
            title={`Program bytes (${(program.length - 2) / 2} bytes)`}
            isWrapped
            width="100%"
            maxHeight={240}
          />
        </VStack>
      </Card>

      <Card>
        <VStack gap={4}>
          <Heading level={4}>Signature</Heading>
          <MetadataList>
            <MetadataListItem label="Strategy hash">{formatHash(strategy.strategyHash)}</MetadataListItem>
            <MetadataListItem label="Shipped in">{`Block ${strategy.shippedAt.block.toLocaleString("en-US")}`}</MetadataListItem>
            <MetadataListItem label="Ship transaction">
              <Link href={`${explorer}/tx/${strategy.shippedAt.tx}`} isExternalLink>
                {formatHash(strategy.shippedAt.tx)}
              </Link>
            </MetadataListItem>
          </MetadataList>
        </VStack>
      </Card>
    </VStack>
  );
}
