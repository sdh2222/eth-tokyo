import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { TxLink } from "../components/TxLink";
import { APPROVE_COPY, FILL_COPY, VERIFY_FILL } from "../copy/en";
import type { Hex, PlannedTx } from "../desk/types";
import { useToast } from "../components/Toast";
import { Link } from "react-router-dom";

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

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-text/40">
      <div className="w-full max-w-[var(--max)] rounded-card bg-bg p-6 shadow-overlay">
        {shown === "review" || shown === "wallet" ? (
          <>
            <p className="text-body">{kind === "approve" ? APPROVE_COPY : FILL_COPY}</p>
            <button type="button" className="mt-4 text-body" onClick={submit} disabled={shown === "wallet"}>
              {shown === "wallet" ? "Wallet" : "Continue"}
            </button>
          </>
        ) : null}
        {shown === "pending" && hash ? <TxLink hash={hash} pending /> : null}
        {shown === "result" && hash ? (
          <Link className="text-body" to={`/fills/${hash}`}>
            {VERIFY_FILL}
          </Link>
        ) : null}
        <button type="button" className="mt-4 block text-body text-muted" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
