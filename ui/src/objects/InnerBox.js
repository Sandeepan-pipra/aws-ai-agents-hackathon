import * as THREE from 'three';
import { DEFAULTS, toUnits } from '../config/constants.js';

export class InnerBox {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
  }

  create(box) {
    const sizeUnits = {
      x: toUnits(box.sx),
      y: toUnits(box.sy),
      z: toUnits(box.sz)
    };
    const posUnits = {
      x: toUnits(box.x),
      y: toUnits(box.y),
      z: toUnits(box.z)
    };

    const geometry = new THREE.BoxGeometry(sizeUnits.x, sizeUnits.y, sizeUnits.z);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(box.color),
      metalness: DEFAULTS.materials.metalness,
      roughness: DEFAULTS.materials.roughness
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(posUnits.x + sizeUnits.x / 2, posUnits.y + sizeUnits.y / 2, posUnits.z + sizeUnits.z / 2);
    this.scene.add(mesh);
    this.objects.push(mesh);

    const edges = new THREE.EdgesGeometry(geometry);
    const boxColor = new THREE.Color(box.color);
    const lighterColor = boxColor.clone().lerp(new THREE.Color(0xffffff), 0.4);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: lighterColor });
    const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
    edgeLines.position.set(posUnits.x + sizeUnits.x / 2, posUnits.y + sizeUnits.y / 2, posUnits.z + sizeUnits.z / 2);
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
