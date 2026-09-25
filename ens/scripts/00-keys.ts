// Fill missing testnet keys in .env and print the addresses. Existing keys are left alone.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import type { Hex } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

const ENV = new URL('../.env', import.meta.url)
const EXAMPLE = new URL('../.env.example', import.meta.url)
const KEYS = ['TREASURY_PK', 'AGENT_PK', 'MM_A_PK', 'MM_B_PK', 'MM_C_PK'] as const

let text = readFileSync(existsSync(ENV) ? ENV : EXAMPLE, 'utf8')
for (const key of KEYS) {
  const line = new RegExp(`^${key}=(.*)$`, 'm')
  const current = text.match(line)?.[1]?.trim()
  if (current && /^0x[0-9a-fA-F]{64}$/.test(current)) continue
  const pk = generatePrivateKey()
  text = line.test(text) ? text.replace(line, `${key}=${pk}`) : `${text.trimEnd()}\n${key}=${pk}\n`
}
writeFileSync(ENV, text)

console.log('Testnet keys are in packages/ens/.env (gitignored). Addresses:')
for (const key of KEYS) {
  const pk = text.match(new RegExp(`^${key}=(0x[0-9a-fA-F]{64})$`, 'm'))![1] as Hex
  console.log(`  ${key.replace('_PK', '').padEnd(8)} ${privateKeyToAccount(pk).address}`)
}
console.log('\nFund TREASURY with ~0.05 Sepolia ETH. The other wallets are funded by the scripts as needed.')
