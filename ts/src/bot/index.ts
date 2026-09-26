import { formatRefusal } from "./format.js";
import { keyName, legRule } from "./commands.js";
import { decodeDeskError } from "../lib/client/index.js";

const command = process.argv[2];
const mmFlag = process.argv.indexOf("--mm");
const mm = mmFlag >= 0 ? process.argv[mmFlag + 1] : "";

if (command === "quote" || command === "fill") {
  const side = process.argv.includes("--side")
    ? process.argv[process.argv.indexOf("--side") + 1]
    : "";
  const weth = process.argv.includes("--weth")
    ? process.argv[process.argv.indexOf("--weth") + 1]
    : undefined;
  const usdc = process.argv.includes("--usdc")
    ? process.argv[process.argv.indexOf("--usdc") + 1]
    : undefined;
  try {
    const leg = legRule({ side: side === "sell" ? "sell" : "buy", weth, usdc });
    const envKey = keyName(mm ?? "");
    if (!process.env[envKey]) {
      console.log(
        `${envKey} is unset. The ENS lane must set addr to the address Aqua sends, and the key stays with Aqua.`,
      );
      process.exit(2);
    }
    console.log(`${command} ${leg.token} ${leg.amount}`);
  } catch (err) {
    const decoded = decodeDeskError(err);
    console.log(formatRefusal(decoded.title, decoded.hint));
    process.exit(1);
  }
}
