import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DEPLOYER_NOTE, STALE_NOTE } from "../copy/en";
import { setOracle } from "../desk/fixture";
import { NOW } from "../desk/fixture/state";
import { useCanAct } from "../hooks/useCanAct";

export function DemoDrawer() {
  const [params] = useSearchParams();
  const [open, setOpen] = useState(params.get("demo") === "1");
  const { isDeployer } = useCanAct();
  const live = import.meta.env.VITE_DESK_MODE === "live";

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.shiftKey && event.key === "D") setOpen((value) => !value);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  return (
    <aside className="rounded-card bg-surface p-5">
      <p className="text-body">Demo</p>
      {live ? (
        <>
          <p className="text-body">pnpm bot oracle</p>
          <p className="text-body">{STALE_NOTE}</p>
        </>
      ) : (
        <>
          <button type="button" className="text-body" disabled={!isDeployer} onClick={() => setOracle(4000e8, NOW)}>
            Set oracle
          </button>
          {!isDeployer ? <p className="text-body">{DEPLOYER_NOTE}</p> : null}
        </>
      )}
    </aside>
  );
}
