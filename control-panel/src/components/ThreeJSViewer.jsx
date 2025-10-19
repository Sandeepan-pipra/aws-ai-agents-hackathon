import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Constants from the existing viewer
const SCALE = 0.01; // Convert mm to units
const toUnits = (mm) => mm * SCALE;

const DEFAULTS = {
  camera: {
    fov: 45,
    near: 0.1,
    far: 1000,
    position: { x: 30, y: 20, z: 40 }
  },
  scene: {
    background: 0xf0f0f0
  },
  materials: {
    metalness: 0.2,
    roughness: 0.7
  }
};

/**
 * ThreeJSViewer - Integrated 3D packing layout viewer
 *
 * Props:
 * - layoutData: Object with { container, packages } structure
 *   - container: { size: { length, width, height }, position: { x, y, z }, color }
 *   - packages: Array of { size: { length, width, height }, position: { x, y, z }, color, weight }
 */
export default function ThreeJSViewer({ layoutData }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(DEFAULTS.scene.background);

    // Camera setup
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(
      DEFAULTS.camera.fov,
      width / height,
      DEFAULTS.camera.near,
      DEFAULTS.camera.far
    );
    camera.position.set(
      DEFAULTS.camera.position.x,
      DEFAULTS.camera.position.y,
      DEFAULTS.camera.position.z
    );

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lighting
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.9));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(3, 4, 2);
    scene.add(directionalLight);

    // Grid
    scene.add(new THREE.GridHelper(100, 100, 0xdddddd, 0xeeeeee));

    // Store refs
    sceneRef.current = { scene, camera, renderer, controls };

    // Render layout data
    if (layoutData) {
      renderLayout(scene, layoutData);
    }

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // Update scene when layoutData changes
  useEffect(() => {
    if (sceneRef.current && layoutData) {
      const { scene } = sceneRef.current;
      // Clear existing objects (except lights and grid)
      const objectsToRemove = [];
      scene.children.forEach((child) => {
        if (child instanceof THREE.Mesh || (child instanceof THREE.LineSegments && child.type !== 'GridHelper')) {
          objectsToRemove.push(child);
        }
      });
      objectsToRemove.forEach((obj) => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });

      // Render new layout
      renderLayout(scene, layoutData);
    }
  }, [layoutData]);

  const renderLayout = (scene, data) => {
    // Render container
    if (data.container) {
      const containerSize = data.container.size;
      const containerPos = data.container.position || { x: 0, y: 0, z: 0 };
      const containerColor = data.container.color || '#9fbcd4';

      const sizeUnits = {
        x: toUnits(containerSize.length),
        y: toUnits(containerSize.height),
        z: toUnits(containerSize.width)
      };
      const posUnits = {
        x: toUnits(containerPos.x),
        y: toUnits(containerPos.y),
        z: toUnits(containerPos.z)
      };

      // Container mesh (transparent)
      const containerGeometry = new THREE.BoxGeometry(sizeUnits.x, sizeUnits.y, sizeUnits.z);
      const containerMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(containerColor),
        metalness: 0.1,
        roughness: 0.35,
        opacity: 0.05,
        transparent: true,
        side: THREE.DoubleSide
      });
      const containerMesh = new THREE.Mesh(containerGeometry, containerMaterial);
      containerMesh.position.set(posUnits.x, posUnits.y, posUnits.z);
      scene.add(containerMesh);

      // Container edges
      const containerEdges = new THREE.EdgesGeometry(containerGeometry);
      const containerEdgeMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(containerColor)
      });
      const containerEdgeLines = new THREE.LineSegments(containerEdges, containerEdgeMaterial);
      containerEdgeLines.position.set(posUnits.x, posUnits.y, posUnits.z);
      scene.add(containerEdgeLines);
    }

    // Render packages
    if (data.packages && Array.isArray(data.packages)) {
      data.packages.forEach((pkg) => {
        const pkgSize = pkg.size;
        const pkgPos = pkg.position;
        const pkgColor = pkg.color || '#666666';

        const sizeUnits = {
          x: toUnits(pkgSize.length),
          y: toUnits(pkgSize.height),
          z: toUnits(pkgSize.width)
        };
        const posUnits = {
          x: toUnits(pkgPos.x),
          y: toUnits(pkgPos.y),
          z: toUnits(pkgPos.z)
        };

        // Package mesh
        const geometry = new THREE.BoxGeometry(sizeUnits.x, sizeUnits.y, sizeUnits.z);
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(pkgColor),
          metalness: DEFAULTS.materials.metalness,
          roughness: DEFAULTS.materials.roughness
        });

        const mesh = new THREE.Mesh(geometry, material);
        // Position at center of the box
        mesh.position.set(
          posUnits.x + sizeUnits.x / 2,
          posUnits.y + sizeUnits.y / 2,
          posUnits.z + sizeUnits.z / 2
        );
        scene.add(mesh);

        // Package edges (lighter color)
        const edges = new THREE.EdgesGeometry(geometry);
        const boxColor = new THREE.Color(pkgColor);
        const lighterColor = boxColor.clone().lerp(new THREE.Color(0xffffff), 0.4);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: lighterColor });
        const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
        edgeLines.position.set(
          posUnits.x + sizeUnits.x / 2,
          posUnits.y + sizeUnits.y / 2,
          posUnits.z + sizeUnits.z / 2
        );
        scene.add(edgeLines);
      });
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full" />
  );
}
