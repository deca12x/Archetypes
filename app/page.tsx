"use client";

import { useAddress, useDisconnect } from "@thirdweb-dev/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function Home() {
  const address = useAddress();
  const disconnect = useDisconnect();
  const router = useRouter();

  useEffect(() => {
    if (!address) {
      router.push("/login");
    }
  }, [address, router]);

  if (!address) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col gap-4 items-center justify-center">
      <div className="text-2xl font-bold">
        Archetypes of the Collective Unconscious
      </div>

      <button
        onClick={() => router.push("/game")}
        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
      >
        Play
      </button>

      <button
        onClick={disconnect}
        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
      >
        Logout
      </button>
    </div>
  );
}
