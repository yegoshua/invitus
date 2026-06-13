"use client";

import { Suspense, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArnoldLoader } from "@/components/ui/arnold-loader";
import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  useProgress,
} from "@react-three/drei";
import * as THREE from "three";
import { DynamicModel, FallbackModel } from "./dynamic-model";

function CameraController() {
  const { camera, size } = useThree();

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (size.width >= 1024) {
      cam.fov = 38; // desktop — slightly zoomed out
    } else if (size.width >= 768) {
      cam.fov = 22; // tablet — zoomed in
    } else {
      cam.fov = 26; // mobile — zoomed in
    }
    cam.updateProjectionMatrix();
  }, [camera, size.width]);

  return null;
}

interface ModelLoaderProps {
  modelUrl?: string;
  fallbackModelUrl?: string;
}

// Loading overlay with progress
function LoadingOverlay() {
  const { progress, active } = useProgress();
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    if (!active && progress === 100) {
      // Delay hiding to allow for smooth transition
      const timer = setTimeout(() => setShowLoader(false), 500);
      return () => clearTimeout(timer);
    }
  }, [active, progress]);

  return (
    <AnimatePresence>
      {showLoader && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 z-30 flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            className="mb-6"
          >
            <ArnoldLoader />
          </motion.div>

          {/* Progress text */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className="font-heading text-lg text-white font-bold tracking-wider">
              {Math.round(progress)}%
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Main component with Canvas and loading
export function ModelLoader({ modelUrl, fallbackModelUrl }: ModelLoaderProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <ArnoldLoader />
      </div>
    );
  }

  const modelToLoad = modelUrl || fallbackModelUrl;

  return (
    <div className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing">
      <Canvas camera={{ position: [0, 0.5, 3], fov: 45 }}>
        <CameraController />
        <ambientLight intensity={0.1} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <directionalLight position={[-3, 2, -2]} intensity={0.3} />
        <Environment preset="city" background={false} />
        <OrbitControls
          target={[0, 0, 0]}
          enablePan={false}
          enableZoom={false}
          autoRotate
          autoRotateSpeed={0.7}
          enableDamping
          dampingFactor={0.05}
          minPolarAngle={Math.PI / 2.8}
          maxPolarAngle={Math.PI / 1.7}
        />
        <Suspense fallback={<FallbackModel position={[0, 0.1, 0]} />}>
          {modelToLoad ? (
            <DynamicModel url={modelToLoad} position={[0, 0.1, 0]} />
          ) : (
            <FallbackModel position={[0, 0.1, 0]} />
          )}
        </Suspense>
      </Canvas>
      <LoadingOverlay />
    </div>
  );
}
