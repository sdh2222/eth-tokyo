// Hand-off to the other lanes (desk-system §6.5): the `ens` and `mms` sections of config/sepolia.json (§8.0).
// Always writes deployments/config.ens.json. If ../config/sepolia.json exists (after T0), merges those two keys only.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { ADDR, CLIENTS_NAME, DESK_LABEL } from '../src/config.js'
import { loadDeployment, requireField } from '../src/deployments.js'

const d = loadDeployment()
const clients = requireField(d.clients, 'clients', 'clients')
const fragment = {
  ens: {
    ethRegistry: ADDR.ethRegistry,
    deskRegistry: requireField(d.registries?.desk, 'desk registry', 'setup'),
    clientsRegistry: requireField(d.registries?.clients, 'clients registry', 'setup'),
    resolver: requireField(d.resolver, 'resolver', 'setup'),
    suffix: CLIENTS_NAME,
    universalResolver: ADDR.universalResolver,
  },
  mms: Object.entries(clients).map(([name, c]) => ({ name, address: c.address })),
}

const out = new URL(`../deployments/config.${DESK_LABEL}.json`, import.meta.url)
writeFileSync(out, JSON.stringify(fragment, null, 2) + '\n')
console.log(`wrote ${out.pathname}`)

const shared = new URL('../../config/sepolia.json', import.meta.url)
if (existsSync(shared)) {
  const config = JSON.parse(readFileSync(shared, 'utf8'))
  writeFileSync(shared, JSON.stringify({ ...config, ens: fragment.ens, mms: fragment.mms }, null, 2) + '\n')
  console.log(`merged ens + mms into ${shared.pathname}`)
} else {
  console.log('config/sepolia.json does not exist yet (T0); paste the fragment in when it lands')
}
