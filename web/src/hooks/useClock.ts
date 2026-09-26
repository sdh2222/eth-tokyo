import { useEffect, useState } from "react";
import { NOW } from "../desk/fixture/state";

const live = import.meta.env.VITE_DESK_MODE === "live";

// Unix seconds, ticking once a second. Fixture mode runs from the fixture's NOW so the
// fixture's timestamps stay in the same frame. Astryx has no countdown component
// (Timer counts up only), so countdowns read this clock.
export function useClock(): number {
  const [started] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (live) return Math.floor(now / 1000);
  return NOW + Math.floor((now - started) / 1000);
}

export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(s / 60);
  return `${minutes}:${String(s % 60).padStart(2, "0")}`;
}
