import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack, Layout, LayoutContent, LayoutFooter, VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import sepoliaConfig from "@config";

// The Safe proposal dialog, from the Astryx `DialogWithSubtitle` example: DialogHeader with a
// subtitle, a Text body, and the actions in a LayoutFooter. No transaction is sent from this
// app in this pass: the dialog explains the proposal and links to the Safe in Safe{Wallet}.

const SAFE_WALLET = "Safe{Wallet}";
export const SAFE_URL = `https://app.safe.global/home?safe=sep:${sepoliaConfig.safe}`;

export function SafeDialog({
  isOpen,
  onOpenChange,
  title,
  description,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Layout
        header={
          <DialogHeader
            title={title}
            subtitle={`2 of 3 Safe owners sign in ${SAFE_WALLET}`}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={4}>
              <Text type="body">{description}</Text>
              <Text type="body" color="secondary">
                {`Nothing is sent from this page. An owner proposes the transaction in ${SAFE_WALLET}, and it lands once two of the three owners have signed.`}
              </Text>
              <Link href={SAFE_URL} isExternalLink isStandalone>
                {`Open the Safe in ${SAFE_WALLET}`}
              </Link>
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button label="Close" variant="secondary" onClick={() => onOpenChange(false)} />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
