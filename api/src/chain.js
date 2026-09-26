import { decodeEventLog, parseAbiItem } from "viem";

export const DESK_FILL = parseAbiItem(
  "event DeskFill(bytes32 indexed orderHash, bytes32 indexed nameHash, address indexed taker, bytes dnsName, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 midWad, uint16 spreadBps, uint8 spreadSource, uint256 wBeforeWad)",
);

const ORACLE = parseAbiItem(
  "function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
);

const BALANCE = parseAbiItem("function balanceOf(address account) view returns (uint256)");

export function filled(address) {
  return typeof address === "string" && /^0x[0-9a-fA-F]{40}$/.test(address) && !/^0x0{40}$/.test(address);
}

export function dnsNameToString(dnsName) {
  const hex = dnsName.startsWith("0x") ? dnsName.slice(2) : dnsName;
  const bytes = Uint8Array.from(hex.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));
  const labels = [];
  let i = 0;
  while (i < bytes.length && bytes[i] !== 0) {
    const len = bytes[i];
    labels.push(new TextDecoder().decode(bytes.slice(i + 1, i + 1 + len)));
    i += 1 + len;
  }
  return labels.join(".");
}

export function fillFromLog(log, { weth = "", blockTime = 0 } = {}) {
  const decoded = decodeEventLog({ abi: [DESK_FILL], data: log.data, topics: log.topics });
  const args = decoded.args;
  const tokenOut = args.tokenOut.toLowerCase();
  const tokenIn = args.tokenIn.toLowerCase();
  const wethLower = weth.toLowerCase();
  const side = wethLower && tokenOut === wethLower ? "bought ETH" : wethLower && tokenIn === wethLower ? "sold ETH" : "";
  return {
    type: "fill",
    tx: log.transactionHash,
    block: log.blockNumber.toString(),
    blockTime,
    name: dnsNameToString(args.dnsName),
    taker: args.taker,
    tokenIn: args.tokenIn,
    tokenOut: args.tokenOut,
    amountIn: args.amountIn.toString(),
    amountOut: args.amountOut.toString(),
    midWad: args.midWad.toString(),
    spreadBps: args.spreadBps,
    spreadSource: args.spreadSource,
    wBeforeWad: args.wBeforeWad.toString(),
    strategyHash: args.orderHash,
    side,
    steps: [],
  };
}

export async function readOracle(client, oracle) {
  if (!filled(oracle)) return null;
  const block = await client.getBlock();
  const round = await client.readContract({ address: oracle, abi: [ORACLE], functionName: "latestRoundData" });
  const answer = round[1];
  if (answer < 0n) return null;
  return {
    type: "oracle",
    block: block.number.toString(),
    answer: answer.toString(),
    updatedAt: Number(round[3]),
  };
}

export async function readVault(client, config) {
  const { weth, usdc } = config.tokens ?? {};
  if (!filled(config.safe) || !filled(weth) || !filled(usdc)) return null;
  const block = await client.getBlock();
  const [wethBal, usdcBal] = await Promise.all([
    client.readContract({ address: weth, abi: [BALANCE], functionName: "balanceOf", args: [config.safe] }),
    client.readContract({ address: usdc, abi: [BALANCE], functionName: "balanceOf", args: [config.safe] }),
  ]);
  return {
    type: "vault",
    block: block.number.toString(),
    weth: wethBal.toString(),
    usdc: usdcBal.toString(),
    wWad: null,
    targetWad: null,
  };
}

export async function readFills(client, config, fromBlock, toBlock) {
  if (!filled(config.router) || fromBlock > toBlock) return [];
  const logs = await client.getLogs({
    address: config.router,
    event: DESK_FILL,
    fromBlock,
    toBlock,
  });
  const events = [];
  for (const log of logs) {
    const block = await client.getBlock({ blockNumber: log.blockNumber });
    events.push(fillFromLog(log, { weth: config.tokens?.weth ?? "", blockTime: Number(block.timestamp) }));
  }
  return events;
}
