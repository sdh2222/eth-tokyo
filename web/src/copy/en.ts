import { AGENT_ENS_NAME, CLIENT_SUFFIX } from "../ens/names";

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
export const TRADING_AS = "Trading as";
export const PER_FILL = "per fill";
export const NOT_ON_LIST =
  "This wallet isn't on the desk's list. You can still ask for a quote to see the desk refuse it.";
export const BUY_ETH = "Buy ETH";
export const SELL_ETH = "Sell ETH";
export const SLIPPAGE = "Slippage";
export const TOO_MANY_DECIMALS = "Too many decimal places";
export const ENTER_AMOUNT = "Enter an amount";
export const YOU_PAY = "You pay";
export const YOU_RECEIVE = "You receive";
export const CHECKED = "Checked against the on-chain formula";
export const REFRESH_QUOTE = "Refresh quote";
export const APPROVE_ROUTER = "Approve router";
export const FILL = "Fill";
export const CANCELLED = "Cancelled";
export const APPROVE_COPY = "This approves the router to move your tokens for fills.";
export const FILL_COPY = "This fills your quote. Tokens move between your wallet and the Safe.";
export const VERIFY_FILL = "Verify this fill";
export const COPY_SAFE = "Copy transaction for Safe{Wallet}";
export const OPEN_STEPS = ["Treasury", "Market", "Policy", "Inventory", "Counterparties", "Review"] as const;
export const BACK = "Back";
export const PAIR = "WETH / USDC";
export const FEED_NOTE = "The desk prices off this feed. If it is older than the limit you set, trading pauses.";
export const ALREADY_OPEN = "A desk is already open. Change it from Controls.";
export const SAFE_HOLDS = "The Safe holds only";
export const ENS_LIST = "The list lives in ENS, not in this program. You can change it later without reopening the desk.";
export const NO_TOKENS_NOW = "No tokens move now. They leave the Safe only when a named market maker fills.";
export const PROPOSE = "Propose to Safe";
export const DESK_LIVE = "Your desk is live.";
export const GO_DASHBOARD = "Go to dashboard";
export const CHECK_SETTING = "Check the highlighted setting";
export const TARGET_LABEL = "Target ETH share";
export const TARGET_HELP = "How much of the desk should stay in ETH.";
export const KAPPA_HELP = "how hard the price leans toward the target";
export const RANGE_HELP = "the agent can only move spreads inside this range";
export const CHANGE_NOTE = "A shipped program can't be edited. Changing it closes the old one and opens a new one in the same transaction.";
export const STOP_COPY = "Market makers will not be able to trade until you open a new desk. Tokens stay in the Safe.";
export const STOP = "Stop the desk";
export const CLOSE_EXCEPT = "Close all except the newest";
export const SEED_TWO = "Seed two desks";
export const TERMS_ENS = "Terms are managed by the ENS lane.";
export const CP_HELP = `Each market maker is a name under ${CLIENT_SUFFIX}. Its address, tier and cap live in its ENS records; the desk reads them at every fill. When the name expires, it can no longer trade.`;
export const ENS_UNAVAILABLE = "ENS records could not be read from Sepolia.";
export const AGENT_HELP = "The agent can only change one number per market maker, inside the range the treasury set. It can't block trading.";
export const AGENT_NAME = AGENT_ENS_NAME;
export const DEPLOYER_NOTE = "Connect the deployer wallet to move the price.";
export const ORACLE_MOVE_NOTE = "The deployer wallet calls MockOracle.setAnswer. This screen reads the new mid.";
export const STALE_NOTE = "The deployer calls MockOracle.setUpdatedAt";
export const ANYONE = "Anyone can do this: the event carries every input.";
export const NO_FILL = "No fill with that hash.";
export const MATCHES = "matches on-chain";
export const RECOMPUTED = "Recomputed";
export const NO_MATCH = "Does not match";
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

export const LANDING = {
  how: "How it works",
  open: "Open the app",
  headline: "Making Treasury Asset Disposal Inefficiency Solved",
  via: "via 1inch Aqua & ENSv2",
  compare: {
    label: "Today, and with watermark",
    title: "Why do treasuries DUMP everything at once? Why not DCA? TWAP?",
    today: "Today",
    ours: "With watermark",
    rows: {
      when: { label: "How it sells", today: "All at once", ours: "Small fills, over time" },
      signatures: { label: "Signatures", today: "One per slice", ours: "One, to ship the desk" },
      price: { label: "Who sets the price", today: "The solver", ours: "The DAO" },
    },
    leak: "And whoever takes that dump, a solver or a pool, eats the DAO's spread.",
    notes: [
      {
        kicker: "Why all at once",
        body: "A treasury sale runs through a multisig. Splitting it into slices means a proposal, signatures and a fresh price for every slice, so the whole amount usually goes out in one trade.",
      },
      {
        kicker: "Why it costs",
        body: "A pool charges slippage on size. A solver quotes a price that already holds what it can extract from the order. The treasury is large, and it is still the taker.",
      },
      {
        kicker: "What watermark changes",
        body: "The Safe signs one SwapVM program and one 1inch Aqua order. Takers then fill small amounts on the DAO's own price, and each fill pulls tokens from the Safe only at that moment.",
      },
    ],
  },
  gate: {
    label: "Named takers",
    title: "Once the DAO quotes a price, who gets to take it?",
    open: "Anyone can take it",
    named: "Only named takers",
    caption: "Every fill reads the taker's ENS name. No name, no fill.",
    notes: [
      {
        kicker: "An open quote",
        body: "An Aqua order that anyone can fill is a free option. When the market moves, the fastest bot takes the DAO's price before the DAO can change it.",
      },
      {
        kicker: "A name per taker",
        body: "Each counterparty is a name under the desk's clients name. At every fill the router reads it: the name must point to the taker's wallet, it must not have expired, and it must carry the DAO's terms.",
      },
      {
        kicker: "Terms on the name",
        body: "desk.terms on each name holds the sell width, the buy width and the cap. Changing them, or letting a name expire, changes who can fill. The program and the Aqua order stay as they are.",
      },
    ],
    raw: "desk.terms · mm-a",
  },
} as const;
