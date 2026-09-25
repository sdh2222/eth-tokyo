import { AGENT_HELP, AGENT_NAME } from "../copy/en";
import { useDeskState, useLiveStrategy } from "../hooks/useDesk";

const AGENT = "0x0000000000000000000000000000000000000004";

export function AgentPage() {
  const live = useLiveStrategy();
  const state = useDeskState(live.data ?? null);
  const sMin = 5;
  const sMax = 200;
  return (
    <div className="flex flex-col gap-3">
      <p className="num text-body">{AGENT}</p>
      <p className="text-body">{AGENT_NAME}</p>
      <p className="text-body">{AGENT_HELP}</p>
      <table>
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
  );
}
