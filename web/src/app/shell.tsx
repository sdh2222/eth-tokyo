import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { AppShell } from "@astryxdesign/core/AppShell";
import { Banner } from "@astryxdesign/core/Banner";
import { BreadcrumbItem, Breadcrumbs } from "@astryxdesign/core/Breadcrumbs";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Kbd } from "@astryxdesign/core/Kbd";
import { SideNav, SideNavCollapseButton, SideNavItem, SideNavSection } from "@astryxdesign/core/SideNav";
import { Tooltip } from "@astryxdesign/core/Tooltip";
import { TopNav, TopNavHeading } from "@astryxdesign/core/TopNav";
import { VStack } from "@astryxdesign/core/VStack";
import { useHotkeys } from "@astryxdesign/core/hooks";
import { bannersFrom, type Banner as DeskBanner } from "./banners";
import { COUNTERPARTY_PAGES, roleOf, selectedHref, trailFor, treasuryPages, type NavPage } from "./nav";
import { useRole } from "./role";
import { WalletControl } from "./WalletControl";
import { WindowPill } from "./WindowPill";
import { Wordmark } from "./Wordmark";
import { ToastProvider } from "../components/Toast";
import { DemoDrawer } from "../pages/DemoDrawer";
import { BANNER_NETWORK, BANNER_OWNER, SWITCH_SEPOLIA } from "../copy/en";
import { NOW } from "../desk/fixture/state";
import { useCanAct } from "../hooks/useCanAct";
import { useDeskState, useLiveStrategy } from "../hooks/useDesk";
import { formatWhen } from "../lib/time";

const SEPOLIA = 11155111;
const COLLAPSE_KEYS = "mod+b";

// The app frame. Landing keeps its own frame; every other page sits in the shell.
export function AppFrame({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <ToastProvider>{pathname === "/" ? children : <Shell>{children}</Shell>}</ToastProvider>;
}

// AppShell "Full Featured": TopNav for identity and account, SideNav for the pages, and
// page-level banners above the content. The SideNav collapse state is controlled here and
// shared with the SideNavCollapseButton in the TopNav heading, as the SideNav page shows.
function Shell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [role, setRole] = useRole();
  const live = useLiveStrategy();
  const deskLive = Boolean(live.data);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const collapsible = { isCollapsed, onCollapsedChange: setIsCollapsed };

  // useHotkeys paired with Kbd, so the shortcut shown is the one registered.
  useHotkeys([{ keys: COLLAPSE_KEYS, onPress: () => setIsCollapsed((value) => !value) }]);

  // The section of the page in view is the role: Trade and My fills are the counterparty's.
  const pageRole = roleOf(location);
  useEffect(() => {
    if (pageRole && pageRole !== role) setRole(pageRole);
  }, [pageRole, role, setRole]);

  const selected = selectedHref(location, role, deskLive);
  const trail = trailFor(location, role, deskLive);

  return (
    <AppShell
      variant="wash"
      height="auto"
      contentPadding={6}
      banner={<NetworkBanner />}
      topNav={
        <TopNav
          label="Account"
          heading={
            <HStack gap={2} vAlign="center">
              <Tooltip
                content={
                  <HStack gap={1} vAlign="center">
                    Pages <Kbd keys={COLLAPSE_KEYS} />
                  </HStack>
                }
              >
                <SideNavCollapseButton collapsible={collapsible} />
              </Tooltip>
              <TopNavHeading logo={<Wordmark />} logoLabel="watermark" />
            </HStack>
          }
          endContent={
            <HStack gap={4} vAlign="center">
              <WindowPill />
              <WalletControl />
            </HStack>
          }
        />
      }
      sideNav={
        <SideNav aria-label="Pages" collapsible={{ ...collapsible, hasButton: false }}>
          <SideNavSection title="Treasury">
            {treasuryPages(deskLive).map((page) => (
              <NavItem key={page.href} page={page} selected={selected} />
            ))}
          </SideNavSection>
          <SideNavSection title="Counterparty">
            {COUNTERPARTY_PAGES.map((page) => (
              <NavItem key={page.href} page={page} selected={selected} />
            ))}
          </SideNavSection>
        </SideNav>
      }
    >
      <VStack gap={4}>
        {trail ? (
          <Breadcrumbs>
            {trail.map((crumb) => (
              <BreadcrumbItem key={crumb.label} {...(crumb.href ? { href: crumb.href } : {})}>
                {crumb.label}
              </BreadcrumbItem>
            ))}
          </Breadcrumbs>
        ) : null}
        <DeskBanners isTreasury={role === "treasury"} />
        {children}
        {/* The old demo drawer (Shift+D or ?demo=1) until the overlays step rebuilds it. */}
        <DemoDrawer />
      </VStack>
    </AppShell>
  );
}

