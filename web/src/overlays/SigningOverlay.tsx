import { useState } from "react";
import { useToast } from "../components/Toast";
import { CANCELLED } from "../copy/en";
import type { Address, DeskError, Hex } from "../desk/types";
import { reduce, type Phase } from "./signing/machine";
import { clearSig, readSig, saveSig } from "./signing/storage";

export function SigningOverlay({
  safeTxHash,
  labels,
  lines,
  onClose,
}: {
  safeTxHash: Hex;
  labels: string[];
  lines: string[];
  onClose: () => void;
}) {
  const stored = readSig(safeTxHash);
  const [phase, setPhase] = useState<Phase>(stored ? { name: "switch" } : { name: "review" });
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState("");
  const toast = useToast();

  function sign1(owner: Address, sig: string) {
    saveSig(safeTxHash, { owner, sig, at: Date.now() });
    const signed = reduce(phase, { type: "SIGN_1", owner, safeTxHash, sig });
    setPhase(signed);
    window.setTimeout(() => setPhase(reduce(signed, { type: "ACCOUNT", owner })), 0);
  }

  function account(owner: Address) {
    const saved = readSig(safeTxHash);
    if (saved && saved.owner.toLowerCase() === owner.toLowerCase()) {
      setNote("That owner has already signed.");
      setReady(false);
      setPhase(reduce({ name: "switch" }, { type: "ACCOUNT", owner }));
      return;
    }
    setNote("");
    setReady(true);
    setPhase(reduce(phase, { type: "ACCOUNT", owner }));
  }

  function reject() {
    toast.show(CANCELLED);
    onClose();
  }

  return (
    <div className="rounded-card bg-surface p-5">
      {phase.name === "review" ? (
        <button type="button" className="text-body" onClick={() => sign1("0x0000000000000000000000000000000000000001", "0xsig")}>
          Sign
        </button>
      ) : null}
      {phase.name === "signed1" ? <p className="text-body">1 of 2 signatures</p> : null}
      {phase.name === "switch" ? (
        <>
          <p className="text-body">1 of 2 signatures</p>
          <p className="text-body">Switch your wallet to another Safe owner (Owner 2 or 3). This window will wait.</p>
          {note ? <p className="text-body">{note}</p> : null}
          <button type="button" className="text-body" onClick={() => account("0x0000000000000000000000000000000000000001")}>
            Same owner
          </button>
          <button type="button" className="text-body" onClick={() => account("0x0000000000000000000000000000000000000002")}>
            Other owner
          </button>
          <button type="button" className="text-body" disabled={!ready} onClick={() => setPhase(reduce(phase, { type: "SIGN_2" }))}>
            Sign and execute
          </button>
        </>
      ) : null}
      {phase.name === "confirming" ? <p className="text-body">Confirming</p> : null}
      {phase.name === "done" ? phase.summary.map((line) => <p key={line}>{line}</p>) : null}
      {phase.name === "failed" ? <p className="text-body">{(phase.error as DeskError).title}</p> : null}
      <ul>
        {labels.map((label) => (
          <li key={label}>{label}</li>
        ))}
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <button type="button" className="text-body" onClick={reject}>
        Reject
      </button>
      <button
        type="button"
        className="text-body"
        onClick={() => {
          clearSig(safeTxHash);
        }}
      >
        Clear
      </button>
    </div>
  );
}
