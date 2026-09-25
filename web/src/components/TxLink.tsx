const EXPLORER = "https://sepolia.etherscan.io";

export function TxLink({ hash, pending }: { hash: string; pending?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <a className="num text-body" href={`${EXPLORER}/tx/${hash}`}>
        {hash}
      </a>
      {pending ? <span className="text-small text-muted">Pending</span> : null}
    </span>
  );
}
