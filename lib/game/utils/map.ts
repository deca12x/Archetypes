import { Tilemaps } from "phaser";
import WorldScene from "../../../app/game/scenes/WorldScene";
import { useUserDataStore } from "../stores/userData";
import { Layers, Sprites } from "../constants/assets";
import { PLAYER_SIZE } from "../constants/game";

export const getPlayerPosition = (scene: WorldScene) => {
  const { x, y } = scene.gridEngine.getPosition("player") ?? { x: 0, y: 0 };

  return {
    x: x * 32 + PLAYER_SIZE.blankZoneWidth,
    y: y * 32 + PLAYER_SIZE.blankZoneHeight,
  };
};

export const getCurrentPlayerTile = (scene: WorldScene) => {
  const { cameras, tilemap } = scene;
  const { x, y } = getPlayerPosition(scene);
  const tile = tilemap.getTileAtWorldXY(x, y, true, cameras.main, Layers.WORLD);

  if (!tile) {
    return;
  }

  return {
    ...tile,
    x: tile.x - 1,
    y: tile.y + 1,
  } as Tilemaps.Tile;
};

export const getStartPosition = (scene: WorldScene) => {
  return {
    startPosition: {
      x: 5,
      y: 5,
    },
    facingDirection: "down",
  };
};

export const savePlayerPosition = (scene: WorldScene) => {
  const userData = useUserDataStore.getState();

  const currentTile = getCurrentPlayerTile(scene);

  if (
    currentTile &&
    (userData.position?.x !== currentTile.x ||
      userData.position?.y !== currentTile.y ||
      userData.position?.map !== scene.map)
  ) {
    userData.update({
      position: {
        x: currentTile.x,
        y: currentTile.y,
        map: scene.map,
        facingDirection: scene.gridEngine.getFacingDirection("player"),
      },
    });
  }
};
