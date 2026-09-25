import { decodeAbiParameters, encodeFunctionData, namehash, type Address, type Hex } from 'viem'
import { profileAbi, registryAbi, resolverAbi } from './abis.js'
import { ADDR, publicClient } from './config.js'
import { decodeSpread, decodeTerms, dnsEncode, KEY_SPREAD, KEY_TERMS, type Spread, type Terms } from './encode.js'

type Level = { name: string; label: string; registry: Address; expiry: bigint }

/**
 * Walk the registry chain the same way the router does: from ETHRegistry down to the leaf label.
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
      if (registry === '0x0000000000000000000000000000000000000000') throw new Error(`${labels.slice(i).join('.')} has no subregistry`)
    }
  }
  return levels
}

/** The treasury resolver is whatever `<desk>.eth` itself points to. */
export async function treasuryResolver(deskLabel: string): Promise<Address> {
  return publicClient.readContract({ address: ADDR.ethRegistry, abi: registryAbi, functionName: 'getResolver', args: [deskLabel] })
}

/** Read records through resolve(), batched into one call with the multicall profile. */
export async function readRecords(resolver: Address, fullName: string) {
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
  const [terms] = decodeAbiParameters([{ type: 'bytes' }], results[1] as Hex)
  const [spread] = decodeAbiParameters([{ type: 'bytes' }], results[2] as Hex)
  return { addr, terms: decodeTerms(terms), spread: decodeSpread(spread) }
}

export type ClientView = {
  name: string
  addr: Address
  terms: Terms | null
  spread: Spread | null
  /** Spread the router would apply: live agent spread if still valid, else the tier value from desk.terms. */
  effective: { askBps: number; bidBps: number; source: 'agent' | 'tier' } | null
  expiries: { name: string; expiry: bigint }[]
  expiryOk: boolean
  resolver: Address
  resolverOk: boolean
  /** Gate verdict before the price step: every check the router's ENS gate runs, except addr == msg.sender. */
  gateOk: boolean
}

/** What the router's ENS gate would see for this name, at the current block time. */
export async function readClient(fullName: string): Promise<ClientView> {
  const labels = fullName.split('.')
  const deskLabel = labels.at(-2)!
  const [levels, expected, block] = await Promise.all([
    walkRegistries(fullName),
    treasuryResolver(deskLabel),
    publicClient.getBlock(),
  ])
  const leaf = levels.at(-1)!
  const resolver = await publicClient.readContract({ address: leaf.registry, abi: registryAbi, functionName: 'getResolver', args: [leaf.label] })
  const records = await readRecords(resolver, fullName)
  const expiryOk = levels.every((l) => l.expiry > block.timestamp)
  const resolverOk = resolver.toLowerCase() === expected.toLowerCase() && resolver !== '0x0000000000000000000000000000000000000000'
  const agentValid = records.spread !== null && records.spread.validUntil > block.timestamp
  const effective = agentValid
    ? { askBps: records.spread!.askBps, bidBps: records.spread!.bidBps, source: 'agent' as const }
    : records.terms
      ? { askBps: records.terms.askBps, bidBps: records.terms.bidBps, source: 'tier' as const }
      : null
  return {
    name: fullName,
    ...records,
    effective,
    expiries: levels.map((l) => ({ name: l.name, expiry: l.expiry })),
    expiryOk,
    resolver,
    resolverOk,
    gateOk: expiryOk && resolverOk && records.terms !== null && records.terms.capPerFill > 0n,
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
