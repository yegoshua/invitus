"use client";

import { Suspense, useCallback, useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArnoldLoader } from "@/components/ui/arnold-loader";
import { useIsHydrated } from "@/hooks/use-is-hydrated";
import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  useProgress,
} from "@react-three/drei";
import * as THREE from "three";
import { DynamicModel, FallbackModel } from "./dynamic-model";
import type { BeltPrint } from "./printed-face";
import { useModelBytesProgress } from "@/stores/model-progress";

function CameraController() {
  // Read through r3f's store getter rather than destructuring the camera out of
  // useThree(). Mutating a three.js object is the whole r3f model, but a value
  // handed straight back from a hook is not ours to mutate — and calling get()
  // inside the effect also guarantees the camera that is current when the
  // effect runs, not the one captured at render time.
  const get = useThree((state) => state.get);
  const width = useThree((state) => state.size.width);

  useEffect(() => {
    const camera = get().camera as THREE.PerspectiveCamera;
    if (width >= 1024) {
      camera.fov = 38; // desktop — slightly zoomed out
    } else if (width >= 768) {
      camera.fov = 22; // tablet — zoomed in
    } else {
      camera.fov = 26; // mobile — zoomed in
    }
    camera.updateProjectionMatrix();
  }, [get, width]);

  return null;
}

interface ModelLoaderProps {
  modelUrl?: string;
  fallbackModelUrl?: string;
  /**
   * Called when the canvas has lost its WebGL context more times than it is
   * worth retrying. The product page uses it to fall back to the photo — a
   * still picture of the belt beats an empty box where the belt should be.
   */
  onGaveUp?: () => void;
  /** A Belt design to wear instead of the model's own printed face. */
  print?: BeltPrint;
  /** Turn about the vertical axis, radians. The product page's three-quarter view by default. */
  rotationY?: number;
  /** Slow turntable. On by default; a builder turns it off so the view stays put. */
  autoRotate?: boolean;
}

/**
 * How many times a lost context is worth rebuilding. Two, because the loss we
 * actually see comes from a mount/unmount race and clears on the retry; a
 * context that dies twice in a row is a machine that cannot keep this canvas,
 * and retrying forever would just spin.
 */
const MAX_CONTEXT_RECOVERIES = 2;

/**
 * `THREE.WebGLRenderer: Context Lost.` in the dev console is expected, and is
 * this code working rather than failing. Measured, repeatedly: development
 * loses the context exactly once per page load and recovers it; a production
 * build never loses it at all.
 *
 * The cause is not ours to remove. React StrictMode mounts the viewer,
 * unmounts it and mounts it again, reusing the same <canvas> element;
 * @react-three/fiber's `unmountComponentAtNode` schedules
 * `gl.forceContextLoss()` on an uncancellable 500 ms timer, so the first
 * mount's teardown fires into the second mount's live context. The recovery
 * below is what makes that survivable — and it is worth keeping regardless,
 * because a real browser takes contexts away too, on sleep or a driver reset.
 *
 * Before treating the message as a regression, run `pnpm check:webgl`: it
 * reports whether the page ends up with a live canvas or a dead one, which is
 * the only difference that reaches a customer.
 */

// Loading overlay with progress
function LoadingOverlay({ modelUrl }: { modelUrl?: string }) {
  const { progress, active } = useProgress();
  const bytes = useModelBytesProgress(modelUrl);
  const [showLoader, setShowLoader] = useState(true);

  // The .glb is nearly all of the wait, so show its bytes when they are known
  // and fall back to the item count when they are not — an unmeasurable
  // response, or a model already in the loader cache, which reports no progress
  // at all because there is nothing left to download and so stays on the item
  // count all the way to 100.
  //
  // The two are different scales, so in principle the handover could show the
  // environment map's 50% dropping to the model's 3%. In practice the first
  // chunk lands within milliseconds of the request, long before anything else
  // in the scene finishes, so bytes take over while the item count is still 0.
  const shown = bytes ?? progress;

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
              {Math.round(shown)}%
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Main component with Canvas and loading
export function ModelLoader({
  modelUrl,
  fallbackModelUrl,
  onGaveUp,
  print,
  rotationY,
  autoRotate = true,
}: ModelLoaderProps) {
  // WebGL has no server-side equivalent, so the canvas cannot be part of the
  // server render — show the loader until hydration has happened.
  const isClient = useIsHydrated();

  // Bumped to rebuild the canvas after a lost context. It is a `key`, so React
  // throws the old <canvas> away and mounts a new one: an element whose context
  // has been lost can never be given a working one again, so reusing it would
  // rebuild the renderer around a corpse.
  const [generation, setGeneration] = useState(0);
  // The count lives in a ref as well as in state because the decision — retry
  // or give up — has to be made in the event handler. Made inside the state
  // updater it would be a side effect in a function React deliberately calls
  // twice in development, which is how `onGaveUp` and the note below both used
  // to fire twice for a single lost context.
  const recoveries = useRef(0);

  const handleContextLost = useCallback(
    (event: Event) => {
      // Without preventDefault the browser will not even attempt to restore,
      // and — more to the point here — three.js stops rendering either way, so
      // the canvas stays blank until something rebuilds it. That something is
      // the generation bump below.
      event.preventDefault();

      if (recoveries.current >= MAX_CONTEXT_RECOVERIES) {
        onGaveUp?.();
        return;
      }
      recoveries.current += 1;

      // three.js has already printed `WebGLRenderer: Context Lost.` by now, and
      // in development that line is this code working, not failing. Say so next
      // to it: the message has been read as a returning bug more than once, and
      // the console is where somebody is looking when they read it.
      if (process.env.NODE_ENV !== "production") {
        console.info(
          "[3D] Context lost and rebuilt — expected in dev, harmless. " +
            "StrictMode remounts the viewer and @react-three/fiber tears the " +
            "old renderer down 500 ms later, into the canvas the new one is " +
            "using. A production build never does it. " +
            "Proof either way: pnpm check:webgl"
        );
      }

      setGeneration(recoveries.current);
    },
    [onGaveUp]
  );

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
      <Canvas
        key={generation}
        camera={{ position: [0, 0.5, 3], fov: 45 }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", handleContextLost, {
            once: true,
          });
        }}
      >
        <CameraController />
        <ambientLight intensity={0.1} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <directionalLight position={[-3, 2, -2]} intensity={0.3} />
        <Environment preset="city" background={false} />
        <OrbitControls
          target={[0, 0, 0]}
          enablePan={false}
          enableZoom={false}
          autoRotate={autoRotate}
          autoRotateSpeed={0.7}
          enableDamping
          dampingFactor={0.05}
          minPolarAngle={Math.PI / 2.8}
          maxPolarAngle={Math.PI / 1.7}
        />
        <Suspense fallback={<FallbackModel position={[0, 0.1, 0]} />}>
          {modelToLoad ? (
            <DynamicModel
              url={modelToLoad}
              position={[0, 0.1, 0]}
              rotationY={rotationY}
              print={print}
            />
          ) : (
            <FallbackModel position={[0, 0.1, 0]} />
          )}
        </Suspense>
      </Canvas>
      <LoadingOverlay modelUrl={modelToLoad} />
    </div>
  );
}
