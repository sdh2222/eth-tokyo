import type { Address } from "viem";
import sepolia from "@config";
import { AGENT_ENS_NAME, DESK_ENS_NAME, clientName } from "./names";

/** Sepolia registry from config/sepolia.json. Reads only; the web does not register or edit names. */
export const ETH_REGISTRY = sepolia.ens.ethRegistry as Address;

export const DESK_LABEL = DESK_ENS_NAME.endsWith(".eth")
  ? DESK_ENS_NAME.slice(0, -".eth".length)
  : DESK_ENS_NAME;

export const CLIENT_NAMES = [clientName("mm-a"), clientName("mm-b"), clientName("mm-c")] as const;

export { AGENT_ENS_NAME };
