import { BaseError, ContractFunctionRevertedError, type Abi, type Address, type ContractFunctionName } from 'viem'
import { publicClient, type Wallet } from './config.js'

const EXPLORER = 'https://sepolia.etherscan.io/tx/'

/** Simulate first so reverts surface with a decoded error name, then send and wait. */
export async function send<const abi extends Abi, fn extends ContractFunctionName<abi, 'nonpayable' | 'payable'>>(
  w: Wallet,
  params: { address: Address; abi: abi; functionName: fn; args?: readonly unknown[]; label: string },
) {
  const { request, result } = await publicClient.simulateContract({
    account: w.account,
    address: params.address,
    abi: params.abi,
    functionName: params.functionName,
    args: params.args,
  } as never)
  const hash = await w.writeContract(request as never)
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') throw new Error(`${params.label} reverted on-chain: ${EXPLORER}${hash}`)
  console.log(`  ✓ ${params.label}  ${EXPLORER}${hash}`)
  return { hash, receipt, result: result as unknown }
}

/** Name of the custom error a call reverts with, or null when it does not revert. */
export async function revertName(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn()
    return null
  } catch (err) {
    if (err instanceof BaseError) {
      const revert = err.walk((e) => e instanceof ContractFunctionRevertedError)
      if (revert instanceof ContractFunctionRevertedError) return revert.data?.errorName ?? revert.signature ?? 'reverted'
    }
    throw err
  }
}

export const log = (msg: string) => console.log(msg)
export const txUrl = (hash: string) => EXPLORER + hash
