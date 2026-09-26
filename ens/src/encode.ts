import {
  concat,
  decodeAbiParameters,
  encodeAbiParameters,
  keccak256,
  labelhash,
  stringToBytes,
  toHex,
  type Hex,
} from 'viem'

// Record keys. The router reads the two data records; people read the text ones.
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

// desk.terms is what DeskPrice reads after one abi.decode of resolve(): 128 bytes,
// abi.encode(uint8 version, uint16 sSellBps, uint16 sBuyBps, uint128 cap). cap is WETH wei.
// The router reverts DeskPriceNoTerms unless version is 1, sell < buy < 10000, and cap > 0.
// desk.spread is abi.encode(uint8 version, uint16 sellBps, uint16 buyBps, uint64 validUntil), 128 bytes.
// A 96-byte record is not live. DeskPrice reads this record on the desk name.
const TERMS = [{ type: 'uint8' }, { type: 'uint16' }, { type: 'uint16' }, { type: 'uint128' }] as const
const SPREAD = [{ type: 'uint8' }, { type: 'uint16' }, { type: 'uint16' }, { type: 'uint64' }] as const
const TERMS_BYTES = 128
const SPREAD_BYTES = 128

export type Terms = { version: number; sSellBps: number; sBuyBps: number; cap: bigint }
export type Spread = { version: number; sellBps: number; buyBps: number; validUntil: bigint }

export const encodeTerms = (t: { sSellBps: number; sBuyBps: number; cap: bigint }) =>
  encodeAbiParameters(TERMS, [RECORD_VERSION, t.sSellBps, t.sBuyBps, t.cap])

export const encodeSpread = (s: { sellBps: number; buyBps: number; validUntil: bigint }) =>
  encodeAbiParameters(SPREAD, [RECORD_VERSION, s.sellBps, s.buyBps, s.validUntil])

const byteLength = (value: Hex) => (value.length - 2) / 2

/**
 * DeskPrice's reading of desk.terms: 128 bytes, version 1, sell < buy < 10000, cap > 0.
 * Anything else is not a fill. Decoding does not throw.
 */
export function decodeTerms(value: Hex): { terms: Terms | null; valid: boolean } {
  if (byteLength(value) !== TERMS_BYTES) return { terms: null, valid: false }
  const [version, sSellBps, sBuyBps, cap] = decodeAbiParameters(TERMS, value)
  const terms = { version, sSellBps, sBuyBps, cap }
  const valid =
    version === RECORD_VERSION && sSellBps < sBuyBps && sBuyBps < 10_000 && cap > 0n && cap <= 2n ** 128n - 1n
  return { terms, valid }
}

/** Stored desk.spread. DeskPrice reads it on the desk name, not the taker name. */
export function decodeSpread(value: Hex, now: bigint): { spread: Spread | null; valid: boolean } {
  if (byteLength(value) !== SPREAD_BYTES) return { spread: null, valid: false }
  const [version, sellBps, buyBps, validUntil] = decodeAbiParameters(SPREAD, value)
  const spread = { version, sellBps, buyBps, validUntil }
  return { spread, valid: version === RECORD_VERSION && validUntil >= now }
}
