import type { Role } from "./role";

// The sitemap from the approved information architecture: one SideNav section per role.
export type NavPage = { label: string; href: string };

export const DASHBOARD: NavPage = { label: "Dashboard", href: "/desk" };
// Listed under Dashboard while no desk program is live (the IA sitemap's conditional page).
export const OPEN_A_DESK: NavPage = { label: "Open a desk", href: "/open" };

export const TREASURY_PAGES: readonly NavPage[] = [
  DASHBOARD,
  { label: "Counterparties", href: "/counterparties" },
  { label: "Risk agent", href: "/agent" },
  { label: "Fills", href: "/fills" },
  { label: "Controls", href: "/controls" },
];

export const MY_FILLS: NavPage = { label: "My fills", href: "/fills?mine" };

export const COUNTERPARTY_PAGES: readonly NavPage[] = [{ label: "Trade", href: "/trade" }, MY_FILLS];

export function treasuryPages(deskLive: boolean): readonly NavPage[] {
  return deskLive ? TREASURY_PAGES : TREASURY_PAGES.flatMap((page) => (page === DASHBOARD ? [page, OPEN_A_DESK] : [page]));
}

type Location = { pathname: string; search: string };

function isMine(search: string): boolean {
  return new URLSearchParams(search).has("mine");
}

// The side-nav item a location belongs to. A child page selects its parent: Verify a fill
// selects Fills (or My fills), Program selects Controls, and the Change flow on /open
// selects Controls while a desk is live.
export function selectedHref(location: Location, role: Role, deskLive: boolean): string | null {
  const { pathname, search } = location;
  if (pathname === "/fills") return isMine(search) ? MY_FILLS.href : "/fills";
  if (pathname.startsWith("/fills/")) return role === "mm" ? MY_FILLS.href : "/fills";
  if (pathname === "/program") return "/controls";
  if (pathname === "/open") return deskLive ? "/controls" : OPEN_A_DESK.href;
  const page = [...TREASURY_PAGES, ...COUNTERPARTY_PAGES].find((item) => item.href === pathname);
  return page?.href ?? null;
}

// The role a location belongs to, or null for pages both roles share.
export function roleOf(location: Location): Role | null {
  const { pathname, search } = location;
  if (pathname === "/trade" || (pathname === "/fills" && isMine(search))) return "mm";
  if (["/desk", "/open", "/counterparties", "/agent", "/controls", "/program"].includes(pathname)) return "treasury";
  if (pathname === "/fills") return "treasury";
  return null;
}

export type Crumb = { label: string; href?: string };

// Breadcrumbs only on child pages. The Breadcrumbs page says not to show them on
// top-level pages that have no parent.
export function trailFor(location: Location, role: Role, deskLive: boolean): readonly Crumb[] | null {
  const { pathname, search } = location;
  if (pathname.startsWith("/fills/")) {
    const tx = decodeURIComponent(pathname.slice("/fills/".length));
    const parent = role === "mm" ? MY_FILLS : { label: "Fills", href: "/fills" };
    return [parent, { label: tx.length > 12 ? `${tx.slice(0, 6)}…${tx.slice(-4)}` : tx }];
  }
  if (pathname === "/program") return [{ label: "Controls", href: "/controls" }, { label: "Program" }];
  if (pathname === "/open" && deskLive && new URLSearchParams(search).has("step")) {
    return [{ label: "Controls", href: "/controls" }, { label: "Open a desk" }];
  }
  return null;
}
