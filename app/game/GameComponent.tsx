"use client";

import { AUTO, Scale, Game as PhaserGame } from "phaser";
import { useState, useEffect, useRef } from "react";
import GridEngine from "grid-engine";
import BootScene from "./scenes/BootScene";
import WorldScene from "./scenes/WorldScene";
import { useUIStore } from "../../lib/game/stores/ui";
import Loading from "./ui/Loading";

const GameComponent = () => {
  const [game, setGame] = useState<PhaserGame>();
  const { loading } = useUIStore();
  const gameContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameContainerRef.current) return;

    // Make sure any previous instance is destroyed
    if (game) {
      game.destroy(true);
    }

    const newGame = new PhaserGame({
      parent: gameContainerRef.current,
      type: AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      scale: {
        mode: Scale.RESIZE,
        autoCenter: Scale.CENTER_BOTH,
      },
      scene: [BootScene, WorldScene],
      physics: {
        default: "arcade",
        arcade: {
          debug: false,
        },
      },
      plugins: {
        scene: [
          {
            key: "gridEngine",
            plugin: GridEngine,
            mapping: "gridEngine",
          },
        ],
      },
      pixelArt: true,
    });

    setGame(newGame);

    // Cleanup on unmount
    return () => {
      newGame.destroy(true);
    };
  }, []);

  return (
    <>
      {loading && <Loading />}
      <div
        id="game"
        ref={gameContainerRef}
        style={{ width: "100%", height: "100%" }}
      />
    </>
  );
};

export default GameComponent;
