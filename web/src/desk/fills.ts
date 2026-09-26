import sepoliaConfig from "@config";
import type { DeskConfig, FillRecord } from "./types";

const WETH = (sepoliaConfig as DeskConfig).tokens.weth.toLowerCase();
const WAD = 10n ** 18n;

// True when the counterparty bought ETH from the desk (WETH went out of the Safe).
export function buysEth(fill: FillRecord): boolean {
  return fill.tokenOut.toLowerCase() === WETH;
}

// The ETH side of a fill, in wei.
export function fillEth(fill: FillRecord): bigint {
  return buysEth(fill) ? fill.amountOut : fill.amountIn;
}

// The fill's own price in USD per ETH (wad): USDC has 6 decimals, WETH 18.
export function fillPrice(fill: FillRecord): bigint {
  const eth = fillEth(fill);
  const usdc = buysEth(fill) ? fill.amountIn : fill.amountOut;
  return eth === 0n ? 0n : (usdc * 10n ** 12n * WAD) / eth;
}
