import { toHex, zeroAddress, type Abi, type Address } from 'viem'
import { registryAbi, rootRolesAbi } from './abis.js'
import { ADDR, AGENTS_NAME, CLIENTS_NAME, DESK_LABEL, DESK_NAME, publicClient } from './config.js'
import { requireField, type Deployment } from './deployments.js'
import { labelId } from './encode.js'
import { REGISTRY_ROOT_ALL, RESOLVER_ROOT_ALL } from './roles.js'

// Requirements 014 and 016: the treasury Safe ends up with every ENS piece the desk depends on (desk-system §6.1,
// §6.3), and the registries report it as the owner of every live desk name.
// Shared by 06-handoff (plans and sends) and 99-verify (checks), so both read the chain the same way.

/** A contract whose root roles the treasury holds, with the full bitmap the Safe must end up with. */
export type RootTarget = { key: 'resolver' | 'desk' | 'clients' | 'agents'; name: string; short: string; address: Address; all: bigint; allName: string }

/** Resolver R, then registries D, C and agents: the order the handoff touches them. */
export function rootTargets(d: Deployment): RootTarget[] {
  const registry = (tag: 'desk' | 'clients' | 'agents') => requireField(d.registries?.[tag], `${tag} registry`, 'setup')
  const all = { all: REGISTRY_ROOT_ALL, allName: 'REGISTRY_ROOT_ALL' }
  return [
    { key: 'resolver', name: 'resolver R', short: 'R', address: requireField(d.resolver, 'resolver', 'setup'), all: RESOLVER_ROOT_ALL, allName: 'RESOLVER_ROOT_ALL' },
    { key: 'desk', name: 'desk registry D', short: 'D', address: registry('desk'), ...all },
    { key: 'clients', name: 'clients registry C', short: 'C', address: registry('clients'), ...all },
    { key: 'agents', name: 'agents registry', short: 'agents registry', address: registry('agents'), ...all },
  ]
}

export type SubnameValues = { subregistry: Address; resolver: Address; expiry: bigint }

/** A desk name below <desk>.eth: clients and agents in D, each MM name in C, risk in agents. */
export type Subname = {
  name: string
  label: string
  registry: RootTarget
  /** What 02-04 registered it with (deployments/). verify compares with it; an interrupted reissue is redone with it. */
  recorded: SubnameValues
}

/** Every desk subname deployments/ records, in the order the handoff reissues them. */
export function deskSubnames(d: Deployment, targets: RootTarget[]): Subname[] {
  const reg = (key: RootTarget['key']) => targets.find((t) => t.key === key)!
  const resolver = requireField(d.resolver, 'resolver', 'setup')
  const deskExpiry = BigInt(requireField(d.desk?.expiry, 'desk expiry', 'register'))
  const sub = (key: RootTarget['key'], name: string, subregistry: Address, expiry: bigint): Subname => ({
    name,
    label: name.split('.')[0]!,
    registry: reg(key),
    recorded: { subregistry, resolver, expiry },
  })
  return [
    sub('desk', CLIENTS_NAME, reg('clients').address, deskExpiry),
    sub('desk', AGENTS_NAME, reg('agents').address, deskExpiry),
    ...Object.entries(d.clients ?? {}).map(([name, c]) => sub('clients', name, zeroAddress, BigInt(c.expiry))),
    ...(d.agent ? [sub('agents', d.agent.name, zeroAddress, deskExpiry)] : []),
  ]
}

export type SubnameState = SubnameValues & {
  sub: Subname
  /** 0x0 once expired: the registry hides the owner, subregistry and resolver of an expired name. */
  owner: Address
  /**
   * live: unexpired. unregistered: expired although deployments/ records it live, which is what an interrupted
   * reissue leaves (unregister sets the expiry to that block's time). expired: past its recorded expiry too (mm-c).
   */
  status: 'live' | 'unregistered' | 'expired'
}

export async function readSubname(sub: Subname, now: bigint): Promise<SubnameState> {
  const r = { address: sub.registry.address, abi: registryAbi } as const
  const id = labelId(sub.label)
  const [expiry, owner, subregistry, resolver] = await Promise.all([
    publicClient.readContract({ ...r, functionName: 'getExpiry', args: [id] }),
    publicClient.readContract({ ...r, functionName: 'getOwner', args: [id] }),
    publicClient.readContract({ ...r, functionName: 'getSubregistry', args: [sub.label] }),
    publicClient.readContract({ ...r, functionName: 'getResolver', args: [sub.label] }),
  ])
  const status = expiry > now ? 'live' : sub.recorded.expiry > now ? 'unregistered' : 'expired'
  return { sub, expiry, owner, subregistry, resolver, status }
}

