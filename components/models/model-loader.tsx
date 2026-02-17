"use client";

import { Suspense, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
  Float,
  useProgress,
} from "@react-three/drei";
import { DynamicModel, FallbackModel } from "./dynamic-model";

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
          className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          {/* Animated ring */}
          <div className="relative w-24 h-24 mb-6">
            {/* Outer spinning ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-transparent border-t-coral"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            {/* Inner spinning ring (opposite direction) */}
            <motion.div
              className="absolute inset-2 rounded-full border-2 border-transparent border-b-white/50"
              animate={{ rotate: -360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
            {/* Center pulsing dot */}
            <motion.div
              className="absolute inset-0 m-auto w-4 h-4 rounded-full bg-coral"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          </div>

          {/* Progress text */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className="font-heading text-lg text-white font-bold tracking-wider">
              {Math.round(progress)}%
            </p>
            <p className="text-sm text-white/60 mt-1">
              Завантаження 3D моделі...
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
        <div className="w-16 h-16 rounded-full border-2 border-coral border-t-transparent animate-spin" />
      </div>
    );
  }

  const modelToLoad = modelUrl || fallbackModelUrl;

  return (
    <div className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing">
      <Canvas camera={{ position: [0, 0.5, 3], fov: 45 }}>
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
        />
        <Float
          speed={1.5}
          rotationIntensity={0.2}
          floatIntensity={0.4}
          floatingRange={[-0.05, 0.05]}
        >
          <Suspense fallback={<FallbackModel position={[0, 0.1, 0]} />}>
            {modelToLoad ? (
              <DynamicModel url={modelToLoad} position={[0, 0.1, 0]} />
            ) : (
              <FallbackModel position={[0, 0.1, 0]} />
            )}
          </Suspense>
        </Float>
        <ContactShadows
          position={[0, -1, 0]}
          opacity={0.4}
          scale={5}
          blur={2.5}
          far={4}
        />
      </Canvas>
      <LoadingOverlay />
    </div>
  );
}
