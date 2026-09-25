// Deploy the treasury resolver and three subregistries, then wire desk.eth → clients/agents.
// Idempotent: every step checks chain state (or deployments/sepolia.json) before sending.
import { type Address } from 'viem'
import { registryAbi, resolverAbi } from '../src/abis.js'
import { ADDR, AGENTS_NAME, CLIENTS_NAME, DESK_LABEL, DESK_NAME, publicClient, wallet } from '../src/config.js'
import { loadDeployment, saveDeployment } from '../src/deployments.js'
import { dnsEncode, KEY_DEPLOYMENT, labelId } from '../src/encode.js'
import { deployProxyCall, registryDeployArgs, resolverDeployArgs } from '../src/setup.js'
import { send } from '../src/tx.js'

const w = wallet('TREASURY_PK')
const treasury = w.account.address
const reg = (address: Address) => ({ address, abi: registryAbi }) as const

const deskOwner = await publicClient.readContract({ ...reg(ADDR.ethRegistry), functionName: 'getOwner', args: [labelId(DESK_LABEL)] })
if (deskOwner.toLowerCase() !== treasury.toLowerCase()) throw new Error(`${DESK_NAME} is not owned by the treasury — run \`npm run register\` first`)
const deskExpiry = await publicClient.readContract({ ...reg(ADDR.ethRegistry), functionName: 'findExpiry', args: [DESK_LABEL] })
console.log(`setup ${DESK_NAME} (treasury ${treasury})`)

// 1. Treasury resolver (proxy of PermissionedResolverImpl), with the default record's capPerFill = 0.
let d = loadDeployment()
if (!d.resolver) {
  const { result } = await send(w, { ...deployProxyCall(resolverDeployArgs(treasury)), label: 'deploy treasury resolver' })
  d = saveDeployment((x) => void (x.resolver = result as Address))
}
const resolver = d.resolver!

// 2. Subregistries: desk.eth's children, clients.desk.eth's children, agents.desk.eth's children.
for (const tag of ['desk', 'clients', 'agents'] as const) {
  if (d.registries?.[tag]) continue
  const { result } = await send(w, { ...deployProxyCall(registryDeployArgs(treasury, tag)), label: `deploy ${tag} registry` })
  d = saveDeployment((x) => void (x.registries = { ...x.registries, [tag]: result as Address }))
}
const { desk: deskReg, clients: clientsReg, agents: agentsReg } = d.registries as Required<NonNullable<typeof d.registries>>

// 3. Point desk.eth at its subregistry and the treasury resolver.
const eth = reg(ADDR.ethRegistry)
if ((await publicClient.readContract({ ...eth, functionName: 'getSubregistry', args: [DESK_LABEL] })).toLowerCase() !== deskReg.toLowerCase()) {
  await send(w, { ...eth, functionName: 'setSubregistry', args: [labelId(DESK_LABEL), deskReg], label: `${DESK_NAME} → subregistry` })
}
if ((await publicClient.readContract({ ...eth, functionName: 'getResolver', args: [DESK_LABEL] })).toLowerCase() !== resolver.toLowerCase()) {
  await send(w, { ...eth, functionName: 'setResolver', args: [labelId(DESK_LABEL), resolver], label: `${DESK_NAME} → resolver` })
}

// 4. clients.desk.eth and agents.desk.eth, owned by the treasury, no roles for anyone else (roleBitmap 0).
const now = (await publicClient.getBlock()).timestamp
for (const [label, subregistry] of [['clients', clientsReg], ['agents', agentsReg]] as const) {
  const expiry = await publicClient.readContract({ ...reg(deskReg), functionName: 'findExpiry', args: [label] })
  if (expiry > now) continue
  await send(w, {
    ...reg(deskReg),
    functionName: 'register',
    args: [label, treasury, subregistry, resolver, 0n, deskExpiry],
    label: `register ${label}.${DESK_NAME}`,
  })
}

// 5. Publish where everything lives, for the web app and judges (text record, not read by the router).
const deployment = JSON.stringify({ v: 1, resolver, registries: d.registries, aqua: '0x1111113ccf1426a8e30e2bff5e005d929bf6a90a' })
await send(w, { address: resolver, abi: resolverAbi, functionName: 'setText', args: [dnsEncode(DESK_NAME), KEY_DEPLOYMENT, deployment], label: `${KEY_DEPLOYMENT} text` })

console.log(`  resolver ${resolver}\n  ${DESK_NAME} → ${deskReg}\n  ${CLIENTS_NAME} → ${clientsReg}\n  ${AGENTS_NAME} → ${agentsReg}`)
