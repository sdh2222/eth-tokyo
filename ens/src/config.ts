import { config } from 'dotenv'
config({ quiet: true })
import { createPublicClient, createWalletClient, http, type Address, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

export const RPC_URL = process.env.RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com'

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

export const DESK_LABEL = process.env.DESK_LABEL ?? 'desk'
export const DESK_NAME = `${DESK_LABEL}.eth`
export const CLIENTS_NAME = `clients.${DESK_NAME}`
export const AGENTS_NAME = `agents.${DESK_NAME}`

export const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC_URL) })

export function account(envKey: string) {
  const pk = process.env[envKey] as Hex | undefined
  if (!pk) throw new Error(`${envKey} is missing in .env — run \`npm run keys\` first`)
  return privateKeyToAccount(pk)
}

export function wallet(envKey: string) {
  return createWalletClient({ account: account(envKey), chain: sepolia, transport: http(RPC_URL) })
}

export type Wallet = ReturnType<typeof wallet>
