"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import GameComponent from "./GameComponent";

// Dynamically import the GameComponent with SSR disabled
const GameComponentDynamic = dynamic(() => import("./GameComponent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-black flex items-center justify-center">
      <div className="text-white text-2xl">Loading game...</div>
    </div>
  ),
});

export default function GamePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to game if we're at the root
    if (window.location.pathname === "/") {
      router.push("/game");
    }

    // Clean up YouTube player when entering the game
    const youtubePlayer = document.getElementById('youtube-player');
    if (youtubePlayer) {
      youtubePlayer.remove();
    }
  }, [router]);

  return (
    <div className="w-full h-screen bg-black overflow-hidden">
      <GameComponent />
    </div>
  );
}
