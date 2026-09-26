import { type JevTier, type Tier } from "./counterparty.js";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const MODEL = "jev-1.13.0";

const questions = {
  tier: {
    type: "choice",
    instructions: "Which spread tier fits the counterparty who just filled?",
    criteria: {
      tight: "The name is live and the filled size is 1 ETH or less.",
      standard: "The name is live and the filled size is 10 ETH or less.",
      fence: "The filled size is above 10 ETH, or the name is not live.",
    },
  },
} as const;

function isTier(value: unknown): value is Tier {
  return value === "tight" || value === "standard" || value === "fence";
}

/** Reads a Jev choice answer. Anything else is not a tier. */
export function parseJevTier(body: unknown): JevTier | null {
  if (body === null || typeof body !== "object") return null;
  const answers = (body as { answers?: unknown }).answers;
  if (answers === null || typeof answers !== "object") return null;
  const tier = (answers as { tier?: unknown }).tier;
  if (tier === null || typeof tier !== "object") return null;
  const choice = (tier as { choice?: unknown }).choice;
  const confidence = (tier as { confidence?: unknown }).confidence;
  if (!isTier(choice) || typeof confidence !== "number") return null;
  if (confidence < 0 || confidence > 1) return null;
  return { tier: choice, confidence };
}

/**
 * One Jev decision. A failed call returns null so the caller keeps the local tier.
 * The key and the raw response are not logged.
 */
export async function askJev(
  key: string,
  state: string,
  fetchImpl: typeof fetch = fetch,
): Promise<JevTier | null> {
  if (key.trim() === "") return null;
  try {
    const response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, state, questions }),
    });
    if (!response.ok) return null;
    return parseJevTier(await response.json());
  } catch {
    return null;
  }
}
