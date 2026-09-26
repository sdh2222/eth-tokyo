import { AmountInput } from "../../components/AmountInput";
import { SAFE_HOLDS } from "../../copy/en";
import { parseAmount } from "../TradePage";
import { formatUsdc, formatWeth } from "../../lib/format";
import type { WizardState } from "./types";

export function inventoryOver(wizard: WizardState, weth: bigint, usdc: bigint): "weth" | "usdc" | null {
  const wethParsed = parseAmount(wizard.weth, 18);
  const usdcParsed = parseAmount(wizard.usdc, 6);
  if (wethParsed.ok && wethParsed.value > weth) return "weth";
  if (usdcParsed.ok && usdcParsed.value > usdc) return "usdc";
  return null;
}

export function InventoryStep({
  wizard,
  onChange,
  safeWeth,
  safeUsdc,
}: {
  wizard: WizardState;
  onChange: (next: WizardState) => void;
  safeWeth: bigint;
  safeUsdc: bigint;
}) {
  const over = inventoryOver(wizard, safeWeth, safeUsdc);
  const known = wizard.weth === "900" && wizard.usdc === "400000";
  return (
    <div className="flex flex-col gap-4">
      <AmountInput value={wizard.weth} onChange={(weth) => onChange({ ...wizard, weth })} unit="WETH" max={formatWeth(safeWeth)} />
      <AmountInput value={wizard.usdc} onChange={(usdc) => onChange({ ...wizard, usdc })} unit="USDC" max={formatUsdc(safeUsdc)} />
      {over === "weth" ? <p className="text-body">{SAFE_HOLDS} {formatWeth(safeWeth)}.</p> : null}
      {over === "usdc" ? <p className="text-body">{SAFE_HOLDS} {formatUsdc(safeUsdc)}.</p> : null}
      <p className="text-body">
        {import.meta.env.VITE_DESK_MODE === "live" || !known ? "— · check the preview" : "90.0% · above target"}
      </p>
    </div>
  );
}
