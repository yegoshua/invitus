import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  designToAtlas,
  findPrintStrip,
  type StripOrientation,
} from "@/lib/strip-mapping";

/**
 * A Belt design to wear on the model: a canvas holding the 1 : 10 design, and
 * which material and which way round it goes. The canvas is redrawn in place,
 * so a caller hands over a new BeltPrint object each time it does — the
 * object's identity is the "has been redrawn" signal.
 */
export interface BeltPrint {
  source: HTMLCanvasElement;
  material: string;
  orientation: StripOrientation;
}

interface Face {
  mesh: THREE.Mesh;
  original: THREE.Material;
  printed: THREE.MeshStandardMaterial;
  image: CanvasImageSource;
  atlas: HTMLCanvasElement;
  texture: THREE.CanvasTexture;
  strip: NonNullable<ReturnType<typeof findPrintStrip>>;
}

function paint(face: Face, print: BeltPrint) {
  const { atlas, image, strip, texture } = face;
  const ctx = atlas.getContext("2d")!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(image, 0, 0, atlas.width, atlas.height);
  ctx.setTransform(...designToAtlas(strip, print.orientation, atlas.width));
  ctx.drawImage(print.source, 0, 0, 1, 1);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  texture.needsUpdate = true;
  face.mesh.material = face.printed;
}

function unpaint(face: Face) {
  face.mesh.material = face.original;
}

function dispose(face: Face) {
  face.texture.dispose();
  face.printed.dispose();
}

/**
 * Paints `print` onto the printed face of `object`, and takes it off again when
 * `print` goes away.
 *
 * The face's texture is redrawn rather than its UVs rewritten: the model's own
 * texture stays underneath, so whatever the design does not cover — and the
 * inside of the belt, which shares the same atlas — still looks like the belt.
 *
 * `object` must be this caller's own clone. The material is cloned before it is
 * touched, but the loader caches scenes by URL, and a product page opened
 * later in the session would otherwise inherit the customer's design.
 */
export function usePrintedFace(object: THREE.Object3D, print: BeltPrint | undefined) {
  const materialName = print?.material;

  const face = useMemo((): Face | null => {
    if (!materialName) return null;
    let mesh: THREE.Mesh | null = null;
    object.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !Array.isArray(m.material) && m.material.name === materialName) mesh = m;
    });
    if (!mesh) return null;
    const found = mesh as THREE.Mesh;
    const original = found.material as THREE.MeshStandardMaterial;
    const image = original.map?.image as (CanvasImageSource & { width: number }) | undefined;
    if (!image) return null;

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
    texture.flipY = original.map!.flipY;
    texture.colorSpace = original.map!.colorSpace;
    texture.anisotropy = 8;
    const printed = original.clone();
    printed.map = texture;

    return { mesh: found, original, printed, image, atlas, texture, strip };
  }, [object, materialName]);

  useEffect(() => {
    if (!face) return;
    if (print) paint(face, print);
    else unpaint(face);
  }, [face, print]);

  useEffect(() => {
    if (!face) return;
    return () => {
      unpaint(face);
      dispose(face);
    };
  }, [face]);
}
