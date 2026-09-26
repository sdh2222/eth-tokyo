// Give the risk agent exactly two keys: desk.spread (data) and desk.stats (text). Then prove the boundary:
// it can write desk.spread, and it cannot write desk.terms or addr (EACUnauthorizedAccountRoles).
// The agent is AGENT_ADDRESS when set (the Aqua lane's wallet: only the address crosses lanes, team decision 09-25),
// otherwise the AGENT_PK wallet. Switching agents (--switch) revokes the recorded one, so exactly one agent writes.
// Pass --send-revert (AGENT_PK only) to also mine the failing desk.terms write, so the demo has a tx hash to show.
import { encodeFunctionData, getAddress, parseEther, zeroAddress, type Address, type Hex } from 'viem'
import { registryAbi, resolverAbi } from '../src/abis.js'
import { AGENTS_NAME, CLIENTS_NAME, publicClient, wallet } from '../src/config.js'
import { loadDeployment, requireField, saveDeployment } from '../src/deployments.js'
import { COIN_TYPE_ETH, dnsEncode, encodeSpread, encodeTerms, KEY_SPREAD, KEY_STATS, KEY_TERMS, keyResource } from '../src/encode.js'
import { readRecords } from '../src/read.js'
import { RESOLVER } from '../src/roles.js'
import { revertName, send, txUrl } from '../src/tx.js'

const given = process.env.AGENT_ADDRESS
if (given && process.argv.includes('--send-revert')) throw new Error('--send-revert needs the agent key (AGENT_PK); AGENT_ADDRESS has none')
const treasuryWallet = wallet('TREASURY_PK')
const treasury = treasuryWallet.account.address
const agentWallet = given ? null : wallet('AGENT_PK')
const agent: Address = given ? getAddress(given) : agentWallet!.account.address
const d = loadDeployment()
const previous = d.agent?.address
const resolver = requireField(d.resolver, 'resolver', 'setup')
const agentsReg = requireField(d.registries?.agents, 'agents registry', 'setup')
const deskExpiry = BigInt(requireField(d.desk?.expiry, 'desk expiry', 'register'))
const agentName = `risk.${AGENTS_NAME}`
const target = `mm-a.${CLIENTS_NAME}`
const R = { address: resolver, abi: resolverAbi } as const
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

// Changing which address is the agent revokes the recorded one, so it has to be asked for.
if (previous && !same(previous, agent) && !process.argv.includes('--switch')) {
  throw new Error(`the recorded agent is ${previous}; running as ${agent} would revoke it. Pass --switch to change agents, or set AGENT_ADDRESS=${previous} to keep it.`)
}

// 1. risk.agents.<desk>.eth → agent address, so spread changes are attributable by name.
const now = (await publicClient.getBlock()).timestamp
if ((await publicClient.readContract({ address: agentsReg, abi: registryAbi, functionName: 'findExpiry', args: ['risk'] })) <= now) {
  await send(treasuryWallet, { address: agentsReg, abi: registryAbi, functionName: 'register', args: ['risk', treasury, zeroAddress, resolver, 0n, deskExpiry], label: `register ${agentName}` })
}
if (!same((await readRecords(resolver, agentName, now)).addr, agent)) {
  await send(treasuryWallet, { ...R, functionName: 'setAddress', args: [dnsEncode(agentName), COIN_TYPE_ETH, agent], label: `${agentName} addr → ${agent}` })
}

// 2. Key-scoped grants. grantRoles() is disabled on this resolver; grantSetterRoles derives resource + role from the setter.
const grants = [
  { key: KEY_SPREAD, role: RESOLVER.ROLE_SET_DATA, setter: encodeFunctionData({ abi: resolverAbi, functionName: 'setData', args: [dnsEncode(''), KEY_SPREAD, '0x'] }) },
  { key: KEY_STATS, role: RESOLVER.ROLE_SET_TEXT, setter: encodeFunctionData({ abi: resolverAbi, functionName: 'setText', args: [dnsEncode(''), KEY_STATS, ''] }) },
]
for (const g of grants) {
  if (await publicClient.readContract({ ...R, functionName: 'hasRoles', args: [keyResource(g.key), g.role, agent] })) continue
  await send(treasuryWallet, { ...R, functionName: 'grantSetterRoles', args: [g.setter, agent], label: `grant agent → ${g.key}` })
}

