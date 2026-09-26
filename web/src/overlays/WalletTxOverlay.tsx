import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import sepoliaConfig from "@config";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { APPROVE_COPY, FILL_COPY, VERIFY_FILL } from "../copy/en";
import type { Hex, PlannedTx } from "../desk/types";
import { useToast } from "../components/Toast";
import { Link } from "react-router-dom";
import { Page, Window } from "../ui/plain";

type Phase = "review" | "wallet" | "pending" | "result";

export function WalletTxOverlay({
  kind,
  tx,
  onClose,
}: {
  kind: "approve" | "fill";
  tx: PlannedTx;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("review");
  const [hash, setHash] = useState<Hex | null>(null);
  const send = useSendTransaction();
  const receipt = useWaitForTransactionReceipt({ hash: hash ?? undefined, query: { enabled: hash !== null } });
  const toast = useToast();
  const queryClient = useQueryClient();

  const shown = phase === "pending" && receipt.isSuccess ? "result" : phase;

  function submit() {
    setPhase("wallet");
    send.mutate(
      { to: tx.to, data: tx.data, value: tx.value },
      {
        onSuccess(next) {
          setHash(next);
          setPhase("pending");
          void queryClient.invalidateQueries({ queryKey: ["fills"] });
          void queryClient.invalidateQueries({ queryKey: ["approvals"] });
        },
        onError(error) {
          const rejected = "code" in error && (error as { code?: number }).code === 4001;
          if (rejected || /reject/i.test(error.message)) {
            toast.show("Cancelled");
            onClose();
            return;
          }
          setPhase("review");
        },
      },
    );
  }

  const title = kind === "approve" ? "Approve the router" : "Fill the quote";
  const explorer = hash ? `${sepoliaConfig.explorer}/tx/${hash}` : null;

  // O2 (SC-04): the same 640 px Astryx Dialog shell as the Safe dialog, with a plain body.
  return (
    <Dialog isOpen onOpenChange={(open) => (open ? undefined : onClose())} width={640}>
      <Page>
        <DialogHeader title={title} subtitle="Signed from your own wallet" onOpenChange={() => onClose()} />
        <div className="wk-stack">
          <p>{kind === "approve" ? APPROVE_COPY : FILL_COPY}</p>
          <Window title="Transaction" meta={shown === "result" ? "Confirmed" : shown === "pending" ? "Pending" : "Sepolia"}>
            <div className="wk-window-line">
              <span>TO</span>
              <span>{tx.to}</span>
            </div>
            {hash && explorer ? (
              <div className="wk-window-line">
                <span>TX</span>
                <a href={explorer} target="_blank" rel="noreferrer">
                  {hash}
                </a>
              </div>
            ) : null}
          </Window>
          {shown === "wallet" ? <p className="wk-muted">Confirm in your wallet.</p> : null}
          {shown === "pending" ? <p className="wk-muted">Waiting for the transaction to land.</p> : null}
        </div>
        <div className="wk-row wk-between">
          <button type="button" className="wk-link" onClick={onClose}>
            Close
          </button>
          {shown === "review" || shown === "wallet" ? (
            <button type="button" className="wk-btn" onClick={submit} disabled={shown === "wallet"}>
              {shown === "wallet" ? "Waiting for your wallet" : "Continue"}
            </button>
          ) : null}
          {shown === "result" && hash && kind === "fill" ? (
            <Link className="wk-btn" to={`/fills/${hash}`} onClick={onClose}>
              {VERIFY_FILL}
            </Link>
          ) : null}
        </div>
      </Page>
    </Dialog>
  );
}
