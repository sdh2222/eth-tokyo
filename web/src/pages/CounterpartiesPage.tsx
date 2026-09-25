import { TERMS_ENS } from "../copy/en";
import { useDeskState, useLiveStrategy } from "../hooks/useDesk";

export function CounterpartiesPage() {
  const live = useLiveStrategy();
  const state = useDeskState(live.data ?? null);
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-h1">Counterparties</h1>
      <p className="rounded-card border border-border bg-surface p-5 text-body">{TERMS_ENS}</p>
      <div className="overflow-x-auto rounded-card border border-border px-5">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Address</th>
          </tr>
        </thead>
        <tbody>
          {(state.data?.mms ?? []).map((mm) => (
            <tr key={mm.address}>
              <td>{mm.name}</td>
              <td>{mm.address}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
