export const FOOTER =
  "Sepolia testnet · not audited · Powered by SwapVM — © Degensoft Ltd 2025 · Built on 1inch Aqua and ENSv2 (not affiliated)";

export const MARK = "Desk";

export const NETWORK_SEPOLIA = "Sepolia";
export const SWITCH_SEPOLIA = "Switch to Sepolia";
export const CONNECT_WALLET = "Connect wallet";
export const CONNECTED = "Connected";
export const CONTINUE = "Continue";

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
