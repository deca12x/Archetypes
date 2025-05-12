"use client";

import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { WorldScene } from "../../lib/game/scenes/WorldScene";

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: 800,
  height: 600,
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [WorldScene],
};

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
