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

// desk.terms = abi.encode(uint8 version, uint16 askBps, uint16 bidBps, uint128 capPerFill)   — multisig only
// desk.spread = abi.encode(uint8 version, uint16 askBps, uint16 bidBps, uint64 validUntil)   — risk agent only
const TERMS = [{ type: 'uint8' }, { type: 'uint16' }, { type: 'uint16' }, { type: 'uint128' }] as const
const SPREAD = [{ type: 'uint8' }, { type: 'uint16' }, { type: 'uint16' }, { type: 'uint64' }] as const

export type Terms = { version: number; askBps: number; bidBps: number; capPerFill: bigint }
export type Spread = { version: number; askBps: number; bidBps: number; validUntil: bigint }

export const encodeTerms = (t: { askBps: number; bidBps: number; capPerFill: bigint }) =>
  encodeAbiParameters(TERMS, [RECORD_VERSION, t.askBps, t.bidBps, t.capPerFill])

export const encodeSpread = (s: { askBps: number; bidBps: number; validUntil: bigint }) =>
  encodeAbiParameters(SPREAD, [RECORD_VERSION, s.askBps, s.bidBps, s.validUntil])

/** Empty record -> null. Unknown version -> throws, the same way the router must revert. */
export function decodeTerms(value: Hex): Terms | null {
  if (value === '0x') return null
  const [version, askBps, bidBps, capPerFill] = decodeAbiParameters(TERMS, value)
  if (version !== RECORD_VERSION) throw new Error(`desk.terms version ${version} is not supported`)
  return { version, askBps, bidBps, capPerFill }
}

export function decodeSpread(value: Hex): Spread | null {
  if (value === '0x') return null
  const [version, askBps, bidBps, validUntil] = decodeAbiParameters(SPREAD, value)
  if (version !== RECORD_VERSION) throw new Error(`desk.spread version ${version} is not supported`)
  return { version, askBps, bidBps, validUntil }
}
