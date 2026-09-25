"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ModelViewer } from "@/components/models/model-viewer";
import type { CustomFace } from "@/components/models/custom-face";
import { ChipButton, chipClassName } from "@/components/ui/chip-button";
import { CTAButton } from "@/components/ui/cta-button";
import {
  BELT_LENGTH_CM,
  BELT_WIDTH_CM,
  MIN_ARTWORK_WIDTH_CM,
  centered,
  fillStrip,
  fitInStrip,
  printQuality,
  scaledAround,
  type ArtworkSize,
  type Placement,
} from "@/lib/belt-design";
import { CUSTOM_BASE } from "@/lib/custom-base";
import { ARTWORK_CONTENT_TYPES, MAX_ARTWORK_BYTES } from "@/lib/custom-request";
import { cn } from "@/lib/utils";
import type { ProductSize } from "@/types";
import { CustomRequestForm, type UploadableArtwork } from "./custom-request-form";
import { DesignEditor } from "./design-editor";
import { drawBeltDesign } from "./draw-belt-design";


/**
 * Density of the design the 3D model wears. The Dragon atlas gives the strip
 * about 2 500 texels of length, so 25 px/cm matches it; more would be
 * resampled away, less would blur the preview.
 */
const DESIGN_CANVAS_PX_PER_CM = 25;

/**
 * The model faces the camera back-first: the middle of a Belt design is the
 * lifter's back, and that is where the customer's design is. Found by eye with
 * a medallion placed dead centre — the model's own zero is not the back, and
 * the product page's three-quarter turn pushed the design off to one side.
 */
const BACK_VIEW_ROTATION = Math.PI - 0.25;

const DEFAULT_BACKGROUND = "#111111";

/** Editor chips are tools, not choices — smaller on a phone than the size chips. */
const TOOL_CHIP = "shrink-0 px-4 py-3 text-sm lg:px-6 lg:py-4 lg:text-base";

/** The size slider's range, in printed centimetres; it moves on a log scale. */
const MAX_ARTWORK_WIDTH_CM = 400;

interface Artwork extends UploadableArtwork {
  image: HTMLImageElement;
  size: ArtworkSize;
  url: string;
}

