"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ModelViewer } from "@/components/models/model-viewer";
import type { BeltPrint } from "@/components/models/printed-face";
import { ChipButton } from "@/components/ui/chip-button";
import { CTAButton } from "@/components/ui/cta-button";
import {
  BELT_LENGTH_CM,
  BELT_WIDTH_CM,
  centered,
  fillStrip,
  fitInStrip,
  printQuality,
  type Placement,
} from "@/lib/belt-design";
import { CUSTOM_BASE } from "@/lib/custom-base";
import { cn } from "@/lib/utils";
import { DesignEditor } from "./design-editor";
import { drawBeltDesign } from "./draw-belt-design";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_ARTWORK_BYTES = 25 * 1024 * 1024;

/**
 * Density of the design the 3D model wears. The Dragon atlas gives the strip
 * about 2 500 texels of length, so 25 px/cm matches it; more would be
 * resampled away, less would blur the preview.
 */
const TEXTURE_PX_PER_CM = 25;

/**
 * The model faces the camera back-first: the middle of a Belt design is the
 * lifter's back, and that is where the customer's design is. A little off
 * square, like the product page, so the belt reads as round.
 */
const BACK_VIEW_ROTATION = Math.PI + 0.3;

const DEFAULT_BACKGROUND = "#111111";

interface Artwork {
  image: HTMLImageElement;
  url: string;
}

