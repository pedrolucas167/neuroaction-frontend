import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const NUM_NEURONS = 1000;
const API_URL = 'http://localhost:8080/brain/state';

interface NeuronState {
  id: number;
  fired: boolean;
}

const BrainScene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101010);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(0, 0, 50);
    scene.add(pointLight);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Neuron representation (InstancedMesh)
    const geometry = new THREE.SphereGeometry(0.2, 16, 16);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // Default color
    const neuronsMesh = new THREE.InstancedMesh(geometry, material, NUM_NEURONS);
    scene.add(neuronsMesh);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    // Positioning neurons in two hemispheres
    for (let i = 0; i < NUM_NEURONS; i++) {
      const hemisphere = i < NUM_NEURONS / 2 ? -1 : 1;
      dummy.position.set(
        hemisphere * (5 + Math.random() * 5),
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );
      dummy.updateMatrix();
      neuronsMesh.setMatrixAt(i, dummy.matrix);
    }
    neuronsMesh.instanceMatrix.needsUpdate = true;

    // Fetch and update loop
    const updateNeurons = async () => {
      try {
        const response = await fetch(API_URL);
        const data: NeuronState[] = await response.json();

        data.forEach(neuron => {
          if (neuron.id < NUM_NEURONS) {
            const newColor = neuron.fired ? 0xff0000 : 0x00ff00;
            neuronsMesh.setColorAt(neuron.id, color.setHex(newColor));

            // Pulsing animation for fired neurons
            if (neuron.fired) {
                neuronsMesh.getMatrixAt(neuron.id, dummy.matrix);
                const position = new THREE.Vector3();
                const quaternion = new THREE.Quaternion();
                const scale = new THREE.Vector3();
                dummy.matrix.decompose(position, quaternion, scale);
                
                // Simple scale pulse
                const pulseScale = 1.5;
                dummy.scale.set(pulseScale, pulseScale, pulseScale);
                dummy.updateMatrix();
                neuronsMesh.setMatrixAt(neuron.id, dummy.matrix);

                // Reset scale after a short delay
                setTimeout(() => {
                    dummy.scale.set(1, 1, 1);
                    dummy.updateMatrix();
                    neuronsMesh.setMatrixAt(neuron.id, dummy.matrix);
                }, 150);
            }
          }
        });

        if (neuronsMesh.instanceColor) {
            neuronsMesh.instanceColor.needsUpdate = true;
        }
        neuronsMesh.instanceMatrix.needsUpdate = true;

      } catch (error) {
        console.error('Failed to fetch neuron state:', error);
      }
    };

    const intervalId = setInterval(updateNeurons, 200);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} />;
};

export default BrainScene;
