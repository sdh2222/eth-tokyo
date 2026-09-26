import Safe, { EthSafeSignature } from "@safe-global/protocol-kit";
import { createPort } from "../../desk/createPort";
import type { Address, Hex, PlannedTx } from "../../desk/types";

export type Kit = Safe;

export async function connect(safeAddress: Address, provider: unknown): Promise<Kit> {
  return Safe.init({
    provider: provider as Exclude<Parameters<typeof Safe.init>[0]["provider"], undefined>,
    safeAddress,
  });
}

export async function build(kit: Kit, txs: PlannedTx[]): Promise<{ safeTx: Awaited<ReturnType<Kit["createTransaction"]>>; safeTxHash: Hex }> {
  const safeTx = await kit.createTransaction({
    transactions: txs.map((tx) => ({ to: tx.to, data: tx.data, value: "0" })),
  });
  const safeTxHash = (await kit.getTransactionHash(safeTx)) as Hex;
  return { safeTx, safeTxHash };
}

export async function sign(kit: Kit, safeTx: Awaited<ReturnType<Kit["createTransaction"]>>): Promise<{ sig: string }> {
  const signed = await kit.signTransaction(safeTx);
  const first = signed.signatures.values().next().value;
  return { sig: first?.data ?? "" };
}

export function addSig<T extends { addSignature(signature: EthSafeSignature): void }>(safeTx: T, sig: string, signer: Address): T {
  safeTx.addSignature(new EthSafeSignature(signer, sig));
  return safeTx;
}

export async function execute(kit: Kit, safeTx: Awaited<ReturnType<Kit["createTransaction"]>>): Promise<Hex> {
  const result = await kit.executeTransaction(safeTx);
  return result.hash as Hex;
}

export function multiSendOf(txs: PlannedTx[]): PlannedTx {
  return createPort().planMultiSend(txs);
}
