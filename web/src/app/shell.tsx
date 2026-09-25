import type { ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAccount, useChainId, useConnect, useSwitchChain } from "wagmi";
import { BannerList, bannersFrom } from "./banners";
import { PrimaryButton } from "../components/PrimaryButton";
import { ToastProvider } from "../components/Toast";
import {
  BANNER_OWNER,
  CONNECT_WALLET,
  CONTINUE,
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
        <main className="mx-auto flex w-full max-w-[var(--max)] flex-1 flex-col gap-5 px-8 py-8">
          {showHeader ? <PageNotices /> : null}
          {showHeader ? <PrimaryButton>{CONTINUE}</PrimaryButton> : null}
          {children}
          {showHeader ? <DemoDrawer /> : null}
        </main>
        <footer className="border-t border-border px-8 py-6 text-small text-muted">{FOOTER}</footer>
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
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-[var(--max)] items-center gap-5 px-8 py-4">
        <span className="text-h3">{MARK}</span>
        <div className="flex gap-1" role="group" aria-label="Role">
          {ROLES.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={item === role}
              className={
                item === role
                  ? "rounded-control bg-surface px-3 py-2 text-body"
                  : "rounded-control px-3 py-2 text-body text-muted"
              }
              onClick={() => pick(item)}
            >
              {ROLE_LABEL[item]}
            </button>
          ))}
        </div>
        <nav className="flex flex-1 gap-4" aria-label="Pages">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                isActive ? "text-body text-text" : "text-body text-muted"
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <NetworkChip />
        <WalletChip />
      </div>
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
