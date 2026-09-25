import {
  BANNER_CLOSES,
  BANNER_MULTI,
  BANNER_NETWORK,
  BANNER_NONE,
  BANNER_RPC,
  BANNER_STALE,
  BANNER_STALE_TAIL,
  CONTROLS,
  GO_CONTROLS,
  LEVEL_WORD,
  NAV_LABEL,
  RETRY,
  SWITCH_SEPOLIA,
} from "../copy/en";

export type Banner = {
  id: string;
  level: "info" | "warning" | "danger";
  text: string;
  action?: { label: string; onClick: () => void };
};

export type BannerInput = {
  wrongNetwork?: boolean;
  onSwitch?: () => void;
  strategyWarning?: string;
  onControls?: () => void;
  oracleStale?: boolean;
  maxStaleness?: number;
  live?: unknown;
  loaded?: boolean;
  isTreasury?: boolean;
  onOpen?: () => void;
  secondsToDeadline?: number;
  deadlineText?: string;
  rpcFailures?: number;
  lastDataText?: string;
  onRetry?: () => void;
};

export function bannersFrom(input: BannerInput | undefined): Banner[] {
  if (!input) return [];
  const banners: Banner[] = [];

  if (input.wrongNetwork && input.onSwitch) {
    banners.push({
      id: "network",
      level: "danger",
      text: BANNER_NETWORK,
      action: { label: SWITCH_SEPOLIA, onClick: input.onSwitch },
    });
  }
  if (input.strategyWarning === "MULTIPLE_LIVE" && input.onControls) {
    banners.push({
      id: "multi",
      level: "danger",
      text: BANNER_MULTI,
      action: { label: GO_CONTROLS, onClick: input.onControls },
    });
  }
  if (input.oracleStale && input.maxStaleness !== undefined) {
    const minutes = input.maxStaleness / 60;
    banners.push({
      id: "stale",
      level: "warning",
      text: `${BANNER_STALE} ${minutes} ${BANNER_STALE_TAIL}`,
    });
  }
  if (input.loaded && input.live === null) {
    banners.push({
      id: "none",
      level: "info",
      text: BANNER_NONE,
      ...(input.isTreasury && input.onOpen
        ? { action: { label: NAV_LABEL.open, onClick: input.onOpen } }
        : {}),
    });
  }
  if (
    input.secondsToDeadline !== undefined &&
    input.secondsToDeadline < 86400 &&
    input.deadlineText &&
    input.onControls
  ) {
    banners.push({
      id: "deadline",
      level: "warning",
      text: `${BANNER_CLOSES} ${input.deadlineText}.`,
      action: { label: CONTROLS, onClick: input.onControls },
    });
  }
  if (input.rpcFailures !== undefined && input.rpcFailures >= 3 && input.lastDataText && input.onRetry) {
    banners.push({
      id: "rpc",
      level: "warning",
      text: `${BANNER_RPC} ${input.lastDataText}.`,
      action: { label: RETRY, onClick: input.onRetry },
    });
  }

  return banners.slice(0, 2);
}

const ICON = { danger: "!", warning: "!", info: "i" } as const;

export function BannerList({ banners }: { banners: Banner[] }) {
  return (
    <div className="flex flex-col gap-3">
      {banners.map((banner) => (
        <div
          key={banner.id}
          role={banner.level === "danger" ? "alert" : "status"}
          className={
            banner.level === "danger"
              ? "flex items-center gap-3 rounded-control bg-danger px-4 py-3 text-body text-onfocus"
              : banner.level === "warning"
                ? "flex items-center gap-3 rounded-control bg-warning px-4 py-3 text-body text-text"
                : "flex items-center gap-3 rounded-control bg-surface px-4 py-3 text-body text-text"
          }
        >
          <span className="sr-only">{LEVEL_WORD[banner.level]}</span>
          <span aria-hidden="true">{ICON[banner.level]}</span>
          <p className="flex-1">{banner.text}</p>
          {banner.action ? (
            <button type="button" className="text-body" onClick={banner.action.onClick}>
              {banner.action.label}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
