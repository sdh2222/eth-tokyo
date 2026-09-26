import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import sepoliaConfig from "@config";
import { Page } from "../../ui/v";

// The Safe proposal dialog (O1, SC-03): an Astryx Dialog shell, 640 px wide, with a kit body.
// No transaction is sent from this app in this pass: the dialog explains the proposal, shows the
// Safe as a raw record and links to the Safe in Safe{Wallet}.

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
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={640}>
      <Page>
        <DialogHeader title={title} subtitle={`2 of 3 Safe owners sign in ${SAFE_WALLET}`} onOpenChange={onOpenChange} />
        <div className="v-stack">
          <div>{description}</div>
          <div className="v-muted">{`Nothing is sent from this page. An owner proposes the transaction in ${SAFE_WALLET}.`}</div>
          <div className="v-code">
            <div>{`SAFE\u00a0\u00a0\u00a0\u00a0 ${sepoliaConfig.safe}`}</div>
            <div>{`SIGNERS\u00a0 2 of 3 owners`}</div>
          </div>
        </div>
        <div className="v-row v-between">
          <button type="button" className="v-btn v-btn-secondary" onClick={() => onOpenChange(false)}>
            Close
          </button>
          <a className="v-btn" href={SAFE_URL} target="_blank" rel="noreferrer">
            {`Open the Safe in ${SAFE_WALLET}`}
          </a>
        </div>
      </Page>
    </Dialog>
  );
}
