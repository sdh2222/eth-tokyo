import { AGENT_HELP, AGENT_NAME } from "../copy/en";
import { useDeskState, useLiveStrategy } from "../hooks/useDesk";

const AGENT = "0x0000000000000000000000000000000000000004";

export function AgentPage() {
  const live = useLiveStrategy();
  const state = useDeskState(live.data ?? null);
  const sMin = 5;
  const sMax = 200;
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">Risk agent</h1>
        <p className="text-body">{AGENT_NAME}</p>
        <p className="num text-body text-muted">{AGENT}</p>
      </header>
      <p className="rounded-card border border-border bg-surface p-5 text-body">{AGENT_HELP}</p>
      <div className="overflow-x-auto rounded-card border border-border px-5">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Spread</th>
            <th>Clamped</th>
            <th>In force</th>
          </tr>
        </thead>
        <tbody>
          {(state.data?.mms ?? []).map((mm) => {
            const bps = mm.spread?.bps;
            const clamped = bps === undefined ? null : Math.min(sMax, Math.max(sMin, bps));
            const inForce = clamped !== null && clamped === bps;
            return (
              <tr key={mm.address}>
                <td>{mm.name}</td>
                <td>{bps === undefined ? "—" : bps}</td>
                <td>{clamped === null ? "—" : clamped}</td>
                <td>{inForce ? "yes" : "no"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
