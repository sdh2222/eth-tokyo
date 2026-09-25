import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Stepper } from "../components/Stepper";
import { ALREADY_OPEN, BACK, BANNER_OWNER, CONTINUE, DESK_LIVE, ENS_LIST, FEED_NOTE, GO_DASHBOARD, OPEN_STEPS, PAIR } from "../copy/en";
import { applyShip } from "../desk/fixture";
import { NOW } from "../desk/fixture/state";
import { FIXTURE_OWNERS } from "../desk/fixture/state";
import { useCanAct } from "../hooks/useCanAct";
import { useDeskState, useLiveStrategy } from "../hooks/useDesk";
import { formatUsd, formatUsdc, formatWeth } from "../lib/format";
import { formatWhen } from "../lib/time";
import { useAccount } from "wagmi";
import { InventoryStep, inventoryOver } from "./open/InventoryStep";
import { PolicyStep, policyInvalid } from "./open/PolicyStep";
import { ReviewStep } from "./open/ReviewStep";
import { INITIAL_WIZARD, type WizardState } from "./open/types";

export function OpenPage() {
  const [params] = useSearchParams();
  const start = Number(params.get("step") ?? "1");
  const [done, setDone] = useState(false);
  const queryClient = useQueryClient();
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
  const safeWeth = desk?.safeWallet.weth ?? 900000000000000000000n;
  const safeUsdc = desk?.safeWallet.usdc ?? 400000000000n;
  const over = inventoryOver(wizard, safeWeth, safeUsdc);
  const stepOk =
    wizard.step === 1 ? isOwner : wizard.step === 3 ? !policyInvalid(wizard) : wizard.step === 4 ? over === null : true;

  if (done) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-h2">{DESK_LIVE}</p>
        <p className="num text-body">{live.data?.strategyHash ?? "—"}</p>
        <p className="text-body">{live.data?.shippedAt.block.toString() ?? "—"}</p>
        <a className="text-body" href={`https://sepolia.etherscan.io/tx/${live.data?.shippedAt.tx ?? ""}`}>
          Explorer
        </a>
        <Link className="text-body" to="/desk">
          {GO_DASHBOARD}
        </Link>
      </div>
    );
  }

  if (live.data && !params.get("step")) {
    return <p className="text-body">{ALREADY_OPEN}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="lg:col-span-3">
        <Stepper
          steps={OPEN_STEPS.map((label, index) => ({ id: String(index + 1), label }))}
          current={String(wizard.step)}
          onJump={(id) => setWizard({ ...wizard, step: Number(id) as WizardState["step"] })}
        />
      </div>
      <div className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5 lg:col-span-9">
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
        {wizard.step === 3 ? <PolicyStep wizard={wizard} onChange={setWizard} /> : null}
        {wizard.step === 4 ? (
          <InventoryStep wizard={wizard} onChange={setWizard} safeWeth={safeWeth} safeUsdc={safeUsdc} />
        ) : null}
        {wizard.step === 5 ? (
          <div className="flex flex-col gap-3">
            {(desk?.mms ?? []).map((mm) => (
              <p key={mm.address} className="text-body">
                {mm.name}
              </p>
            ))}
            <p className="text-body">{ENS_LIST}</p>
          </div>
        ) : null}
        {wizard.step === 6 ? (
          <ReviewStep
            wizard={wizard}
            onPropose={() => {
              applyShip();
              void queryClient.invalidateQueries({ queryKey: ["live"] });
              setDone(true);
            }}
          />
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
