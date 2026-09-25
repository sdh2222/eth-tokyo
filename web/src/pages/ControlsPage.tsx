import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ShowRaw } from "../components/ShowRaw";
import { CHANGE_NOTE, CLOSE_EXCEPT, SEED_TWO, STOP, STOP_COPY } from "../copy/en";
import { dockDesk, seedTwoDesks } from "../desk/fixture";
import { emptyConfig, NOW } from "../desk/fixture/state";
import { useDeskPort, useDeskState, useLiveStrategy } from "../hooks/useDesk";
import { formatHash } from "../lib/format";
import { formatWhen } from "../lib/time";

export function ControlsPage() {
  const live = useLiveStrategy();
  const state = useDeskState(live.data ?? null);
  const port = useDeskPort();
  const queryClient = useQueryClient();
  const [askStop, setAskStop] = useState(false);
  const [stopped, setStopped] = useState(false);
  const now = import.meta.env.VITE_DESK_MODE === "live" ? Math.floor(Date.now() / 1000) : NOW;
  const lines = port.describeProgram({ deadline: 0n, salt: 0n, unknown: [] }, emptyConfig());
  const strategy = live.data;

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["live"] });
  }

  if (stopped || !strategy) {
    return <p className="text-body">Not open</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <ShowRaw summary={lines.join(" ")}>
        <pre className="num">{strategy.program}</pre>
      </ShowRaw>
      <p className="text-body">{state.data ? formatWhen(state.data.deadline, now) : "—"}</p>
      <p className="num text-body">{formatHash(strategy.strategyHash)}</p>
      <Link className="text-body" to="/open?step=3">
        Change
      </Link>
      <p className="text-body">{CHANGE_NOTE}</p>
      <button type="button" className="text-body" onClick={() => setAskStop(true)}>
        {STOP}
      </button>
      {askStop ? (
        <div className="rounded-card bg-surface p-5">
          <p className="text-body">{STOP_COPY}</p>
          <button
            type="button"
            className="text-body"
            onClick={() => {
              port.planDock({ client: null, cfg: emptyConfig() }, strategy.strategyHash);
              dockDesk();
              setStopped(true);
              refresh();
            }}
          >
            Confirm
          </button>
        </div>
      ) : null}
      {strategy.warning === "MULTIPLE_LIVE" ? (
        <div className="rounded-card bg-danger p-5 text-onfocus">
          <p className="text-body">{strategy.strategyHash}</p>
          <button
            type="button"
            className="text-body"
            onClick={() => {
              port.planMultiSend([port.planDock({ client: null, cfg: emptyConfig() }, strategy.strategyHash)]);
              dockDesk();
              refresh();
            }}
          >
            {CLOSE_EXCEPT}
          </button>
        </div>
      ) : null}
      {import.meta.env.DEV ? (
        <button
          type="button"
          className="text-body"
          onClick={() => {
            seedTwoDesks();
            refresh();
          }}
        >
          {SEED_TWO}
        </button>
      ) : null}
      <table>
        <tbody>
          <tr>
            <td>Oracle price</td>
            <td>Deployer</td>
          </tr>
          <tr>
            <td>Agent spread</td>
            <td>Risk agent</td>
          </tr>
          <tr>
            <td>Terms and names</td>
            <td>Treasury, on ENS</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
