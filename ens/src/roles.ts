// Role bits as DEPLOYED on Sepolia (read from the Blockscout-verified source, 2026-09-25).
// contracts-v2@main has different values (e.g. ROLE_SET_DATA is 1<<36 there, 1<<24 here). Trust these.

const admin = (roles: bigint) => roles << 128n

/** PermissionedResolverLib (deployed) */
export const RESOLVER = {
  ROLE_SET_ADDRESS: 1n << 0n,
  ROLE_SET_TEXT: 1n << 4n,
  ROLE_SET_CONTENTHASH: 1n << 8n,
  ROLE_SET_ABI: 1n << 12n,
  ROLE_SET_INTERFACE: 1n << 16n,
  ROLE_SET_NAME: 1n << 20n,
  ROLE_SET_DATA: 1n << 24n,
  ROLE_LINK: 1n << 28n,
  ROLE_CAN_NAME: 1n << 120n,
  ROLE_UPGRADE: 1n << 124n,
} as const

/** RegistryRolesLib (deployed) */
export const REGISTRY = {
  ROLE_REGISTRAR: 1n << 0n,
  ROLE_REGISTER_RESERVED: 1n << 4n,
  ROLE_SET_PARENT: 1n << 8n,
  ROLE_UNREGISTER: 1n << 12n,
  ROLE_RENEW: 1n << 16n,
  ROLE_SET_SUBREGISTRY: 1n << 20n,
  ROLE_SET_RESOLVER: 1n << 24n,
  ROLE_CAN_TRANSFER_ADMIN: (1n << 28n) << 128n,
  ROLE_SET_URI: 1n << 36n,
  ROLE_CAN_NAME: 1n << 120n,
  ROLE_UPGRADE: 1n << 124n,
} as const

const allOf = (o: Record<string, bigint>) => Object.values(o).reduce((a, b) => a | b, 0n)

/** Everything the treasury holds on its own resolver: every role plus its admin bit. */
export const RESOLVER_ROOT_ALL = (() => {
  const roles = allOf(RESOLVER)
  return roles | admin(roles)
})()

/** Everything the treasury holds on its own subregistries. ROLE_CAN_TRANSFER_ADMIN is already an admin bit. */
export const REGISTRY_ROOT_ALL = (() => {
  const { ROLE_CAN_TRANSFER_ADMIN, ...rest } = REGISTRY
  const roles = allOf(rest)
  return roles | admin(roles) | ROLE_CAN_TRANSFER_ADMIN
})()
