import { toHex, type Abi, type Address } from 'viem'
import { registryAbi, rootRolesAbi } from './abis.js'
import { ADDR, DESK_LABEL, DESK_NAME, publicClient } from './config.js'
import { requireField, type Deployment } from './deployments.js'
import { labelId } from './encode.js'
import { REGISTRY_ROOT_ALL, RESOLVER_ROOT_ALL } from './roles.js'

// Requirement 014: the treasury Safe ends up with every ENS piece the desk depends on (desk-system §6.1, §6.3).
// Shared by 06-handoff (plans and sends) and 99-verify (checks), so both read the chain the same way.

/** A contract whose root roles the treasury holds, with the full bitmap the Safe must end up with. */
export type RootTarget = { name: string; address: Address; all: bigint; allName: string }

/** Resolver R, then registries D, C and agents: the order the handoff touches them. */
export function rootTargets(d: Deployment): RootTarget[] {
  const registry = (tag: 'desk' | 'clients' | 'agents') => requireField(d.registries?.[tag], `${tag} registry`, 'setup')
  const all = { all: REGISTRY_ROOT_ALL, allName: 'REGISTRY_ROOT_ALL' }
  return [
    { name: 'resolver R', address: requireField(d.resolver, 'resolver', 'setup'), all: RESOLVER_ROOT_ALL, allName: 'RESOLVER_ROOT_ALL' },
    { name: 'desk registry D', address: registry('desk'), ...all },
    { name: 'clients registry C', address: registry('clients'), ...all },
    { name: 'agents registry', address: registry('agents'), ...all },
  ]
}

export type HandoffState = {
  roots: { target: RootTarget; safe: bigint; eoa: bigint }[]
  /** <desk>.eth in the ETHRegistry. Its token id changes whenever its roles change, so it is always read fresh. */
  desk: { owner: Address; tokenId: bigint; safeRoles: bigint; eoaRoles: bigint }
}

export async function readHandoffState(targets: RootTarget[], eoa: Address, safe: Address): Promise<HandoffState> {
  const rootRoles = (address: Address, account: Address) =>
    publicClient.readContract({ address, abi: rootRolesAbi, functionName: 'roles', args: [0n, account] })
  const eth = { address: ADDR.ethRegistry, abi: registryAbi } as const
  const id = labelId(DESK_LABEL)
  const [roots, owner, tokenId, safeRoles, eoaRoles] = await Promise.all([
    Promise.all(targets.map(async (target) => ({ target, safe: await rootRoles(target.address, safe), eoa: await rootRoles(target.address, eoa) }))),
    publicClient.readContract({ ...eth, functionName: 'getOwner', args: [id] }),
    publicClient.readContract({ ...eth, functionName: 'getTokenId', args: [id] }),
    publicClient.readContract({ ...eth, functionName: 'roles', args: [id, safe] }),
    publicClient.readContract({ ...eth, functionName: 'roles', args: [id, eoa] }),
  ])
  return { roots, desk: { owner, tokenId, safeRoles, eoaRoles } }
}

export const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/** A role bitmap as the plan and the checks print it. */
export const roleName = (bitmap: bigint, t?: RootTarget) => (bitmap === 0n ? '0' : t && bitmap === t.all ? t.allName : toHex(bitmap))

/** What the Safe still lacks. Revocation waits until this is empty. */
export function safeGaps(s: HandoffState, safe: Address): string[] {
  const gaps = s.roots.filter((r) => (r.safe & r.target.all) !== r.target.all).map((r) => `${r.target.name}: Safe holds ${roleName(r.safe, r.target)}`)
  if (!same(s.desk.owner, safe)) gaps.push(`${DESK_NAME}: owner is ${s.desk.owner}`)
  return gaps
}

/** What the setup EOA still holds: root roles on the four contracts, or roles on <desk>.eth's token. */
export function eoaLeftovers(s: HandoffState): string[] {
  const left = s.roots.filter((r) => r.eoa !== 0n).map((r) => `${r.target.name}: EOA holds ${roleName(r.eoa, r.target)}`)
  if (s.desk.eoaRoles !== 0n) left.push(`${DESK_NAME}: EOA holds token roles ${roleName(s.desk.eoaRoles)}`)
  return left
}

export type PlannedCall = {
  step: 'grant' | 'transfer' | 'revoke'
  target: string
  address: Address
  abi: Abi
  functionName: string
  args: readonly unknown[]
  /** Target, function and a short form of the arguments. */
  label: string
}

/**
 * Only the calls that are still missing, in the order they must be sent: grants to the Safe, the name, then
 * revocation of every root role the EOA holds. A completed handoff plans nothing.
 *
 * The name moves with safeTransferFrom, not unsafeTransfer. The ETHRegistry is emancipated, so the safe path is
 * open, and only the safe path also requires the EOA to be the token's only role holder (isOnlyAssignee): nobody
 * keeps a role on <desk>.eth after the transfer. Both paths run the ERC-1155 receiver check on the Safe.
 */
export function planHandoff(s: HandoffState, eoa: Address, safe: Address): PlannedCall[] {
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
