import { TERMS_ENS } from "../copy/en";
import { useDeskState, useLiveStrategy } from "../hooks/useDesk";

export function CounterpartiesPage() {
  const live = useLiveStrategy();
  const state = useDeskState(live.data ?? null);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-body">{TERMS_ENS}</p>
      <table>
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
  );
}
