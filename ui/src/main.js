import { SceneManager } from './scene/SceneManager.js';
import { BigBox } from './objects/BigBox.js';
import { InnerBox } from './objects/InnerBox.js';
import { UIController } from './ui/UIController.js';

class App {
  constructor() {
    this.sceneManager = new SceneManager();
    this.bigBox = new BigBox(this.sceneManager.scene);
    this.innerBox = new InnerBox(this.sceneManager.scene);
    this.uiController = new UIController((data) => this.renderScene(data));

    this.init();
  }

  init() {
    this.renderScene(this.uiController.getSceneData());
    this.sceneManager.animate();
  }

  renderScene(data) {
    this.bigBox.create(
      data.bigBox.dimensions,
      data.bigBox.position,
      data.bigBox.color
    );

    this.innerBox.clear();
    data.innerBoxes.forEach(box => this.innerBox.create(box));
  }
}

new App();
