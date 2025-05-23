// app/game/GameComponent.tsx
"use client";

import { AUTO, Scale, Game as PhaserGame } from "phaser";
import { useState, useEffect, useRef } from "react";
import GridEngine from "grid-engine";
import BootScene from "./scenes/BootScene";
import WorldScene from "./scenes/WorldScene";
import { useUIStore } from "../../lib/game/stores/ui";
import { useChatStore } from "../../lib/game/stores/chat";
import Loading from "./ui/Loading";
import ChatWindow from "./ui/ChatWindow";
import { useSocket } from "@/lib/hooks/useSocket";
import { useGameMoves } from "@/components/game/GameMoves";

const GameComponent = () => {
  const [game, setGame] = useState<PhaserGame>();
  const { loading } = useUIStore();
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const { socket, isConnected } = useSocket();
  const [worldScene, setWorldScene] = useState<WorldScene | null>(null);

  // Get game moves from hook
  const gameMoves = useGameMoves();

  useEffect(() => {
    // Make the socket globally available to the Phaser game
    if (socket && typeof window !== "undefined") {
      (window as any).__gameSocket = socket;
      (window as any).__gameMoves = gameMoves; // Make game moves available globally

      // Also store game action for the Phaser scenes to access
      if (localStorage.getItem("gameAction")) {
        (window as any).__gameAction = localStorage.getItem("gameAction");
        (window as any).__roomCode = localStorage.getItem("roomCode") || null;
      }
    }
  }, [socket, gameMoves]);

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

    // Get reference to the WorldScene once it's created
    const checkForWorldScene = () => {
      const worldSceneInstance = newGame.scene.getScene(
        "WorldScene"
      ) as WorldScene;
      if (worldSceneInstance) {
        setWorldScene(worldSceneInstance);
      } else {
        // Try again in a short while if not found
        setTimeout(checkForWorldScene, 100);
      }
    };

    // Start checking once the game is loaded
    newGame.events.once("ready", checkForWorldScene);

    // Cleanup on unmount
    return () => {
      newGame.destroy(true);
    };
  }, [gameContainerRef.current, socket]);

  // Handle chat message sending
  const handleSendMessage = (message: string) => {
    if (worldScene) {
      worldScene.sendChatMessage(message);
    }
  };

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
      {/* Always show the chat window */}
      <ChatWindow
        onSendMessage={handleSendMessage}
        username={worldScene?.username || "Player"}
        playerId={worldScene?.playerId || ""}
      />
    </>
  );
};

export default GameComponent;
