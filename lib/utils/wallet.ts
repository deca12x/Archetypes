import { PhantomWallet } from "@thirdweb-dev/wallets";
import { Mantle } from "@thirdweb-dev/chains";

// Fallback RPC endpoints
const FALLBACK_RPC_ENDPOINTS = [
  "https://rpc.mantle.xyz",
  "https://mantle.publicnode.com",
  "https://mantle-rpc.publicnode.com"
];

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export const configureWallet = () => {
  const wallet = new PhantomWallet({
    chain: Mantle,
    // Add retry logic for RPC calls
    rpc: {
      retry: {
        maxRetries: MAX_RETRIES,
        initialDelay: INITIAL_RETRY_DELAY,
        maxDelay: 5000, // 5 seconds
        backoff: "exponential",
      },
    },
    // Add fallback RPC endpoints
    fallbackRpc: FALLBACK_RPC_ENDPOINTS,
  });

  // Add error handling for rate limiting
  wallet.on("error", (error) => {
    if (error.message.includes("rate limit")) {
      console.warn("Rate limit hit, retrying with exponential backoff...");
      // The wallet will automatically retry with the configured retry logic
    }
  });

  return wallet;
}; 