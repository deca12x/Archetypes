"use client";

import { ConnectWallet, useAddress } from "@thirdweb-dev/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BackgroundAudio } from "@/components/BackgroundAudio";
import { ParallaxBackground } from "@/components/ParallaxBackground";

export default function Login() {
  const address = useAddress();
  const router = useRouter();

  useEffect(() => {
    if (address) {
      router.push("/");
    }
  }, [address, router]);

  const layers = [
    "/assets/images/layer1.webp",
    "/assets/images/layer2.webp",
    "/assets/images/layer 3.webp",
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <BackgroundAudio />
      <ParallaxBackground layers={layers} />

      {/* Content */}
      <div className="relative z-10 bg-black/50 p-8 rounded-lg backdrop-blur-sm">
        <div className="text-2xl font-bold mb-8 text-white">
          Archetypes of the Collective Unconscious
        </div>
        <ConnectWallet
          theme="light"
          modalSize="compact"
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
    </div>
  );
}
