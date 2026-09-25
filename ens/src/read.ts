import { decodeAbiParameters, encodeFunctionData, namehash, zeroAddress, type Address, type Hex } from 'viem'
import { profileAbi, registryAbi, resolverAbi } from './abis.js'
import { ADDR, publicClient } from './config.js'
import { decodeSpread, decodeTerms, dnsEncode, KEY_SPREAD, KEY_TERMS, type Spread, type Terms } from './encode.js'

type Level = { name: string; label: string; registry: Address; expiry: bigint }

/**
 * Walk the registry chain the way the router's gate does: from ETHRegistry down to the leaf label.
 * For "mm-a.clients.desk.eth" this yields desk (ETHRegistry), clients (desk's subregistry), mm-a (clients' subregistry).
 */
export async function walkRegistries(fullName: string): Promise<Level[]> {
  const labels = fullName.split('.')
  if (labels.at(-1) !== 'eth') throw new Error(`${fullName} is not a .eth name`)
  const levels: Level[] = []
  let registry: Address = ADDR.ethRegistry
  for (let i = labels.length - 2; i >= 0; i--) {
    const label = labels[i]!
    const expiry = await publicClient.readContract({ address: registry, abi: registryAbi, functionName: 'findExpiry', args: [label] })
    levels.push({ name: labels.slice(i).join('.'), label, registry, expiry })
    if (i > 0) {
      registry = await publicClient.readContract({ address: registry, abi: registryAbi, functionName: 'getSubregistry', args: [label] })
      if (registry === zeroAddress) throw new Error(`${labels.slice(i).join('.')} has no subregistry`)
    }
  }
  return levels
}

/** The treasury resolver is whatever `<desk>.eth` itself points to. */
export async function treasuryResolver(deskLabel: string): Promise<Address> {
  return publicClient.readContract({ address: ADDR.ethRegistry, abi: registryAbi, functionName: 'getResolver', args: [deskLabel] })
}

export type Records = {
  addr: Address
  terms: Terms | null
  termsValid: boolean
  spread: Spread | null
  spreadValid: boolean
}

/** Read addr, desk.terms and desk.spread in one resolve() call using the multicall profile (desk-system §5.4 step 6). */
export async function readRecords(resolver: Address, fullName: string, now: bigint): Promise<Records> {
  const node = namehash(fullName)
  const calls = [
    encodeFunctionData({ abi: profileAbi, functionName: 'addr', args: [node] }),
    encodeFunctionData({ abi: profileAbi, functionName: 'data', args: [node, KEY_TERMS] }),
    encodeFunctionData({ abi: profileAbi, functionName: 'data', args: [node, KEY_SPREAD] }),
  ]
  const raw = await publicClient.readContract({
    address: resolver,
    abi: resolverAbi,
    functionName: 'resolve',
    args: [dnsEncode(fullName), encodeFunctionData({ abi: profileAbi, functionName: 'multicall', args: [calls] })],
  })
  const [results] = decodeAbiParameters([{ type: 'bytes[]' }], raw)
  const [addr] = decodeAbiParameters([{ type: 'address' }], results[0] as Hex)
  const [termsRaw] = decodeAbiParameters([{ type: 'bytes' }], results[1] as Hex)
  const [spreadRaw] = decodeAbiParameters([{ type: 'bytes' }], results[2] as Hex)
  const t = decodeTerms(termsRaw)
  const s = decodeSpread(spreadRaw, now)
  return { addr, terms: t.terms, termsValid: t.valid, spread: s.spread, spreadValid: s.valid }
}

export type ClientView = Records & {
  name: string
  /** Pre-clamp spread the router starts from: the agent's spread if valid, else the tier from desk.terms. */
  rawSpread: { bps: number; source: 'agent' | 'tier' } | null
  expiries: { name: string; expiry: bigint }[]
  expiryOk: boolean
  resolver: Address
  resolverOk: boolean
  /** Every ENS-side condition for a fill except addr == msg.sender, which depends on the caller. */
  gateOk: boolean
}

/** What the router would see for this name at the current block time. */
export async function readClient(fullName: string): Promise<ClientView> {
  const deskLabel = fullName.split('.').at(-2)!
  const [levels, expected, block] = await Promise.all([walkRegistries(fullName), treasuryResolver(deskLabel), publicClient.getBlock()])
  const leaf = levels.at(-1)!
  const resolver = await publicClient.readContract({ address: leaf.registry, abi: registryAbi, functionName: 'getResolver', args: [leaf.label] })
  const records = await readRecords(resolver, fullName, block.timestamp)
  const expiryOk = levels.every((l) => l.expiry > block.timestamp)
  const resolverOk = resolver !== zeroAddress && resolver.toLowerCase() === expected.toLowerCase()
  const rawSpread = records.spreadValid
    ? { bps: records.spread!.spreadBps, source: 'agent' as const }
    : records.termsValid
      ? { bps: records.terms!.tierBps, source: 'tier' as const }
      : null
  return {
    name: fullName,
    ...records,
    rawSpread,
    expiries: levels.map((l) => ({ name: l.name, expiry: l.expiry })),
    expiryOk,
    resolver,
    resolverOk,
    gateOk: expiryOk && resolverOk && records.termsValid,
  }
}

/** Reverse lookup over the names this package issued (deployments/sepolia.json). */
export async function lookupName(address: Address, clientNames: string[]): Promise<string | null> {
  for (const name of clientNames) {
    const view = await readClient(name).catch(() => null)
    if (view && view.addr.toLowerCase() === address.toLowerCase()) return name
  }
  return null
}
