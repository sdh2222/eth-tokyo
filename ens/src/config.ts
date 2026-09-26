import { config } from 'dotenv'
config({ quiet: true })
import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPublicClient, createTestClient, createWalletClient, getAddress, http, type Account, type Address, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

export const RPC_URL = process.env.RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com'

/** Host only, so a key embedded in an RPC URL's path or query is never printed. */
export const rpcHost = (url = RPC_URL) => new URL(url).host

/** True for an RPC on this machine (an anvil fork). Scripts that send use it to refuse a real chain by default. */
export const isLocalRpc = (url = RPC_URL) => ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname)

// 확인: docs.ens.domains/learn/deployments 목록 + Blockscout verified source + `cast code` (2026-09-25)
export const ADDR = {
  ethRegistrar: '0xabe76f6c8dfced81aa5a2bb8034202a7136b94ca',
  ethRegistry: '0x657ea849311d3d5823348dded7c2aaafb3ede09e',
  rootRegistry: '0x9703dbd26dab89504490994138cf2c575251a9ce',
  universalResolver: '0x5d25c1d6acbb71b7a28aa7899618a3412a8303e3',
  permissionedResolverImpl: '0x14f09fd05d4585759e54844dc9b00147131cf243',
  userRegistryImpl: '0xa80338aaa8d23831cea25e858d1774534abb0263',
  verifiableFactory: '0x9e726eb570beb6bceb495ab8cda7df517d4e841c',
  mockUSDC: '0x16f95d91dba7da3aca778ec053df0ff6c6a8aa8e',
} as const satisfies Record<string, Address>

// The desk lives under the DAO's own name (desk-system §6.1). dao-treasury-a.eth is the demo DAO.
export const DESK_LABEL = process.env.DESK_LABEL ?? 'dao-treasury-a'
export const DESK_NAME = `${DESK_LABEL}.eth`
export const CLIENTS_NAME = `clients.${DESK_NAME}`
export const AGENTS_NAME = `agents.${DESK_NAME}`

// One record per desk name, so a rename never overwrites an earlier deployment. Public addresses only.
export const DEPLOYMENT_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'deployments', `sepolia.${DESK_LABEL}.json`)

// Reads retry rate-limited requests with backoff (500 ms doubling, 6 times). The public Sepolia RPC answers verify's
// parallel reads with "Rate limit exceeded" (-32005 / HTTP 429), which viem's default 3 short retries do not outlast.
export const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC_URL, { retryCount: 6, retryDelay: 500 }) })

/**
 * FORK_IMPERSONATE=1: fork runs with no testnet key (team security SEC-05, coding agents do not receive keys).
 * wallet('TREASURY_PK') and wallet('AGENT_PK') then send as the addresses recorded in deployments/, which anvil
 * impersonates. Local RPC only: on any other RPC every script stops here, before it reads a key or the network.
 */
export const FORK_IMPERSONATE = process.env.FORK_IMPERSONATE === '1'
if (FORK_IMPERSONATE && !isLocalRpc()) {
  console.error(`refusing FORK_IMPERSONATE=1: RPC_URL (${rpcHost()}) is not a local RPC. Nothing was done.`)
  process.exit(1)
}

const IMPERSONATED: Record<string, (d: { treasury?: string; agent?: { address?: string } }) => string | undefined> = {
  TREASURY_PK: (d) => d.treasury,
  AGENT_PK: (d) => d.agent?.address,
}

function recordedAddress(envKey: string): Address | undefined {
  const d = existsSync(DEPLOYMENT_FILE) ? JSON.parse(readFileSync(DEPLOYMENT_FILE, 'utf8')) : {}
  const address = IMPERSONATED[envKey]?.(d)
  return address ? getAddress(address) : undefined
}

if (FORK_IMPERSONATE) {
  const anvil = createTestClient({ mode: 'anvil', chain: sepolia, transport: http(RPC_URL) })
  for (const envKey of Object.keys(IMPERSONATED)) {
    const address = recordedAddress(envKey)
    if (address) await anvil.impersonateAccount({ address })
  }
}

/** The account behind a key in .env, or with FORK_IMPERSONATE=1 the recorded address as a JSON-RPC account. */
export function account(envKey: string): Account {
  if (FORK_IMPERSONATE) {
    if (!IMPERSONATED[envKey]) throw new Error(`FORK_IMPERSONATE=1 covers ${Object.keys(IMPERSONATED).join(' and ')}, not ${envKey}`)
    const address = recordedAddress(envKey)
    if (!address) throw new Error(`FORK_IMPERSONATE=1: deployments/${basename(DEPLOYMENT_FILE)} records no address for ${envKey}`)
    return { address, type: 'json-rpc' }
  }
  const pk = process.env[envKey] as Hex | undefined
  if (!pk) throw new Error(`${envKey} is missing in .env — run \`npm run keys\`, or on a fork set FORK_IMPERSONATE=1`)
  return privateKeyToAccount(pk)
}

export function wallet(envKey: string) {
  return createWalletClient({ account: account(envKey), chain: sepolia, transport: http(RPC_URL) })
}

export type Wallet = ReturnType<typeof wallet>
