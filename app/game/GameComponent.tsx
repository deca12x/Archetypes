// app/game/GameComponent.tsx
"use client";

import React from "react";
import { AUTO, Scale, Game as PhaserGame } from "phaser";
import { useState, useEffect, useRef } from "react";
import GridEngine from "grid-engine";
import BootScene from "./scenes/BootScene";
import WorldScene from "./scenes/WorldScene";
import Scene3 from "./scenes/Scene3";
import Scene4 from "./scenes/Scene4";
import { useUIStore } from "../../lib/game/stores/ui";
import { useChatStore } from "../../lib/game/stores/chat";
import Loading from "./ui/Loading";
import ChatWindow from "./ui/ChatWindow";
import { useSocket } from "../../lib/hooks/useSocket";
import { IntroScene } from "./scenes/IntroScene";
import { PauseScene } from "./scenes/PauseScene";
import RoomCodeDisplay from "../../components/RoomCodeDisplay";
import { GameScene } from "../../lib/game/types/scenes";

const GameComponent = () => {
  const [game, setGame] = useState<PhaserGame>();
  const { loading } = useUIStore();
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const { socket, isConnected } = useSocket();
  const [worldScene, setWorldScene] = useState<WorldScene | null>(null);
  const [introScene, setIntroScene] = useState<IntroScene | null>(null);
  const [pauseScene, setPauseScene] = useState<PauseScene | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);

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

    try {
      console.log("Creating new Phaser game...");
      console.log("GridEngine plugin:", GridEngine);
      console.log("GridEngine type:", typeof GridEngine);
      console.log("GridEngine keys:", Object.keys(GridEngine || {}));

      const newGame = new PhaserGame({
        parent: gameContainerRef.current,
        type: AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        scale: {
          mode: Scale.RESIZE,
          autoCenter: Scale.CENTER_BOTH,
        },
        scene: [BootScene, WorldScene, Scene3, Scene4, PauseScene, IntroScene],
        pixelArt: true,
      });

      console.log("Phaser game created successfully");

      // Expose the game instance to the window object for the ChatWindow component
      (window as any).__PHASER_GAME__ = newGame;

      setGame(newGame);

      // Get reference to the WorldScene once it's created
      const checkForWorldScene = () => {
        const worldSceneInstance = newGame.scene.getScene(
          "WorldScene"
        ) as WorldScene;
        if (worldSceneInstance) {
          setWorldScene(worldSceneInstance);

          // Set up a custom event to receive room code updates from the WorldScene
          console.log("Setting up roomCodeUpdated listener");
          worldSceneInstance.events.on("roomCodeUpdated", (code: string) => {
            console.log("Room code updated:", code);
            setRoomCode(code);
          });
        } else {
          // Try again in a short while if not found
          setTimeout(checkForWorldScene, 100);
        }
      };

      // Start checking once the game is loaded
      newGame.events.once("ready", checkForWorldScene);

      // Cleanup on unmount
      return () => {
        if (worldScene) {
          worldScene.events.off("roomCodeUpdated");
        }
        newGame.destroy(true);
      };
    } catch (error) {
      console.error("Error creating Phaser game:", error);
      console.error("GridEngine import issue:", GridEngine);
    }
  }, [gameContainerRef.current, socket]);

  // Handle chat message sending
  const handleSendMessage = (message: string) => {
    if (!game) return;

    // Get the current active scene
    const activeScenes = game.scene.getScenes(true);
    const gameScenes = activeScenes.filter((scene) =>
      ["WorldScene", "scene3", "scene4"].includes(scene.scene.key)
    );

    if (gameScenes.length > 0) {
      // Cast to GameScene type
      const currentScene = gameScenes[0] as unknown as GameScene;
      if (currentScene.sendChatMessage) {
        currentScene.sendChatMessage(message);
      }
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
      {/* Room code display */}
      <RoomCodeDisplay roomCode={roomCode} />
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
