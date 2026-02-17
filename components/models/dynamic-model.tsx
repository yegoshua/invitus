"use client";

import { Suspense, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface DynamicModelProps {
  url: string;
  position?: [number, number, number];
  scale?: number;
}

// Loading spinner component (3D ring)
function LoadingSpinner() {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 2;
      ringRef.current.rotation.x += delta * 0.5;
    }
  });

  return (
    <mesh ref={ringRef}>
      <torusGeometry args={[0.5, 0.05, 16, 100]} />
      <meshStandardMaterial
        color="#E74223"
        emissive="#E74223"
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}

// The actual model component that loads the GLB
function Model({ url, position = [0, 0, 0], scale = 2.5 }: DynamicModelProps) {
  const { scene } = useGLTF(url);

  return (
    <primitive
      object={scene.clone()}
      position={position}
      scale={scale}
      dispose={null}
    />
  );
}

// Wrapper with Suspense for loading state
export function DynamicModel({ url, position, scale }: DynamicModelProps) {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Model url={url} position={position} scale={scale} />
    </Suspense>
  );
}

// Fallback static model for when no URL is provided
export function FallbackModel({
  position = [0, 0, 0],
}: {
  position?: [number, number, number];
}) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group position={position}>
      {/* Simple belt-like placeholder shape */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.6, 0.15, 16, 100]} />
        <meshStandardMaterial
          color="#1a1a1a"
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>
    </group>
  );
}
