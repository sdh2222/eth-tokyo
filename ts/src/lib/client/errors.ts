import { decodeErrorResult, keccak256, toBytes, type Hex } from "viem";

import type { DeskError } from "./ctx.js";

const rows: Record<string, Omit<DeskError, "code" | "args">> = {
  EnsGateInvalidArgs: {
    title: "The desk program is misconfigured",
    hint: "The gate's settings in the program are invalid. The treasury must reopen the desk.",
    severity: "config",
  },
  EnsGateMissingName: {
    title: "No name was sent",
    hint: "Trade from the Trade page, which sends your ENS name with the order.",
    severity: "system",
  },
  EnsGateNameNotUnderDesk: {
    title: "That name isn't one of the desk's clients",
    hint: "Only names under clients.desk.eth can trade.",
    severity: "user",
  },
  EnsGateDeskMismatch: {
    title: "The desk's ENS name is not active",
    hint: "desk.eth has expired or points somewhere else. The treasury must renew it.",
    severity: "config",
  },
  EnsGateClientsMismatch: {
    title: "The client list is not active",
    hint: "clients.desk.eth has expired or was relinked. The treasury must renew it.",
    severity: "config",
  },
  EnsGateNameExpired: {
    title: "Your name has expired",
    hint: "Ask the treasury to renew your name to trade again.",
    severity: "user",
  },
  EnsGateWrongResolver: {
    title: "Your name isn't set up for the desk",
    hint: "Its resolver must be the treasury's resolver. Ask the treasury.",
    severity: "config",
  },
  EnsGateTakerMismatch: {
    title: "This wallet isn't on the desk's list",
    hint: "Only the address in a client name's ENS record can trade under that name.",
    severity: "user",
  },
  DeskPriceInvalidArgs: {
    title: "The desk program is misconfigured",
    hint: "The pricing settings in the program are invalid. The treasury must reopen the desk.",
    severity: "config",
  },
  DeskPriceMissingName: {
    title: "No name was sent",
    hint: "Trade from the Trade page.",
    severity: "system",
  },
  DeskPriceUnsupportedPair: {
    title: "This desk only trades WETH/USDC",
    hint: "Choose WETH and USDC.",
    severity: "user",
  },
  DeskPriceRecomputeDetected: {
    title: "Internal pricing error",
    hint: "Please report this with the transaction data.",
    severity: "system",
  },
  DeskPriceOracleInvalid: {
    title: "The price feed returned an invalid price",
    hint: "Trading is paused until the feed recovers.",
    severity: "user",
  },
  DeskPriceOracleStale: {
    title: "The price feed is too old",
    hint: "Trading is open for 10 minutes after an oracle update.",
    severity: "user",
  },
  DeskPriceInvalidRecords: {
    title: "Couldn't read your terms",
    hint: "The resolver returned something unexpected. Ask the treasury.",
    severity: "config",
  },
  DeskPriceNoTerms: {
    title: "You have no trading terms",
    hint: "Your name has no terms, or its cap is zero. Ask the treasury.",
    severity: "user",
  },
  DeskPriceEmptyBook: {
    title: "The desk is empty",
    hint: "The treasury has nothing committed to the desk.",
    severity: "config",
  },
  DeskPriceSizeTooLarge: {
    title: "Too large for this desk",
    hint: "This size is too big relative to the desk. Try a smaller amount.",
    severity: "user",
  },
  DeskPriceTargetReached: {
    title: "The desk has reached its ETH target",
    hint: "A sale of ETH stops at the target share. A purchase of ETH still fills.",
    severity: "user",
  },
  DeskPriceCapExceeded: {
    title: "Over your cap per fill",
    hint: "Your cap is {cap} WETH per fill. Split the trade.",
    severity: "user",
  },
  DeskPriceInsufficientInventory: {
    title: "Not enough inventory",
    hint: "The desk holds only {balanceOut}. Try a smaller amount.",
    severity: "user",
  },
  DeadlineReached: {
    title: "This desk has closed",
    hint: "The program's end date has passed. The treasury can open a new desk.",
    severity: "user",
  },
  TakerTraitsDeadlineExpired: {
    title: "Your order expired",
    hint: "Get a fresh quote and fill again.",
    severity: "user",
  },
  TakerTraitsInsufficientMinOutputAmount: {
    title: "Price moved beyond your slippage",
    hint: "Refresh the quote, or raise the slippage setting.",
    severity: "user",
  },
  TakerTraitsExceedingMaxInputAmount: {
    title: "Price moved beyond your slippage",
    hint: "Refresh the quote, or raise the slippage setting.",
    severity: "user",
  },
  TakerTraitsAmountOutMustBeGreaterThanZero: {
    title: "Amount too small",
    hint: "This amount rounds to zero. Enter a larger amount.",
    severity: "user",
  },
  MakerTraitsZeroAmountInNotAllowed: {
    title: "Amount too small",
    hint: "Enter a larger amount.",
    severity: "user",
  },
  MakerTraitsTokenInAndTokenOutMustBeDifferent: {
    title: "Choose two different tokens",
    hint: "(none)",
    severity: "system",
  },
  TakerTraitsTakerAmountInMismatch: {
    title: "Internal order error",
    hint: "Please report this with the transaction data.",
    severity: "system",
  },
  TakerTraitsTakerAmountOutMismatch: {
    title: "Internal order error",
    hint: "Please report this with the transaction data.",
    severity: "system",
  },
  AquaBalanceInsufficientAfterTakerPush: {
    title: "Settlement failed",
    hint: "Please report this with the transaction data.",
    severity: "system",
  },
  SafeBalancesForTokenNotInActiveStrategy: {
    title: "No desk is open",
    hint: "The treasury stopped the desk or hasn't opened one.",
    severity: "user",
  },
  StrategiesMustBeImmutable: {
    title: "This exact program was already shipped",
    hint: "A program can't be shipped twice. Change the salt or a setting.",
    severity: "config",
  },
  DockingShouldCloseAllTokens: {
    title: "This desk is already stopped",
    hint: "Nothing to stop.",
    severity: "config",
  },
  PushToNonActiveStrategyPrevented: {
    title: "No desk is open",
    hint: "The desk was stopped during your trade.",
    severity: "user",
  },
  SafeERC20FailedOperation: {
    title: "Token transfer failed",
    hint: "Please report this with the transaction data.",
    severity: "system",
  },
  EACUnauthorizedAccountRoles: {
    title: "Not allowed",
    hint: "This account doesn't hold the role for that record.",
    severity: "user",
  },
  LabelExpired: {
    title: "That name has expired",
    hint: "Renew it first.",
    severity: "user",
  },
  INVALID_POLICY: {
    title: "Check the highlighted setting",
    hint: "(the field's own message)",
    severity: "user",
  },
  UNKNOWN: {
    title: "Something went wrong",
    hint: "Show details for the raw error.",
    severity: "system",
  },
};

