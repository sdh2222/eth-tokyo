import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

import { readFills } from "../lib/client/fills.js";
import type { DeskCtx } from "../lib/client/ctx.js";
import { loadEnv } from "../scripts/_common/env.js";
import { loadDeskConfig } from "./fill.js";
import { recordFill } from "./react.js";

const KEPT = 100;

export type KeeperCursor = {
  router: string;
  block: bigint;
  done: string[];
};

/** Remember one DeskFill and keep the cursor on the newest block already scanned. */
export function noteFill(
  cursor: KeeperCursor,
  hash: string,
  block: bigint,
): KeeperCursor {
  const key = hash.toLowerCase();
  const done = cursor.done.map((item) => item.toLowerCase());
  if (!done.includes(key)) done.push(key);
  return {
    router: cursor.router,
    block: block > cursor.block ? block : cursor.block,
    done: done.slice(-KEPT),
  };
}

function cursorPath(): string {
  return join(homedir(), ".aqua-eth-tokyo", "keeper.json");
}

function readCursor(router: string): KeeperCursor | null {
  try {
    const parsed = JSON.parse(readFileSync(cursorPath(), "utf8")) as {
      router?: unknown;
      block?: unknown;
      done?: unknown;
    };
    if (
      typeof parsed.router !== "string" ||
      parsed.router.toLowerCase() !== router.toLowerCase()
    ) {
      return null;
    }
    if (typeof parsed.block !== "string" && typeof parsed.block !== "number")
      return null;
    const done = Array.isArray(parsed.done)
      ? parsed.done.filter((item): item is string => typeof item === "string")
      : [];
    return { router, block: BigInt(parsed.block), done };
  } catch {
    return null;
  }
}

function writeCursor(cursor: KeeperCursor): void {
  const path = cursorPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        router: cursor.router,
        block: cursor.block.toString(),
        done: cursor.done,
      },
      null,
      2,
    )}\n`,
  );
}

/**
 * Stays up and scans DeskFill from the saved cursor.
 * The first start begins at the current block. A restart continues from the cursor file.
 */
export async function runKeeper(rpc: string): Promise<never> {
  loadEnv();
  const cfg = loadDeskConfig();
  if (cfg.router === "") throw new Error("router is unset");
  const client = createPublicClient({ chain: sepolia, transport: http(rpc) });
  const ctx: DeskCtx = { client, cfg };
  let cursor = readCursor(cfg.router);
  if (!cursor) {
    const head = await client.getBlockNumber();
    cursor = { router: cfg.router, block: head, done: [] };
    writeCursor(cursor);
  }
  console.log(
    `keeper watching DeskFill on ${cfg.router} from block ${cursor.block}`,
  );
  for (;;) {
    try {
      const fills = await readFills(ctx, undefined, cursor.block);
      for (const fill of [...fills].reverse()) {
        const hash = fill.transactionHash.toLowerCase();
        if (cursor.done.includes(hash)) continue;
        await recordFill(rpc, fill);
        cursor = noteFill(cursor, hash, fill.blockNumber);
        writeCursor(cursor);
      }
      const head = await client.getBlockNumber();
      if (head > cursor.block) {
        cursor = { ...cursor, block: head };
        writeCursor(cursor);
      }
    } catch (err) {
      console.log(err instanceof Error ? err.message : String(err));
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
}
