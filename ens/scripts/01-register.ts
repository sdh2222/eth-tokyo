// Register <DESK_LABEL>.eth to the treasury: mint MockUSDC → approve → commit → wait → register.
// Subregistry and resolver are left empty here and wired in 02-setup, so the 60s commit clock starts immediately.
// Safe to rerun: an unexpired commitment in deployments/sepolia.json is reused instead of paying for a new one.
import { formatUnits, toHex, zeroAddress, zeroHash, type Hex } from 'viem'
import { erc20Abi, ethRegistrarAbi, registryAbi } from '../src/abis.js'
import { ADDR, DESK_LABEL, DESK_NAME, publicClient, wallet } from '../src/config.js'
import { loadDeployment, saveDeployment } from '../src/deployments.js'
import { labelId } from '../src/encode.js'
import { send } from '../src/tx.js'

const w = wallet('TREASURY_PK')
const owner = w.account.address
const label = DESK_LABEL
const duration = BigInt(Number(process.env.DESK_DURATION_DAYS ?? 365) * 86400)

const read = <T>(functionName: string, args: readonly unknown[] = []) =>
  publicClient.readContract({ address: ADDR.ethRegistrar, abi: ethRegistrarAbi, functionName, args } as never) as Promise<T>

async function ownedByUs() {
  const current = await publicClient.readContract({ address: ADDR.ethRegistry, abi: registryAbi, functionName: 'getOwner', args: [labelId(label)] })
  return current.toLowerCase() === owner.toLowerCase()
}

console.log(`register ${DESK_NAME} to treasury ${owner} for ${Number(duration) / 86400}d`)

if (!(await read<boolean>('isAvailable', [label]))) {
  if (await ownedByUs()) {
    const expiry = await publicClient.readContract({ address: ADDR.ethRegistry, abi: registryAbi, functionName: 'findExpiry', args: [label] })
    saveDeployment((d) => {
      d.treasury = owner
      d.desk = { ...d.desk, label, expiry: expiry.toString() }
      delete d.desk.pendingCommit
    })
    console.log(`  already ours, expires ${new Date(Number(expiry) * 1000).toISOString()} — nothing to do`)
    process.exit(0)
  }
  throw new Error(`${DESK_NAME} is taken by someone else. Pick a fallback via DESK_LABEL in .env (otcdesk, quotedesk, ...).`)
}

// 1. Payment. MockUSDC.mint is permissionless on Sepolia.
const [base, premium] = await read<[bigint, bigint]>('getRegisterPrice', [label, duration, ADDR.mockUSDC])
const price = base + premium
console.log(`  price ${formatUnits(price, 6)} MockUSDC`)
const balance = await publicClient.readContract({ address: ADDR.mockUSDC, abi: erc20Abi, functionName: 'balanceOf', args: [owner] })
if (balance < price) {
  await send(w, { address: ADDR.mockUSDC, abi: erc20Abi, functionName: 'mint', args: [owner, price * 2n - balance], label: 'mint MockUSDC' })
}
const allowance = await publicClient.readContract({ address: ADDR.mockUSDC, abi: erc20Abi, functionName: 'allowance', args: [owner, ADDR.ethRegistrar] })
if (allowance < price) {
  await send(w, { address: ADDR.mockUSDC, abi: erc20Abi, functionName: 'approve', args: [ADDR.ethRegistrar, price], label: 'approve registrar' })
}

// 2. Commit, or reuse a commitment from an interrupted run.
const [minAge, maxAge] = await Promise.all([read<bigint>('MIN_COMMITMENT_AGE'), read<bigint>('MAX_COMMITMENT_AGE')])
const now = async () => (await publicClient.getBlock()).timestamp

let pending = loadDeployment().desk?.pendingCommit
let committedAt = 0n
if (pending && pending.duration === duration.toString()) {
  committedAt = await read<bigint>('commitmentAt', [pending.commitment])
  if (committedAt === 0n || (await now()) > committedAt + maxAge) pending = undefined
}
if (!pending) {
  const secret = toHex(crypto.getRandomValues(new Uint8Array(32))) as Hex
  const commitment = await read<Hex>('makeCommitment', [label, owner, secret, zeroAddress, zeroAddress, duration, zeroHash])
  pending = { secret, commitment, duration: duration.toString() }
  saveDeployment((d) => {
    d.treasury = owner
    d.desk = { ...d.desk, label, pendingCommit: pending }
  })
  await send(w, { address: ADDR.ethRegistrar, abi: ethRegistrarAbi, functionName: 'commit', args: [commitment], label: 'commit' })
  committedAt = await read<bigint>('commitmentAt', [commitment])
} else {
  console.log(`  reusing commitment from ${new Date(Number(committedAt) * 1000).toISOString()}`)
}

// 3. Wait for MIN_COMMITMENT_AGE on chain time, not the local clock.
const readyAt = committedAt + minAge + 1n
for (let t = await now(); t < readyAt; t = await now()) {
  process.stdout.write(`\r  waiting ${readyAt - t}s for the commitment to mature…   `)
  await new Promise((resolve) => setTimeout(resolve, 5000))
}
process.stdout.write('\n')

// 4. Register.
const { hash } = await send(w, {
  address: ADDR.ethRegistrar,
  abi: ethRegistrarAbi,
  functionName: 'register',
  args: [label, owner, pending.secret, zeroAddress, zeroAddress, duration, ADDR.mockUSDC, zeroHash],
  label: `register ${DESK_NAME}`,
})

if (!(await ownedByUs())) throw new Error('register succeeded but ETHRegistry does not report the treasury as owner')
const expiry = await publicClient.readContract({ address: ADDR.ethRegistry, abi: registryAbi, functionName: 'findExpiry', args: [label] })
saveDeployment((d) => {
  d.desk = { label, registerTx: hash, expiry: expiry.toString() }
})
console.log(`  ${DESK_NAME} is ours until ${new Date(Number(expiry) * 1000).toISOString()}`)
