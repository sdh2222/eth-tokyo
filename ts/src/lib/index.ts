export { loadConfig, type DeskConfig } from "./config.js";
export {
  dnsEncode,
  encodeGateArgs,
  encodePriceArgs,
  encodeTakerArgs,
  encodeTerms,
  encodeSpread,
} from "./encode.js";
export { ensGateOpcode, deskPriceOpcode, deskInstructions } from "./opcodes.js";
export {
  buildProgram,
  buildOrder,
  strategyBytes,
  strategyHash,
} from "./program.js";
export { buildTakerData } from "./taker.js";
export { priceMirror } from "./price.js";
export { deskFillAbi, decodeDeskFill, type DeskFillEvent } from "./events.js";
export {
  AGENT_SCOPE,
  agentSpreadFits,
  encodeAgentSpread,
  encodeAgentStats,
  planAgentWrites,
  type AgentSpread,
  type AgentStats,
  type AgentTerms,
  type AgentWrite,
  type DeskBook,
} from "./agent.js";
