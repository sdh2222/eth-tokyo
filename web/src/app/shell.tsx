import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { Banner } from "@astryxdesign/core/Banner";
import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Kbd } from "@astryxdesign/core/Kbd";
import { Tooltip } from "@astryxdesign/core/Tooltip";
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

// The approved "Side list" shell from design/desk (ShellPreview.tsx), kept as approved:
// the role list on the left (ctrl+b), the wordmark and wallet in the TopNav, the page tabs,
// then the banners. Styles are web/src/app/shell.css. What changed: the roles are Treasury
// and Counterparty, the tabs are the IA pages and route, and the banners and wallet are live.
function Shell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [role, setRole] = useRole();
  const live = useLiveStrategy();
  const deskLive = Boolean(live.data);
  const [menuOpen, setMenuOpen] = useState(true);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "b" || !event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, [contenteditable='true']")) return;
      event.preventDefault();
      setMenuOpen((open) => !open);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The page in view decides the role: Trade and My fills belong to the counterparty.
  const pageRole = roleOf(location);
  useEffect(() => {
    if (pageRole && pageRole !== role) setRole(pageRole);
  }, [pageRole, role, setRole]);

  const pages = role === "treasury" ? treasuryPages(deskLive) : COUNTERPARTY_PAGES;
  const selected = selectedHref(location, role, deskLive);
  const trail = trailFor(location, role, deskLive);

  return (
    <div className="mul-shell" data-roles={menuOpen ? "open" : "closed"}>
      <div className="mul-frame">
        <div className="watermark-toc" aria-hidden={menuOpen ? undefined : true}>
          <div role="radiogroup" aria-label="Role">
            {ROLES.map((item) => (
              <button
                key={item}
                type="button"
                className="watermark-toc-item"
                role="radio"
                aria-checked={item === role}
                tabIndex={menuOpen ? 0 : -1}
                onClick={() => {
                  setRole(item);
                  navigate(homeFor(item));
                }}
              >
                {ROLE_WORD[item]}
              </button>
            ))}
          </div>
        </div>
        <div className="mul-main">
          <header className="mul-header">
            <TopNav
              label="Account"
              heading={
                <span className="watermark-heading">
                  <Tooltip placement="below" content={<span className="watermark-tip">Roles <Kbd keys="ctrl+b" /></span>}>
                    <IconButton
                      className="watermark-menu"
                      label={menuOpen ? "Close roles" : "Open roles"}
                      variant="ghost"
                      icon={<Icon icon={menuOpen ? "chevronLeft" : "menu"} />}
                      onClick={() => setMenuOpen((open) => !open)}
                    />
                  </Tooltip>
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
            <nav className="mul-pages" aria-label="Pages">
              {pages.map((page) => (
                <TopNavItem key={page.href} label={page.label} href={page.href} isSelected={page.href === selected} />
              ))}
            </nav>
          </header>
          <Notices isTreasury={role === "treasury"} />
          <main className="mul-page">
            {trail ? (
              <Breadcrumbs>
                {trail.map((crumb) => (
                  <BreadcrumbItem key={crumb.label} {...(crumb.href ? { href: crumb.href } : {})}>
                    {crumb.label}
                  </BreadcrumbItem>
                ))}
              </Breadcrumbs>
            ) : null}
            {children}
            <DemoDrawer />
          </main>
        </div>
      </div>
    </div>
  );
}

const STATUS = { danger: "error", warning: "warning", info: "info" } as const;

// The approved Notices: section banners with a ghost action, fed by bannersFrom.
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
          title={banner.text}
          {...(banner.action
            ? { endContent: <Button label={banner.action.label} variant="ghost" onClick={banner.action.onClick} /> }
            : {})}
        />
      ))}
    </div>
  );
}
