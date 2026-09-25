// Zero-gas checks: our encodings vs. the deployed contracts' own pure functions.
import { encodeFunctionData, stringToBytes, toHex } from 'viem'
import { resolverAbi } from '../src/abis.js'
import { ADDR, publicClient } from '../src/config.js'
import { dnsEncode, keyResource, KEY_SPREAD, KEY_STATS, KEY_TERMS } from '../src/encode.js'
import { RESOLVER } from '../src/roles.js'
const cases = [
  ['setData', KEY_SPREAD, RESOLVER.ROLE_SET_DATA],
  ['setText', KEY_STATS, RESOLVER.ROLE_SET_TEXT],
  ['setData', KEY_TERMS, RESOLVER.ROLE_SET_DATA],
] as const
for (const [fn, key, expectRole] of cases) {
  const setter = fn === 'setData'
    ? encodeFunctionData({ abi: resolverAbi, functionName: 'setData', args: [dnsEncode(''), key, '0x'] })
    : encodeFunctionData({ abi: resolverAbi, functionName: 'setText', args: [dnsEncode(''), key, ''] })
  const [arg, resource, roleBitmap] = await publicClient.readContract({ address: ADDR.permissionedResolverImpl, abi: resolverAbi, functionName: 'decodeSetter', args: [setter] })
  const ok = arg === toHex(stringToBytes(key)) && resource === keyResource(key) && roleBitmap === expectRole
  console.log((ok ? '✓' : '✗'), fn.padEnd(7), key.padEnd(12), 'role', '1<<' + (roleBitmap.toString(2).length - 1), ok ? '' : JSON.stringify({ arg, resource: resource.toString(16), roleBitmap: roleBitmap.toString() }))
}

// Simulate the proxy deployments 02-setup will send. eth_call needs no balance, so this works before funding.
import { account as envAccount } from '../src/config.js'
import { deployProxyCall, registryDeployArgs, resolverDeployArgs } from '../src/setup.js'
const treasury = envAccount('TREASURY_PK').address
for (const [label, args] of [
  ['treasury resolver', resolverDeployArgs(treasury)],
  ['desk registry', registryDeployArgs(treasury, 'desk')],
  ['clients registry', registryDeployArgs(treasury, 'clients')],
] as const) {
  try {
    const { result } = await publicClient.simulateContract({ account: treasury, ...deployProxyCall(args) })
    console.log(`✓ simulate deploy ${label.padEnd(18)} → ${result}`)
  } catch (e) {
    console.log(`✗ simulate deploy ${label}: ${(e as Error).message.split('\n')[0]}`)
  }
}
