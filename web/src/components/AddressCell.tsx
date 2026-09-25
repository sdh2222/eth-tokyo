const EXPLORER = "https://sepolia.etherscan.io";

export function AddressCell({ address, ens }: { address: string; ens?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div>
        {ens ? <p className="text-body">{ens}</p> : null}
        <p className="num text-body">{address}</p>
      </div>
      <button
        type="button"
        className="text-body text-muted"
        onClick={() => {
          void navigator.clipboard.writeText(address);
        }}
      >
        Copy
      </button>
      <a className="text-body text-muted" href={`${EXPLORER}/address/${address}`}>
        Explorer
      </a>
    </div>
  );
}
