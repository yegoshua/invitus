"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BELT_LENGTH_CM,
  BELT_WIDTH_CM,
  movedBy,
  scaledAround,
  type Placement,
} from "@/lib/belt-design";
import { CUSTOM_BASE } from "@/lib/custom-base";
import { cn } from "@/lib/utils";
import { drawBeltDesign, drawPrintZones, type StripView } from "./draw-belt-design";

interface Props {
  artwork: HTMLImageElement | null;
  placement: Placement;
  onPlacementChange: (update: (p: Placement) => Placement) => void;
}

/** A canvas's CSS size, kept in step with its box. */
function useBoxSize(ref: React.RefObject<HTMLCanvasElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

/** Sizes the backing store for the screen's density and returns a context in CSS pixels. */
function prepare(canvas: HTMLCanvasElement, width: number, height: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(width * dpr);
  const h = Math.round(height * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { ctx: canvas.getContext("2d")!, dpr };
}

/**
 * The Belt design editor. The whole strip is 1 : 10 — on a phone that is a
 * sliver 35 px tall, far too thin to take a finger — so it is shown twice: a
 * minimap of all 100 cm, and under it a close-up of the stretch the minimap's
 * frame marks, where the Artwork is dragged and pinched.
 */
export function DesignEditor({ artwork, placement, onPlacementChange }: Props) {
  const miniRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef<HTMLCanvasElement>(null);
  const mini = useBoxSize(miniRef);
  const zoom = useBoxSize(zoomRef);

  // The close-up starts on the back — the middle of the strip, and the zone
  // that matters most.
  const [focusCm, setFocusCm] = useState(BELT_LENGTH_CM / 2);
  const windowCm = zoom.height > 0 ? (BELT_WIDTH_CM * zoom.width) / zoom.height : 30;
  const fromCm = Math.min(
    Math.max(focusCm - windowCm / 2, 0),
    Math.max(BELT_LENGTH_CM - windowCm, 0),
  );
  const zoomView: StripView = {
    fromCm,
    pxPerCm: zoom.height / BELT_WIDTH_CM,
  };

  const aspect = artwork ? artwork.naturalWidth / artwork.naturalHeight : 1;

  // Minimap.
  useEffect(() => {
    const canvas = miniRef.current;
    if (!canvas || mini.width === 0) return;
    const { ctx, dpr } = prepare(canvas, mini.width, mini.height);
    const view: StripView = { fromCm: 0, pxPerCm: (mini.width * dpr) / BELT_LENGTH_CM };
    drawBeltDesign(ctx, artwork, aspect, placement, view);
    drawPrintZones(ctx, CUSTOM_BASE.printZones, CUSTOM_BASE.stitchMarginCm, view, dpr);
    ctx.strokeStyle = "#E74223";
    ctx.lineWidth = 2 * dpr;
    ctx.setLineDash([]);
    ctx.strokeRect(
      fromCm * view.pxPerCm + dpr,
      dpr,
      Math.min(windowCm, BELT_LENGTH_CM) * view.pxPerCm - 2 * dpr,
      canvas.height - 2 * dpr,
    );
  }, [artwork, aspect, placement, mini, fromCm, windowCm]);

  // Close-up.
  useEffect(() => {
    const canvas = zoomRef.current;
    if (!canvas || zoom.width === 0) return;
    const { ctx, dpr } = prepare(canvas, zoom.width, zoom.height);
    const view: StripView = { fromCm, pxPerCm: zoomView.pxPerCm * dpr };
    drawBeltDesign(ctx, artwork, aspect, placement, view);
    drawPrintZones(ctx, CUSTOM_BASE.printZones, CUSTOM_BASE.stitchMarginCm, view, dpr);
    if (!artwork) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font = `500 ${14 * dpr}px var(--font-sans, sans-serif)`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Тут з'явиться твоє зображення", canvas.width / 2, canvas.height / 2);
    }
  }, [artwork, aspect, placement, zoom, fromCm, zoomView.pxPerCm]);

  // Pointers on the close-up, in centimetres of the strip.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const toCm = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const r = zoomRef.current!.getBoundingClientRect();
      return {
        x: fromCm + (e.clientX - r.left) / zoomView.pxPerCm,
        y: (e.clientY - r.top) / zoomView.pxPerCm,
      };
    },
    [fromCm, zoomView.pxPerCm],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!artwork) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, toCm(e));
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const all = pointers.current;
    const before = all.get(e.pointerId);
    if (!before) return;
    const now = toCm(e);

    if (all.size === 1) {
      onPlacementChange((p) => movedBy(p, now.x - before.x, now.y - before.y));
    } else if (all.size === 2) {
      const [other] = [...all.entries()].filter(([id]) => id !== e.pointerId).map(([, pt]) => pt);
      const d0 = Math.hypot(before.x - other.x, before.y - other.y);
      const d1 = Math.hypot(now.x - other.x, now.y - other.y);
      const mid0 = { x: (before.x + other.x) / 2, y: (before.y + other.y) / 2 };
      const mid1 = { x: (now.x + other.x) / 2, y: (now.y + other.y) / 2 };
      if (d0 > 0.01) {
        onPlacementChange((p) =>
          movedBy(scaledAround(p, d1 / d0, mid0.x, mid0.y), mid1.x - mid0.x, mid1.y - mid0.y),
        );
      }
    }
    all.set(e.pointerId, now);
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
  };

  // Wheel zoom has to be a non-passive listener to keep the page from scrolling.
  useEffect(() => {
    const canvas = zoomRef.current;
    if (!canvas || !artwork) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const at = toCm(e);
      onPlacementChange((p) => scaledAround(p, Math.exp(-e.deltaY * 0.0015), at.x, at.y));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [artwork, toCm, onPlacementChange]);

  // Minimap: tap or drag to choose what the close-up shows.
  const aiming = useRef(false);
  const aim = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setFocusCm(((e.clientX - r.left) / r.width) * BELT_LENGTH_CM);
  };

  return (
    <div className="flex flex-col gap-3">
      <canvas
        ref={miniRef}
        aria-label="Уся смуга пояса, 100 × 10 см. Торкнись, щоб наблизити ділянку."
        className="block aspect-[10/1] w-full cursor-pointer touch-none rounded-[6px]"
        onPointerDown={(e) => {
          aiming.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          aim(e);
        }}
        onPointerMove={(e) => aiming.current && aim(e)}
        onPointerUp={() => (aiming.current = false)}
        onPointerCancel={() => (aiming.current = false)}
      />
      <canvas
        ref={zoomRef}
        aria-label="Збільшена ділянка смуги. Тягни зображення, зводь пальці, щоб змінити розмір."
        className={cn(
          "block aspect-[5/2] w-full rounded-[12px] lg:aspect-[4/1]",
          artwork ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-default",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      />
    </div>
  );
}
