import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { Theme } from "@astryxdesign/core/theme";
import type { ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { watermarkTheme } from "../themes/watermark";

if (sepolia.id !== 11155111) {
  throw new Error("sepolia id");
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1 },
  },
});

const config = createConfig({
  chains: [sepolia],
  connectors: [injected({ target: "metaMask" })],
  transports: {
    [sepolia.id]: http(import.meta.env.VITE_SEPOLIA_RPC_URL),
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Theme theme={watermarkTheme} mode="light">
          <LayerProvider toast={{ position: "bottomEnd" }}>{children}</LayerProvider>
        </Theme>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
