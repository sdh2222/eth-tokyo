import { useRef, useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import { Avatar } from "@astryxdesign/core/Avatar";
import { AvatarGroup, AvatarGroupOverflow } from "@astryxdesign/core/AvatarGroup";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Popover } from "@astryxdesign/core/Popover";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { TopNavItem } from "@astryxdesign/core/TopNav";
import {
  BANNER_NONE,
  BANNER_STALE,
  BANNER_STALE_TAIL,
  CONNECT_WALLET,
  CONTROLS,
  NAV_LABEL,
} from "../../copy/en";
import type { Role } from "../../app/role";

export const MAKER_NAV = [
  "Dashboard",
  "Desks",
  "Counterparties",
  "Control center",
  "Agent",
  "Fills",
  "Programs",
] as const;

export const TAKER_NAV = ["Dashboard", "Trade", "Fills", "Records", "Compare", "API"] as const;

export const OBSERVER_NAV = ["Dashboard", "Fills", "Programs", "Counterparties", "Agent"] as const;

export const NAV: Record<Role, readonly string[]> = {
  treasury: MAKER_NAV,
  mm: TAKER_NAV,
  observer: OBSERVER_NAV,
};

export const ROLES: Role[] = ["treasury", "mm", "observer"];

export const ROLE_WORD: Record<Role, string> = {
  treasury: "Maker",
  mm: "Taker",
  observer: "Observer",
};

export const ROLE_LIST: Record<Role, string> = {
  treasury: "Maker Dashboard",
  mm: "Taker Dashboard",
  observer: "Observer Dashboard",
};

export function VersionLinks({ current }: { current: "side" | "row" | "astryx" }) {
  return (
    <nav className="watermark-versions" aria-label="Header versions">
      <Link to="/dev/shell" aria-current={current === "side" ? "page" : undefined}>
        Side list
      </Link>
      <Link to="/dev/shell/row" aria-current={current === "row" ? "page" : undefined}>
        Second row
      </Link>
      <Link to="/dev/shell/astryx" aria-current={current === "astryx" ? "page" : undefined}>
        Astryx
      </Link>
    </nav>
  );
}

export function PageNav({
  role,
  page,
  onPick,
  dashboardLabel,
}: {
  role: Role;
  page: string;
  onPick: (label: string) => void;
  dashboardLabel?: string;
}) {
  return (
    <nav className="mul-pages" aria-label="Pages">
      {NAV[role].map((label, index) => {
        const name = index === 0 && dashboardLabel ? dashboardLabel : label;
        return <TopNavItem key={name} label={name} isSelected={name === page} onClick={() => onPick(name)} />;
      })}
    </nav>
  );
}

export function Notices() {
  return (
    <div className="mul-banners">
      <Banner
        status="warning"
        container="section"
        title={`${BANNER_STALE} 60 ${BANNER_STALE_TAIL}`}
        endContent={<Button label={CONTROLS} variant="ghost" />}
      />
      <Banner
        status="info"
        container="section"
        title={BANNER_NONE}
        endContent={<Button label={NAV_LABEL.open} variant="ghost" />}
      />
    </div>
  );
}

const WALLET = "0xA11cE3f20000000000000000000000000000e3F2";
const WALLET_SHORT = "0xA11c…e3F2";
const WALLET_EXPLORER = `https://sepolia.etherscan.io/address/${WALLET}`;

function WalletInfo({ onLogout }: { onLogout: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(WALLET).then(() => setCopied(true));
  }

  return (
    <div className="watermark-wallet-info">
      <div className="watermark-wallet-address-row">
        <button type="button" className="watermark-wallet-address" onClick={copy}>
          {WALLET_SHORT}
        </button>
        <button type="button" className="watermark-copy" aria-label={copied ? "Copied" : "Copy address"} onClick={copy}>
          <Icon icon="copy" />
        </button>
      </div>
      <Divider />
      <HStack gap={2} vAlign="center">
        <AvatarGroup aria-label="3 treasury keys, 1 joined">
          <Avatar name="1" alt="Key 001" />
          <Avatar name="2" alt="Key 002" />
          <AvatarGroupOverflow count={1} />
        </AvatarGroup>
        <StatusDot variant="success" label="1 of 3 joined" tooltip="Key 001 from the treasury can sign" />
      </HStack>
      <Text type="body">Key 001 from the treasury</Text>
      <a href={WALLET_EXPLORER} target="_blank" rel="noreferrer">
        View this address on Etherscan
      </a>
      <Button label="Log out" variant="ghost" onClick={onLogout} />
    </div>
  );
}

export function WalletControl() {
  const [connected, setConnected] = useState(false);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        type="button"
        ref={anchorRef}
        className={connected ? "watermark-wallet watermark-wallet-on" : "watermark-wallet"}
        aria-label={connected ? WALLET_SHORT : CONNECT_WALLET}
        onClick={() => {
          if (!connected) setConnected(true);
        }}
      >
        {connected ? WALLET_SHORT : CONNECT_WALLET}
      </button>
      {connected ? (
        <Popover
          label="Wallet"
          placement="below"
          alignment="end"
          hasCloseButton={false}
          className="watermark-wallet-popover"
          anchorRef={anchorRef as RefObject<HTMLElement>}
          isOpen={open}
          onOpenChange={setOpen}
          content={<WalletInfo onLogout={() => { setOpen(false); setConnected(false); }} />}
        />
      ) : null}
    </>
  );
}
