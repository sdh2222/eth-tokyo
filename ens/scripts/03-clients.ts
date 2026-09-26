// Issue MM names under clients.<desk>.eth and write their addr + desk.terms. Idempotent.
// Live terms are sell 3 bp, buy 10 bp, cap 50 ETH. mm-c's short expiry is the expiry scene.
import { encodeFunctionData, getAddress, zeroAddress, type Address, type Hex } from 'viem'
import { registryAbi, resolverAbi } from '../src/abis.js'
import { account, CLIENTS_NAME, publicClient, wallet } from '../src/config.js'
import { loadDeployment, requireField, saveDeployment } from '../src/deployments.js'
import { COIN_TYPE_ETH, dnsEncode, encodeTerms, KEY_TERMS } from '../src/encode.js'
import { readRecords } from '../src/read.js'
import { send } from '../src/tx.js'

const DAY = 86400n
const MM_C_TTL = BigInt(process.env.MM_C_TTL_SECONDS ?? 900) // re-run before the demo to reset the clock

// cap is WETH wei. DeskPrice compares the WETH size of the fill with it.
// Live mm-a and mm-b both store sell 3 bp, buy 10 bp, cap 50 ETH. A re-run must not write the old 96-byte record.
const CAP = 50n * 10n ** 18n
// addrEnv lets the Aqua lane hand over only the bot's address (no key crosses lanes): the name's addr must be the
// account that will call the router, and that account's key stays with the lane that signs.
const SEEDS = [
  { label: 'mm-a', envKey: 'MM_A_PK', addrEnv: 'MM_A_ADDRESS', sSellBps: 3, sBuyBps: 10, cap: CAP, ttl: 30n * DAY },
  { label: 'mm-b', envKey: 'MM_B_PK', addrEnv: 'MM_B_ADDRESS', sSellBps: 3, sBuyBps: 10, cap: CAP, ttl: 30n * DAY },
  { label: 'mm-c', envKey: 'MM_C_PK', addrEnv: 'MM_C_ADDRESS', sSellBps: 3, sBuyBps: 10, cap: CAP, ttl: MM_C_TTL },
] as const

const mmAddress = (seed: (typeof SEEDS)[number]): Address => {
  const given = process.env[seed.addrEnv]
  return given ? getAddress(given) : account(seed.envKey).address
}

// `--only mm-a,mm-b` touches just those names, e.g. repoint two addrs without re-arming an expired mm-c,
// or re-arm mm-c alone right before the demo.
const onlyAt = process.argv.indexOf('--only')
const only = onlyAt >= 0 ? new Set((process.argv[onlyAt + 1] ?? '').split(',').filter(Boolean)) : null
if (only && (only.size === 0 || [...only].some((l) => !SEEDS.some((s) => s.label === l)))) {
  throw new Error(`--only takes a comma-separated subset of ${SEEDS.map((s) => s.label).join(',')}`)
}

const w = wallet('TREASURY_PK')
const treasury = w.account.address
const d = loadDeployment()
const resolver = requireField(d.resolver, 'resolver', 'setup')
const clientsReg = requireField(d.registries?.clients, 'clients registry', 'setup')
const now = (await publicClient.getBlock()).timestamp

for (const seed of SEEDS) {
  if (only && !only.has(seed.label)) continue
  const name = `${seed.label}.${CLIENTS_NAME}`
  const mm = mmAddress(seed)
  let expiry = await publicClient.readContract({ address: clientsReg, abi: registryAbi, functionName: 'findExpiry', args: [seed.label] })
  if (expiry <= now) {
    expiry = now + seed.ttl
    await send(w, {
      address: clientsReg,
      abi: registryAbi,
      functionName: 'register',
      args: [seed.label, treasury, zeroAddress, resolver, 0n, expiry],
      label: `register ${name} (expires ${new Date(Number(expiry) * 1000).toISOString()})`,
    })
  }

  const current = await readRecords(resolver, name, now)
  const calls: Hex[] = []
  const changed: string[] = []
  if (current.addr.toLowerCase() !== mm.toLowerCase()) {
    calls.push(encodeFunctionData({ abi: resolverAbi, functionName: 'setAddress', args: [dnsEncode(name), COIN_TYPE_ETH, mm] }))
    changed.push(`addr → ${mm}`)
  }
  const t = current.terms
  if (!current.termsValid || !t || t.sSellBps !== seed.sSellBps || t.sBuyBps !== seed.sBuyBps || t.cap !== seed.cap) {
    calls.push(encodeFunctionData({ abi: resolverAbi, functionName: 'setData', args: [dnsEncode(name), KEY_TERMS, encodeTerms(seed)] }))
    changed.push('desk.terms')
  }
  if (calls.length) {
    await send(w, { address: resolver, abi: resolverAbi, functionName: 'multicall', args: [calls], label: `${name} ${changed.join(' + ')}` })
  } else {
    console.log(`  = ${name} records already match`)
  }

  saveDeployment((x) => void (x.clients = { ...x.clients, [name]: { address: mm, expiry: expiry.toString() } }))
}
