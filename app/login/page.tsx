"use client";

import { ConnectWallet, useAddress } from "@thirdweb-dev/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function Login() {
  const address = useAddress();
  const router = useRouter();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [currentLayer, setCurrentLayer] = useState(0);

  useEffect(() => {
    if (address) {
      router.push("/");
    }
  }, [address, router]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLayer((prev) => (prev + 1) % 3); // Cycle through 3 layers
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, []);

  const layers = [
    "/assets/images/layer1.webp",
    "/assets/images/layer2.webp",
    "/assets/images/layer 3.webp",
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background layers with parallax effect */}
      <div className="absolute inset-0 w-full h-full">
        {layers.map((src, index) => (
          <div
            key={src}
            className="absolute inset-0 w-full h-full transition-transform duration-200"
            style={{
              transform: `translate(${mousePosition.x * (0.1 + index * 0.1)}px, ${
                mousePosition.y * (0.1 + index * 0.1)
              }px)`,
              opacity: currentLayer === index ? 1 : 0,
              transition: "opacity 2s ease-in-out",
            }}
          >
            <Image
              src={src}
              alt={`Background Layer ${index + 1}`}
              fill
              className="object-cover"
              priority
            />
          </div>
        ))}
      </div>

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
