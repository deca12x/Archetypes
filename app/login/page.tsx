"use client";

import { useAuth } from "@/lib/utils/auth";

export default function Login() {
  const { ConnectWalletComponent } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-2xl font-bold mb-8">
        Welcome to Archetypes
      </div>
      <ConnectWalletComponent />
    </div>
  );
}
