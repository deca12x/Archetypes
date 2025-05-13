"use client";

import { AUTO, Scale, Game as PhaserGame } from "phaser";
import { useState, useEffect } from "react";
import GridEngine from "grid-engine";
import BootScene from "./scenes/BootScene";
import WorldScene from "./scenes/WorldScene";
import { useUIStore } from "../../lib/game/stores/ui";
import Loading from "./ui/Loading";

const GameComponent = () => {
  const [game, setGame] = useState<PhaserGame>();
  const { loading } = useUIStore();

  useEffect(() => {
    setGame(
      new PhaserGame({
        parent: "game",
        type: AUTO,
        width: 1280,
        height: 720,
        scale: {
          mode: Scale.FIT,
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
      })
    );
  }, []);

  if (!game) {
    return null;
  }

  return (
    <>
      {loading && <Loading />}
      <div id="game" />
    </>
  );
};

export default GameComponent;
