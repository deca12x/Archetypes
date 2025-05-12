import Phaser from "phaser";
import { GridEngine } from "grid-engine";

export class WorldScene extends Phaser.Scene {
  private gridEngine!: GridEngine;

  constructor() {
    super({ key: "WorldScene" });
  }

  preload() {
    // We'll add asset loading here later
  }

  create() {
    // We'll add scene setup here later
  }

  update() {
    // We'll add game loop logic here later
  }
}

export default WorldScene;
