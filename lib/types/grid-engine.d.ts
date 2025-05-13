declare module "grid-engine" {
  import Phaser from "phaser";

  export class GridEngine {
    constructor(scene: Phaser.Scene, config: any);
    create(map: Phaser.Tilemaps.Tilemap, config: any): void;
    move(charId: string, direction: string): void;
    // Add other methods as needed
  }
}
