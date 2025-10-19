import * as THREE from 'three';
import { toUnits } from '../config/constants.js';

export class BigBox {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
  }

  create(dimensions, position, color) {
    this.clear();

    const sizeUnits = {
      x: toUnits(dimensions.x),
      y: toUnits(dimensions.y),
      z: toUnits(dimensions.z)
    };
    const posUnits = {
      x: toUnits(position.x),
      y: toUnits(position.y),
      z: toUnits(position.z)
    };

    const geometry = new THREE.BoxGeometry(sizeUnits.x, sizeUnits.y, sizeUnits.z);

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      metalness: 0.1,
      roughness: 0.35,
      opacity: 0.05,
      transparent: true,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(posUnits.x, posUnits.y, posUnits.z);
    this.scene.add(mesh);
    this.objects.push(mesh);

    const edges = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: new THREE.Color(color) });
    const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
    edgeLines.position.set(posUnits.x, posUnits.y, posUnits.z);
    this.scene.add(edgeLines);
    this.objects.push(edgeLines);
  }

  clear() {
    this.objects.forEach(obj => {
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    this.objects = [];
  }
}
