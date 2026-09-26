import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Address, Hex } from 'viem'
import { DEPLOYMENT_FILE as FILE } from './config.js'

export type Deployment = {
  treasury?: Address
  desk?: {
    label: string
    registerTx?: Hex
    expiry?: string
    /** Kept so an interrupted 01-register run can resume without paying for a new commitment. */
    pendingCommit?: { secret: Hex; commitment: Hex; duration: string }
  }
  resolver?: Address
  registries?: { desk?: Address; clients?: Address; agents?: Address }
  clients?: Record<string, { address: Address; expiry: string }>
  agent?: { name: string; address: Address }
}

export function loadDeployment(): Deployment {
  return existsSync(FILE) ? (JSON.parse(readFileSync(FILE, 'utf8')) as Deployment) : {}
}

export function saveDeployment(update: (d: Deployment) => void): Deployment {
  const d = loadDeployment()
  update(d)
  mkdirSync(dirname(FILE), { recursive: true })
  writeFileSync(FILE, JSON.stringify(d, null, 2) + '\n')
  return d
}

export function requireField<T>(value: T | undefined, what: string, script: string): T {
  if (value === undefined) throw new Error(`${what} is not in deployments/sepolia.json — run \`npm run ${script}\` first`)
  return value
}
