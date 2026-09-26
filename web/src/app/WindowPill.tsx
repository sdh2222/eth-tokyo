import { HStack } from "@astryxdesign/core/HStack";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import sepoliaConfig from "@config";
import type { DeskConfig } from "../desk/types";
import { useDeskState, useLiveStrategy } from "../hooks/useDesk";
import { useOracleRound } from "../hooks/useOracle";
import { formatCountdown, useClock } from "../hooks/useClock";

// A fill is allowed only for maxBlocks blocks after the oracle updatedAt: 50 × 12 s = 600 s.
const WINDOW_SECONDS = ((sepoliaConfig as DeskConfig).desk.maxBlocks ?? 50) * 12;

// The price window in the header, for both roles. StatusDot "Status Indicators" example:
// a dot plus a visible text label, since colour alone must not carry the state.
export function WindowPill() {
  const now = useClock();
  const oracle = useOracleRound();
  const strategy = useLiveStrategy();
  const desk = useDeskState(strategy.data ?? null);
  const updatedAt = oracle.data?.updatedAt ?? desk.data?.oracleUpdatedAt;

  if (updatedAt === undefined) return null;

  // An updatedAt in the future is not fresh (book rule in docs/agent-design.md).
  const left = updatedAt > now ? 0 : updatedAt + WINDOW_SECONDS - now;
  const open = left > 0;
  const label = open ? "Window open" : "Waiting for price";

  return (
    <HStack gap={2} vAlign="center">
      <StatusDot variant={open ? "success" : "warning"} label={label} />
      <Text type="body" hasTabularNumbers>
        {open ? `${label} · ${formatCountdown(left)}` : label}
      </Text>
    </HStack>
  );
}