export type HandoffState = {
  now: bigint
  roots: { target: RootTarget; safe: bigint; eoa: bigint }[]
  /** <desk>.eth in the ETHRegistry. Its token id changes whenever its roles change, so it is always read fresh. */
  desk: { owner: Address; tokenId: bigint; safeRoles: bigint; eoaRoles: bigint }
  subnames: SubnameState[]
}

export async function readHandoffState(targets: RootTarget[], subnames: Subname[], eoa: Address, safe: Address): Promise<HandoffState> {
  const rootRoles = (address: Address, account: Address) =>
    publicClient.readContract({ address, abi: rootRolesAbi, functionName: 'roles', args: [0n, account] })
  const eth = { address: ADDR.ethRegistry, abi: registryAbi } as const
  const id = labelId(DESK_LABEL)
  const now = (await publicClient.getBlock()).timestamp
  const [roots, owner, tokenId, safeRoles, eoaRoles, subs] = await Promise.all([
    Promise.all(targets.map(async (target) => ({ target, safe: await rootRoles(target.address, safe), eoa: await rootRoles(target.address, eoa) }))),
    publicClient.readContract({ ...eth, functionName: 'getOwner', args: [id] }),
    publicClient.readContract({ ...eth, functionName: 'getTokenId', args: [id] }),
    publicClient.readContract({ ...eth, functionName: 'roles', args: [id, safe] }),
    publicClient.readContract({ ...eth, functionName: 'roles', args: [id, eoa] }),
    Promise.all(subnames.map((s) => readSubname(s, now))),
  ])
  return { now, roots, desk: { owner, tokenId, safeRoles, eoaRoles }, subnames: subs }
}

export const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()
export const iso = (t: bigint) => new Date(Number(t) * 1000).toISOString()

/** A role bitmap as the plan and the checks print it. */
export const roleName = (bitmap: bigint, t?: RootTarget) => (bitmap === 0n ? '0' : t && bitmap === t.all ? t.allName : toHex(bitmap))

/** An address as the plan prints it: none, one of the desk's contracts by its short name, or the address. */
export function contractName(address: Address, targets: RootTarget[]) {
  if (same(address, zeroAddress)) return 'none'
  return targets.find((t) => same(t.address, address))?.short ?? address
}

export const describeValues = (v: SubnameValues, targets: RootTarget[]) =>
  `subregistry ${contractName(v.subregistry, targets)}, resolver ${contractName(v.resolver, targets)}, expiry ${iso(v.expiry)}`

export const sameValues = (a: SubnameValues, b: SubnameValues) => a.expiry === b.expiry && same(a.subregistry, b.subregistry) && same(a.resolver, b.resolver)

/** What the Safe still lacks. Revocation waits until this is empty. */
export function safeGaps(s: HandoffState, safe: Address): string[] {
  const gaps = s.roots.filter((r) => (r.safe & r.target.all) !== r.target.all).map((r) => `${r.target.name}: Safe holds ${roleName(r.safe, r.target)}`)
  if (!same(s.desk.owner, safe)) gaps.push(`${DESK_NAME}: owner is ${s.desk.owner}`)
  for (const n of s.subnames) {
    if (n.status === 'unregistered') gaps.push(`${n.sub.name}: UNREGISTERED (recorded live until ${iso(n.sub.recorded.expiry)})`)
    else if (n.status === 'live' && !same(n.owner, safe)) gaps.push(`${n.sub.name}: owner is ${n.owner}`)
  }
  return gaps
}

/** Names this plan registered whose expiry, subregistry or resolver now differ from the planned values. */
export function reissueDrift(plan: PlannedCall[], s: HandoffState, targets: RootTarget[]): string[] {
  return plan.flatMap((c) => {
    if (c.step !== 'register' || !c.reissue) return []
    const { name, values } = c.reissue
    const n = s.subnames.find((x) => x.sub.name === name)
    return n && sameValues(n, values) ? [] : [`${name}: now ${n ? describeValues(n, targets) : 'unread'}, planned ${describeValues(values, targets)}`]
  })
}

/** What the setup EOA still holds: root roles on the four contracts, or roles on <desk>.eth's token. */
export function eoaLeftovers(s: HandoffState): string[] {
  const left = s.roots.filter((r) => r.eoa !== 0n).map((r) => `${r.target.name}: EOA holds ${roleName(r.eoa, r.target)}`)
  if (s.desk.eoaRoles !== 0n) left.push(`${DESK_NAME}: EOA holds token roles ${roleName(s.desk.eoaRoles)}`)
  return left
}