/** Why a file cannot be used, in the customer's words — or null if it can. */
function rejectReason(file: File): string | null {
  if (!ARTWORK_CONTENT_TYPES.includes(file.type)) return "Підходять лише PNG, JPG або WebP.";
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

function paintDesignCanvas(canvas: HTMLCanvasElement, artwork: Artwork, placement: Placement) {
  canvas.width = BELT_LENGTH_CM * DESIGN_CANVAS_PX_PER_CM;
  canvas.height = BELT_WIDTH_CM * DESIGN_CANVAS_PX_PER_CM;
  drawBeltDesign(canvas.getContext("2d")!, artwork, placement, {
    fromCm: 0,
    pxPerCm: DESIGN_CANVAS_PX_PER_CM,
  });
}

export function CustomBeltBuilder({
  modelUrl,
  sizes,
}: {
  modelUrl?: string;
  /** The Custom base's size grid, for the request form. */
  sizes: ProductSize[];
}) {
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [placement, setPlacement] = useState<Placement>({
    centerX: BELT_LENGTH_CM / 2,
    centerY: BELT_WIDTH_CM / 2,
    width: BELT_LENGTH_CM,
    background: DEFAULT_BACKGROUND,
  });
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"design" | "3d">("3d");
  const [example, setExample] = useState<HTMLCanvasElement | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // The Belt design the model wears: an off-screen canvas, redrawn whenever
  // the Artwork or its placement changes. Created lazily in the browser — it
  // never affects the markup, so the server rendering without one is harmless.
  const [designCanvas] = useState(() =>
    typeof document === "undefined" ? null : document.createElement("canvas"),
  );

  useEffect(() => () => {
    if (artwork) URL.revokeObjectURL(artwork.url);
  }, [artwork]);

  // Until there is an Artwork the model keeps its own dragon — the example
  // design the page promises — and hands a flat copy of it to the editor.
  const customFace = useMemo<CustomFace>(() => {
    let design: CustomFace["design"] = null;
    if (designCanvas && artwork) {
      paintDesignCanvas(designCanvas, artwork, placement);
      design = { canvas: designCanvas };
    }
    return {
      material: CUSTOM_BASE.printMaterial,
      orientation: CUSTOM_BASE.orientation,
      design,
      onOwnDesign: setExample,
    };
  }, [designCanvas, artwork, placement]);

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
      const size = { width: image.naturalWidth, height: image.naturalHeight };
      setError(null);
      setArtwork({ image, file, size, aspect: size.width / size.height, url });
      setPlacement((p) => fillStrip(size, p.background));
      setTab("design");
    } catch {
      URL.revokeObjectURL(url);
      setError("Не вдалося відкрити це зображення. Спробуй інший файл.");
    }
  };

  const quality = artwork ? printQuality(artwork.size, placement) : null;

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
              accept={ARTWORK_CONTENT_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-[24px] bg-surface p-3 lg:rounded-[32px] lg:p-6">
          <div className="flex gap-3 lg:hidden" role="tablist" aria-label="Що показати">
            <ChipButton
              role="tab"
              id="custom-belt-tab-design"
              aria-selected={tab === "design"}
              aria-controls="custom-belt-panel-design"
              isActive={tab === "design"}
              onClick={() => setTab("design")}
            >
              Дизайн
            </ChipButton>
            <ChipButton
              role="tab"
              id="custom-belt-tab-3d"
              aria-selected={tab === "3d"}
              aria-controls="custom-belt-panel-3d"
              isActive={tab === "3d"}
              onClick={() => setTab("3d")}
            >
              3D
            </ChipButton>
          </div>

          {/* Hidden rather than unmounted on the other tab: unmounting would
              throw the WebGL context away and reload the model on every switch. */}
          <div
            id="custom-belt-panel-3d"
            role="tabpanel"
            aria-labelledby="custom-belt-tab-3d"
            className={cn(
              "relative aspect-square w-full overflow-hidden rounded-[16px] bg-black sm:aspect-[16/10] lg:block lg:aspect-[16/7]",
              tab === "3d" ? "block" : "hidden",
            )}
          >
            <ModelViewer
              modelUrl={modelUrl}
              customFace={customFace}
              rotationY={BACK_VIEW_ROTATION}
              autoRotate={false}
            />
          </div>

          <div
            id="custom-belt-panel-design"
            role="tabpanel"
            aria-labelledby="custom-belt-tab-design"
            className={cn("flex-col gap-4 lg:flex", tab === "design" ? "flex" : "hidden")}
          >
            <DesignEditor
              artwork={artwork}
              placement={placement}
              onPlacementChange={setPlacement}
              example={example}
            />

            {/* One scrolling row on a phone: five chips wrapped one per line
                pushed the quality note and the rest of the page a screen down. */}
            <div className="-mx-3 flex items-center gap-2 overflow-x-auto px-3 pb-1 scrollbar-hide lg:mx-0 lg:flex-wrap lg:gap-3 lg:overflow-visible lg:px-0">
              <ChipButton
                className={TOOL_CHIP}
                disabled={!artwork}
                onClick={() => artwork && setPlacement((p) => fillStrip(artwork.size, p.background))}
              >
                Заповнити смугу
              </ChipButton>
              <ChipButton
                className={TOOL_CHIP}
                disabled={!artwork}
                onClick={() => artwork && setPlacement((p) => fitInStrip(artwork.size, p.background))}
              >
                Вмістити
              </ChipButton>
              <ChipButton className={TOOL_CHIP} disabled={!artwork} onClick={() => setPlacement(centered)}>
                По центру
              </ChipButton>
              <label
                className={cn(
                  chipClassName({ disabled: !artwork }),
                  TOOL_CHIP,
                  "flex shrink-0 items-center gap-3 no-underline",
                )}
              >
                Розмір
                <input
                  type="range"
                  disabled={!artwork}
                  min={Math.log(MIN_ARTWORK_WIDTH_CM)}
                  max={Math.log(MAX_ARTWORK_WIDTH_CM)}
                  step={0.01}
                  value={Math.log(placement.width)}
                  aria-valuetext={`${Math.round(placement.width)} см завширшки`}
                  onChange={(e) => {
                    const width = Math.exp(Number(e.target.value));
                    setPlacement((p) => scaledAround(p, width / p.width, p.centerX, p.centerY));
                  }}
                  className="w-28 accent-coral lg:w-40"
                />
              </label>
              <label
                className={cn(
                  chipClassName({ disabled: !artwork }),
                  TOOL_CHIP,
                  "flex shrink-0 items-center gap-3 no-underline",
                )}
              >
                Фон
                <input
                  type="color"
                  disabled={!artwork}
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
                  ? `Якість друку: ${Math.round(quality.dpi)} DPI — достатньо.`
                  : `Якість друку: ${Math.round(quality.dpi)} DPI — при такому розмірі друк може вийти розмитим. Зменш зображення або завантаж більше. Надіслати все одно можна — підкажемо, що зробити.`}
              </p>
            )}
            {!artwork && (
              <p className="text-sm text-white/60">
                Зараз на смузі — приклад, пояс Dragon. Завантаж своє зображення, щоб замінити його.
              </p>
            )}
          </div>
        </div>
        <CustomRequestForm artwork={artwork} placement={placement} sizes={sizes} />
      </div>
    </section>
  );
}
