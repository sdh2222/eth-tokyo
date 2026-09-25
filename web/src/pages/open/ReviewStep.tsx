import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { ShowRaw } from "../../components/ShowRaw";
import { NO_TOKENS_NOW, PROPOSE } from "../../copy/en";
import { emptyConfig } from "../../desk/fixture/state";
import { useDeskPort } from "../../hooks/useDesk";
import { parseAmount } from "../TradePage";
import type { PlannedTx } from "../../desk/types";
import type { WizardState } from "./types";

export function ReviewStep({ wizard, onPropose }: { wizard: WizardState; onPropose: () => void }) {
  const port = useDeskPort();
  const client = usePublicClient();
  const [labels, setLabels] = useState<string[]>([]);
  const [program, setProgram] = useState("0x");
  const weth = parseAmount(wizard.weth, 18);
  const usdc = parseAmount(wizard.usdc, 6);
  const lines = port.describeProgram({ deadline: 0n, salt: 0n, unknown: [] }, emptyConfig());

  useEffect(() => {
    if (!weth.ok || !usdc.ok) return;
    void port
      .planShip(
        { client, cfg: emptyConfig() },
        {
          salt: BigInt(Date.now()),
          ttlDays: wizard.ttlDays,
          wethAmt: weth.value,
          usdcAmt: usdc.value,
          policy: { sMin: wizard.sMin, sMax: wizard.sMax, wStar: wizard.targetPct * 100 },
        },
      )
      .then((plan) => {
        setLabels(plan.txs.map((tx: PlannedTx) => tx.label));
        setProgram(plan.program);
      });
  }, [client, port, usdc.ok, weth.ok, wizard.sMax, wizard.sMin, wizard.targetPct, wizard.ttlDays, wizard.usdc, wizard.weth]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-h3">What you are signing</h2>
      <ol>
        {labels.map((label) => (
          <li key={label} className="text-body">
            {label}
          </li>
        ))}
      </ol>
      <h2 className="text-h3">The program, in plain English</h2>
      <ShowRaw summary={lines.join(" ")}>
        <pre className="num">{program}</pre>
      </ShowRaw>
      <h2 className="text-h3">What does not happen</h2>
      <p className="text-body">{NO_TOKENS_NOW}</p>
      <button type="button" className="text-body" onClick={onPropose}>
        {PROPOSE}
      </button>
    </div>
  );
}
