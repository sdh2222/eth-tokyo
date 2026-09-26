import { deployLocal } from "./deploy-local.js";

const rpc =
  process.argv.find((arg) => arg.startsWith("http")) ?? "http://127.0.0.1:8545";

await deployLocal(rpc);
console.log("anvil account 0 maker");
console.log("fixture wrote no sepolia.json");