function NavItem({ page, selected }: { page: NavPage; selected: string | null }) {
  return <SideNavItem label={page.label} href={page.href} isSelected={page.href === selected} />;
}

// System-wide: the AppShell banner slot. An error banner stays until the network is fixed.
function NetworkBanner() {
  const account = useAccount();
  const configChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const chainId = account.status === "connected" && account.chainId != null ? account.chainId : configChainId;
  if (account.status !== "connected" || chainId === SEPOLIA) return null;
  return (
    <Banner
      status="error"
      container="section"
      title={BANNER_NETWORK}
      endContent={
        <Button label={SWITCH_SEPOLIA} variant="secondary" size="sm" onClick={() => switchChain({ chainId: SEPOLIA })} />
      }
    />
  );
}

const STATUS = { danger: "error", warning: "warning", info: "info" } as const;

type PageBanner = { id: string; status: "error" | "warning" | "info"; title: string; description?: string; action?: DeskBanner["action"] };

// Banner page: keep titles short, so a notice's first sentence is the title and the rest
// its description; don't stack two banners of one status, so those combine into one.
function toPageBanners(list: readonly DeskBanner[]): PageBanner[] {
  const out: PageBanner[] = [];
  for (const item of list) {
    const status = STATUS[item.level];
    const split = item.text.indexOf(". ");
    const title = split > 0 ? item.text.slice(0, split + 1) : item.text;
    const rest = split > 0 ? item.text.slice(split + 2) : undefined;
    const same = out.find((banner) => banner.status === status);
    if (same) {
      same.description = [same.description, item.text].filter(Boolean).join(" ");
      continue;
    }
    out.push({
      id: item.id,
      status,
      title,
      ...(rest ? { description: rest } : {}),
      ...(item.action ? { action: item.action } : {}),
    });
  }
  return out;
}

// Page-level notices about the desk, above the content (Banner container "section").
// Info banners can be dismissed; warnings and errors stay.
function DeskBanners({ isTreasury }: { isTreasury: boolean }) {
  const navigate = useNavigate();
  const { readOnlyTreasury } = useCanAct();
  const live = useLiveStrategy();
  const state = useDeskState(live.data ?? null);
  const now = import.meta.env.VITE_DESK_MODE === "live" ? Math.floor(Date.now() / 1000) : NOW;
  const desk = state.data;

  const notices = bannersFrom({
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
  const banners = toPageBanners(
    isTreasury && readOnlyTreasury ? [{ id: "owner", level: "info", text: BANNER_OWNER }, ...notices] : notices,
  ).slice(0, 2);

  if (banners.length === 0) return null;
  return (
    <VStack gap={2}>
      {banners.map((banner) => (
        <Banner
          key={banner.id}
          status={banner.status}
          container="section"
          title={banner.title}
          {...(banner.description ? { description: banner.description } : {})}
          isDismissable={banner.status === "info"}
          {...(banner.action
            ? {
                endContent: (
                  <Button label={banner.action.label} variant="secondary" size="sm" onClick={banner.action.onClick} />
                ),
              }
            : {})}
        />
      ))}
    </VStack>
  );
}
