import { fileURLToPath } from "node:url";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { filled } from "./chain.js";
import { loadConfig } from "./watch.js";

const NOT_ON_CHAIN = {
  ok: false,
  error: {
    code: "QUOTE_NOT_ON_CHAIN",
    title: "Quote is read from the contract",
    hint: "router, WETH, and USDC have to be set before a quote can be read.",
    severity: "config",
  },
};

export function validateQuote(body) {
  if (!body || typeof body !== "object") return fail(400, "BAD_QUOTE", "Quote body is missing.");
  if (body.side !== "buy" && body.side !== "sell") return fail(400, "BAD_QUOTE", "side is buy or sell.");
  if (body.leg !== "weth" && body.leg !== "usdc") return fail(400, "BAD_QUOTE", "leg is weth or usdc.");
  if (typeof body.amount !== "string" || !/^[0-9]+$/.test(body.amount) || body.amount === "0") {
    return fail(400, "BAD_QUOTE", "amount is a positive integer string.");
  }
  if (typeof body.mm !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(body.mm)) {
    return fail(400, "BAD_QUOTE", "mm is the connected market maker address.");
  }
  return { ok: true, value: { mm: body.mm, side: body.side, leg: body.leg, amount: body.amount } };
}

export async function quoteRequest(body, { configPath, quoteLive } = {}) {
  const checked = validateQuote(body);
  if (!checked.ok) return checked;
  const cfg = loadConfig(
    configPath ?? process.env.DESK_CONFIG ?? fileURLToPath(new URL("../../config/sepolia.json", import.meta.url)),
  );
  if (!filled(cfg.router) || !filled(cfg.tokens?.weth) || !filled(cfg.tokens?.usdc)) {
    return { status: 501, body: NOT_ON_CHAIN };
  }
  try {
    const result = await (quoteLive ?? liveQuote)(cfg, checked.value);
    return { status: result.ok ? 200 : 422, body: publicQuote(result) };
  } catch (error) {
    const missing = error && error.code === "ERR_MODULE_NOT_FOUND";
    return {
      status: 501,
      body: {
        ok: false,
        error: {
          code: missing ? "DESK_CLIENT_NOT_BUILT" : "QUOTE_FAILED",
          title: "Quote is read from the contract",
          hint: missing ? "Build the desk client before quoting." : "The router quote did not return a price.",
          severity: "config",
        },
      },
    };
  }
}

async function liveQuote(cfg, input) {
  const client = createPublicClient({
    chain: sepolia,
    transport: http(process.env.DESK_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com"),
  });
  const { findLiveStrategy } = await import("../../ts/src/lib/client/strategies.ts");
  const { quoteFor } = await import("../../ts/src/lib/client/quote.ts");
  const strategy = await findLiveStrategy({ client, cfg });
  if (!strategy) {
    return {
      ok: false,
      error: {
        code: "NO_LIVE_STRATEGY",
        title: "No desk is open",
        hint: "Ship a program before requesting a quote.",
        severity: "config",
        args: {},
      },
    };
  }
  const mm = cfg.mms.find((row) => row.address.toLowerCase() === input.mm.toLowerCase());
  return quoteFor({ client, cfg }, strategy, {
    mm: { name: mm?.name ?? "", address: input.mm },
    side: input.side,
    leg: input.leg,
    amount: BigInt(input.amount),
  });
}

function publicQuote(result) {
  if (!result.ok) return { ok: false, error: result.error };
  return {
    ok: true,
    amountIn: result.amountIn.toString(),
    amountOut: result.amountOut.toString(),
    priceWad: result.priceWad.toString(),
    spreadBps: result.sSellBps ?? result.spreadBps ?? 0,
    spreadSource: result.spreadSource ?? 0,
  };
}

function fail(status, code, hint) {
  return {
    ok: false,
    status,
    body: {
      ok: false,
      error: { code, title: "Quote is read from the contract", hint, severity: "user" },
    },
  };
}
