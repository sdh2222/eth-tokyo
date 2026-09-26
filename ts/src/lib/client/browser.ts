export { decodeProgram, describeProgram } from "./program.js";
export { findStrategies, findLiveStrategy } from "./strategies.js";
export { readDeskState } from "./state.js";
export { readFills } from "./fills.js";
export { decodeDeskError } from "./errors.js";
// The router's own quote for a taker name. quote.ts imports taker.ts, which imports
// @1inch/swap-vm-sdk; that package calls Node's assert, which the web aliases to a small
// browser shim (web/src/shims/assert.ts).
export { quoteFor } from "./quote.js";

// plans.ts stays out of this file: it needs more of Node than assert.
