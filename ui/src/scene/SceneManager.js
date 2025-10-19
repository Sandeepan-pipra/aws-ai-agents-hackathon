import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DEFAULTS } from '../config/constants.js';

export class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(DEFAULTS.scene.background);
    
    this.camera = new THREE.PerspectiveCamera(
      DEFAULTS.camera.fov,
      window.innerWidth / window.innerHeight,
      DEFAULTS.camera.near,
      DEFAULTS.camera.far
    );
    this.camera.position.set(
      DEFAULTS.camera.position.x,
      DEFAULTS.camera.position.y,
      DEFAULTS.camera.position.z
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    const container = document.getElementById('canvas-container');
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    this.setupLights();
    this.setupGrid();
    this.setupResize();
  }

  setupLights() {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.9));
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(3, 4, 2);
    this.scene.add(dir);
  }

  setupGrid() {
    this.scene.add(new THREE.GridHelper(100, 100, 0xdddddd, 0xeeeeee));
  }

  setupResize() {
    window.addEventListener('resize', () => {
      const container = document.getElementById('canvas-container');
      this.camera.aspect = container.clientWidth / container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(container.clientWidth, container.clientHeight);
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
