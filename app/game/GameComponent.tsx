// app/game/GameComponent.tsx
"use client";

import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { gameConfig } from "./config";

export default function GameComponent() {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!gameRef.current) {
      gameRef.current = new Phaser.Game({
        ...gameConfig,
        parent: "game-container",
      });
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-screen">
      <div id="game-container" className="w-full h-full" />
    </div>
  );
}
