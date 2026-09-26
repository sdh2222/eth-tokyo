// Hand every ENS piece the desk depends on to the treasury Safe (requirements 014 and 016; desk-system §6.1, §6.3).
// From the setup EOA (TREASURY_PK), in order: root-role grants to the Safe on resolver R and registries D, C and
// agents; <desk>.eth to the Safe in the ETHRegistry (its token roles move with it); each live subname reissued to
// the Safe (unregister, then register with the same subregistry, resolver and expiry); then revocation of every
// root role the EOA still holds. Idempotent: it reads the chain first and plans only what is still missing.
//
//   npm run handoff -- --safe <address>                       dry run: print the plan, check it, send nothing
//   npm run handoff -- --safe <address> --execute             send; only to a local RPC such as an anvil fork
//   npm run handoff -- --safe <address> --execute --sepolia   send to a non-local RPC (the real Sepolia handoff)
//
// On a fork, FORK_IMPERSONATE=1 sends as the setup EOA recorded in deployments/ with no key (src/config.ts).
import { parseArgs } from 'node:util'
import { BaseError, getAddress, isAddress, toHex, type Address } from 'viem'
import { sepolia } from 'viem/chains'
import { account, DESK_NAME, FORK_IMPERSONATE, isLocalRpc, publicClient, rpcHost, wallet } from '../src/config.js'
import { loadDeployment, requireField } from '../src/deployments.js'
import {
  contractName,
  describeValues,
  deskSubnames,
  eoaLeftovers,
  iso,
  planHandoff,
  readHandoffState,
  readSubname,
  reissueDrift,
  roleName,
  rootTargets,
  safeGaps,
  same,
  type HandoffState,
} from '../src/handoff.js'
import { REGISTRY } from '../src/roles.js'
import { readSafe } from '../src/safe.js'
import { revertName, send } from '../src/tx.js'

const { values: opts } = parseArgs({
  options: { safe: { type: 'string' }, execute: { type: 'boolean', default: false }, sepolia: { type: 'boolean', default: false } },
})

// First, before any key or network use: a real chain needs an explicit --sepolia.
if (opts.execute && !isLocalRpc() && !opts.sepolia) {
  console.error(`refusing to send: RPC_URL (${rpcHost()}) is not a local RPC. Nothing was sent. Add --sepolia to send to Sepolia.`)
  process.exit(1)
}
if (!opts.safe || !isAddress(opts.safe)) {
  console.error('usage: npm run handoff -- --safe <address> [--execute] [--sepolia]')
  process.exit(1)
}
const safe = getAddress(opts.safe)
const d = loadDeployment()
const targets = rootTargets(d)
const subnames = deskSubnames(d, targets)
const w = opts.execute ? wallet('TREASURY_PK') : null
// A dry run needs no key: without TREASURY_PK it plans for the setup EOA recorded in deployments/.
const eoa = w?.account.address ?? (process.env.TREASURY_PK || FORK_IMPERSONATE ? account('TREASURY_PK').address : requireField(d.treasury, 'treasury', 'register'))

const chainId = await publicClient.getChainId()
if (chainId !== sepolia.id) throw new Error(`RPC_URL is chain ${chainId}, not Sepolia (${sepolia.id}) or a fork of it`)
if (same(safe, eoa)) throw new Error('--safe is the setup EOA itself')
const info = await readSafe(safe)
if (!info) throw new Error(`no contract at ${safe}: deploy the Safe first`)

const short = (a: Address) => `${a.slice(0, 6)}…${a.slice(-4)}`
const who = (a: Address) => (same(a, safe) ? 'the Safe' : same(a, eoa) ? 'the setup EOA' : contractName(a, targets))
console.log(`handoff ${DESK_NAME} to the treasury Safe`)
console.log(`  chain ${chainId} via ${rpcHost()} (${isLocalRpc() ? 'local' : 'REMOTE'})`)
console.log(`  Safe       ${safe}  ${info.threshold}-of-${info.owners.length} (${info.owners.map(short).join(', ')}), Safe ${info.version}`)
console.log(`             fallback handler ${info.fallbackHandler}, accepts ERC-1155: ${info.acceptsErc1155 ? 'yes' : 'NO'}`)
console.log(`  setup EOA  ${eoa}${FORK_IMPERSONATE ? '  (FORK_IMPERSONATE=1: anvil sends as this address, no key)' : ''}`)

