import { useState } from "react";
import { useConnect } from "wagmi";

// Connect the browser wallet, and say why when it can't: no wallet in this browser, or the
// request was turned down in the wallet. Used by the header and the pages' Connect buttons.

export const NO_WALLET = "No browser wallet found. Install MetaMask, or open this page in your wallet's browser.";
export const INSTALL_WALLET_URL = "https://metamask.io/download/";

export function useConnectWallet(): { connectWallet: () => void; problem: string | null; clearProblem: () => void } {
  const { connect, connectors } = useConnect();
  const [problem, setProblem] = useState<string | null>(null);

  function connectWallet() {
    const connector = connectors[0];
    const provider = typeof window === "undefined" ? undefined : (window as { ethereum?: unknown }).ethereum;
    if (!connector || provider === undefined) {
      setProblem(NO_WALLET);
      return;
    }
    setProblem(null);
    connect(
      { connector },
      {
        onError: (error) =>
          setProblem(error.name === "UserRejectedRequestError" ? "The wallet turned down the request. Try again." : "The wallet did not connect. Try again."),
      },
    );
  }

  return { connectWallet, problem, clearProblem: () => setProblem(null) };
}
