// Read-only preflight. Needs no gas; safe to run any time.
import { formatEther, formatUnits } from 'viem'
import { erc20Abi, ethRegistrarAbi, registryAbi } from '../src/abis.js'
import { account, ADDR, DESK_LABEL, publicClient } from '../src/config.js'
import { loadDeployment } from '../src/deployments.js'
import { labelId } from '../src/encode.js'

const r = (functionName: string, args: readonly unknown[] = []) =>
  publicClient.readContract({ address: ADDR.ethRegistrar, abi: ethRegistrarAbi, functionName, args } as never) as Promise<never>

const [chainId, block] = await Promise.all([publicClient.getChainId(), publicClient.getBlock()])
console.log(`chain ${chainId}  block ${block.number}  time ${new Date(Number(block.timestamp) * 1000).toISOString()}`)

const [minAge, maxAge, minDur] = await Promise.all([r('MIN_COMMITMENT_AGE'), r('MAX_COMMITMENT_AGE'), r('MIN_REGISTER_DURATION')])
console.log(`registrar  commit ${minAge}s..${maxAge}s  min duration ${Number(minDur) / 86400}d`)

const available: boolean = await r('isAvailable', [DESK_LABEL])
const [base, premium]: [bigint, bigint] = await r('getRegisterPrice', [DESK_LABEL, 365n * 86400n, ADDR.mockUSDC])
console.log(`${DESK_LABEL}.eth  available=${available}  1y price ${formatUnits(base + premium, 6)} MockUSDC (premium ${formatUnits(premium, 6)})`)
if (!available) {
  const owner = await publicClient.readContract({ address: ADDR.ethRegistry, abi: registryAbi, functionName: 'getOwner', args: [labelId(DESK_LABEL)] })
  console.log(`  owner ${owner}`)
}

try {
  const treasury = account('TREASURY_PK').address
  const [eth, usdc] = await Promise.all([
    publicClient.getBalance({ address: treasury }),
    publicClient.readContract({ address: ADDR.mockUSDC, abi: erc20Abi, functionName: 'balanceOf', args: [treasury] }),
  ])
  console.log(`treasury ${treasury}  ${formatEther(eth)} ETH  ${formatUnits(usdc, 6)} MockUSDC`)
  if (eth === 0n) console.log('  → fund this address with Sepolia ETH before `npm run register`')
} catch {
  console.log('treasury key not set — run `npm run keys`')
}

const d = loadDeployment()
console.log(`deployments: resolver=${d.resolver ?? '-'} registries=${JSON.stringify(d.registries ?? {})} clients=${Object.keys(d.clients ?? {}).length}`)
