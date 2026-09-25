// Give the risk agent exactly two keys: desk.spread (data) and desk.stats (text). Then prove the boundary:
// it can write desk.spread, and it cannot write desk.terms or addr (EACUnauthorizedAccountRoles).
// Pass --send-revert to also mine the failing desk.terms write, so the demo has a tx hash to show.
import { encodeFunctionData, parseEther, zeroAddress, type Hex } from 'viem'
import { registryAbi, resolverAbi } from '../src/abis.js'
import { account, AGENTS_NAME, CLIENTS_NAME, publicClient, wallet } from '../src/config.js'
import { loadDeployment, requireField, saveDeployment } from '../src/deployments.js'
import { COIN_TYPE_ETH, dnsEncode, encodeSpread, encodeTerms, KEY_SPREAD, KEY_STATS, KEY_TERMS, keyResource } from '../src/encode.js'
import { RESOLVER } from '../src/roles.js'
import { revertName, send, txUrl } from '../src/tx.js'

const treasuryWallet = wallet('TREASURY_PK')
const treasury = treasuryWallet.account.address
const agentWallet = wallet('AGENT_PK')
const agent = agentWallet.account.address
const d = loadDeployment()
const resolver = requireField(d.resolver, 'resolver', 'setup')
const agentsReg = requireField(d.registries?.agents, 'agents registry', 'setup')
const deskExpiry = BigInt(requireField(d.desk?.expiry, 'desk expiry', 'register'))
const agentName = `risk.${AGENTS_NAME}`
const target = `mm-a.${CLIENTS_NAME}`
const R = { address: resolver, abi: resolverAbi } as const

// 1. risk.agents.<desk>.eth → agent address, so spread changes are attributable by name.
const now = (await publicClient.getBlock()).timestamp
if ((await publicClient.readContract({ address: agentsReg, abi: registryAbi, functionName: 'findExpiry', args: ['risk'] })) <= now) {
  await send(treasuryWallet, { address: agentsReg, abi: registryAbi, functionName: 'register', args: ['risk', treasury, zeroAddress, resolver, 0n, deskExpiry], label: `register ${agentName}` })
  await send(treasuryWallet, { ...R, functionName: 'setAddress', args: [dnsEncode(agentName), COIN_TYPE_ETH, agent], label: `${agentName} addr` })
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

// 3. Gas for the agent.
if ((await publicClient.getBalance({ address: agent })) < parseEther('0.003')) {
  const hash = await treasuryWallet.sendTransaction({ to: agent, value: parseEther('0.01') })
  await publicClient.waitForTransactionReceipt({ hash })
  console.log(`  ✓ fund agent 0.01 ETH  ${txUrl(hash)}`)
}

// 4. The boundary.
const validUntil = (await publicClient.getBlock()).timestamp + 3600n
await send(agentWallet, { ...R, functionName: 'setData', args: [dnsEncode(target), KEY_SPREAD, encodeSpread({ spreadBps: 40, validUntil })], label: `agent writes ${KEY_SPREAD} on ${target}` })

const deniedTerms = { ...R, functionName: 'setData' as const, args: [dnsEncode(target), KEY_TERMS, encodeTerms({ tierBps: 1, capPerFill: 10n ** 12n })] as const }
const deniedAddr = { ...R, functionName: 'setAddress' as const, args: [dnsEncode(target), COIN_TYPE_ETH, agent as Hex] as const }
for (const [what, call] of [[`${KEY_TERMS}`, deniedTerms], ['addr', deniedAddr]] as const) {
  const reason = await revertName(() => publicClient.simulateContract({ account: agent, ...call } as never))
  if (reason !== 'EACUnauthorizedAccountRoles') throw new Error(`agent write to ${what} should revert with EACUnauthorizedAccountRoles, got ${reason}`)
  console.log(`  ✓ agent cannot write ${what}: ${reason}`)
}

if (process.argv.includes('--send-revert')) {
  // Skip estimation (it would fail) so the revert is mined and visible on the explorer.
  const hash = await agentWallet.writeContract({ ...deniedTerms, gas: 200_000n })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log(`  ✓ mined the denied ${KEY_TERMS} write (status ${receipt.status})  ${txUrl(hash)}`)
}

saveDeployment((x) => void (x.agent = { name: agentName, address: agent }))