function printState(s: HandoffState) {
  for (const r of s.roots) {
    console.log(`  ${r.target.name.padEnd(31)} ${r.target.address}  Safe ${roleName(r.safe, r.target).padEnd(17)}  EOA ${roleName(r.eoa, r.target)}`)
  }
  console.log(`  ${DESK_NAME.padEnd(31)} owner ${who(s.desk.owner)}, token ${toHex(s.desk.tokenId)}`)
  console.log(`  ${''.padEnd(31)} token roles  Safe ${roleName(s.desk.safeRoles)}  EOA ${roleName(s.desk.eoaRoles)}`)
  for (const n of s.subnames) {
    const where = `in ${n.sub.registry.short}`.padEnd(18)
    if (n.status === 'expired') console.log(`  ${n.sub.name.padEnd(31)} ${where} expired ${iso(n.expiry)}: skipped, the Safe registers it itself when it re-arms it`)
    else if (n.status === 'unregistered') console.log(`  ${n.sub.name.padEnd(31)} ${where} UNREGISTERED since ${iso(n.expiry)}, recorded live until ${iso(n.sub.recorded.expiry)}`)
    else console.log(`  ${n.sub.name.padEnd(31)} ${where} owner ${who(n.owner)}, ${describeValues(n, targets)}`)
  }
}

const before = await readHandoffState(targets, subnames, eoa, safe)
console.log('state')
printState(before)

const plan = planHandoff(before, eoa, safe, targets)
if (plan.length === 0) {
  console.log('nothing to do: the Safe holds everything and owns every live desk name, and the setup EOA holds no root role. No transaction sent.')
  process.exit(0)
}
console.log(`plan: ${plan.length} calls from the setup EOA, in this order`)
plan.forEach((c, i) => console.log(`  ${String(i + 1).padStart(2)}. ${c.target.padEnd(19)} ${c.address}  ${c.label}`))

// A register whose unregister comes earlier in the plan cannot be simulated yet: its name is still registered
// (LabelAlreadyRegistered). send() simulates it right after that unregister lands. Up front, its preconditions are
// checked instead. Every other call does not depend on the calls before it and is simulated now.
let failed = 0
const deferred = plan.filter((c) => c.reissue?.afterUnregister)
for (const [i, c] of plan.entries()) {
  if (c.reissue?.afterUnregister) {
    const root = before.roots.find((r) => same(r.target.address, c.address))
    const problems = [
      !root || (root.eoa & REGISTRY.ROLE_REGISTRAR) === 0n ? 'the setup EOA lacks ROLE_REGISTRAR on this registry' : '',
      c.reissue.values.expiry <= before.now ? 'its expiry has passed' : '',
      info.acceptsErc1155 ? '' : 'the Safe does not accept ERC-1155, and register mints the name to it',
    ].filter(Boolean)
    if (problems.length) console.log(`  ✗ ${i + 1}. ${c.target} ${c.label} cannot succeed: ${problems.join('; ')}`)
    failed += problems.length ? 1 : 0
    continue
  }
  const reason = await revertName(() => publicClient.simulateContract({ account: eoa, address: c.address, abi: c.abi, functionName: c.functionName, args: c.args } as never))
  if (reason) console.log(`  ✗ ${i + 1}. ${c.target} ${c.functionName} would revert: ${reason}`)
  failed += reason ? 1 : 0
}
if (failed) {
  console.error(`${failed} planned call(s) would fail. Nothing was sent.`)
  process.exit(1)
}
console.log(`simulation: all ${plan.length - deferred.length} calls that do not depend on an earlier call succeed against the current state`)
if (deferred.length) {
  console.log(`  the ${deferred.length} register calls each need their unregister first, so send() simulates each one right after that lands.`)
  console.log('  Checked now instead: the setup EOA holds ROLE_REGISTRAR on each registry, every expiry is in the future, the Safe accepts ERC-1155.')
}
const skipped = before.subnames.filter((n) => n.status === 'expired')
for (const n of skipped) console.log(`skipped: ${n.sub.name} expired ${iso(n.expiry)}. The Safe registers it itself when it re-arms it.`)

