import { useEffect, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { TopNav, TopNavHeading, TopNavItem } from "@astryxdesign/core/TopNav";
import { bannersFrom } from "./banners";
import { COUNTERPARTY_PAGES, roleOf, selectedHref, trailFor, treasuryPages } from "./nav";
import { homeFor, useRole, type Role } from "./role";
import { WalletControl } from "./WalletControl";
import { ToastProvider } from "../components/Toast";
import { NOW } from "../desk/fixture/state";
import { useDeskState, useLiveStrategy } from "../hooks/useDesk";
import { formatWhen } from "../lib/time";
import { DemoDrawer } from "../pages/DemoDrawer";

const SEPOLIA = 11155111;
const ROLES: Role[] = ["treasury", "mm"];
const ROLE_WORD: Record<Role, string> = { treasury: "Treasury", mm: "Counterparty" };

// Landing keeps its own frame; every other page sits in the approved shell.
export function AppFrame({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <ToastProvider>{pathname === "/" ? children : <Shell>{children}</Shell>}</ToastProvider>;
}

// The approved "Second row" shell from design/desk (ShellRow.tsx), kept as approved: the
// wordmark and wallet in the TopNav, a second row of role buttons, the page tabs, then the
// banners. Styles are web/src/app/shell.css. What changed: the roles are Treasury and
// Counterparty, the tabs are the IA pages and route, and the banners and wallet are live.
function Shell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [role, setRole] = useRole();
  const live = useLiveStrategy();
  const deskLive = Boolean(live.data);

  // The page in view decides the role: Trade and My fills belong to the counterparty.
  const pageRole = roleOf(location);
  useEffect(() => {
    if (pageRole && pageRole !== role) setRole(pageRole);
  }, [pageRole, role, setRole]);

  const pages = role === "treasury" ? treasuryPages(deskLive) : COUNTERPARTY_PAGES;
  const selected = selectedHref(location, role, deskLive);
  const trail = trailFor(location, role, deskLive);

  return (
    <div className="mul-shell">
      <header className="mul-header">
        <TopNav
          label="Account"
          heading={
            <span className="watermark-heading">
              <TopNavHeading
                className="watermark-mark"
                logoLabel="watermark"
                logo={
                  <span className="watermark-word">
                    <span className="watermark-water">water</span>
                    <span className="watermark-ens">mark</span>
                  </span>
                }
              />
            </span>
          }
          endContent={<WalletControl />}
        />
        <div className="watermark-role-row" role="radiogroup" aria-label="Role">
          {ROLES.map((item) => (
            <Button
              key={item}
              label={ROLE_WORD[item]}
              variant={item === role ? "primary" : "ghost"}
              onClick={() => {
                setRole(item);
                navigate(homeFor(item));
              }}
            />
          ))}
        </div>
        <nav className="mul-pages" aria-label="Pages">
          {pages.map((page) => (
            <TopNavItem key={page.href} label={page.label} href={page.href} isSelected={page.href === selected} />
          ))}
        </nav>
      </header>
      <Notices isTreasury={role === "treasury"} />
      <main className="mul-page">
        {trail ? (
          <nav className="wm-crumbs" aria-label="Breadcrumb">
            {trail.map((crumb, index) => (
              <span key={crumb.label}>
                {index > 0 ? <span aria-hidden="true"> / </span> : null}
                {crumb.href ? <Link to={crumb.href}>{crumb.label}</Link> : <span aria-current="page">{crumb.label}</span>}
              </span>
            ))}
          </nav>
        ) : null}
        {children}
        <DemoDrawer />
      </main>
    </div>
  );
}

const STATUS = { danger: "error", warning: "warning", info: "info" } as const;

// The approved DismissibleNotices: section banners with a ghost action, fed by bannersFrom.
function Notices({ isTreasury }: { isTreasury: boolean }) {
  const navigate = useNavigate();
  const account = useAccount();
  const configChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const live = useLiveStrategy();
  const state = useDeskState(live.data ?? null);
  const now = import.meta.env.VITE_DESK_MODE === "live" ? Math.floor(Date.now() / 1000) : NOW;
  const desk = state.data;
  const chainId = account.status === "connected" && account.chainId != null ? account.chainId : configChainId;

  const banners = bannersFrom({
    ...(account.status === "connected" && chainId !== SEPOLIA
      ? { wrongNetwork: true, onSwitch: () => switchChain({ chainId: SEPOLIA }) }
      : {}),
    ...(live.data?.warning ? { strategyWarning: live.data.warning, onControls: () => navigate("/controls") } : {}),
    ...(desk?.oracleStale ? { oracleStale: true, maxStaleness: desk.maxStaleness } : {}),
    ...(live.isSuccess ? { loaded: true, live: live.data } : {}),
    ...(isTreasury ? { isTreasury: true, onOpen: () => navigate("/open") } : {}),
    ...(desk
      ? {
          secondsToDeadline: desk.deadline - now,
          deadlineText: formatWhen(desk.deadline, now),
          onControls: () => navigate("/controls"),
        }
      : {}),
  });

  if (banners.length === 0) return null;
  return (
    <div className="mul-banners">
      {banners.map((banner) => (
        <Banner
          key={banner.id}
          status={STATUS[banner.level]}
          container="section"
          isDismissable
          title={banner.text}
          {...(banner.action
            ? { endContent: <Button label={banner.action.label} variant="ghost" onClick={banner.action.onClick} /> }
            : {})}
        />
      ))}
    </div>
  );
}
