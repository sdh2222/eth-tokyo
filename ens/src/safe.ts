import protocolKit, { EthSafeSignature, EthSafeTransaction } from '@safe-global/protocol-kit'
import { createWalletClient, getAddress, http, keccak256, parseAbi, parseEventLogs, stringToHex, type Address, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { publicClient, RPC_URL } from './config.js'

// The kit's type declarations describe its CommonJS build, where the class sits under `.default`. tsx loads the ESM
// build, whose default export is the class itself. Take whichever this runtime provides.
type SafeClass = typeof protocolKit.default
const Safe: SafeClass = (protocolKit as unknown as { default?: SafeClass }).default ?? (protocolKit as unknown as SafeClass)

// The treasury Safe (desk-system §4.1, §6.3), through protocol-kit 8.0.7, the pin T0 uses.
//
// Owner keys never meet (team decision): owners 1 and 2 are Aqua-lane people and owner 3 is the ENS lane, and
// no file holds two owner keys. So a Safe transaction goes in three separate steps:
//   proposeSafeTx  anyone, no key: fixes the transaction and its safeTxHash (plain JSON, to pass between lanes)
//   signSafeTx     each owner, with one local key: returns a signature, which is fine to share (the key is not)
//   execSafeTx     any funded account, once the signatures reach the threshold: submits and pays the gas
// Reads go to the Safe contract directly, so the checks do not depend on the kit.

export const safeAbi = parseAbi([
  'function VERSION() view returns (string)',
  'function getOwners() view returns (address[])',
  'function getThreshold() view returns (uint256)',
  'function nonce() view returns (uint256)',
  // Not on the Safe itself: its fallback forwards the call to the fallback handler, which answers.
  'function onERC1155Received(address operator, address from, uint256 id, uint256 value, bytes data) view returns (bytes4)',
  // Safe 1.4.1 indexes txHash (checked: topic 1 of a fork execution receipt is the safeTxHash).
  'event ExecutionSuccess(bytes32 indexed txHash, uint256 payment)',
  'event ExecutionFailure(bytes32 indexed txHash, uint256 payment)',
])

/** keccak256("fallback_manager.handler.address"): where a Safe keeps its fallback handler (FallbackManager.sol). */
const FALLBACK_HANDLER_SLOT = '0x6c9a6c4a39284e37ed1cf53d337577d14212a4870fb976a4366c693b939918d5'
/** IERC1155Receiver.onERC1155Received.selector, the value a receiver returns to accept a token. */
const ERC1155_ACCEPTED = '0xf23a6e61'

export type SafeInfo = {
  address: Address
  version: string
  owners: Address[]
  threshold: bigint
  nonce: bigint
  fallbackHandler: Address
  /** Whether a registry's ERC-1155 receiver check accepts a name sent to this Safe. */
  acceptsErc1155: boolean
}

/** The Safe at `address`, or null when no contract is there. Throws when the contract is not a Safe. */
export async function readSafe(address: Address): Promise<SafeInfo | null> {
  const code = await publicClient.getCode({ address })
  if (!code || code === '0x') return null
  const s = { address, abi: safeAbi } as const
  const [version, owners, threshold, nonce, slot] = await Promise.all([
    publicClient.readContract({ ...s, functionName: 'VERSION' }),
    publicClient.readContract({ ...s, functionName: 'getOwners' }),
    publicClient.readContract({ ...s, functionName: 'getThreshold' }),
    publicClient.readContract({ ...s, functionName: 'nonce' }),
    publicClient.getStorageAt({ address, slot: FALLBACK_HANDLER_SLOT }),
  ]).catch(() => {
    throw new Error(`${address} has code but does not answer as a Safe (VERSION/getOwners/getThreshold/nonce)`)
  })
  const acceptsErc1155 = await publicClient
    .readContract({ ...s, functionName: 'onERC1155Received', args: [address, address, 0n, 1n, '0x'] })
    .then((r) => r === ERC1155_ACCEPTED, () => false)
  const fallbackHandler = getAddress(`0x${(slot ?? '0x').slice(2).padStart(64, '0').slice(24)}`)
  return { address, version, owners: [...owners], threshold, nonce, fallbackHandler, acceptsErc1155 }
}

/** The version T6a's safe-setup deploys. */
const SAFE_VERSION = '1.4.1'

/** protocol-kit wants a uint256 saltNonce, so a readable label is hashed, the same way T6a's safe-setup does. */
export type SafeSpec = { owners: Address[]; threshold: number; saltLabel: string }

/** Deploy the Safe unless it already exists. The fallback handler is protocol-kit's default for Safe 1.4.1. */
export async function deploySafe(spec: SafeSpec, deployerKey: Hex): Promise<{ address: Address; hash: Hex | null }> {
  const kit = await Safe.init({
    provider: RPC_URL,
    signer: deployerKey,
    predictedSafe: {
      safeAccountConfig: { owners: spec.owners, threshold: spec.threshold },
      safeDeploymentConfig: { saltNonce: keccak256(stringToHex(spec.saltLabel)), safeVersion: SAFE_VERSION },
    },
  })
  const address = getAddress(await kit.getAddress())
  if (await kit.isSafeDeployed()) return { address, hash: null }
  const tx = await kit.createSafeDeploymentTransaction()
  const deployer = createWalletClient({ account: privateKeyToAccount(deployerKey), chain: sepolia, transport: http(RPC_URL) })
  const hash = await deployer.sendTransaction({ to: getAddress(tx.to), data: tx.data as Hex, value: BigInt(tx.value) })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success' || !(await kit.isSafeDeployed())) throw new Error(`Safe deployment failed: ${hash}`)
  return { address, hash }
}

/** Every field that fixes a Safe transaction's hash. JSON-safe, so it can travel between lanes as a file. */
export type PendingSafeTx = {
  chainId: number
  safe: Address
  safeTxHash: Hex
  tx: {
    to: Address
    value: string
    data: Hex
    operation: 0 | 1
    safeTxGas: string
    baseGas: string
    gasPrice: string
    gasToken: Address
    refundReceiver: Address
    nonce: number
  }
}

/** One owner's signature over a pending transaction. Public: sharing it gives away nothing. */
export type OwnerSignature = { signer: Address; data: Hex }

/** Fix one call from the Safe at the Safe's current nonce. Needs no key. */
export async function proposeSafeTx(safe: Address, call: { to: Address; data: Hex; value?: bigint }): Promise<PendingSafeTx> {
  const kit = await Safe.init({ provider: RPC_URL, safeAddress: safe })
  const tx = await kit.createTransaction({ transactions: [{ to: call.to, data: call.data, value: (call.value ?? 0n).toString() }] })
  const d = tx.data
  return {
    chainId: Number(await kit.getChainId()),
    safe,
    safeTxHash: (await kit.getTransactionHash(tx)) as Hex,
    tx: {
      to: getAddress(d.to),
      value: d.value,
      data: d.data as Hex,
      operation: d.operation as 0 | 1,
      safeTxGas: d.safeTxGas,
      baseGas: d.baseGas,
      gasPrice: d.gasPrice,
      gasToken: getAddress(d.gasToken),
      refundReceiver: getAddress(d.refundReceiver),
      nonce: d.nonce,
    },
  }
}

/** This owner's signature (EIP-712) over `pending`, made with the one key this process holds. */
export async function signSafeTx(pending: PendingSafeTx, ownerKey: Hex): Promise<OwnerSignature> {
  const kit = await Safe.init({ provider: RPC_URL, signer: ownerKey, safeAddress: pending.safe })
  const tx = new EthSafeTransaction({ ...pending.tx })
  // Sign only what the Safe itself hashes to the agreed safeTxHash (same chain, same nonce, same fields).
  if ((await kit.getTransactionHash(tx)) !== pending.safeTxHash) throw new Error('the pending transaction does not hash to its safeTxHash on this chain')
  const signer = privateKeyToAccount(ownerKey).address
  const signature = (await kit.signTransaction(tx)).getSignature(signer)
  if (!signature) throw new Error(`no signature from ${signer}`)
  return { signer, data: signature.data as Hex }
}

/**
 * Submit `pending` with the collected owner signatures. Any funded account can execute; it only pays the gas.
 * Resolves only when the Safe emitted ExecutionSuccess, so a failed inner call is never reported as done.
 */
export async function execSafeTx(pending: PendingSafeTx, signatures: readonly OwnerSignature[], executorKey: Hex): Promise<{ hash: Hex }> {
  const kit = await Safe.init({ provider: RPC_URL, signer: executorKey, safeAddress: pending.safe })
  const tx = new EthSafeTransaction({ ...pending.tx })
  for (const s of signatures) tx.addSignature(new EthSafeSignature(s.signer, s.data))
  const threshold = await kit.getThreshold()
  if (tx.signatures.size < threshold) throw new Error(`${pending.safeTxHash} has ${tx.signatures.size} of ${threshold} signatures`)
  const hash = (await kit.executeTransaction(tx)).hash as Hex
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  const outcome = parseEventLogs({ abi: safeAbi, logs: receipt.logs, eventName: ['ExecutionSuccess', 'ExecutionFailure'] }).find(
    (l) => l.address.toLowerCase() === pending.safe.toLowerCase() && l.args.txHash === pending.safeTxHash,
  )
  if (receipt.status !== 'success' || outcome?.eventName !== 'ExecutionSuccess') {
    throw new Error(`Safe transaction ${pending.safeTxHash} did not succeed (${outcome?.eventName ?? receipt.status}): ${hash}`)
  }
  return { hash }
}
