import { fixturePort } from "./fixture";
import { createLivePort } from "./live";
import type { DeskPort } from "./port";

export function createPort(): DeskPort {
  if (import.meta.env.VITE_DESK_MODE === "live") return createLivePort();
  return fixturePort(import.meta.env.VITE_FIXTURE === "demo" ? "demo" : "qa");
}
