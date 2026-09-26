import { useRef, useState, type RefObject } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { AvatarGroup, AvatarGroupOverflow } from "@astryxdesign/core/AvatarGroup";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Popover } from "@astryxdesign/core/Popover";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import sepoliaConfig from "@config";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { CONNECT_WALLET } from "../copy/en";
import type { DeskConfig } from "../desk/types";
import { useWalletLabel } from "../hooks/useCanAct";
import { formatAddr } from "../lib/format";

const EXPLORER = (sepoliaConfig as DeskConfig).explorer;

// The approved wallet control (design/desk shell-parts.tsx), unchanged in markup and
// classes. Only the mock wallet is replaced by wagmi: the address, connect and log out.
function WalletInfo({ address, onLogout }: { address: string; onLogout: () => void }) {
  const [copied, setCopied] = useState(false);
  const label = useWalletLabel();
  const owner = /^Safe owner (\d)\/3$/.exec(label);

  function copy() {
    void navigator.clipboard.writeText(address).then(() => setCopied(true));
  }

  return (
    <div className="watermark-wallet-info">
      <div className="watermark-wallet-address-row">
        <button type="button" className="watermark-wallet-address" onClick={copy}>
          {formatAddr(address)}
        </button>
        <button type="button" className="watermark-copy" aria-label={copied ? "Copied" : "Copy address"} onClick={copy}>
          <Icon icon="copy" />
        </button>
      </div>
      <Divider />
      {owner ? (
        <HStack gap={2} vAlign="center">
          <AvatarGroup aria-label="3 treasury keys">
            <Avatar name="1" alt="Key 1" />
            <Avatar name="2" alt="Key 2" />
            <AvatarGroupOverflow count={1} />
          </AvatarGroup>
          <StatusDot variant="success" label={`Key ${owner[1]} of 3`} tooltip={`Key ${owner[1]} from the treasury can sign`} />
        </HStack>
      ) : null}
      <Text type="body">{owner ? `Key ${owner[1]} from the treasury` : label}</Text>
      <a href={`${EXPLORER}/address/${address}`} target="_blank" rel="noreferrer">
        View this address on Etherscan
      </a>
      <Button label="Log out" variant="ghost" onClick={onLogout} />
    </div>
  );
}

export function WalletControl() {
  const { address, status } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const connected = status === "connected" && address !== undefined;
  const short = address ? formatAddr(address) : "";

  return (
    <>
      <button
        type="button"
        ref={anchorRef}
        className={connected ? "watermark-wallet watermark-wallet-on" : "watermark-wallet"}
        aria-label={connected ? short : CONNECT_WALLET}
        onClick={() => {
          const connector = connectors[0];
          if (!connected && connector) connect({ connector });
        }}
      >
        {connected ? short : CONNECT_WALLET}
      </button>
      {connected && address ? (
        <Popover
          label="Wallet"
          placement="below"
          alignment="end"
          hasCloseButton={false}
          className="watermark-wallet-popover"
          anchorRef={anchorRef as RefObject<HTMLElement>}
          isOpen={open}
          onOpenChange={setOpen}
          content={
            <WalletInfo
              address={address}
              onLogout={() => {
                setOpen(false);
                disconnect();
              }}
            />
          }
        />
      ) : null}
    </>
  );
}
