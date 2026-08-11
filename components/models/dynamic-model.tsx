"use client";

import { Suspense, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import * as THREE from "three";
import { useModelProgressStore } from "@/stores/model-progress";

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

// Draco and Meshopt are set up here only to keep the decoders drei's `useGLTF`
// attached by default — dropping them would turn any compressed .glb Strapi
// serves in future into a load error rather than a slower load. The decoder
// itself is fetched lazily, and only by a file that actually needs it.
let dracoLoader: DRACOLoader | null = null;

function configureLoader(loader: GLTFLoader) {
  if (!dracoLoader) {
    dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(
      "https://www.gstatic.com/draco/versioned/decoders/1.5.5/"
    );
  }
  loader.setDRACOLoader(dracoLoader);
  loader.setMeshoptDecoder(MeshoptDecoder);
}

// The actual model component that loads the GLB
function Model({ url, position = [0, 0, 0], scale = 2.5 }: DynamicModelProps) {
  // `useLoader` rather than drei's `useGLTF` for one reason: it forwards an
  // onProgress callback to the loader, and `useGLTF` does not. Everything else
  // — the suspense cache keyed by url, the decoders — is the same.
  const { scene } = useLoader(GLTFLoader, url, configureLoader, (event) => {
    // A response without Content-Length reports total 0; the store reads that
    // as "unmeasurable" and the overlay falls back to counting items.
    useModelProgressStore
      .getState()
      .report(url, event.loaded, event.lengthComputable ? event.total : 0);
  });

  return (
    <primitive
      object={scene.clone()}
      position={position}
      scale={scale}
      rotation={[0, 0.3, 0]}
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
