// Issue MM names under clients.<desk>.eth and write their addr + desk.terms. Idempotent.
// Seeds match the runbook (idea1/해커톤_런북.md): mm-a and mm-b price differently, mm-c expires for demo scene 3.
import { encodeFunctionData, parseEther, zeroAddress, type Hex } from 'viem'
import { registryAbi, resolverAbi } from '../src/abis.js'
import { account, CLIENTS_NAME, publicClient, wallet } from '../src/config.js'
import { loadDeployment, requireField, saveDeployment } from '../src/deployments.js'
import { COIN_TYPE_ETH, dnsEncode, encodeTerms, KEY_TERMS } from '../src/encode.js'
import { readRecords } from '../src/read.js'
import { send } from '../src/tx.js'

const DAY = 86400n
const MM_C_TTL = BigInt(process.env.MM_C_TTL_SECONDS ?? 900) // re-run before the demo to reset the clock

const SEEDS = [
  { label: 'mm-a', envKey: 'MM_A_PK', askBps: 10, bidBps: 25, capPerFill: parseEther('5'), ttl: 30n * DAY },
  { label: 'mm-b', envKey: 'MM_B_PK', askBps: 25, bidBps: 50, capPerFill: parseEther('5'), ttl: 30n * DAY },
  { label: 'mm-c', envKey: 'MM_C_PK', askBps: 10, bidBps: 25, capPerFill: parseEther('5'), ttl: MM_C_TTL },
] as const

const w = wallet('TREASURY_PK')
const treasury = w.account.address
const d = loadDeployment()
const resolver = requireField(d.resolver, 'resolver', 'setup')
const clientsReg = requireField(d.registries?.clients, 'clients registry', 'setup')
const now = (await publicClient.getBlock()).timestamp

for (const seed of SEEDS) {
  const name = `${seed.label}.${CLIENTS_NAME}`
  const mm = account(seed.envKey).address
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

  const current = await readRecords(resolver, name)
  const calls: Hex[] = []
  if (current.addr.toLowerCase() !== mm.toLowerCase()) {
    calls.push(encodeFunctionData({ abi: resolverAbi, functionName: 'setAddress', args: [dnsEncode(name), COIN_TYPE_ETH, mm] }))
  }
  const t = current.terms
  if (!t || t.askBps !== seed.askBps || t.bidBps !== seed.bidBps || t.capPerFill !== seed.capPerFill) {
    calls.push(encodeFunctionData({ abi: resolverAbi, functionName: 'setData', args: [dnsEncode(name), KEY_TERMS, encodeTerms(seed)] }))
  }
  if (calls.length) {
    await send(w, { address: resolver, abi: resolverAbi, functionName: 'multicall', args: [calls], label: `${name} addr + desk.terms` })
  } else {
    console.log(`  = ${name} records already match`)
  }

  saveDeployment((x) => void (x.clients = { ...x.clients, [name]: { address: mm, expiry: expiry.toString() } }))
}
