import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  atlasToDesign,
  designToAtlas,
  findPrintStrip,
  type PrintStrip,
  type StripOrientation,
} from "@/lib/strip-mapping";

/**
 * How a Custom belt's face is handled on the model: which material carries the
 * printed face, which way round a Belt design lies on it, and the design to
 * wear, if any.
 */
export interface CustomFace {
  material: string;
  orientation: StripOrientation;
  /**
   * The Belt design to wear, drawn 1 : 10 on a canvas; null keeps the model's
   * own. The canvas is redrawn in place, so the caller wraps it in a new
   * object each time it does — that identity is the "has changed" signal.
   */
  design: { canvas: HTMLCanvasElement } | null;
  /**
   * Handed the model's own printed face, laid flat as a 1 : 10 design, once the
   * model has loaded — the example the editor shows before an upload. Must be
   * stable across renders (a state setter is ideal).
   */
  onOwnDesign?: (canvas: HTMLCanvasElement) => void;
}

/** Pixel size of the flat copy of the model's own face handed to `onOwnDesign`. */
const OWN_DESIGN_SIZE = { width: 2500, height: 250 };

interface Face {
  mesh: THREE.Mesh;
  original: THREE.Material;
  painted: THREE.MeshStandardMaterial;
  image: CanvasImageSource;
  atlas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  strip: PrintStrip;
}

function paint(face: Face, design: HTMLCanvasElement, orientation: StripOrientation) {
  const { atlas, image, strip, texture } = face;
  const ctx = atlas.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(image, 0, 0, atlas.width, atlas.height);
  ctx.setTransform(...designToAtlas(strip, orientation, atlas.width));
  ctx.drawImage(design, 0, 0, 1, 1);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  texture.needsUpdate = true;
  face.mesh.material = face.painted;
}

function unpaint(face: Face) {
  face.mesh.material = face.original;
}

function dispose(face: Face) {
  face.texture.dispose();
  face.painted.dispose();
}

function readOwnDesign(face: Face, orientation: StripOrientation): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = OWN_DESIGN_SIZE.width;
  canvas.height = OWN_DESIGN_SIZE.height;
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(
    ...atlasToDesign(face.strip, orientation, face.atlas.width, canvas.width, canvas.height),
  );
  ctx.drawImage(face.image, 0, 0, face.atlas.width, face.atlas.height);
  return canvas;
}

function findFace(object: THREE.Object3D, materialName: string): Face | null {
  let mesh: THREE.Mesh | null = null;
  object.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && !Array.isArray(m.material) && m.material.name === materialName) mesh = m;
  });
  if (!mesh) return null;
  const found = mesh as THREE.Mesh;
  const original = found.material as THREE.MeshStandardMaterial;
  const map = original.map;
  const image = map?.image as (CanvasImageSource & { width: number }) | undefined;
  if (!map || !image) return null;

  // Read through getX/getY, not `.array`: a meshopt-compressed model stores
  // UVs quantised to normalised integers, and only the accessors undo that.
  const uvAttribute = found.geometry.getAttribute("uv");
  const uv = new Float32Array(uvAttribute.count * 2);
  for (let i = 0; i < uvAttribute.count; i++) {
    uv[2 * i] = uvAttribute.getX(i);
    uv[2 * i + 1] = uvAttribute.getY(i);
  }
  const index = found.geometry.getIndex();
  const strip = findPrintStrip(uv, index ? index.array : null);
  if (!strip) return null;

  const atlas = document.createElement("canvas");
  atlas.width = atlas.height = image.width;
  const texture = new THREE.CanvasTexture(atlas);
  texture.flipY = map.flipY;
  texture.colorSpace = map.colorSpace;
  texture.anisotropy = 8;
  const painted = original.clone();
  painted.map = texture;

  return { mesh: found, original, painted, image, atlas, texture, strip };
}

/**
 * Puts `customFace.design` on the model's printed face, and takes it off again
 * when the design goes away.
 *
 * The face's texture is redrawn rather than its UVs rewritten: the model's own
 * texture stays underneath, so whatever the design does not cover — and the
 * inside of the belt, which shares the same atlas — still looks like the belt.
 *
 * `object` must be this caller's own clone. The material is cloned before it is
 * touched, but the loader caches scenes by URL, and a product page opened later
 * in the session would otherwise inherit the customer's design.
 */
export function useCustomFace(object: THREE.Object3D, customFace: CustomFace | undefined) {
  const materialName = customFace?.material;
  const orientation = customFace?.orientation;
  const design = customFace?.design ?? null;
  const onOwnDesign = customFace?.onOwnDesign;

  const face = useMemo(
    () => (materialName ? findFace(object, materialName) : null),
    [object, materialName],
  );

  useEffect(() => {
    if (face && orientation && onOwnDesign) onOwnDesign(readOwnDesign(face, orientation));
  }, [face, orientation, onOwnDesign]);

  // A drag changes the design on every pointer move, and each repaint is a
  // 2048² atlas and a texture upload. One per frame is all the screen can show.
  useEffect(() => {
    if (!face || !orientation) return;
    const frame = requestAnimationFrame(() => {
      if (design) paint(face, design.canvas, orientation);
      else unpaint(face);
    });
    return () => cancelAnimationFrame(frame);
  }, [face, design, orientation]);

  useEffect(() => {
    if (!face) return;
    return () => {
      unpaint(face);
      dispose(face);
    };
  }, [face]);
}
