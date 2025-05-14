"use client";

import { AUTO, Scale, Game as PhaserGame } from "phaser";
import { useState, useEffect, useRef } from "react";
import GridEngine from "grid-engine";
import BootScene from "./scenes/BootScene";
import WorldScene from "./scenes/WorldScene";
import { useUIStore } from "../../lib/game/stores/ui";
import Loading from "./ui/Loading";
import { useSocket } from "@/lib/hooks/useSocket";

const GameComponent = () => {
  const [game, setGame] = useState<PhaserGame>();
  const { loading } = useUIStore();
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    // Make the socket globally available to the Phaser game
    if (socket && typeof window !== "undefined") {
      (window as any).__gameSocket = socket;

      // Also store game action for the Phaser scenes to access
      if (localStorage.getItem("gameAction")) {
        (window as any).__gameAction = localStorage.getItem("gameAction");
        (window as any).__roomCode = localStorage.getItem("roomCode") || null;
      }
    }
  }, [socket]);

  useEffect(() => {
    if (!gameContainerRef.current || !socket) return;

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
  }, [gameContainerRef.current, socket]); // Add socket as a dependency

  return (
    <>
      {loading && <Loading />}
      {!isConnected && (
        <div className="absolute top-0 left-0 bg-red-500 text-white p-2">
          Not connected to server
        </div>
      )}
      <div
        id="game"
        ref={gameContainerRef}
        style={{ width: "100%", height: "100%" }}
      />
    </>
  );
};

export default GameComponent;
