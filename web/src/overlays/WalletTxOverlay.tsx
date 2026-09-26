import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import sepoliaConfig from "@config";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { APPROVE_COPY, FILL_COPY, VERIFY_FILL } from "../copy/en";
import type { Hex, PlannedTx } from "../desk/types";
import { useToast } from "../components/Toast";
import { Link } from "react-router-dom";
import { Dl, Page, Status, type Tone } from "../ui/v";

type Phase = "review" | "wallet" | "pending" | "result";

export function WalletTxOverlay({
  kind,
  tx,
  summary,
  onClose,
}: {
  kind: "approve" | "fill";
  tx: PlannedTx;
  /** What the fill does, repeated from the Trade page so the dialog says what is signed. */
  summary?: readonly (readonly [string, string])[];
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

  const status: { tone: Tone; word: string; note: string | null } =
    shown === "result"
      ? { tone: "green", word: "Confirmed", note: null }
      : shown === "pending"
        ? { tone: "amber", word: "Pending", note: "Waiting for the transaction to land." }
        : shown === "wallet"
          ? { tone: "blue", word: "Sepolia", note: "Confirm in your wallet." }
          : { tone: "gray", word: "Sepolia", note: null };

  // O2 (SC-04): the same 640 px Astryx Dialog shell as the Safe dialog, with a v kit body.
  return (
    <Dialog isOpen onOpenChange={(open) => (open ? undefined : onClose())} width={640}>
      <Page>
        <DialogHeader title={title} subtitle="Signed from your own wallet" onOpenChange={() => onClose()} />
        <div className="v-stack">
          <p>{kind === "approve" ? APPROVE_COPY : FILL_COPY}</p>
          {kind === "fill" && summary ? <Dl items={summary} /> : null}
          <div className="v-code">
            <div>{`TO ${tx.to}`}</div>
            {hash && explorer ? (
              <div>
                {"TX "}
                <a href={explorer} target="_blank" rel="noreferrer">
                  {hash}
                </a>
              </div>
            ) : null}
          </div>
          <div className="v-row v-row-8">
            <Status tone={status.tone}>{status.word}</Status>
            {status.note ? <span className="v-muted">{status.note}</span> : null}
          </div>
        </div>
        <div className="v-row v-between">
          <button type="button" className="v-btn v-btn-secondary" onClick={onClose}>
            Close
          </button>
          {shown === "review" || shown === "wallet" ? (
            <button type="button" className="v-btn" onClick={submit} disabled={shown === "wallet"}>
              {shown === "wallet" ? "Waiting for your wallet" : "Continue"}
            </button>
          ) : null}
          {shown === "result" && hash && kind === "fill" ? (
            <Link className="v-btn" to={`/fills/${hash}`} onClick={onClose}>
              {VERIFY_FILL}
            </Link>
          ) : null}
        </div>
      </Page>
    </Dialog>
  );
}