const abi = [
  {
    type: "error",
    name: "DeskPriceOracleStale",
    inputs: [
      { name: "updatedAt", type: "uint256" },
      { name: "maxAge", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "EnsGateTakerMismatch",
    inputs: [
      { name: "expected", type: "address" },
      { name: "taker", type: "address" },
    ],
  },
  {
    type: "error",
    name: "DeskPriceCapExceeded",
    inputs: [{ name: "cap", type: "uint256" }],
  },
  {
    type: "error",
    name: "DeskPriceTargetReached",
    inputs: [
      { name: "wWad", type: "uint256" },
      { name: "wStarWad", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "DeskPriceOracleStale",
    inputs: [
      { name: "updatedAt", type: "uint256" },
      { name: "maxAge", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "DeskPriceInsufficientInventory",
    inputs: [
      { name: "amountOut", type: "uint256" },
      { name: "balanceOut", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "DeskPriceSizeTooLarge",
    inputs: [{ name: "floorBps", type: "uint256" }],
  },
  {
    type: "error",
    name: "ERC20InsufficientAllowance",
    inputs: [
      { name: "spender", type: "address" },
      { name: "allowance", type: "uint256" },
      { name: "needed", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "ERC20InsufficientBalance",
    inputs: [
      { name: "sender", type: "address" },
      { name: "balance", type: "uint256" },
      { name: "needed", type: "uint256" },
    ],
  },
  ...Object.keys(rows)
    .filter((name) => !name.includes("_") && name[0] === name[0]?.toUpperCase())
    .filter(
      (name) =>
        ![
          "EnsGateTakerMismatch",
          "DeskPriceCapExceeded",
          "DeskPriceInsufficientInventory",
          "DeskPriceSizeTooLarge",
          "DeskPriceTargetReached",
          "DeskPriceOracleStale",
        ].includes(name),
    )
    .map((name) => ({ type: "error" as const, name, inputs: [] })),
] as const;

function fill(hint: string, args: Record<string, unknown>): string {
  return hint
    .replaceAll("{cap}", String(args.cap ?? ""))
    .replaceAll("{balanceOut}", String(args.balanceOut ?? ""));
}

export function decodeDeskError(e: unknown): DeskError {
  const data = errorData(e);
  if (data) {
    const selector = data.slice(0, 10);
    for (const name of Object.keys(rows)) {
      if (name === "UNKNOWN" || name.includes("_")) continue;
      if (selector === keccak256(toBytes(`${name}()`)).slice(0, 10)) {
        const row = rows[name];
        return {
          code: name,
          args: {},
          title: row.title,
          hint: row.hint,
          severity: row.severity,
        };
      }
    }
    try {
      const decoded = decodeErrorResult({ abi, data });
      const args = Object.fromEntries(
        decoded.args.map((value, i) => [
          decoded.abiItem.inputs[i]?.name ?? String(i),
          value,
        ]),
      );
      if (decoded.errorName === "ERC20InsufficientAllowance") {
        return allowanceOrBalance("allowance", args);
      }
      if (decoded.errorName === "ERC20InsufficientBalance") {
        return allowanceOrBalance("balance", args);
      }
      const row = rows[decoded.errorName] ?? rows.UNKNOWN;
      return {
        code: decoded.errorName,
        args,
        title: row.title,
        hint: fill(row.hint, args),
        severity: row.severity,
      };
    } catch {
      return { code: "UNKNOWN", args: { data }, ...rows.UNKNOWN };
    }
  }
  if (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    typeof e.code === "string" &&
    e.code in rows
  ) {
    const row = rows[e.code];
    return {
      code: e.code,
      args: {},
      title: row.title,
      hint: row.hint,
      severity: row.severity,
    };
  }
  return { code: "UNKNOWN", args: { raw: String(e) }, ...rows.UNKNOWN };
}

function allowanceOrBalance(
  kind: "allowance" | "balance",
  args: Record<string, unknown>,
): DeskError {
  if (kind === "allowance") {
    return {
      code: "ERC20InsufficientAllowance",
      args,
      title: "Approve the router first",
      hint: 'Click "Approve router" once.',
      severity: "user",
    };
  }
  return {
    code: "ERC20InsufficientBalance",
    args,
    title: "Not enough tokens in your wallet",
    hint: "Top up your wallet or trade less.",
    severity: "user",
  };
}

function errorData(e: unknown): Hex | undefined {
  if (typeof e !== "object" || e === null) return undefined;
  if ("data" in e && typeof e.data === "string" && e.data.startsWith("0x"))
    return e.data as Hex;
  if ("cause" in e) return errorData(e.cause);
  return undefined;
}
