import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Stepper } from "../components/Stepper";
import { BACK, BANNER_OWNER, CONTINUE, FEED_NOTE, OPEN_STEPS, PAIR } from "../copy/en";
import { NOW } from "../desk/fixture/state";
import { FIXTURE_OWNERS } from "../desk/fixture/state";
import { useCanAct } from "../hooks/useCanAct";
import { useDeskState, useLiveStrategy } from "../hooks/useDesk";
import { formatUsd, formatUsdc, formatWeth } from "../lib/format";
import { formatWhen } from "../lib/time";
import { useAccount } from "wagmi";
import { INITIAL_WIZARD, type WizardState } from "./open/types";

export function OpenPage() {
  const [params] = useSearchParams();
  const start = Number(params.get("step") ?? "1");
  const [wizard, setWizard] = useState<WizardState>({
    ...INITIAL_WIZARD,
    step: start >= 1 && start <= 6 ? (start as WizardState["step"]) : 1,
  });
  const { isOwner } = useCanAct();
  const { address } = useAccount();
  const live = useLiveStrategy();
  const state = useDeskState(live.data ?? null);
  const desk = state.data;
  const now = import.meta.env.VITE_DESK_MODE === "live" ? Math.floor(Date.now() / 1000) : NOW;
  const stepOk = wizard.step === 1 ? isOwner : true;

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-3">
        <Stepper
          steps={OPEN_STEPS.map((label, index) => ({ id: String(index + 1), label }))}
          current={String(wizard.step)}
          onJump={(id) => setWizard({ ...wizard, step: Number(id) as WizardState["step"] })}
        />
      </div>
      <div className="col-span-9 flex flex-col gap-5">
        {wizard.step === 1 ? (
          <section className="flex flex-col gap-3">
            <p className="num text-body">{FIXTURE_OWNERS[0]}</p>
            <ul>
              {FIXTURE_OWNERS.map((owner, index) => (
                <li key={owner} className="text-body">
                  {owner}
                  {address && owner.toLowerCase() === address.toLowerCase() ? " you" : ""} {index + 1} of 3
                </li>
              ))}
            </ul>
            <p className="text-body">2 of 3</p>
            <p className="num text-body">{desk ? formatWeth(desk.safeWallet.weth) : "—"}</p>
            <p className="num text-body">{desk ? formatUsdc(desk.safeWallet.usdc) : "—"}</p>
            {isOwner ? null : <p className="text-body">{BANNER_OWNER}</p>}
          </section>
        ) : null}
        {wizard.step === 2 ? (
          <section className="flex flex-col gap-3">
            <p className="text-body">{PAIR}</p>
            <p className="num text-body">—</p>
            <p className="num text-h3">{desk ? formatUsd(desk.pWad) : "—"}</p>
            <p className="text-body">{desk ? formatWhen(desk.oracleUpdatedAt, now) : "—"}</p>
            <p className="text-body">{FEED_NOTE}</p>
          </section>
        ) : null}
        <div className="flex gap-4">
          <button
            type="button"
            className="text-body"
            disabled={wizard.step === 1}
            onClick={() => setWizard({ ...wizard, step: (wizard.step - 1) as WizardState["step"] })}
          >
            {BACK}
          </button>
          <button
            type="button"
            className="text-body"
            disabled={!stepOk || wizard.step === 6}
            onClick={() => setWizard({ ...wizard, step: (wizard.step + 1) as WizardState["step"] })}
          >
            {CONTINUE}
          </button>
        </div>
      </div>
    </div>
  );
}
