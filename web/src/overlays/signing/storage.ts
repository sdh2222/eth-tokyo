const PREFIX = "desk.safeSig.";
const TTL = 30 * 60 * 1000;

export type StoredSig = { owner: string; sig: string; at: number };

export function saveSig(safeTxHash: string, value: StoredSig) {
  localStorage.setItem(PREFIX + safeTxHash, JSON.stringify(value));
}

export function readSig(safeTxHash: string, now = Date.now()): StoredSig | null {
  const raw = localStorage.getItem(PREFIX + safeTxHash);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as StoredSig;
  if (now - parsed.at > TTL) {
    localStorage.removeItem(PREFIX + safeTxHash);
    return null;
  }
  return parsed;
}

export function clearSig(safeTxHash: string) {
  localStorage.removeItem(PREFIX + safeTxHash);
}
