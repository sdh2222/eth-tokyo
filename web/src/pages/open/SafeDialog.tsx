import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import sepoliaConfig from "@config";
import { Page, Window } from "../../ui/plain";

// The Safe proposal dialog (O1, SC-03): an Astryx Dialog shell, 640 px wide, with a plain body.
// No transaction is sent from this app in this pass: the dialog explains the proposal, shows the
// Safe in a terminal window (SC-14) and links to the Safe in Safe{Wallet}.

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
        <div className="wm-stack">
          <p>{description}</p>
          <p className="wm-muted">
            {`Nothing is sent from this page. An owner proposes the transaction in ${SAFE_WALLET}, and it lands once two of the three owners have signed.`}
          </p>
          <Window title="Safe" meta="Sepolia">
            <div className="wm-window-line">
              <span>SAFE</span>
              <span>{sepoliaConfig.safe}</span>
            </div>
            <div className="wm-window-line">
              <span>SIGNERS</span>
              <span>2 of 3 owners</span>
            </div>
          </Window>
        </div>
        <div className="wm-row wm-between">
          <button type="button" className="wm-link" onClick={() => onOpenChange(false)}>
            Close
          </button>
          <a className="wm-btn" href={SAFE_URL} target="_blank" rel="noreferrer">
            {`Open the Safe in ${SAFE_WALLET}`}
          </a>
        </div>
      </Page>
    </Dialog>
  );
}
