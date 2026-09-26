import sepolia from "@config";

/** Client-name parent from config/sepolia.json, for example clients.dao-treasury-a.eth. */
export const CLIENT_SUFFIX: string = sepolia.ens.suffix;

/** The desk's own .eth name, the suffix with the clients label removed. */
export const DESK_ENS_NAME: string = CLIENT_SUFFIX.startsWith("clients.")
  ? CLIENT_SUFFIX.slice("clients.".length)
  : CLIENT_SUFFIX;

export function clientName(label: string): string {
  return `${label}.${CLIENT_SUFFIX}`;
}

export const AGENT_ENS_NAME = `risk.agents.${DESK_ENS_NAME}`;
