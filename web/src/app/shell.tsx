import { type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAccount, useChainId, useConnect, useSwitchChain } from "wagmi";
import { BannerList, bannersFrom } from "./banners";
import { ToastProvider } from "../components/Toast";
import {
  BANNER_OWNER,
  CONNECT_WALLET,
  FOOTER,
  MARK,
  NAV_LABEL,
  NETWORK_SEPOLIA,
  ROLE_LABEL,
  SWITCH_SEPOLIA,
} from "../copy/en";
import { NOW } from "../desk/fixture/state";
import { useDeskState, useLiveStrategy } from "../hooks/useDesk";
import { useCanAct, useWalletLabel } from "../hooks/useCanAct";
import { formatWhen } from "../lib/time";
import { formatAddr } from "../lib/format";
import { DemoDrawer } from "../pages/DemoDrawer";
import { homeFor, useRole, type Role } from "./role";

const NAV: Record<Role, { to: string; label: string; end: boolean }[]> = {
  treasury: [
    { to: "/desk", label: NAV_LABEL.dashboard, end: true },
    { to: "/open", label: NAV_LABEL.open, end: true },
    { to: "/counterparties", label: NAV_LABEL.counterparties, end: true },
    { to: "/controls", label: NAV_LABEL.controls, end: true },
    { to: "/fills", label: NAV_LABEL.fills, end: false },
    { to: "/program", label: NAV_LABEL.program, end: true },
  ],
  mm: [
    { to: "/trade", label: NAV_LABEL.trade, end: true },
    { to: "/desk", label: NAV_LABEL.dashboard, end: true },
    { to: "/fills", label: NAV_LABEL.fills, end: false },
    { to: "/program", label: NAV_LABEL.program, end: true },
  ],
  observer: [
    { to: "/desk", label: NAV_LABEL.dashboard, end: true },
    { to: "/fills", label: NAV_LABEL.fills, end: false },
    { to: "/program", label: NAV_LABEL.program, end: true },
    { to: "/counterparties", label: NAV_LABEL.counterparties, end: true },
    { to: "/agent", label: NAV_LABEL.agent, end: true },
  ],
};

const ROLES: Role[] = ["treasury", "mm", "observer"];

export function AppFrame({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const showHeader = pathname !== "/";

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col">
        {showHeader ? <AppHeader /> : null}
        <main className="mx-auto flex w-full min-w-0 max-w-[var(--max)] flex-1 flex-col gap-5 px-4 py-6 sm:px-8 sm:py-8">
          {showHeader ? <PageNotices /> : null}
          {children}
          {showHeader ? <DemoDrawer /> : null}
        </main>
        <footer className="break-words px-4 py-6 text-small text-muted shadow-overlay sm:px-8">{FOOTER}</footer>
      </div>
    </ToastProvider>
  );
}

function PageNotices() {
  const { wrongNetwork, readOnlyTreasury } = useCanAct();
  const { switchChain } = useSwitchChain();
  const navigate = useNavigate();
  const [role] = useRole();
  const live = useLiveStrategy();
  const state = useDeskState(live.data ?? null);
  const now = import.meta.env.VITE_DESK_MODE === "live" ? Math.floor(Date.now() / 1000) : NOW;
  const desk = state.data;
  const banners = bannersFrom({
    ...(wrongNetwork ? { wrongNetwork: true, onSwitch: () => switchChain({ chainId: 11155111 }) } : {}),
    ...(live.data?.warning ? { strategyWarning: live.data.warning, onControls: () => navigate("/controls") } : {}),
    ...(desk?.oracleStale ? { oracleStale: true, maxStaleness: desk.maxStaleness } : {}),
    ...(live.isSuccess ? { loaded: true, live: live.data } : {}),
    ...(role === "treasury" ? { isTreasury: true, onOpen: () => navigate("/open") } : {}),
    ...(desk
      ? {
          secondsToDeadline: desk.deadline - now,
          deadlineText: formatWhen(desk.deadline, now),
          onControls: () => navigate("/controls"),
        }
      : {}),
  });

  return (
    <>
      {readOnlyTreasury ? <p className="text-body">{BANNER_OWNER}</p> : null}
      <BannerList banners={banners} />
    </>
  );
}

function AppHeader() {
  const [role, setRole] = useRole();
  const navigate = useNavigate();
  const live = useLiveStrategy();
  const links = NAV[role].filter((link) => !(role === "treasury" && live.data && link.to === "/open"));

  function pick(next: Role) {
    if (next === role) return;
    setRole(next);
    navigate(homeFor(next));
  }

  return (
    <header className="sticky top-0 z-20 bg-bg">
      <div className="mx-auto flex w-full max-w-[var(--max)] flex-wrap items-center gap-3 px-4 py-4 sm:gap-5 sm:px-8">
        <span className="text-h3">{MARK}</span>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <NetworkChip />
          <WalletChip />
          <label className="flex items-center gap-2 text-small text-muted">
            Mode
            <select
              aria-label="Mode"
              className="text-body text-text"
              value={role}
              onChange={(event) => pick(event.target.value as Role)}
            >
              {ROLES.map((item) => (
                <option key={item} value={item}>
                  {ROLE_LABEL[item]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <nav className="mx-auto flex w-full max-w-[var(--max)] flex-wrap gap-2 px-4 pb-4 sm:px-8" aria-label="Pages">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              isActive
                ? "rounded-control bg-text px-3 py-2 text-body text-onfocus no-underline"
                : "rounded-control bg-transparent px-3 py-2 text-body text-muted no-underline shadow-none"
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

function NetworkChip() {
  const account = useAccount();
  const configChainId = useChainId();
  const chainId =
    account.status === "connected" && account.chainId != null ? account.chainId : configChainId;
  const { switchChain } = useSwitchChain();

  if (chainId === 11155111) {
    return <span className="text-body text-muted">{NETWORK_SEPOLIA}</span>;
  }

  return (
    <button
      type="button"
      className="rounded-control bg-danger px-3 py-2 text-body text-onfocus"
      onClick={() => switchChain({ chainId: 11155111 })}
    >
      {SWITCH_SEPOLIA}
    </button>
  );
}

function WalletChip() {
  const { address, status } = useAccount();
  const { connect, connectors } = useConnect();
  const label = useWalletLabel();

  if (status === "connected" && address) {
    return (
      <span className="text-body">
        <span className="num">{formatAddr(address)}</span> <span className="text-muted">{label}</span>
      </span>
    );
  }

  const connector = connectors[0];

  return (
    <button
      type="button"
      className="text-body"
      onClick={() => {
        if (connector) connect({ connector });
      }}
    >
      {CONNECT_WALLET}
    </button>
  );
}
