import { useSearchParams } from "react-router-dom";
import { FillTable } from "../components/FillTable";
import { NOW } from "../desk/fixture/state";
import { useDeskState, useFills, useLiveStrategy } from "../hooks/useDesk";

export function FillsPage() {
  const [params, setParams] = useSearchParams();
  const mm = params.get("mm") ?? "";
  const side = params.get("side") ?? "all";
  const page = Number(params.get("page") ?? "1");
  const live = useLiveStrategy();
  const state = useDeskState(live.data ?? null);
  const fills = useFills(live.data ?? null);
  const now = import.meta.env.VITE_DESK_MODE === "live" ? Math.floor(Date.now() / 1000) : NOW;
  const weth = "";
  const filtered = (fills.data ?? []).filter((fill) => {
    if (mm && fill.name !== mm) return false;
    if (side === "bought ETH" && fill.tokenOut.toLowerCase() !== weth) return false;
    if (side === "sold ETH" && fill.tokenIn.toLowerCase() !== weth) return false;
    return true;
  });
  const start = (page - 1) * 25;

  function set(next: Record<string, string>) {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) merged.set(key, value);
    setParams(merged);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">Fills</h1>
        <p className="text-body text-muted">Every fill against this desk.</p>
      </header>
      <div className="flex flex-wrap gap-4 rounded-card border border-border bg-surface p-5">
      <label className="text-body">
        MM
        <select className="ml-2" value={mm} onChange={(event) => set({ mm: event.target.value, page: "1" })}>
          <option value="">All</option>
          {(state.data?.mms ?? []).map((item) => (
            <option key={item.address} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-body">
        Side
        <select className="ml-2" value={side} onChange={(event) => set({ side: event.target.value, page: "1" })}>
          <option value="all">All</option>
          <option value="bought ETH">bought ETH</option>
          <option value="sold ETH">sold ETH</option>
        </select>
      </label>
      </div>
      <div className="overflow-x-auto rounded-card border border-border px-5">
      <FillTable fills={filtered.slice(start, start + 25)} weth={weth} midWad={state.data?.pWad ?? 0n} now={now} limit={25} />
      </div>
      <div className="flex gap-3">
        <button type="button" className="text-body" disabled={page <= 1} onClick={() => set({ page: String(page - 1) })}>
          Previous
        </button>
        <button type="button" className="text-body" disabled={start + 25 >= filtered.length} onClick={() => set({ page: String(page + 1) })}>
          Next
        </button>
      </div>
    </div>
  );
}
