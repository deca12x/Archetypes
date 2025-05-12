"use client";

import { ConnectWallet, useAddress } from "@thirdweb-dev/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Login() {
  const address = useAddress();
  const router = useRouter();

  useEffect(() => {
    if (address) {
      router.push("/");
    }
  }, [address, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-2xl font-bold mb-8">
        Welcome to your Thirdweb Webapp
      </div>
      <ConnectWallet
        theme="light"
        modalSize="wide"
        welcomeScreen={{
          title: "Welcome to our app",
          subtitle: "Connect your wallet to get started",
        }}
        modalTitleIconUrl=""
        auth={{
          loginOptional: false,
        }}
        switchToActiveChain={true}
        modalTitle="Connect Wallet"
        termsOfServiceUrl=""
        privacyPolicyUrl=""
      />
    </div>
  );
}
