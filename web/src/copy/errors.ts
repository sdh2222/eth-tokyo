import { CLIENT_SUFFIX, DESK_ENS_NAME } from "../ens/names";

export type ErrorSeverity = "user" | "config" | "system";

export type ErrorCopy = {
  title: string;
  hint: string;
  severity: ErrorSeverity;
};

export const ERRORS: Record<string, ErrorCopy> = {
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
    hint: `Only names under ${CLIENT_SUFFIX} can trade.`,
    severity: "user",
  },
  EnsGateDeskMismatch: {
    title: "The desk's ENS name is not active",
    hint: `${DESK_ENS_NAME} has expired or points somewhere else. The treasury must renew it.`,
    severity: "config",
  },
  EnsGateClientsMismatch: {
    title: "The client list is not active",
    hint: `${CLIENT_SUFFIX} has expired or was relinked. The treasury must renew it.`,
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
    hint: "Trading pauses when the price is older than the limit. It resumes on the next update.",
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
  DeskPriceCapExceeded: {
    title: "Over your cap per fill",
    hint: "Your cap is {cap} USDC per fill. Split the trade.",
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
    hint: "—",
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
  ERC20InsufficientAllowance: {
    title: "Approve the router first",
    hint: 'Click "Approve router" once.',
    severity: "user",
  },
  ERC20InsufficientBalance: {
    title: "Not enough tokens in your wallet",
    hint: "Top up your wallet or trade less.",
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
  WRONG_NETWORK: {
    title: "Wrong network",
    hint: "The desk runs on Sepolia.",
    severity: "user",
  },
  NOT_SAFE_OWNER: {
    title: "Connect a Safe owner",
    hint: "Only the treasury's owners can do this.",
    severity: "user",
  },
  SAME_OWNER: {
    title: "That owner has already signed",
    hint: "Switch to another Safe owner.",
    severity: "user",
  },
  NO_LIVE_STRATEGY: {
    title: "No desk is open",
    hint: "The treasury hasn't opened one yet.",
    severity: "user",
  },
  MULTIPLE_LIVE: {
    title: "More than one desk program is live",
    hint: "Close all but the newest from Controls.",
    severity: "config",
  },
  INVALID_POLICY: {
    title: "Check the highlighted setting",
    hint: "(the field's own message)",
    severity: "user",
  },
  QUOTE_EXPIRED: {
    title: "Quote expired",
    hint: "Refresh the quote.",
    severity: "user",
  },
  USER_REJECTED: {
    title: "Cancelled",
    hint: "",
    severity: "user",
  },
  RPC_UNAVAILABLE: {
    title: "Can't reach Sepolia",
    hint: "Retrying. Showing the last data we had.",
    severity: "system",
  },
  UNKNOWN: {
    title: "Something went wrong",
    hint: "Show details for the raw error.",
    severity: "system",
  },
};

export function fillHint(hint: string, args: Record<string, string>): string {
  return hint.replace(/\{(\w+)\}/g, (token, key: string) => {
    const value = args[key];
    return value === undefined ? token : value;
  });
}
