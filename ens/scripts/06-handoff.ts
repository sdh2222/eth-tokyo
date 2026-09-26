// Hand every ENS piece the desk depends on to the treasury Safe (requirement 014; desk-system §6.1, §6.3).
// From the setup EOA (TREASURY_PK), in order: root-role grants to the Safe on resolver R and registries D, C and
// agents; <desk>.eth to the Safe in the ETHRegistry (its token roles move with it); then revocation of every root
// role the EOA still holds. Idempotent: it reads the chain first and plans only what is still missing.
//
//   npm run handoff -- --safe <address>                       dry run: print the plan, simulate it, send nothing
//   npm run handoff -- --safe <address> --execute             send; only to a local RPC such as an anvil fork
//   npm run handoff -- --safe <address> --execute --sepolia   send to a non-local RPC (the real Sepolia handoff)
import { parseArgs } from 'node:util'
import { getAddress, isAddress, toHex, type Address } from 'viem'
import { sepolia } from 'viem/chains'
import { account, DESK_NAME, isLocalRpc, publicClient, rpcHost, wallet } from '../src/config.js'
import { loadDeployment, requireField } from '../src/deployments.js'
import { eoaLeftovers, planHandoff, readHandoffState, roleName, rootTargets, safeGaps, same, type HandoffState } from '../src/handoff.js'
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
const w = opts.execute ? wallet('TREASURY_PK') : null
// A dry run needs no key: without TREASURY_PK it plans for the setup EOA recorded in deployments/.
const eoa = w?.account.address ?? (process.env.TREASURY_PK ? account('TREASURY_PK').address : requireField(d.treasury, 'treasury', 'register'))

const chainId = await publicClient.getChainId()
if (chainId !== sepolia.id) throw new Error(`RPC_URL is chain ${chainId}, not Sepolia (${sepolia.id}) or a fork of it`)
if (same(safe, eoa)) throw new Error('--safe is the setup EOA itself')
const info = await readSafe(safe)
if (!info) throw new Error(`no contract at ${safe}: deploy the Safe first`)

const short = (a: Address) => `${a.slice(0, 6)}…${a.slice(-4)}`
console.log(`handoff ${DESK_NAME} to the treasury Safe`)
console.log(`  chain ${chainId} via ${rpcHost()} (${isLocalRpc() ? 'local' : 'REMOTE'})`)
console.log(`  Safe       ${safe}  ${info.threshold}-of-${info.owners.length} (${info.owners.map(short).join(', ')}), Safe ${info.version}`)
console.log(`             fallback handler ${info.fallbackHandler}, accepts ERC-1155: ${info.acceptsErc1155 ? 'yes' : 'NO'}`)
console.log(`  setup EOA  ${eoa}`)

function printState(s: HandoffState) {
  for (const r of s.roots) {
    console.log(`  ${r.target.name.padEnd(19)} ${r.target.address}  Safe ${roleName(r.safe, r.target).padEnd(17)}  EOA ${roleName(r.eoa, r.target)}`)
  }
  const owner = same(s.desk.owner, safe) ? 'the Safe' : same(s.desk.owner, eoa) ? 'the setup EOA' : s.desk.owner
  console.log(`  ${DESK_NAME.padEnd(19)} owner ${owner}, token ${toHex(s.desk.tokenId)}`)
  console.log(`  ${''.padEnd(19)} token roles  Safe ${roleName(s.desk.safeRoles)}  EOA ${roleName(s.desk.eoaRoles)}`)
}

const before = await readHandoffState(targets, eoa, safe)
console.log('state')
printState(before)

const plan = planHandoff(before, eoa, safe)
if (plan.length === 0) {
  console.log('nothing to do: the Safe already holds everything and the setup EOA holds no root role. No transaction sent.')
  process.exit(0)
}
console.log(`plan: ${plan.length} calls from the setup EOA, in this order`)
plan.forEach((c, i) => console.log(`  ${String(i + 1).padStart(2)}. ${c.target.padEnd(19)} ${c.address}  ${c.label}`))

// Every call is checked against the current state before the first one is sent. They do not depend on each other.
let failed = 0
for (const [i, c] of plan.entries()) {
  const reason = await revertName(() => publicClient.simulateContract({ account: eoa, address: c.address, abi: c.abi, functionName: c.functionName, args: c.args } as never))
  if (reason) {
    console.log(`  ✗ ${i + 1}. ${c.target} ${c.functionName} would revert: ${reason}`)
    failed++
  }
}
if (failed) {
  console.error(`${failed} planned call(s) would revert. Nothing was sent.`)
  process.exit(1)
}
console.log(`simulation: all ${plan.length} calls succeed against the current state`)

if (!w) {
  console.log('dry run: nothing sent. Add --execute to send.')
  process.exit(0)
}

console.log('sending')
for (const c of plan.filter((c) => c.step !== 'revoke')) await send(w, { ...c, label: `${c.target}: ${c.label}` } as never)

// Revoke only once the chain shows the Safe holds everything, not because the sends above returned.
const gaps = safeGaps(await readHandoffState(targets, eoa, safe), safe)
if (gaps.length) throw new Error(`not revoking the setup EOA, the Safe is not in control yet:\n  ${gaps.join('\n  ')}`)
for (const c of plan.filter((c) => c.step === 'revoke')) await send(w, { ...c, label: `${c.target}: ${c.label}` } as never)

const after = await readHandoffState(targets, eoa, safe)
console.log('state after')
printState(after)
const problems = [...safeGaps(after, safe), ...eoaLeftovers(after)]
if (problems.length) throw new Error(`handoff incomplete:\n  ${problems.join('\n  ')}`)
console.log(`handoff complete: the Safe holds every root role on R, D, C and agents and owns ${DESK_NAME}; the setup EOA holds none`)
