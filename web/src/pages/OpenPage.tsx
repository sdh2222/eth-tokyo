import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Stepper } from "../components/Stepper";
import { ALREADY_OPEN, BACK, BANNER_OWNER, CONTINUE, DESK_LIVE, ENS_LIST, FEED_NOTE, GO_DASHBOARD, OPEN_STEPS, PAIR } from "../copy/en";
import { applyShip } from "../desk/fixture";
import { NOW } from "../desk/fixture/state";
import { FIXTURE_OWNERS } from "../desk/fixture/state";
import { useCanAct } from "../hooks/useCanAct";
import { useDeskState, useLiveStrategy } from "../hooks/useDesk";
import { useOracleRound } from "../hooks/useOracle";
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
  const oracle = useOracleRound();
  const state = useDeskState(live.data ?? null);
  const desk = state.data;
  const now = import.meta.env.VITE_DESK_MODE === "live" ? Math.floor(Date.now() / 1000) : NOW;
  const liveMode = import.meta.env.VITE_DESK_MODE === "live";
  const safeWeth = desk?.safeWallet.weth ?? (liveMode ? 0n : 900000000000000000000n);
  const safeUsdc = desk?.safeWallet.usdc ?? (liveMode ? 0n : 400000000000n);
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
      <div className="open-panel flex flex-col gap-5 rounded-card bg-surface p-5 lg:col-span-9">
        <h2 className="text-h3">{`${wizard.step}. ${OPEN_STEPS[wizard.step - 1]}`}</h2>
        {wizard.step === 1 ? (
          <section className="flex flex-col gap-4">
            <Field label="Owners">
              {liveMode ? (
                "—"
              ) : (
                <ul>
                  {FIXTURE_OWNERS.map((owner, index) => (
                    <li key={owner} className="num">
                      {owner}
                      {address && owner.toLowerCase() === address.toLowerCase() ? " you" : ""} · {index + 1} of 3
                    </li>
                  ))}
                </ul>
              )}
            </Field>
            <Field label="Signatures required">2 of 3</Field>
            <Field label="ETH in the Safe">{desk ? formatWeth(desk.safeWallet.weth) : "—"}</Field>
            <Field label="USDC in the Safe">{desk ? formatUsdc(desk.safeWallet.usdc) : "—"}</Field>
            {isOwner ? null : <p className="text-body">{BANNER_OWNER}</p>}
          </section>
        ) : null}
        {wizard.step === 3 ? <PolicyStep wizard={wizard} onChange={setWizard} /> : null}
        {wizard.step === 4 ? (
          <InventoryStep wizard={wizard} onChange={setWizard} safeWeth={safeWeth} safeUsdc={safeUsdc} />
        ) : null}
        {wizard.step === 5 ? (
          <div className="flex flex-col gap-4">
            <Field label="Named market makers">
              {(desk?.mms ?? []).length === 0 ? (
                "—"
              ) : (
                <ul>
                  {desk?.mms.map((mm) => (
                    <li key={mm.address}>{mm.name}</li>
                  ))}
                </ul>
              )}
            </Field>
            <p className="text-body text-muted">{ENS_LIST}</p>
          </div>
        ) : null}
        {wizard.step === 6 ? (
          <ReviewStep
            wizard={wizard}
            onPropose={() => {
              if (liveMode) return;
              applyShip();
              void queryClient.invalidateQueries({ queryKey: ["live"] });
              setDone(true);
            }}
          />
        ) : null}
        {wizard.step === 2 ? (
          <section className="flex flex-col gap-4">
            <Field label="Pair">{PAIR}</Field>
            <Field label="Oracle mid">
              {oracle.data ? formatUsd(oracle.data.midWad) : desk ? formatUsd(desk.pWad) : "—"}
            </Field>
            <Field label="Updated">
              {oracle.data ? formatWhen(oracle.data.updatedAt, now) : desk ? formatWhen(desk.oracleUpdatedAt, now) : "—"}
              {oracle.data?.stale ? " · stale" : ""}
            </Field>
            <p className="text-body text-muted">{FEED_NOTE}</p>
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-small text-muted">{label}</p>
      <div className="num text-body">{children}</div>
    </div>
  );
}
