// Acceptance checks for the ENS part (ENS_구현_매뉴얼.md §7 step 6 and §10). Exits 1 if a required check fails.
// After the handoff to the treasury Safe (requirement 014), run it as `npm run verify -- --safe <address>`.
import { parseArgs } from 'node:util'
import { decodeAbiParameters, encodeFunctionData, getAddress, namehash, parseAbi } from 'viem'
import { profileAbi, registryAbi, resolverAbi } from '../src/abis.js'
import { ADDR, CLIENTS_NAME, DESK_LABEL, DESK_NAME, publicClient } from '../src/config.js'
import { loadDeployment, requireField } from '../src/deployments.js'
import { dnsEncode, encodeTakerName, KEY_SPREAD, KEY_TERMS, keyResource, labelId } from '../src/encode.js'
import { describeValues, deskSubnames, readHandoffState, roleName, rootTargets, sameValues } from '../src/handoff.js'
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
// --safe adds the handoff checks (section 7). From then on the treasury that owns the name is the Safe.
const { values: opts } = parseArgs({ options: { safe: { type: 'string' } } })
const safe = opts.safe === undefined ? null : getAddress(opts.safe)

// 1. desk.eth itself
const [owner, deskExpiry, deskResolver, deskSub] = await Promise.all([
  publicClient.readContract({ ...eth, functionName: 'getOwner', args: [labelId(DESK_LABEL)] }),
  publicClient.readContract({ ...eth, functionName: 'findExpiry', args: [DESK_LABEL] }),
  publicClient.readContract({ ...eth, functionName: 'getResolver', args: [DESK_LABEL] }),
  publicClient.readContract({ ...eth, functionName: 'getSubregistry', args: [DESK_LABEL] }),
])
const handedOff = !safe && !same(owner, treasury) ? '; if it was handed to the Safe, pass --safe <address>' : ''
check(same(owner, safe ?? treasury), `${DESK_NAME} owned by ${safe ? 'the treasury Safe' : 'treasury'}`, owner + handedOff)
check(deskExpiry > now, `${DESK_NAME} not expired`, iso(deskExpiry))
check(same(deskResolver, resolver), `${DESK_NAME} resolver is the treasury resolver`)
check(same(deskSub, d.registries?.desk ?? ''), `${DESK_NAME} subregistry wired`)

// 2. MM names, as the router's gate would see them
const mmA = await readClient(`mm-a.${CLIENTS_NAME}`)
check(mmA.gateOk, `${mmA.name} passes the gate (3-level expiry + resolver + terms)`)
check(same(mmA.addr, requireField(d.clients?.[mmA.name]?.address, 'mm-a', 'clients')), `${mmA.name} addr = the recorded MM_A address`)
const cap = 50n * 10n ** 18n
check(mmA.termsValid && mmA.terms?.sSellBps === 3 && mmA.terms?.sBuyBps === 10 && mmA.terms?.cap === cap, `${mmA.name} desk.terms = sell 3 bp / buy 10 bp / cap 50 ETH`, JSON.stringify(mmA.terms, (_, v) => (typeof v === 'bigint' ? v.toString() : v)))
check(mmA.expiries.length === 3, `${mmA.name} expiry read at 3 levels`, mmA.expiries.map((e) => `${e.name} ${iso(e.expiry)}`).join(' | '))

const mmB = await readClient(`mm-b.${CLIENTS_NAME}`)
check(mmB.gateOk && mmB.terms?.sSellBps === 3 && mmB.terms?.sBuyBps === 10 && mmB.terms?.cap === cap, `${mmB.name} desk.terms = sell 3 bp / buy 10 bp / cap 50 ETH`)

const mmC = await readClient(`mm-c.${CLIENTS_NAME}`)
info(`${mmC.name} expires ${iso(mmC.expiries.at(-1)!.expiry)} → gate ${mmC.gateOk ? 'OPEN' : 'CLOSED (NameExpired)'} — rerun 03-clients before demo scene 3`)

// 3. A name with no record of its own must not be a valid 128-byte terms record.
const orphan = await readRecords(resolver, `nobody.${CLIENTS_NAME}`, now)
check(!orphan.termsValid && (orphan.terms === null || orphan.terms.cap === DEFAULT_TERMS.cap), 'unrecorded name is not valid desk.terms, so the router reverts DeskPriceNoTerms')

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
info(`${mmA.name} stored desk.spread (router does not read it): ${mmA.storedSpread ? `sell ${mmA.storedSpread.sellBps} bp / buy ${mmA.storedSpread.buyBps} bp until ${iso(mmA.storedSpread.validUntil)}` : 'none'}`)

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

// 7. Handoff to the treasury Safe (requirements 014 and 016, desk-system §6.1, §6.3). Check 1 covers <desk>.eth.
if (safe) {
  const targets = rootTargets(d)
  const s = await readHandoffState(targets, deskSubnames(d, targets), treasury, safe)
  for (const r of s.roots) {
    check(r.safe === r.target.all, `${r.target.name}: Safe holds ${r.target.allName} at root`, roleName(r.safe, r.target))
    check(r.eoa === 0n, `${r.target.name}: setup EOA holds no root role`, roleName(r.eoa, r.target))
  }
  check(s.desk.eoaRoles === 0n, `setup EOA holds no role on the ${DESK_NAME} token`, roleName(s.desk.eoaRoles))
  info(`${DESK_NAME} token roles now with the Safe: ${roleName(s.desk.safeRoles)}`)
  // Every live desk subname, against what deployments/ records for it.
  for (const n of s.subnames) {
    if (n.status === 'expired') {
      info(`${n.sub.name} expired ${iso(n.expiry)}: not checked, the Safe registers it itself when it re-arms it`)
      continue
    }
    check(n.status === 'live', `${n.sub.name} registered`, n.status === 'live' ? '' : `UNREGISTERED, recorded live until ${iso(n.sub.recorded.expiry)}`)
    if (n.status !== 'live') continue
    check(same(n.owner, safe), `${n.sub.name} owned by the treasury Safe`, n.owner)
    check(sameValues(n, n.sub.recorded), `${n.sub.name} keeps its recorded expiry, subregistry and resolver`, describeValues(n, targets))
  }
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall required checks passed')
process.exit(failed ? 1 : 0)
