"use client";
import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { createConfig, WagmiProvider } from "wagmi";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { http } from "wagmi";
import { defineChain } from "viem";
import { Mantle } from "@thirdweb-dev/chains";

// Define Mantle Sepolia chain for Wagmi
const mantleSepolia = defineChain({
  id: 5001,
  name: "Mantle Sepolia",
  network: "mantle-sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "MNT",
    symbol: "MNT",
  },
  rpcUrls: {
    default: { http: ["https://rpc.sepolia.mantle.xyz"] },
    public: { http: ["https://rpc.sepolia.mantle.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "Mantle Sepolia Explorer",
      url: "https://explorer.sepolia.mantle.xyz",
    },
  },
  testnet: true,
});

// Define Mantle Sepolia for Thirdweb
const mantleSepoliaThirdweb = {
  chainId: 5001,
  chain: "Mantle Sepolia",
  name: "Mantle Sepolia",
  shortName: "mnt-sepolia",
  slug: "mantle-sepolia",
  testnet: true,
  rpc: ["https://rpc.sepolia.mantle.xyz"],
  nativeCurrency: {
    name: "MNT",
    symbol: "MNT",
    decimals: 18,
  },
  blockExplorers: [
    {
      name: "Mantle Sepolia Explorer",
      url: "https://explorer.sepolia.mantle.xyz",
    },
  ],
};

// Define Mantle Mainnet chain (keeping your existing configuration)
const mantleChain = defineChain({
  id: Mantle.chainId,
  name: "Mantle",
  network: "mantle",
  nativeCurrency: {
    name: "Mantle",
    symbol: "MNT",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://rpc.mantle.xyz"] },
    public: { http: ["https://rpc.mantle.xyz"] },
  },
  blockExplorers: {
    default: { name: "Mantle Explorer", url: "https://explorer.mantle.xyz" },
  },
});

// Configure Wagmi with both chains
const wagmiConfig = createConfig({
  chains: [mantleChain, mantleSepolia],
  transports: {
    [mantleChain.id]: http(),
    [mantleSepolia.id]: http(),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <ThirdwebProvider
          activeChain={mantleSepoliaThirdweb}
          clientId={process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID}
        >
          <NuqsAdapter>{children}</NuqsAdapter>
        </ThirdwebProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