// 2b. The agent recorded before (if another address) loses both keys: one agent writes the spread.
if (previous && !same(previous, agent)) {
  for (const g of grants) {
    if (!(await publicClient.readContract({ ...R, functionName: 'hasRoles', args: [keyResource(g.key), g.role, previous] }))) continue
    await send(treasuryWallet, { ...R, functionName: 'revokeRoles', args: [keyResource(g.key), g.role, previous], label: `revoke previous agent ${previous} → ${g.key}` })
  }
}

// 3. Gas for our own agent wallet. An agent given by address is funded by the lane that holds its key.
if (agentWallet && (await publicClient.getBalance({ address: agent })) < parseEther('0.003')) {
  const hash = await treasuryWallet.sendTransaction({ to: agent, value: parseEther('0.01') })
  await publicClient.waitForTransactionReceipt({ hash })
  console.log(`  ✓ fund agent 0.01 ETH  ${txUrl(hash)}`)
}

// 4. The boundary. Without the agent's key, the allowed write is simulated from its address instead of sent.
const validUntil = (await publicClient.getBlock()).timestamp + 3600n
const allowed = { ...R, functionName: 'setData' as const, args: [dnsEncode(target), KEY_SPREAD, encodeSpread({ spreadBps: 40, validUntil })] as const }
if (agentWallet) {
  await send(agentWallet, { ...allowed, label: `agent writes ${KEY_SPREAD} on ${target}` })
} else {
  const reason = await revertName(() => publicClient.simulateContract({ account: agent, ...allowed } as never))
  if (reason) throw new Error(`agent ${agent} cannot write ${KEY_SPREAD}: ${reason}`)
  console.log(`  ✓ agent can write ${KEY_SPREAD} (simulated from ${agent}; its key stays with its lane)`)
}

const deniedTerms = { ...R, functionName: 'setData' as const, args: [dnsEncode(target), KEY_TERMS, encodeTerms({ sSellBps: 3, sBuyBps: 10, cap: 50n * 10n ** 18n })] as const }
const deniedAddr = { ...R, functionName: 'setAddress' as const, args: [dnsEncode(target), COIN_TYPE_ETH, agent as Hex] as const }
for (const [what, call] of [[`${KEY_TERMS}`, deniedTerms], ['addr', deniedAddr]] as const) {
  const reason = await revertName(() => publicClient.simulateContract({ account: agent, ...call } as never))
  if (reason !== 'EACUnauthorizedAccountRoles') throw new Error(`agent write to ${what} should revert with EACUnauthorizedAccountRoles, got ${reason}`)
  console.log(`  ✓ agent cannot write ${what}: ${reason}`)
}
if (previous && !same(previous, agent)) {
  const reason = await revertName(() => publicClient.simulateContract({ account: previous, ...allowed } as never))
  if (reason !== 'EACUnauthorizedAccountRoles') throw new Error(`previous agent ${previous} should no longer write ${KEY_SPREAD}, got ${reason}`)
  console.log(`  ✓ previous agent ${previous} cannot write ${KEY_SPREAD}: ${reason}`)
}

if (agentWallet && process.argv.includes('--send-revert')) {
  // Skip estimation (it would fail) so the revert is mined and visible on the explorer.
  const hash = await agentWallet.writeContract({ ...deniedTerms, gas: 200_000n })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log(`  ✓ mined the denied ${KEY_TERMS} write (status ${receipt.status})  ${txUrl(hash)}`)
}

saveDeployment((x) => void (x.agent = { name: agentName, address: agent }))
