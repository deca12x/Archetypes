"use client";

import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { gameConfig } from "../../lib/game/config/gameConfig";

export default function GamePage() {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !gameRef.current) {
      gameRef.current = new Phaser.Game(gameConfig);
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div
        id="game-container"
        className="border-4 border-gray-800 rounded"
      ></div>
    </div>
  );
}
