// FORK ONLY. Requirements 014 and 016 end to end on an anvil Sepolia fork: deploy a 2-of-3 Safe, run the handoff
// through its CLI, then prove who owns and controls what. Refuses any RPC that is not local.
//
//   anvil --fork-url <Sepolia RPC> --chain-id 11155111 --port 8546
//   FORK_IMPERSONATE=1 RPC_URL=http://127.0.0.1:8546 npx tsx scripts/fork-handoff-demo.ts
//
// With FORK_IMPERSONATE=1 no testnet key is needed (SEC-05): the setup EOA and the risk agent send as the addresses
// recorded in deployments/ through anvil impersonation, here and in the handoff it spawns.
// The Safe's owners are anvil's default accounts 1-3, derived at run time from anvil's public test mnemonic and never
// printed. They are fork-only stand-ins. On the real Safe (T6a), owners 1 and 2 are Aqua-lane people and owner 3 is
// the ENS lane, each with their own key, so a real ENS change needs an Aqua owner to co-sign (src/safe.ts).
import { spawnSync } from 'node:child_process'
import { createTestClient, encodeFunctionData, http, parseEther, toHex, type Address, type Hex } from 'viem'
import { mnemonicToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { resolverAbi } from '../src/abis.js'
import { AGENTS_NAME, CLIENTS_NAME, DESK_NAME, FORK_IMPERSONATE, isLocalRpc, publicClient, rpcHost, RPC_URL, wallet } from '../src/config.js'
import { loadDeployment, requireField } from '../src/deployments.js'
import { dnsEncode, encodeSpread, encodeTerms, KEY_SPREAD, KEY_TERMS, keyResource } from '../src/encode.js'
import { describeValues, deskSubnames, iso, planHandoff, readHandoffState, rootTargets, same, sameValues, type HandoffState } from '../src/handoff.js'
import { readRecords, type Records } from '../src/read.js'
import { RESOLVER } from '../src/roles.js'
import { deploySafe, execSafeTx, proposeSafeTx, readSafe, signSafeTx } from '../src/safe.js'
import { revertName, send, txUrl } from '../src/tx.js'

if (!isLocalRpc()) {
  console.error(`fork only: RPC_URL (${rpcHost()}) is not a local RPC`)
  process.exit(1)
}
const chainId = await publicClient.getChainId()
if (chainId !== sepolia.id) throw new Error(`RPC_URL is chain ${chainId}; start anvil with --fork-url <Sepolia RPC> --chain-id 11155111`)

const d = loadDeployment()
const targets = rootTargets(d)
const subnames = deskSubnames(d, targets)
const resolver = requireField(d.resolver, 'resolver', 'setup')
const eoaWallet = wallet('TREASURY_PK')
const eoa = eoaWallet.account.address
if (!same(eoa, requireField(d.treasury, 'treasury', 'register'))) throw new Error(`TREASURY_PK is ${eoa}, not the setup EOA in deployments/`)
const agent = wallet('AGENT_PK')
const mmA = `mm-a.${CLIENTS_NAME}`
const R = { address: resolver, abi: resolverAbi } as const
const CAP = 50n * 10n ** 18n // live desk.terms cap, WETH wei
const short = (a: Address) => `${a.slice(0, 6)}…${a.slice(-4)}`
const step = (title: string) => console.log(`\n== ${title}`)
function ok(cond: boolean, what: string): asserts cond {
  if (!cond) throw new Error(`FAILED: ${what}`)
  console.log(`  ✓ ${what}`)
}

// Fork-only stand-in owners: anvil's default accounts 1-3. Their keys stay in this process and are never printed.
const ANVIL_MNEMONIC = 'test test test test test test test test test test test junk'
const owners = [1, 2, 3].map((i) => {
  const a = mnemonicToAccount(ANVIL_MNEMONIC, { addressIndex: i })
  return { address: a.address, key: toHex(a.getHdKey().privateKey!) as Hex }
})
const [owner1, owner2] = owners as [(typeof owners)[number], (typeof owners)[number]]

console.log(
  FORK_IMPERSONATE
    ? `signing: FORK_IMPERSONATE=1. The setup EOA ${short(eoa)} and the agent ${short(agent.account.address)} send through anvil impersonation, with no key.`
    : 'signing: TREASURY_PK and AGENT_PK from .env.',
)

// The setup EOA and the agent pay gas from their Sepolia balances. Top up on the fork only, if they run low.
const testClient = createTestClient({ mode: 'anvil', chain: sepolia, transport: http(RPC_URL) })
for (const address of [eoa, agent.account.address]) {
  if ((await publicClient.getBalance({ address })) < parseEther('0.01')) await testClient.setBalance({ address, value: parseEther('1') })
}

step('1. treasury Safe (2-of-3, anvil accounts 1-3 as fork-only owners, saltNonce keccak256("ens-handoff-fork"))')
const { address: safe, hash: deployHash } = await deploySafe({ owners: owners.map((o) => o.address), threshold: 2, saltLabel: 'ens-handoff-fork' }, owner1.key)
const info = await readSafe(safe)
if (!info) throw new Error(`no Safe at ${safe}`)
console.log(`  Safe ${safe} ${deployHash ? `deployed in ${deployHash}` : 'already deployed'}`)
console.log(`  Safe ${info.version}, ${info.threshold}-of-${info.owners.length}: ${info.owners.join(', ')}`)
console.log(`  fallback handler ${info.fallbackHandler}`)
ok(info.threshold === 2n && info.owners.length === 3, 'threshold 2 of 3 owners')
ok(info.acceptsErc1155, 'the Safe accepts ERC-1155 tokens: onERC1155Received returns 0xf23a6e61 through its fallback handler')

step('2. before the handoff: every desk name and the records the router and people read')
const read = () => readHandoffState(targets, subnames, eoa, safe)
type Snapshot = { state: HandoffState; records: Map<string, Records> }
async function snapshot(): Promise<Snapshot> {
  const state = await read()
  const records = new Map<string, Records>()
  for (const n of state.subnames) if (n.status === 'live' && n.sub.registry.key !== 'desk') records.set(n.sub.name, await readRecords(resolver, n.sub.name, state.now))
  return { state, records }
}
const recordLine = (r: Records) => `addr ${r.addr}${r.terms ? `, ${KEY_TERMS} sell ${r.terms.sSellBps} bp buy ${r.terms.sBuyBps} bp cap ${r.terms.cap}` : ''}`
const who = (a: Address) => (same(a, safe) ? 'the Safe' : same(a, eoa) ? 'the setup EOA' : a)
const s0 = await snapshot()
for (const n of s0.state.subnames) {
  if (n.status !== 'live') {
    console.log(`  ${n.sub.name.padEnd(31)} ${n.status} ${iso(n.expiry)}`)
    continue
  }
  const r = s0.records.get(n.sub.name)
  console.log(`  ${n.sub.name.padEnd(31)} owner ${who(n.owner)}, ${describeValues(n, targets)}${r ? `\n  ${''.padEnd(31)} ${recordLine(r)}` : ''}`)
}

step('3. handoff (npm run handoff), sent from the setup EOA')
const termsCall = (sSellBps: number) => ({ ...R, functionName: 'setData' as const, args: [dnsEncode(mmA), KEY_TERMS, encodeTerms({ sSellBps, sBuyBps: 10, cap: CAP })] as const })
const eoaTermsBefore = await revertName(() => publicClient.simulateContract({ account: eoa, ...termsCall(10) }))
console.log(`  before: the setup EOA's setData(${mmA}, ${KEY_TERMS}) ${eoaTermsBefore ? `reverts ${eoaTermsBefore}` : 'is allowed (simulated)'}`)
// Runs the CLI and reports whether anything was mined meanwhile: anvil mines one block per transaction.
async function handoff(...flags: string[]) {
  console.log(`\n$ npm run handoff -- --safe ${safe}${flags.map((f) => ` ${f}`).join('')}`)
  const mark = () => Promise.all([publicClient.getTransactionCount({ address: eoa }), publicClient.getBlockNumber()])
  const [nonce0, block0] = await mark()
  const r = spawnSync('npm', ['run', '--silent', 'handoff', '--', '--safe', safe, ...flags], { stdio: 'inherit' })
  if (r.status !== 0) throw new Error(`handoff ${flags.join(' ')} exited ${r.status}`)
  const [nonce1, block1] = await mark()
  return { sentNothing: nonce0 === nonce1 && block0 === block1, detail: `setup EOA nonce ${nonce0} → ${nonce1}, block ${block0} → ${block1}` }
}
const dry = await handoff()
ok(dry.sentNothing, `the dry run sent no transaction (${dry.detail})`)

// The same plan the dry run printed: each live subname as unregister, then register to the Safe with the same
// values, all before the first revocation. Expired names are not in it.
const plan = planHandoff(s0.state, eoa, safe, targets)
const firstRevoke = plan.findIndex((c) => c.step === 'revoke')
const reissued = s0.state.subnames.filter((n) => n.status === 'live' && !same(n.owner, safe))
for (const n of reissued) {
  const i = plan.findIndex((c) => c.step === 'unregister' && c.reissue?.name === n.sub.name)
  const reg = plan[i + 1]
  ok(
    i >= 0 && reg?.step === 'register' && reg.reissue?.name === n.sub.name && same(reg.args[1] as Address, safe) && sameValues(reg.reissue.values, n) && i + 1 < firstRevoke,
    `plan ${i + 1}-${i + 2}: unregister(${n.sub.label}), register(${n.sub.label}) to the Safe with the same values, before the first revocation (${firstRevoke + 1})`,
  )
}
for (const n of s0.state.subnames.filter((x) => x.status === 'expired')) {
  ok(!plan.some((c) => c.reissue?.name === n.sub.name), `plan skips ${n.sub.name}, expired ${iso(n.expiry)}`)
}

await handoff('--execute')
const again = await handoff('--execute')
ok(again.sentNothing, `the second --execute sent no transaction (${again.detail})`)

step('4. after the handoff: owners, values and records')
const s1 = await snapshot()
ok(same(s1.state.desk.owner, safe), `${DESK_NAME}: owner the Safe`)
for (const n0 of reissued) {
  const n1 = s1.state.subnames.find((x) => x.sub.name === n0.sub.name)!
  ok(same(n1.owner, safe) && sameValues(n1, n0), `${n1.sub.name}: owner the Safe; ${describeValues(n1, targets)}, as before`)
  const r0 = s0.records.get(n0.sub.name)
  const r1 = s1.records.get(n1.sub.name)
  if (!r0) continue
  const termsSame = JSON.stringify(r0.terms, (_, v) => (typeof v === 'bigint' ? v.toString() : v)) === JSON.stringify(r1?.terms, (_, v) => (typeof v === 'bigint' ? v.toString() : v))
  ok(!!r1 && same(r1.addr, r0.addr) && termsSame, `${n1.sub.name}: ${recordLine(r1!)}, as before`)
}
for (const n0 of s0.state.subnames.filter((x) => x.status === 'expired')) {
  const n1 = s1.state.subnames.find((x) => x.sub.name === n0.sub.name)!
  ok(n1.status === 'expired' && n1.expiry === n0.expiry, `${n1.sub.name}: still expired ${iso(n1.expiry)}, not reissued`)
}

step('5. after the handoff: who can write')
const eoaTermsAfter = await revertName(() => publicClient.simulateContract({ account: eoa, ...termsCall(1) }))
ok(eoaTermsAfter === 'EACUnauthorizedAccountRoles', `the setup EOA's setData(${mmA}, ${KEY_TERMS}) reverts: ${eoaTermsAfter}`)
// The same call sent for real from the impersonated setup EOA, with a fixed gas limit so it is mined and not estimated.
const deniedHash = await eoaWallet.writeContract({ ...termsCall(1), gas: 200_000n })
const denied = await publicClient.waitForTransactionReceipt({ hash: deniedHash })
ok(denied.status === 'reverted', `sent from the setup EOA, it is mined as reverted in block ${denied.blockNumber} (${txUrl(deniedHash)})`)

// A Safe transaction in the three steps the real owners use: propose, each owner signs with only their own key, execute.
async function safeSetTerms(sSellBps: number) {
  const pending = await proposeSafeTx(safe, { to: resolver, data: encodeFunctionData(termsCall(sSellBps)) })
  const signatures = [await signSafeTx(pending, owner1.key), await signSafeTx(pending, owner2.key)]
  const { hash } = await execSafeTx(pending, signatures, owner1.key)
  const now = (await publicClient.getBlock()).timestamp
  const terms = (await readRecords(resolver, mmA, now)).terms
  console.log(`  Safe tx nonce ${pending.tx.nonce} ${pending.safeTxHash}`)
  console.log(`    signed by owner 1 ${short(owner1.address)} and owner 2 ${short(owner2.address)}, executed by owner 1 in ${hash}`)
  ok(terms?.sSellBps === sSellBps && terms.sBuyBps === 10 && terms.cap === CAP, `${mmA} ${KEY_TERMS} now reads sell ${sSellBps} bp, buy 10 bp, cap 50 ETH`)
}
await safeSetTerms(4)
await safeSetTerms(3) // back to the live sell width, so `npm run verify -- --safe` still passes

const agentAddress = agent.account.address
const [canSpread, spreadRoles] = await Promise.all([
  publicClient.readContract({ ...R, functionName: 'hasRoles', args: [keyResource(KEY_SPREAD), RESOLVER.ROLE_SET_DATA, agentAddress] }),
  publicClient.readContract({ ...R, functionName: 'roles', args: [keyResource(KEY_SPREAD), agentAddress] }),
])
ok(canSpread, `risk agent ${short(agentAddress)} (risk.${AGENTS_NAME}) still holds its key-scoped ${KEY_SPREAD} role (${toHex(spreadRoles)})`)
const validUntil = (await publicClient.getBlock()).timestamp + 3600n
await send(agent, { ...R, functionName: 'setData', args: [dnsEncode(mmA), KEY_SPREAD, encodeSpread({ sellBps: 2, buyBps: 8, validUntil })], label: `agent writes ${KEY_SPREAD} on ${mmA}` })
const spread = (await readRecords(resolver, mmA, (await publicClient.getBlock()).timestamp)).spread
ok(spread?.sellBps === 2 && spread.buyBps === 8, `${mmA} ${KEY_SPREAD} now reads sell 2 bp / buy 8 bp, written by the agent`)

console.log(`\nfork demo passed. Next: npm run verify -- --safe ${safe}`)
