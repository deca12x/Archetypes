// app/game/GameComponent.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { useUIStore } from "../../lib/game/stores/ui";
import { useChatStore } from "../../lib/game/stores/chat";
import Loading from './ui/Loading';
import WorldScene from './scenes/WorldScene';
import { ChatWindow } from "@/components/ChatWindow";
import { useSocket } from "@/lib/hooks/useSocket";
import { gameConfig } from "./config";
import { EphemeralThoughtBubble } from '@/components/EphemeralThoughtBubble';
import { MissionBubble } from '@/components/MissionBubble';
import { useIsInGame } from '@/lib/hooks/useIsInGame';
import { LoadingLogs } from './ui/LoadingLogs';

interface LoadingProgress {
  progress: number;
  currentAsset: string;
  totalAssets: number;
  loadedAssets: number;
}

export const GameComponent: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const { loading: uiLoading } = useUIStore();
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [worldScene, setWorldScene] = useState<WorldScene | null>(null);
  const { socket, isConnected } = useSocket();
  const [activeBubble, setActiveBubble] = useState<React.ReactNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress>({
    progress: 0,
    currentAsset: '',
    totalAssets: 0,
    loadedAssets: 0
  });
  const isInGame = useIsInGame();

  useEffect(() => {
    if (!gameRef.current) {
      console.info('Starting game initialization...');
      
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
        scene: [WorldScene],
        backgroundColor: '#000000'
      };

      try {
        console.info('Creating Phaser game instance...');
        const game = new Phaser.Game(config);
        gameRef.current = game;
        console.info('Game instance created successfully');
      } catch (error) {
        console.error('Failed to create game instance:', error);
        return;
      }

      // Function to initialize scene and set up event listeners
      const initializeScene = () => {
        console.info('Attempting to initialize scene...');
        const scene = gameRef.current?.scene.getScene('WorldScene') as WorldScene;
        
        if (scene && scene.events) {
          console.info('WorldScene found, setting up event listeners...');
          setWorldScene(scene);
          
          // Listen for bubble updates
          scene.events.on('bubbleUpdate', (bubble: React.ReactNode) => {
            setActiveBubble(bubble);
          });

          // Listen for loading progress
          scene.events.on('loadingProgress', (progress: LoadingProgress) => {
            console.info(`Loading progress update: ${progress.progress.toFixed(0)}% - ${progress.currentAsset}`);
            setLoadingProgress(progress);
          });

          // Listen for scene ready
          scene.events.on('sceneReady', () => {
            console.info('Scene ready event received, completing initialization');
            setIsLoading(false);
          });

        } else {
          console.info('Scene not ready yet, retrying in 100ms...');
          // If scene is not ready, try again in 100ms
          setTimeout(initializeScene, 100);
        }
      };

      // Start checking for scene initialization
      initializeScene();

      // Handle window resize
      const handleResize = () => {
        if (gameRef.current) {
          gameRef.current.scale.resize(window.innerWidth, window.innerHeight);
          console.info('Game window resized');
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        console.info('Cleaning up game resources...');
        window.removeEventListener('resize', handleResize);
        if (worldScene && worldScene.events) {
          worldScene.events.off('bubbleUpdate');
          worldScene.events.off('loadingProgress');
          worldScene.events.off('sceneReady');
        }
        if (gameRef.current) {
          gameRef.current.destroy(true);
          gameRef.current = null;
          console.info('Game instance destroyed');
        }
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

  // Show loading only when either UI is loading or game is initializing
  const showLoading = uiLoading || isLoading;

  return (
    <div className="relative w-full h-screen">
      {showLoading && (
        <Loading
          progress={loadingProgress.progress}
          currentAsset={loadingProgress.currentAsset}
          totalAssets={loadingProgress.totalAssets}
          loadedAssets={loadingProgress.loadedAssets}
        />
      )}
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
      {isInGame && activeBubble}
      {isInGame && worldScene && (
        <ChatWindow
          onSendMessage={handleSendMessage}
          username={worldScene.username}
          playerId={worldScene.playerId}
        />
      )}
      <LoadingLogs />
    </div>
  );
};

export default GameComponent;
