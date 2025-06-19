declare module "grid-engine" {
  import Phaser from "phaser";

  // GridEngine as a plugin class
  export default class GridEngine {
    constructor(scene: Phaser.Scene);
    
    // Plugin methods
    create(map: Phaser.Tilemaps.Tilemap, config: any): void;
    move(charId: string, direction: string): void;
    getPosition(charId: string): { x: number; y: number };
    getFacingDirection(charId: string): string;
    setPosition(charId: string, position: { x: number; y: number }): void;
    turnTowards(charId: string, direction: string): void;
    hasCharacter(charId: string): boolean;
    addCharacter(config: any): void;
    removeCharacter(charId: string): void;
    isMoving(charId: string): boolean;
    
    // Event methods
    movementStarted(): {
      subscribe: (callback: (data: any) => void) => void;
    };
    movementStopped(): {
      subscribe: (callback: (data: any) => void) => void;
    };
    directionChanged(): {
      subscribe: (callback: (data: any) => void) => void;
    };
    positionChangeFinished(): {
      subscribe: (callback: (data: any) => void) => void;
    };
  }
}
