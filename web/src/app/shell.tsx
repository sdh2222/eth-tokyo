import type { ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { MARK, NAV_LABEL, ROLE_LABEL, WALLET_DISCONNECTED, FOOTER } from "../copy/en";
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
    <div className="min-h-screen flex flex-col">
      {showHeader ? <AppHeader /> : null}
      <main className="mx-auto w-full max-w-[var(--max)] px-8 py-8 flex-1">{children}</main>
      <footer className="border-t border-border px-8 py-6 text-small text-muted">{FOOTER}</footer>
    </div>
  );
}

function AppHeader() {
  const [role, setRole] = useRole();
  const navigate = useNavigate();
  const links = NAV[role];

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
        <span className="text-body text-muted">{WALLET_DISCONNECTED}</span>
      </div>
    </header>
  );
}
