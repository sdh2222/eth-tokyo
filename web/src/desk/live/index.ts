import type { DeskPort } from "../port";

export function createLivePort(): DeskPort {
  throw new Error("LIVE_NOT_READY");
}
