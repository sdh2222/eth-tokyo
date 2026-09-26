import protocolKit, {
  EthSafeSignature,
  EthSafeTransaction,
} from "@safe-global/protocol-kit";
import {
  createPublicClient,
  getAddress,
  http,
  parseEventLogs,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

type SafeClass = typeof protocolKit.default;
const Safe: SafeClass =
  (protocolKit as Partial<typeof protocolKit>).default ??
  (protocolKit as unknown as SafeClass);

const safeAbi = [
  {
    type: "event",
    name: "ExecutionSuccess",
    inputs: [
      { name: "txHash", type: "bytes32", indexed: true },
      { name: "payment", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ExecutionFailure",
    inputs: [
      { name: "txHash", type: "bytes32", indexed: true },
      { name: "payment", type: "uint256", indexed: false },
    ],
  },
] as const;

export type SafeCall = { to: Address; data: Hex; value?: bigint };

/**
 * Owners sign. The executor pays gas and does not need to be an owner.
 * Keys are not printed.
 */
export async function executeSafeCalls(args: {
  rpc: string;
  safe: Address;
  calls: SafeCall[];
  ownerKeys: readonly Hex[];
  executorKey: Hex;
}): Promise<Hex> {
  const reader = await Safe.init({
    provider: args.rpc,
    safeAddress: args.safe,
  });
  const created = await reader.createTransaction({
    transactions: args.calls.map((call) => ({
      to: call.to,
      data: call.data,
      value: (call.value ?? 0n).toString(),
    })),
  });
  const data = created.data;
  const tx = new EthSafeTransaction({
    to: getAddress(data.to),
    value: data.value,
    data: data.data,
    operation: data.operation,
    safeTxGas: data.safeTxGas,
    baseGas: data.baseGas,
    gasPrice: data.gasPrice,
    gasToken: getAddress(data.gasToken),
    refundReceiver: getAddress(data.refundReceiver),
    nonce: data.nonce,
  });
  const safeTxHash = (await reader.getTransactionHash(tx)) as Hex;
  for (const key of args.ownerKeys) {
    const signerKit = await Safe.init({
      provider: args.rpc,
      signer: key,
      safeAddress: args.safe,
    });
    const signer = privateKeyToAccount(key).address;
    const signature = (await signerKit.signTransaction(tx)).getSignature(
      signer,
    );
    if (!signature) throw new Error(`no signature from ${signer}`);
    tx.addSignature(new EthSafeSignature(signer, signature.data as Hex));
  }
  const threshold = Number(await reader.getThreshold());
  if (tx.signatures.size < threshold) {
    throw new Error(
      `${safeTxHash} has ${tx.signatures.size} of ${threshold} signatures`,
    );
  }
  const exec = await Safe.init({
    provider: args.rpc,
    signer: args.executorKey,
    safeAddress: args.safe,
  });
  const hash = (await exec.executeTransaction(tx)).hash as Hex;
  const client = createPublicClient({
    chain: sepolia,
    transport: http(args.rpc),
  });
  const receipt = await client.waitForTransactionReceipt({ hash });
  const outcome = parseEventLogs({
    abi: safeAbi,
    logs: receipt.logs,
    eventName: ["ExecutionSuccess", "ExecutionFailure"],
  }).find(
    (log) =>
      log.address.toLowerCase() === args.safe.toLowerCase() &&
      log.args.txHash === safeTxHash,
  );
  if (
    receipt.status !== "success" ||
    outcome?.eventName !== "ExecutionSuccess"
  ) {
    throw new Error(
      `Safe transaction ${safeTxHash} did not succeed (${outcome?.eventName ?? receipt.status}): ${hash}`,
    );
  }
  return hash;
}