export type PlannedCall = {
  step: 'grant' | 'transfer' | 'unregister' | 'register' | 'revoke'
  target: string
  address: Address
  abi: Abi
  functionName: string
  args: readonly unknown[]
  /** Target, function and a short form of the arguments. */
  label: string
  /**
   * unregister and register only. values: what register writes back. afterUnregister: the unregister of the same
   * name comes earlier in this plan, so this register can only be simulated once that unregister has landed.
   */
  reissue?: { name: string; values: SubnameValues; afterUnregister: boolean }
}

/**
 * Only the calls that are still missing, in the order they must be sent: grants to the Safe, the name, the reissue
 * of each live subname the Safe does not own, then revocation of every root role the EOA holds.
 * A completed handoff plans nothing.
 *
 * The name moves with safeTransferFrom, not unsafeTransfer. The ETHRegistry is emancipated, so the safe path is
 * open, and only the safe path also requires the EOA to be the token's only role holder (isOnlyAssignee): nobody
 * keeps a role on <desk>.eth after the transfer. Both paths run the ERC-1155 receiver check on the Safe.
 *
 * Subnames cannot be transferred (registered with roleBitmap 0: no ROLE_CAN_TRANSFER_ADMIN, and the UserRegistries
 * are not emancipated). While the EOA holds root roles it unregisters each one and registers it again to the Safe
 * with the same subregistry, resolver and expiry, and roleBitmap 0. Records live in resolver R, keyed by name, so
 * they stay. Expired names are skipped. A name an interrupted run left unregistered is registered again with the
 * values recorded in deployments/.
 */
export function planHandoff(s: HandoffState, eoa: Address, safe: Address, targets: RootTarget[]): PlannedCall[] {
  const calls: PlannedCall[] = []
  for (const { target, safe: held } of s.roots) {
    if ((held & target.all) === target.all) continue
    calls.push({
      step: 'grant',
      target: target.name,
      address: target.address,
      abi: rootRolesAbi,
      functionName: 'grantRootRoles',
      args: [target.all, safe],
      label: `grantRootRoles(${target.allName}, Safe)`,
    })
  }
  if (!same(s.desk.owner, safe)) {
    if (!same(s.desk.owner, eoa)) throw new Error(`${DESK_NAME} is owned by ${s.desk.owner}, which is neither the setup EOA nor the Safe`)
    calls.push({
      step: 'transfer',
      target: 'ETHRegistry',
      address: ADDR.ethRegistry,
      abi: registryAbi,
      functionName: 'safeTransferFrom',
      args: [eoa, safe, s.desk.tokenId, 1n, '0x'],
      label: `safeTransferFrom(EOA, Safe, ${DESK_LABEL} token ${toHex(s.desk.tokenId)}, 1, 0x)`,
    })
  }
  for (const n of s.subnames) {
    if (n.status === 'expired' || (n.status === 'live' && same(n.owner, safe))) continue
    const values: SubnameValues = n.status === 'live' ? { subregistry: n.subregistry, resolver: n.resolver, expiry: n.expiry } : n.sub.recorded
    const at = { target: n.sub.registry.name, address: n.sub.registry.address, abi: registryAbi }
    if (n.status === 'live') {
      calls.push({
        ...at,
        step: 'unregister',
        functionName: 'unregister',
        args: [labelId(n.sub.label)],
        label: `unregister(${n.sub.label})`,
        reissue: { name: n.sub.name, values, afterUnregister: false },
      })
    }
    calls.push({
      ...at,
      step: 'register',
      functionName: 'register',
      args: [n.sub.label, safe, values.subregistry, values.resolver, 0n, values.expiry],
      label: `register(${n.sub.label}, owner Safe, ${describeValues(values, targets)}, roleBitmap 0)${n.status === 'unregistered' ? ', was UNREGISTERED: recorded values' : ''}`,
      reissue: { name: n.sub.name, values, afterUnregister: n.status === 'live' },
    })
  }
  for (const { target, eoa: held } of s.roots) {
    if (held === 0n) continue
    calls.push({
      step: 'revoke',
      target: target.name,
      address: target.address,
      abi: rootRolesAbi,
      functionName: 'revokeRootRoles',
      args: [held, eoa],
      label: `revokeRootRoles(${roleName(held, target)}, EOA)`,
    })
  }
  return calls
}
