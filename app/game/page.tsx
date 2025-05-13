"use client";

import dynamic from "next/dynamic";

// Dynamically import the GameComponent with SSR disabled
const GameComponent = dynamic(() => import("./GameComponent"), {
  ssr: false,
});

export default function GamePage() {
  return (
    <div className="w-full h-screen bg-black">
      <GameComponent />
    </div>
  );
}
