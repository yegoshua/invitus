import {
  BELT_LENGTH_CM,
  BELT_WIDTH_CM,
  type Placement,
  type PrintZone,
} from "@/lib/belt-design";

/** A window onto the strip: which centimetres of it a canvas shows, at what density. */
export interface StripView {
  /** cm along the strip at the canvas's left edge. */
  fromCm: number;
  /** Canvas pixels per centimetre. */
  pxPerCm: number;
}

/**
 * The Belt design itself — background colour, then the Artwork. Exactly what
 * goes to the 3D model, and so nothing else may be drawn by this function.
 */
export function drawBeltDesign(
  ctx: CanvasRenderingContext2D,
  artwork: CanvasImageSource | null,
  artworkAspect: number,
  placement: Placement,
  view: StripView,
) {
  const { width, height } = ctx.canvas;
  const x = (cm: number) => (cm - view.fromCm) * view.pxPerCm;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = placement.background;
  ctx.fillRect(x(0), 0, BELT_LENGTH_CM * view.pxPerCm, BELT_WIDTH_CM * view.pxPerCm);
  if (artwork) {
    ctx.beginPath();
    ctx.rect(x(0), 0, BELT_LENGTH_CM * view.pxPerCm, BELT_WIDTH_CM * view.pxPerCm);
    ctx.clip();
    const w = placement.width * view.pxPerCm;
    const h = w / artworkAspect;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      artwork,
      x(placement.centerX) - w / 2,
      placement.centerY * view.pxPerCm - h / 2,
      w,
      h,
    );
  }
  ctx.restore();
}

const ZONE_LABEL: Record<PrintZone["kind"], string> = {
  back: "СПИНА",
  side: "БІК",
  "under-buckle": "ПІД ПРЯЖКОЮ",
};

/**
 * Print zones over the design, for the editor only — the 3D model never sees
 * them. Hidden stretches are shaded, the stitch margin is dashed, and each zone
 * is named where there is room to name it.
 */
export function drawPrintZones(
  ctx: CanvasRenderingContext2D,
  zones: readonly PrintZone[],
  stitchMarginCm: number,
  view: StripView,
  /** Canvas pixels per CSS pixel, so labels stay readable on a dense screen. */
  dpr = 1,
) {
  const { width } = ctx.canvas;
  const height = BELT_WIDTH_CM * view.pxPerCm;
  const x = (cm: number) => (cm - view.fromCm) * view.pxPerCm;
  const label = Math.max(9, Math.min(13, (view.pxPerCm / dpr) * 1.1)) * dpr;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  for (const zone of zones) {
    const left = x(zone.from);
    const right = x(zone.to);
    if (right < 0 || left > width) continue;

    if (zone.kind === "under-buckle") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(left, 0, right - left, height);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let hx = left - height; hx < right; hx += 8) {
        ctx.moveTo(Math.max(hx, left), Math.max(0, left - hx));
        ctx.lineTo(Math.min(hx + height, right), Math.min(height, right - hx));
      }
      ctx.stroke();
    }

    if (zone.from > 0) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(Math.round(left) + 0.5, 0);
      ctx.lineTo(Math.round(left) + 0.5, height);
      ctx.stroke();
    }

    const text = ZONE_LABEL[zone.kind];
    ctx.font = `700 ${label}px var(--font-sans, sans-serif)`;
    const textWidth = ctx.measureText(text).width;
    const visibleLeft = Math.max(left, 0);
    const visibleRight = Math.min(right, width);
    if (visibleRight - visibleLeft > textWidth + 12) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 3;
      ctx.textBaseline = "top";
      ctx.textAlign = "center";
      ctx.fillText(text, (visibleLeft + visibleRight) / 2, stitchMarginCm * view.pxPerCm + 4 * dpr);
      ctx.shadowBlur = 0;
    }
  }

  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.setLineDash([4 * dpr, 4 * dpr]);
  ctx.lineWidth = dpr;
  for (const y of [stitchMarginCm, BELT_WIDTH_CM - stitchMarginCm]) {
    const py = Math.round(y * view.pxPerCm) + 0.5;
    ctx.beginPath();
    ctx.moveTo(Math.max(0, x(0)), py);
    ctx.lineTo(Math.min(width, x(BELT_LENGTH_CM)), py);
    ctx.stroke();
  }
  ctx.restore();
}
