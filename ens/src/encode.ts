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

// Record formats from desk-system §6.2 / D5. abi.encode, so each value is exactly 96 bytes.
// desk.terms  = abi.encode(uint8 version, uint16 tierBps, uint128 capPerFill)  — Safe only. capPerFill is in USDC base units (6 dp)
// desk.spread = abi.encode(uint8 version, uint16 spreadBps, uint64 validUntil)  — risk agent only
const TERMS = [{ type: 'uint8' }, { type: 'uint16' }, { type: 'uint128' }] as const
const SPREAD = [{ type: 'uint8' }, { type: 'uint16' }, { type: 'uint64' }] as const
const RECORD_BYTES = 96

export type Terms = { version: number; tierBps: number; capPerFill: bigint }
export type Spread = { version: number; spreadBps: number; validUntil: bigint }

export const encodeTerms = (t: { tierBps: number; capPerFill: bigint }) =>
  encodeAbiParameters(TERMS, [RECORD_VERSION, t.tierBps, t.capPerFill])

export const encodeSpread = (s: { spreadBps: number; validUntil: bigint }) =>
  encodeAbiParameters(SPREAD, [RECORD_VERSION, s.spreadBps, s.validUntil])

const byteLength = (value: Hex) => (value.length - 2) / 2

/**
 * The router's reading of desk.terms (desk-system §5.4 step 6): 96 bytes, version 1, capPerFill > 0.
 * Anything else means "no terms" and the fill reverts with DeskPriceNoTerms. Decoding does not throw.
 */
export function decodeTerms(value: Hex): { terms: Terms | null; valid: boolean } {
  if (byteLength(value) !== RECORD_BYTES) return { terms: null, valid: false }
  const [version, tierBps, capPerFill] = decodeAbiParameters(TERMS, value)
  const terms = { version, tierBps, capPerFill }
  return { terms, valid: version === RECORD_VERSION && capPerFill > 0n }
}

/** The router's reading of desk.spread: 96 bytes, version 1, and not past validUntil. Otherwise it is ignored. */
export function decodeSpread(value: Hex, now: bigint): { spread: Spread | null; valid: boolean } {
  if (byteLength(value) !== RECORD_BYTES) return { spread: null, valid: false }
  const [version, spreadBps, validUntil] = decodeAbiParameters(SPREAD, value)
  const spread = { version, spreadBps, validUntil }
  return { spread, valid: version === RECORD_VERSION && now <= validUntil }
}
