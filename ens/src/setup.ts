import { encodeFunctionData, keccak256, stringToBytes, type Address, type Hex } from 'viem'
import { factoryAbi, registryAbi, resolverAbi } from './abis.js'
import { ADDR, DESK_NAME } from './config.js'
import { dnsEncode, encodeTerms, KEY_TERMS } from './encode.js'
import { REGISTRY_ROOT_ALL, RESOLVER_ROOT_ALL } from './roles.js'

/**
 * The default record is the record of the root name (0x00). Names without their own record fall back to it
 * (desk-system §6.2). cap = 0, so DeskPrice reverts DeskPriceNoTerms for any such name; the widths are the web app's
 * cut-off values. Fresh deployments only: the Sepolia resolver keeps its pre-#21 96-byte default (cap 0), which the
 * router rejects on length.
 */
export const DEFAULT_TERMS = { sSellBps: 3, sBuyBps: 10, cap: 0n }

const salt = (tag: string) => BigInt(keccak256(stringToBytes(`${DESK_NAME}/${tag}`)))

/** deployProxy args for the treasury's PermissionedResolver. Root roles go to the treasury only. */
export function resolverDeployArgs(treasury: Address): readonly [Address, bigint, Hex] {
  const defaultTerms = encodeFunctionData({
    abi: resolverAbi,
    functionName: 'setData',
    args: [dnsEncode(''), KEY_TERMS, encodeTerms(DEFAULT_TERMS)],
  })
  const init = encodeFunctionData({
    abi: resolverAbi,
    functionName: 'initialize',
    args: [[{ account: treasury, roleBitmap: RESOLVER_ROOT_ALL }], [defaultTerms]],
  })
  return [ADDR.permissionedResolverImpl, salt('resolver'), init]
}

/** deployProxy args for one of the treasury's UserRegistries (desk / clients / agents). */
export function registryDeployArgs(treasury: Address, tag: 'desk' | 'clients' | 'agents'): readonly [Address, bigint, Hex] {
  const init = encodeFunctionData({
    abi: registryAbi,
    functionName: 'initialize',
    args: [[{ account: treasury, roleBitmap: REGISTRY_ROOT_ALL }]],
  })
  return [ADDR.userRegistryImpl, salt(`registry/${tag}`), init]
}

export const deployProxyCall = (args: readonly [Address, bigint, Hex]) =>
  ({ address: ADDR.verifiableFactory, abi: factoryAbi, functionName: 'deployProxy' as const, args }) as const
