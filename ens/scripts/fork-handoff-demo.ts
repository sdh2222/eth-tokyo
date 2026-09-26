// FORK ONLY. Requirement 014 end to end on an anvil Sepolia fork: deploy a 2-of-3 Safe, run the handoff through
// its CLI, then prove who controls what. Refuses any RPC that is not local.
//
//   anvil --fork-url <Sepolia RPC> --chain-id 11155111 --port 8546
//   RPC_URL=http://127.0.0.1:8546 npx tsx scripts/fork-handoff-demo.ts
//
// The Safe's owners here are anvil's default accounts 1-3, derived at run time from anvil's public test mnemonic.
// They are fork-only stand-ins. On the real Safe (T6a), owners 1 and 2 are Aqua-lane people and owner 3 is the ENS
// lane, each with their own key, so a real ENS change needs an Aqua owner to co-sign (src/safe.ts).
import { spawnSync } from 'node:child_process'
import { createTestClient, encodeFunctionData, http, parseEther, parseUnits, toHex, type Address, type Hex } from 'viem'
import { mnemonicToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { registryAbi, resolverAbi } from '../src/abis.js'
import { AGENTS_NAME, CLIENTS_NAME, isLocalRpc, publicClient, rpcHost, RPC_URL, wallet } from '../src/config.js'
import { loadDeployment, requireField } from '../src/deployments.js'
import { dnsEncode, encodeSpread, encodeTerms, KEY_SPREAD, KEY_TERMS, keyResource, labelId } from '../src/encode.js'
import { readRecords } from '../src/read.js'
import { RESOLVER } from '../src/roles.js'
import { deploySafe, execSafeTx, proposeSafeTx, readSafe, signSafeTx } from '../src/safe.js'
import { revertName, send } from '../src/tx.js'

if (!isLocalRpc()) {
  console.error(`fork only: RPC_URL (${rpcHost()}) is not a local RPC`)
  process.exit(1)
}
const chainId = await publicClient.getChainId()
if (chainId !== sepolia.id) throw new Error(`RPC_URL is chain ${chainId}; start anvil with --fork-url <Sepolia RPC> --chain-id 11155111`)

const d = loadDeployment()
const eoa = requireField(d.treasury, 'treasury', 'register')
const resolver = requireField(d.resolver, 'resolver', 'setup')
const agent = wallet('AGENT_PK')
const mmA = `mm-a.${CLIENTS_NAME}`
const R = { address: resolver, abi: resolverAbi } as const
const CAP = parseUnits('100000', 6) // mm-a's seed terms (03-clients)
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

step('2. subname tokens (out of scope, read-only): can the setup EOA move clients.<desk>.eth to the Safe?')
const D = { address: requireField(d.registries?.desk, 'desk registry', 'setup'), abi: registryAbi } as const
const clientsToken = await publicClient.readContract({ ...D, functionName: 'getTokenId', args: [labelId('clients')] })
const [holder, emancipated, tokenRoles] = await Promise.all([
  publicClient.readContract({ ...D, functionName: 'getOwner', args: [labelId('clients')] }),
  publicClient.readContract({ ...D, functionName: 'isEmancipated' }),
  publicClient.readContract({ ...D, functionName: 'roles', args: [labelId('clients'), eoa] }),
])
console.log(`  holder ${holder}, the setup EOA's roles on the token ${tokenRoles}, desk registry emancipated ${emancipated}`)
for (const [fn, args] of [
  ['safeTransferFrom', [eoa, safe, clientsToken, 1n, '0x']],
  ['unsafeTransfer', [safe, clientsToken, '0x']],
] as const) {
  const reason = await revertName(() => publicClient.simulateContract({ account: eoa, ...D, functionName: fn, args } as never))
  console.log(`  ${fn} from the setup EOA: ${reason ? `reverts ${reason}` : 'would succeed'}`)
}

step('3. handoff (npm run handoff), sent from the setup EOA')
const termsCall = (tierBps: number) => ({ ...R, functionName: 'setData' as const, args: [dnsEncode(mmA), KEY_TERMS, encodeTerms({ tierBps, capPerFill: CAP })] as const })
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
await handoff('--execute')
const again = await handoff('--execute')
ok(again.sentNothing, `the second --execute sent no transaction (${again.detail})`)

step('4. after the handoff')
const eoaTermsAfter = await revertName(() => publicClient.simulateContract({ account: eoa, ...termsCall(1) }))
ok(eoaTermsAfter === 'EACUnauthorizedAccountRoles', `the setup EOA's setData(${mmA}, ${KEY_TERMS}) reverts: ${eoaTermsAfter}`)

// A Safe transaction in the three steps the real owners use: propose, each owner signs with only their own key, execute.
async function safeSetTerms(tierBps: number) {
  const pending = await proposeSafeTx(safe, { to: resolver, data: encodeFunctionData(termsCall(tierBps)) })
  const signatures = [await signSafeTx(pending, owner1.key), await signSafeTx(pending, owner2.key)]
  const { hash } = await execSafeTx(pending, signatures, owner1.key)
  const now = (await publicClient.getBlock()).timestamp
  const terms = (await readRecords(resolver, mmA, now)).terms
  console.log(`  Safe tx nonce ${pending.tx.nonce} ${pending.safeTxHash}`)
  console.log(`    signed by owner 1 ${short(owner1.address)} and owner 2 ${short(owner2.address)}, executed by owner 1 in ${hash}`)
  ok(terms?.tierBps === tierBps && terms.capPerFill === CAP, `${mmA} ${KEY_TERMS} now reads tier ${tierBps} bps, cap 100,000 USDC`)
}
await safeSetTerms(11)
await safeSetTerms(10) // back to the seed value, so `npm run verify -- --safe` still passes

const agentAddress = agent.account.address
const [canSpread, spreadRoles] = await Promise.all([
  publicClient.readContract({ ...R, functionName: 'hasRoles', args: [keyResource(KEY_SPREAD), RESOLVER.ROLE_SET_DATA, agentAddress] }),
  publicClient.readContract({ ...R, functionName: 'roles', args: [keyResource(KEY_SPREAD), agentAddress] }),
])
ok(canSpread, `risk agent ${short(agentAddress)} (risk.${AGENTS_NAME}) still holds its key-scoped ${KEY_SPREAD} role (${toHex(spreadRoles)})`)
const validUntil = (await publicClient.getBlock()).timestamp + 3600n
await send(agent, { ...R, functionName: 'setData', args: [dnsEncode(mmA), KEY_SPREAD, encodeSpread({ spreadBps: 40, validUntil })], label: `agent writes ${KEY_SPREAD} on ${mmA}` })
const spread = (await readRecords(resolver, mmA, (await publicClient.getBlock()).timestamp)).spread
ok(spread?.spreadBps === 40, `${mmA} ${KEY_SPREAD} now reads 40 bps, written by the agent`)

console.log(`\nfork demo passed. Next: npm run verify -- --safe ${safe}`)
