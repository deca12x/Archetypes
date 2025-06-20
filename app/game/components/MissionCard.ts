// import { Scene } from "phaser";

// export class MissionCard {
//   private scene: Scene;
//   private container: Phaser.GameObjects.Container;
//   private isVisible: boolean = false;

//   constructor(scene: Scene) {
//     this.scene = scene;
//     this.container = this.scene.add.container(this.scene.scale.width / 2, 50);
//     this.container.setDepth(1000);
//     this.createCard();
//   }

//   private createCard() {
//     // Create background rectangle
//     const background = this.scene.add.rectangle(0, 0, 400, 100, 0x000000, 0.8);
//     background.setStrokeStyle(2, 0xffffff);

//     // Create mission title
//     const title = this.scene.add.text(0, -20, 'Main Mission', {
//       fontSize: '24px',
//       color: '#ffffff',
//       fontFamily: 'Arial'
//     }).setOrigin(0.5);

//     // Create mission description
//     const description = this.scene.add.text(0, 10, 'Get to the marketplace\nbefore dark!', {
//       fontSize: '18px',
//       color: '#ffffff',
//       fontFamily: 'Arial',
//       align: 'center'
//     }).setOrigin(0.5);

//     // Add all elements to the container
//     this.container.add([background, title, description]);
//     this.container.setVisible(false);
//   }

//   show() {
//     this.container.setVisible(true);
//     this.isVisible = true;
//   }

//   hide() {
//     this.container.setVisible(false);
//     this.isVisible = false;
//   }

//   toggle() {
//     this.isVisible ? this.hide() : this.show();
//   }

//   isCardVisible(): boolean {
//     return this.isVisible;
//   }
// }