if (!w) {
  console.log('dry run: nothing sent. Add --execute to send.')
  process.exit(0)
}

// Stops the run before any revocation, naming each desk name that is unregistered right now.
async function stop(reason: string): Promise<never> {
  const now = await readHandoffState(targets, subnames, eoa, safe)
  console.error(`\nSTOPPED before any revocation: ${reason}`)
  for (const n of now.subnames.filter((x) => x.status === 'unregistered')) {
    const was = before.subnames.find((x) => x.sub.name === n.sub.name)
    console.error(`  ${n.sub.name} is UNREGISTERED: nothing under it resolves until it is registered again.`)
    console.error(`    before this run: ${was ? describeValues(was, targets) : 'not read'}`)
    console.error(`    a re-run registers it to the Safe with the recorded ${describeValues(n.sub.recorded, targets)}`)
  }
  console.error('The setup EOA still holds its root roles. Run the same command again to finish.')
  process.exit(1)
}

console.log('sending')
const unregisteredAt = new Map<string, bigint>()
let current = ''
try {
  for (const c of plan.filter((c) => c.step !== 'revoke')) {
    current = `call ${plan.indexOf(c) + 1} (${c.target}: ${c.label})`
    const { receipt } = await send(w, { ...c, label: `${c.target}: ${c.label}` } as never)
    if (!c.reissue) continue
    const sub = subnames.find((s) => s.name === c.reissue!.name)!
    const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber })
    const n = await readSubname(sub, block.timestamp)
    if (c.step === 'unregister') {
      unregisteredAt.set(sub.name, receipt.blockNumber)
      const expiry = n.expiry === block.timestamp ? "that block's time" : iso(n.expiry)
      console.log(`      ${sub.name} unregistered in block ${receipt.blockNumber}: expiry = ${expiry}; owner ${contractName(n.owner, targets)}, subregistry ${contractName(n.subregistry, targets)}, resolver ${contractName(n.resolver, targets)}`)
    } else {
      const from = unregisteredAt.get(sub.name)
      const gap = from === undefined ? '' : ` (${receipt.blockNumber - from} block(s) after its unregister)`
      console.log(`      ${sub.name} registered in block ${receipt.blockNumber}${gap}: owner ${who(n.owner)}, ${describeValues(n, targets)}`)
    }
  }
} catch (err) {
  const why = err instanceof BaseError ? `${err.shortMessage.split('\n')[0]}${err.details ? ` ${err.details}` : ''}` : (err as Error).message.split('\n')[0]
  await stop(`${current} failed: ${why}`)
}

// Revoke only once the chain shows the Safe holds everything and owns every live desk name with its values intact.
const mid = await readHandoffState(targets, subnames, eoa, safe)
const gaps = [...safeGaps(mid, safe), ...reissueDrift(plan, mid, targets)]
if (gaps.length) await stop(`the Safe is not in control yet:\n  ${gaps.join('\n  ')}`)
for (const c of plan.filter((c) => c.step === 'revoke')) await send(w, { ...c, label: `${c.target}: ${c.label}` } as never)

const after = await readHandoffState(targets, subnames, eoa, safe)
console.log('state after')
printState(after)
const problems = [...safeGaps(after, safe), ...eoaLeftovers(after)]
if (problems.length) throw new Error(`handoff incomplete:\n  ${problems.join('\n  ')}`)
console.log(`handoff complete: the Safe holds every root role on R, D, C and agents and owns ${DESK_NAME} and every live desk name; the setup EOA holds none`)
