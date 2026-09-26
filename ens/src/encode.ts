import {
  concat,
  decodeAbiParameters,
  encodeAbiParameters,
  hexToBigInt,
  keccak256,
  labelhash,
  stringToBytes,
  toHex,
  type Hex,
} from 'viem'

// Record keys. The router reads desk.terms (since #21, not desk.spread); people read the text ones.
export const KEY_TERMS = 'desk.terms'
export const KEY_SPREAD = 'desk.spread'
export const KEY_STATS = 'desk.stats'
export const KEY_DEPLOYMENT = 'desk.deployment'

export const COIN_TYPE_ETH = 60n
export const RECORD_VERSION = 1

/**
 * DNS wire format, which every ENSv2 setter and resolve() takes as `name`.
 * "mm-a.clients.desk.eth" -> 0x04 'mm-a' 0x07 'clients' 0x04 'desk' 0x03 'eth' 0x00. "" is the root (0x00).
 * The router compares this against the pinned suffix byte-for-byte, so it must stay canonical.
 */
export function dnsEncode(name: string): Hex {
  if (name === '' || name === '.') return '0x00'
  const parts: Uint8Array[] = []
  for (const label of name.split('.')) {
    const bytes = stringToBytes(label)
    if (bytes.length === 0 || bytes.length > 255) throw new Error(`invalid label "${label}" in "${name}"`)
    parts.push(Uint8Array.of(bytes.length), bytes)
  }
  parts.push(Uint8Array.of(0))
  return toHex(concat(parts))
}

/** The dnsName part of takerData. Per desk-system §5.3, takerData is `uint8 len ‖ dnsName`. */
export const encodeTakerName = dnsEncode

/** Registry calls take `anyId`; the labelhash works for every one of them. */
export const labelId = (label: string) => BigInt(labelhash(label))

/** EAC resource for a string argument, as PermissionedResolverLib.resource(string). */
export const keyResource = (key: string) => BigInt(keccak256(stringToBytes(key)))

// Record formats. abi.encode, so each value is a whole number of 32-byte words.
// desk.terms  = abi.encode(uint8 1, uint16 sSellBps, uint16 sBuyBps, uint128 cap)  — 128 bytes, Safe only (main #21).
//               cap is in WETH base units (18 dp): DeskPrice reverts DeskPriceCapExceeded when a fill's WETH leg is above it.
// desk.spread = abi.encode(uint8 1, uint16 spreadBps, uint64 validUntil)  — 96 bytes, risk agent only.
//               The router does not read it since #21; the agent's delegation and this format stay.
const TERMS = [{ type: 'uint8' }, { type: 'uint16' }, { type: 'uint16' }, { type: 'uint128' }] as const
const SPREAD = [{ type: 'uint8' }, { type: 'uint16' }, { type: 'uint64' }] as const
const TERMS_BYTES = 128
const SPREAD_BYTES = 96
const UINT128_MAX = (1n << 128n) - 1n

export type Terms = { version: number; sSellBps: number; sBuyBps: number; cap: bigint }
export type Spread = { version: number; spreadBps: number; validUntil: bigint }

export const encodeTerms = (t: { sSellBps: number; sBuyBps: number; cap: bigint }) =>
  encodeAbiParameters(TERMS, [RECORD_VERSION, t.sSellBps, t.sBuyBps, t.cap])

export const encodeSpread = (s: { spreadBps: number; validUntil: bigint }) =>
  encodeAbiParameters(SPREAD, [RECORD_VERSION, s.spreadBps, s.validUntil])

const byteLength = (value: Hex) => (value.length - 2) / 2

/** The i-th 32-byte word of value, as DeskPrice's _word reads it. */
const word = (value: Hex, i: number) => hexToBigInt(`0x${value.slice(2 + i * 64, 2 + (i + 1) * 64)}`)

export type TermsCheck = {
  /** Every field, when the value is 128 bytes and each word fits its field. Filled even when the router rejects it. */
  terms: Terms | null
  /** Whether DeskPrice._records accepts the value. */
  valid: boolean
  /** The first rule the value breaks, in the router's order, or null when valid. */
  reason: string | null
}

/**
 * desk.terms as DeskPrice._records (contracts/src/instructions/DeskPrice.sol) judges it, word by word, applied to the
 * record value: resolve() returns data()'s ABI-encoded bytes, which readRecords() unwraps first. The router accepts
 * only 128 bytes with version 1, sSell <= 0xFFFF, sBuy <= 0xFFFF, sSell < sBuy, sBuy < 10000 and 0 < cap <=
 * type(uint128).max, and reverts DeskPriceNoTerms otherwise. The words are read raw, as the router does, so a word
 * that overflows its field is caught instead of truncated. Decoding does not throw.
 */
export function decodeTerms(value: Hex): TermsCheck {
  const bytes = byteLength(value)
  if (bytes !== TERMS_BYTES) {
    const old = bytes === SPREAD_BYTES && word(value, 0) === 1n ? ` (the pre-#21 format: tier ${word(value, 1)} bps, cap ${word(value, 2)} USDC base units)` : ''
    return { terms: null, valid: false, reason: `${bytes} bytes, not ${TERMS_BYTES}${old}` }
  }
  const [version, sell, buy, cap] = [0, 1, 2, 3].map((i) => word(value, i)) as [bigint, bigint, bigint, bigint]
  const reason =
    version !== 1n ? `version ${version}, not 1`
    : sell > 0xffffn ? `sSell word ${sell} is above 0xFFFF`
    : buy > 0xffffn ? `sBuy word ${buy} is above 0xFFFF`
    : sell >= buy ? `sSell ${sell} is not below sBuy ${buy}`
    : buy >= 10_000n ? `sBuy ${buy} is not below 10000`
    : cap === 0n ? 'cap is 0'
    : cap > UINT128_MAX ? 'cap is above type(uint128).max'
    : null
  const fits = version <= 0xffn && sell <= 0xffffn && buy <= 0xffffn && cap <= UINT128_MAX
  const terms = fits ? { version: Number(version), sSellBps: Number(sell), sBuyBps: Number(buy), cap } : null
  return { terms, valid: reason === null, reason }
}

/** desk.spread as the agent writes it: 96 bytes, version 1, and not past validUntil. Information only since #21. */
export function decodeSpread(value: Hex, now: bigint): { spread: Spread | null; valid: boolean } {
  if (byteLength(value) !== SPREAD_BYTES) return { spread: null, valid: false }
  const [version, spreadBps, validUntil] = decodeAbiParameters(SPREAD, value)
  const spread = { version, spreadBps, validUntil }
  return { spread, valid: version === RECORD_VERSION && now <= validUntil }
}