/** Why a file cannot be used, in the customer's words — or null if it can. */
function rejectReason(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Підходять лише PNG, JPG або WebP.";
  if (file.size > MAX_ARTWORK_BYTES) return "Файл більший за 25 МБ — стисни його або збережи як JPG.";
  return null;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function paintTexture(canvas: HTMLCanvasElement, image: HTMLImageElement, placement: Placement) {
  canvas.width = BELT_LENGTH_CM * TEXTURE_PX_PER_CM;
  canvas.height = BELT_WIDTH_CM * TEXTURE_PX_PER_CM;
  drawBeltDesign(
    canvas.getContext("2d")!,
    image,
    image.naturalWidth / image.naturalHeight,
    placement,
    { fromCm: 0, pxPerCm: TEXTURE_PX_PER_CM },
  );
}

function formatDpi(dpi: number) {
  return `${Math.round(dpi)} DPI`;
}

export function CustomBeltBuilder({ modelUrl }: { modelUrl?: string }) {
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [placement, setPlacement] = useState<Placement>({
    centerX: BELT_LENGTH_CM / 2,
    centerY: BELT_WIDTH_CM / 2,
    width: BELT_LENGTH_CM,
    background: DEFAULT_BACKGROUND,
  });
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"design" | "3d">("3d");
  const fileInput = useRef<HTMLInputElement>(null);

  // The design the model wears: an off-screen canvas, redrawn whenever the
  // Artwork or its placement changes. Created lazily in the browser — it never
  // affects the markup, so the server rendering without one is harmless.
  const [texture] = useState(() =>
    typeof document === "undefined" ? null : document.createElement("canvas"),
  );

  useEffect(() => () => {
    if (artwork) URL.revokeObjectURL(artwork.url);
  }, [artwork]);

  // Until there is an Artwork the model keeps its own dragon — the example
  // design the page promises.
  const print = useMemo<BeltPrint | undefined>(() => {
    if (!texture || !artwork) return undefined;
    paintTexture(texture, artwork.image, placement);
    return {
      source: texture,
      material: CUSTOM_BASE.printMaterial,
      orientation: CUSTOM_BASE.orientation,
    };
  }, [texture, artwork, placement]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const reason = rejectReason(file);
    if (reason) {
      setError(reason);
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const image = await loadImage(url);
      setError(null);
      setArtwork({ image, url });
      setPlacement((p) =>
        fillStrip({ width: image.naturalWidth, height: image.naturalHeight }, p.background),
      );
    } catch {
      URL.revokeObjectURL(url);
      setError("Не вдалося відкрити це зображення. Спробуй інший файл.");
    }
  };

  const updatePlacement = useCallback(
    (update: (p: Placement) => Placement) => setPlacement(update),
    [],
  );

  const size = artwork
    ? { width: artwork.image.naturalWidth, height: artwork.image.naturalHeight }
    : null;
  const quality = size ? printQuality(size, placement) : null;

  return (
    <section className="bg-black pb-12 lg:pb-20">
      <div className="container-main flex flex-col gap-4 [--container-px:0.5rem] sm:[--container-px:0.75rem] lg:[--container-px:clamp(1rem,5vw,2rem)]">
        <div className="flex flex-col gap-6 rounded-[24px] bg-surface px-6 py-8 lg:flex-row lg:items-end lg:justify-between lg:rounded-[32px] lg:p-12">
          <div className="flex max-w-[560px] flex-col gap-4">
            <h2 className="font-heading text-h3 font-bold text-white">
              Твій малюнок — на поясі INVITUS
            </h2>
            <p className="text-base leading-relaxed text-white/70">
              Завантаж зображення, розмісти його на смузі 10 × 100 см і подивись, як пояс
              виглядатиме в 3D. Друкуємо на всій лицьовій поверхні — дизайн допоможемо
              довести до друку.
            </p>
            <p className="font-heading text-h3 font-bold text-white">від 10 000 ₴</p>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <CTAButton type="button" onClick={() => fileInput.current?.click()}>
              {artwork ? "Інше зображення" : "Завантажити зображення"}
            </CTAButton>
            <p className="text-sm text-white/50">PNG, JPG або WebP, до 25 МБ</p>
            {error && (
              <p role="alert" className="text-sm text-coral">
                {error}
              </p>
            )}
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-[24px] bg-surface p-3 lg:rounded-[32px] lg:p-6">
          <div className="flex gap-3 lg:hidden" role="tablist">
            <ChipButton isActive={tab === "3d"} onClick={() => setTab("3d")}>
              3D
            </ChipButton>
            <ChipButton isActive={tab === "design"} onClick={() => setTab("design")}>
              Дизайн
            </ChipButton>
          </div>

          {/* Hidden rather than unmounted on the other tab: unmounting would
              throw the WebGL context away and reload the model on every switch. */}
          <div
            className={cn(
              "relative aspect-square w-full overflow-hidden rounded-[16px] bg-black sm:aspect-[16/10] lg:block lg:aspect-[16/7]",
              tab === "3d" ? "block" : "hidden",
            )}
          >
            <ModelViewer
              modelUrl={modelUrl}
              print={print}
              rotationY={BACK_VIEW_ROTATION}
              autoRotate={false}
            />
          </div>

          <div className={cn("flex-col gap-4 lg:flex", tab === "design" ? "flex" : "hidden")}>
            <DesignEditor
              artwork={artwork?.image ?? null}
              placement={placement}
              onPlacementChange={updatePlacement}
            />

            <div className="flex flex-wrap items-center gap-3">
              <ChipButton
                disabled={!size}
                onClick={() => size && setPlacement((p) => fillStrip(size, p.background))}
              >
                Заповнити смугу
              </ChipButton>
              <ChipButton
                disabled={!size}
                onClick={() => size && setPlacement((p) => fitInStrip(size, p.background))}
              >
                Вмістити
              </ChipButton>
              <ChipButton disabled={!size} onClick={() => setPlacement(centered)}>
                По центру
              </ChipButton>
              <label className="flex cursor-pointer items-center gap-3 rounded-[20px] bg-[#0000007A] px-6 py-4 font-heading text-base font-bold tracking-[0.1em] text-white">
                Фон
                <input
                  type="color"
                  value={placement.background}
                  onChange={(e) => setPlacement((p) => ({ ...p, background: e.target.value }))}
                  className="h-6 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                />
              </label>
            </div>

            {quality && (
              <p
                aria-live="polite"
                className={cn(
                  "text-sm",
                  quality.verdict === "ok" ? "text-white/60" : "text-coral",
                )}
              >
                {quality.verdict === "ok"
                  ? `Якість друку: ${formatDpi(quality.dpi)} — достатньо.`
                  : `Якість друку: ${formatDpi(quality.dpi)} — при такому розмірі друк може вийти розмитим. Зменш зображення або завантаж більше. Надіслати все одно можна — підкажемо, що зробити.`}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
