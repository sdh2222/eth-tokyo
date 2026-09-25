// Acceptance checks for the ENS part (ENS_구현_매뉴얼.md §7 step 6 and §10). Exits 1 if a required check fails.
import { decodeAbiParameters, encodeFunctionData, namehash, parseAbi, parseUnits } from 'viem'
import { profileAbi, registryAbi, resolverAbi } from '../src/abis.js'
import { ADDR, CLIENTS_NAME, DESK_LABEL, DESK_NAME, publicClient } from '../src/config.js'
import { loadDeployment, requireField } from '../src/deployments.js'
import { dnsEncode, encodeTakerName, KEY_SPREAD, KEY_TERMS, keyResource, labelId } from '../src/encode.js'
import { readClient, readRecords } from '../src/read.js'
import { RESOLVER } from '../src/roles.js'
import { DEFAULT_TERMS } from '../src/setup.js'

let failed = 0
const check = (ok: boolean, what: string, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${what}${detail ? `  (${detail})` : ''}`)
  if (!ok) failed++
}
const info = (what: string) => console.log(`· ${what}`)
const iso = (t: bigint) => new Date(Number(t) * 1000).toISOString()
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

const d = loadDeployment()
// Reads only public addresses from deployments/sepolia.json, so a reviewer can run this without any keys.
const treasury = requireField(d.treasury, 'treasury', 'register')
const resolver = requireField(d.resolver, 'resolver', 'setup')
const now = (await publicClient.getBlock()).timestamp
const eth = { address: ADDR.ethRegistry, abi: registryAbi } as const

// 1. desk.eth itself
const [owner, deskExpiry, deskResolver, deskSub] = await Promise.all([
  publicClient.readContract({ ...eth, functionName: 'getOwner', args: [labelId(DESK_LABEL)] }),
  publicClient.readContract({ ...eth, functionName: 'findExpiry', args: [DESK_LABEL] }),
  publicClient.readContract({ ...eth, functionName: 'getResolver', args: [DESK_LABEL] }),
  publicClient.readContract({ ...eth, functionName: 'getSubregistry', args: [DESK_LABEL] }),
])
check(same(owner, treasury), `${DESK_NAME} owned by treasury`, owner)
check(deskExpiry > now, `${DESK_NAME} not expired`, iso(deskExpiry))
check(same(deskResolver, resolver), `${DESK_NAME} resolver is the treasury resolver`)
check(same(deskSub, d.registries?.desk ?? ''), `${DESK_NAME} subregistry wired`)

// 2. MM names, as the router's gate would see them
const mmA = await readClient(`mm-a.${CLIENTS_NAME}`)
check(mmA.gateOk, `${mmA.name} passes the gate (3-level expiry + resolver + terms)`)
check(same(mmA.addr, requireField(d.clients?.[mmA.name]?.address, 'mm-a', 'clients')), `${mmA.name} addr = the recorded MM_A address`)
check(mmA.termsValid && mmA.terms?.tierBps === 10 && mmA.terms?.capPerFill === parseUnits('100000', 6), `${mmA.name} desk.terms = tier 10 bps / cap 100,000 USDC (96 bytes)`, JSON.stringify(mmA.terms, (_, v) => (typeof v === 'bigint' ? v.toString() : v)))
check(mmA.expiries.length === 3, `${mmA.name} expiry read at 3 levels`, mmA.expiries.map((e) => `${e.name} ${iso(e.expiry)}`).join(' | '))

const mmB = await readClient(`mm-b.${CLIENTS_NAME}`)
check(mmB.gateOk && mmB.terms?.tierBps === 25, `${mmB.name} passes with a different tier (25 bps)`)

const mmC = await readClient(`mm-c.${CLIENTS_NAME}`)
info(`${mmC.name} expires ${iso(mmC.expiries.at(-1)!.expiry)} → gate ${mmC.gateOk ? 'OPEN' : 'CLOSED (NameExpired)'} — rerun 03-clients before demo scene 3`)

// 3. Default record: a name with no record of its own must read capPerFill = 0
const orphan = await readRecords(resolver, `nobody.${CLIENTS_NAME}`, now)
check(orphan.terms?.capPerFill === DEFAULT_TERMS.capPerFill && !orphan.termsValid, 'unrecorded name falls back to the default record: capPerFill 0, so the router reverts DeskPriceNoTerms')

// 4. Agent boundary
const agent = requireField(d.agent, 'agent', 'agent').address
const R = { address: resolver, abi: resolverAbi } as const
const [canSpread, canTerms, isRoot] = await Promise.all([
  publicClient.readContract({ ...R, functionName: 'hasRoles', args: [keyResource(KEY_SPREAD), RESOLVER.ROLE_SET_DATA, agent] }),
  publicClient.readContract({ ...R, functionName: 'hasRoles', args: [keyResource(KEY_TERMS), RESOLVER.ROLE_SET_DATA, agent] }),
  publicClient.readContract({ ...R, functionName: 'hasRootRoles', args: [RESOLVER.ROLE_SET_DATA, agent] }),
])
check(canSpread, 'agent can write desk.spread')
check(!canTerms, 'agent cannot write desk.terms')
check(!isRoot, 'agent has no root data role')
info(`${mmA.name} pre-clamp spread: ${mmA.rawSpread ? `${mmA.rawSpread.bps} bps from ${mmA.rawSpread.source}` : 'none'}`)

// 5. Standard clients: UniversalResolverV2 walks the same hierarchy
const ur = parseAbi(['function resolve(bytes name, bytes data) view returns (bytes result, address resolver)'])
try {
  const [result, via] = await publicClient.readContract({
    address: ADDR.universalResolver,
    abi: ur,
    functionName: 'resolve',
    args: [dnsEncode(mmA.name), encodeFunctionData({ abi: profileAbi, functionName: 'addr', args: [namehash(mmA.name)] })],
  })
  const [addr] = decodeAbiParameters([{ type: 'address' }], result)
  check(same(addr, mmA.addr) && same(via, resolver), 'UniversalResolverV2 resolves mm-a via the treasury resolver', `${addr} via ${via}`)
} catch (e) {
  check(false, 'UniversalResolverV2 resolves mm-a', (e as Error).message.split('\n')[0])
}

// 6. What the router person needs
info(`dnsName for ${mmA.name} (takerData = uint8 len ‖ dnsName): ${encodeTakerName(mmA.name)}`)
info(`treasury resolver ${resolver} | clients registry ${d.registries?.clients} | ETHRegistry ${ADDR.ethRegistry}`)

console.log(failed ? `\n${failed} check(s) failed` : '\nall required checks passed')
process.exit(failed ? 1 : 0)
