export const FOOTER =
  "Sepolia testnet · not audited · Powered by SwapVM — © Degensoft Ltd 2025 · Built on 1inch Aqua and ENSv2 (not affiliated)";

export const MARK = "Desk";

export const NETWORK_SEPOLIA = "Sepolia";
export const SWITCH_SEPOLIA = "Switch to Sepolia";
export const CONNECT_WALLET = "Connect wallet";
export const CONNECTED = "Connected";
export const CONTINUE = "Continue";
export const UPDATED = "updated";
export const CLOSES_IN = "closes in";

export const HERO_TITLE = "An OTC desk in your wallet.";
export const HERO_SUB =
  "A DAO treasury quotes its own two-sided price to market makers it names. Tokens stay in the multisig until each fill. The price is computed on-chain.";
export const OPEN_DEMO = "Open the live demo";
export const HOW_IT_WORKS = "How it works";
export const SEPOLIA_MICRO = "Sepolia testnet";
export const COMPARE_2PCT = "$323k";
export const COMPARE_10 = "$16k";
export const COMPARE_25 = "$40k";
export const PROBLEM = [
  "In 2023 ENS DAO sold 10,000 ETH in one trade with a 2% slippage budget ($323k).",
  "Each tranche would have needed its own vote.",
  "The DAO was a price taker on its own inventory.",
] as const;
export const STEPS = [
  "The Safe ships a pricing program to 1inch Aqua.",
  "Named market makers (ENS names) trade against it; the price shades toward a 70/30 target.",
  "Tokens move Safe ↔ MM only at fill time.",
] as const;
export const VERIFY_LINE = "Every fill can be recomputed from public data.";
export const NOT_OPEN = "Not open";
export const STRIP = {
  status: "Desk status",
  share: "ETH share vs 70% target",
  mid: "Oracle mid",
  fills: "Fills today",
} as const;

export const BANNER_NETWORK = "You're on the wrong network. The desk runs on Sepolia.";
export const BANNER_MULTI = "More than one desk program is live on this Safe.";
export const BANNER_NONE =
  "No desk is open. The treasury hasn't shipped a program yet, or it was stopped.";
export const BANNER_RPC = "Can't reach Sepolia right now. Showing the last data from";
export const BANNER_STALE = "The price feed is older than";
export const BANNER_STALE_TAIL = "minutes, so trading is paused.";
export const BANNER_CLOSES = "This desk closes in";
export const BANNER_OWNER = "Connect a Safe owner wallet to act as the treasury.";
export const GO_CONTROLS = "Go to Controls";
export const CONTROLS = "Controls";
export const RETRY = "Retry";
export const LEVEL_WORD = { danger: "Danger", warning: "Warning", info: "Info" } as const;

export const ROLE_LABEL = {
  treasury: "Treasury",
  mm: "Market maker",
  observer: "Observer",
} as const;

export const NAV_LABEL = {
  dashboard: "Dashboard",
  open: "Open a desk",
  counterparties: "Counterparties",
  trade: "Trade",
  controls: "Controls",
  fills: "Fills",
  program: "Program",
  agent: "Risk agent",
} as const;

export const PAGE = {
  landing: "Landing",
  dashboard: "Dashboard",
  open: "Open a desk",
  counterparties: "Counterparties",
  trade: "Trade",
  controls: "Controls",
  fills: "Fills",
  verify: "Verify a fill",
  program: "The program",
  agent: "Risk agent",
} as const;
