import { Skeleton } from "../components/Skeleton";
import { AGENT_HELP, AGENT_NAME, ENS_UNAVAILABLE } from "../copy/en";
import { useEnsDesk } from "../hooks/useEnsDesk";

const S_MIN = 5;
const S_MAX = 200;

export function AgentPage() {
  const ens = useEnsDesk();

  if (ens.isPending) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-h1">Risk agent</h1>
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (ens.isError || !ens.data) {
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-h1">Risk agent</h1>
        <p className="text-body">{ENS_UNAVAILABLE}</p>
        <button type="button" className="text-body" onClick={() => void ens.refetch()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">Risk agent</h1>
        <p className="text-body">{ens.data.agent.name || AGENT_NAME}</p>
        <p className="num text-body text-muted">{ens.data.agent.addr}</p>
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
            {ens.data.clients.map((mm) => {
              const bps = mm.spreadBps;
              const clamped = bps === null ? null : Math.min(S_MAX, Math.max(S_MIN, bps));
              const inForce = clamped !== null && clamped === bps;
              return (
                <tr key={mm.name}>
                  <td>{mm.name}</td>
                  <td>{bps === null ? "—" : bps}</td>
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
