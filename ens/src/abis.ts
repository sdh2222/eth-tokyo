import { parseAbi } from 'viem'

// Signatures below are copied from the Blockscout-verified ABIs in ../abis/*.json.
// The deployed ENSv2 contracts differ from contracts-v2@main; do not "fix" these from the repo.

export const ethRegistrarAbi = parseAbi([
  'function isAvailable(string label) view returns (bool)',
  'function getRegisterPrice(string label, uint64 duration, address paymentToken) view returns (uint256 base, uint256 premium)',
  'function makeCommitment(string label, address owner, bytes32 secret, address subregistry, address resolver, uint64 duration, bytes32 referrer) pure returns (bytes32)',
  'function commit(bytes32 commitment)',
  'function commitmentAt(bytes32 commitment) view returns (uint64)',
  'function register(string label, address owner, bytes32 secret, address subregistry, address resolver, uint64 duration, address paymentToken, bytes32 referrer) returns (uint256)',
  'function MIN_COMMITMENT_AGE() view returns (uint64)',
  'function MAX_COMMITMENT_AGE() view returns (uint64)',
  'function MIN_REGISTER_DURATION() view returns (uint64)',
])

// Shared by ETHRegistry (PermissionedRegistry) and UserRegistry.
export const registryAbi = parseAbi([
  'function initialize((address account, uint256 roleBitmap)[] grants)',
  'function register(string label, address owner, address registry, address resolver, uint256 roleBitmap, uint64 expiry) returns (uint256)',
  'function findExpiry(string label) view returns (uint64)',
  'function getExpiry(uint256 anyId) view returns (uint64)',
  'function getOwner(uint256 anyId) view returns (address)',
  'function getResolver(string label) view returns (address)',
  'function getSubregistry(string label) view returns (address)',
  'function setSubregistry(uint256 anyId, address registry)',
  'function setResolver(uint256 anyId, address resolver)',
  'function roles(uint256 anyId, address account) view returns (uint256)',
  'function getTokenId(uint256 anyId) view returns (uint256)',
  'function isEmancipated() view returns (bool)',
  'function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes data)',
  'function unsafeTransfer(address to, uint256 tokenId, bytes data)',
  'error EACUnauthorizedAccountRoles(uint256 resource, uint256 roleBitmap, address account)',
  'error EACCannotGrantRoles(uint256 resource, uint256 roleBitmap, address account)',
  'error LabelAlreadyRegistered(string label)',
  'error CannotSetPastExpiry(uint64 expiry)',
  'error TransferDisallowed(uint256 tokenId, address from)',
  'error TransferUnsafeUntilRegistryIsEmancipated()',
  'error TransferUnsafeWithMultipleAssignees(uint256 tokenId, address from)',
  'error ERC1155InvalidReceiver(address receiver)',
  'error ERC1155MissingApprovalForAll(address operator, address owner)',
])

// EnhancedAccessControl root-role calls. The resolver and every PermissionedRegistry share them;
// on a registry, roles(0, account) reads the root resource too.
export const rootRolesAbi = parseAbi([
  'function roles(uint256 resource, address account) view returns (uint256)',
  'function grantRootRoles(uint256 roleBitmap, address account) returns (bool)',
  'function revokeRootRoles(uint256 roleBitmap, address account) returns (bool)',
  'error EACUnauthorizedAccountRoles(uint256 resource, uint256 roleBitmap, address account)',
  'error EACCannotGrantRoles(uint256 resource, uint256 roleBitmap, address account)',
  'error EACCannotRevokeRoles(uint256 resource, uint256 roleBitmap, address account)',
])

export const resolverAbi = parseAbi([
  'function initialize((address account, uint256 roleBitmap)[] grants, bytes[] calls)',
  'function setAddress(bytes name, uint256 coinType, bytes addressBytes)',
  'function setData(bytes name, string key, bytes value)',
  'function setText(bytes name, string key, string value)',
  'function multicall(bytes[] calls) returns (bytes[] results)',
  'function resolve(bytes name, bytes data) view returns (bytes)',
  'function grantSetterRoles(bytes setter, address account) returns (bool)',
  'function grantRootRoles(uint256 roleBitmap, address account) returns (bool)',
  'function revokeRoles(uint256 resource, uint256 roleBitmap, address account) returns (bool)',
  'function roles(uint256 resource, address account) view returns (uint256)',
  'function hasRoles(uint256 resource, uint256 roleBitmap, address account) view returns (bool)',
  'function hasRootRoles(uint256 roleBitmap, address account) view returns (bool)',
  'function decodeSetter(bytes setter) pure returns (bytes arg, uint256 resource, uint256 roleBitmap)',
  'function getRecordId(bytes32 node) view returns (uint256)',
  'error EACUnauthorizedAccountRoles(uint256 resource, uint256 roleBitmap, address account)',
  'error EACCannotGrantRoles(uint256 resource, uint256 roleBitmap, address account)',
  'error InvalidEVMAddress(bytes addressBytes)',
  'error UnsupportedResolverProfile(bytes4 selector)',
])

// Profile calls passed as `data` into resolver.resolve(name, data). The node argument is ignored by the resolver.
export const profileAbi = parseAbi([
  'function addr(bytes32 node) view returns (address)',
  'function data(bytes32 node, string key) view returns (bytes)',
  'function text(bytes32 node, string key) view returns (string)',
  'function multicall(bytes[] calls) returns (bytes[] results)',
])

export const factoryAbi = parseAbi([
  'function deployProxy(address implementation, uint256 salt, bytes data) returns (address proxy)',
  'event ProxyDeployed(address indexed sender, address indexed proxyAddress, uint256 salt, address implementation)',
])

export const erc20Abi = parseAbi([
  'function mint(address to, uint256 amount)',
  'function approve(address spender, uint256 value) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
])
