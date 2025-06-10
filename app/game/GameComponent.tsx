// app/game/GameComponent.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { useUIStore } from "../../lib/game/stores/ui";
import { useChatStore } from "../../lib/game/stores/chat";
import Loading from "./ui/Loading";
import { ChatWindow } from "../../components/ChatWindow";
import { useSocket } from "@/lib/hooks/useSocket";
import { gameConfig } from "./config";
import WorldScene from "./scenes/WorldScene";
import { ThoughtBubble } from '@/components/ThoughtBubble';

export const GameComponent: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const { loading } = useUIStore();
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [worldScene, setWorldScene] = useState<WorldScene | null>(null);
  const { socket, isConnected } = useSocket();
  const [activeBubble, setActiveBubble] = useState<React.ReactNode | null>(null);

  useEffect(() => {
    if (!gameRef.current) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent: 'game-container',
        width: window.innerWidth,
        height: window.innerHeight,
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
          }
        },
        scene: WorldScene
      };

      const game = new Phaser.Game(config);
      gameRef.current = game;

      // Get reference to the WorldScene
      const scene = game.scene.getScene('WorldScene') as WorldScene;
      setWorldScene(scene);

      // Listen for bubble updates
      scene.events.on('bubbleUpdate', (bubble: React.ReactNode) => {
        setActiveBubble(bubble);
      });

      // Handle window resize
      const handleResize = () => {
        game.scale.resize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        game.destroy(true);
        gameRef.current = null;
      };
    }
  }, []);

  const handleSendMessage = (message: string) => {
    if (socket && worldScene) {
      socket.emit('chat message', {
        message,
        username: worldScene.username,
        playerId: worldScene.playerId
      });
    }
  };

  return (
    <div className="relative w-full h-screen">
      {loading && <Loading />}
      {!isConnected && (
        <div className="absolute top-0 left-0 bg-red-500 text-white p-2">
          Not connected to server
        </div>
      )}
      <div
        id="game-container"
        ref={gameContainerRef}
        style={{ width: "100%", height: "100%" }}
      />
      {/* Always show the chat window */}
      <ChatWindow
        onSendMessage={handleSendMessage}
        username={worldScene?.username || "Player"}
        playerId={worldScene?.playerId || ""}
      />
      {activeBubble}
    </div>
  );
};

export default GameComponent;
