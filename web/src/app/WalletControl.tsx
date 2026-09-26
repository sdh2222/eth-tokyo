import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { Link } from "@astryxdesign/core/Link";
import { Popover } from "@astryxdesign/core/Popover";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useClipboard } from "@astryxdesign/core/hooks";
import sepoliaConfig from "@config";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { CONNECT_WALLET } from "../copy/en";
import type { DeskConfig } from "../desk/types";
import { useWalletLabel } from "../hooks/useCanAct";
import { formatAddr } from "../lib/format";

const EXPLORER = (sepoliaConfig as DeskConfig).explorer;
const NOT_ON_DESK = "Not on the desk";

// The approved wallet control: the sky dot pill until a wallet connects, then the filled
// pill that opens the wallet popover. The trigger sits inside Popover as its child, as
// the Popover page shows.
export function WalletControl() {
  const { address, status } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const role = useWalletLabel();
  // useClipboard: a ghost IconButton with a "Copy" tooltip, the icon flip driven by isCopied.
  const { copy, isCopied } = useClipboard({ announce: "Address copied" });

  if (status !== "connected" || !address) {
    const connector = connectors[0];
    return (
      <Button
        label={CONNECT_WALLET}
        variant="wallet"
        isDisabled={!connector}
        onClick={() => {
          if (connector) connect({ connector });
        }}
      />
    );
  }

  const short = formatAddr(address);
  // The wallet shows as its ENS client name when it has one.
  const name = role.endsWith(".eth") ? role : short;

  return (
    <Popover
      label="Wallet"
      placement="below"
      alignment="end"
      content={
        <VStack gap={3}>
          <HStack gap={1} vAlign="center">
            <Text type="body" hasTabularNumbers>
              {short}
            </Text>
            <IconButton
              label="Copy address"
              tooltip="Copy"
              variant="ghost"
              size="sm"
              icon={<Icon icon={isCopied ? "checkDouble" : "copy"} />}
              onClick={() => {
                void copy(address);
              }}
            />
          </HStack>
          <Divider />
          <Text type="body" color={role === NOT_ON_DESK ? "secondary" : "primary"}>
            {role}
          </Text>
          <Link href={`${EXPLORER}/address/${address}`} isStandalone>
            View this address on Etherscan
          </Link>
          <Button label="Disconnect" variant="ghost" onClick={() => disconnect()} />
        </VStack>
      }
    >
      <Button label={name} variant="wallet-connected" />
    </Popover>
  );
}
