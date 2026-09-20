"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import CloseIcon from "@/public/assets/icons/Close.svg";

// The chart is the designer's own artwork rather than a table rebuilt in HTML,
// so the alt text carries the figures for anyone who cannot see it.
const SIZE_CHART_ALT =
  "Розмірна сітка атлетичних поясів: XS — 57,5–70 см, S — 65–80 см, M — 72,5–90 см, L — 80–100 см, XL — 87,5–110 см, 2XL — 95–120 см, 3XL — 102,5–130 см, 4XL — 110–140 см. Між двома розмірами — бери більший. Обміряй талію на рівні пупка, стій розслаблено, не втягуй живіт; стрічка прилягає щільно, але не врізається.";

/**
 * The «Розмірна сітка» link under the belt size guide, and the chart it opens.
 *
 * A native `<dialog>` opened with `showModal()`: the browser puts it in the top
 * layer above the fixed header and CTA, traps focus and closes it on Escape,
 * so none of that is re-implemented here. It is portalled to `<body>` and
 * mounted only while open: the product page renders its mobile and desktop
 * layouts side by side, and a dialog left inside the hidden one draws nothing.
 */
export function SizeChartDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.showModal();

    // A modal dialog does not stop the page behind it from scrolling.
    const { overflow } = document.documentElement.style;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = overflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-primary underline underline-offset-auto cursor-pointer hover:no-underline"
      >
        Розмірна сітка
      </button>

      {open &&
        createPortal(
          <dialog
            ref={dialogRef}
            aria-label="Розмірна сітка"
            // Escape closes the dialog natively; keep the state in step with it.
            onClose={() => setOpen(false)}
            // A click on the blurred area around the chart, not on the chart.
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
            className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none bg-[#0000007A] p-0 backdrop-blur-md backdrop:bg-transparent open:flex items-center justify-center open:animate-in open:fade-in-0"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Закрити"
              className="absolute top-[67px] right-7 lg:top-14 lg:right-16 cursor-pointer [&_path]:fill-white"
            >
              <CloseIcon className="size-6 lg:size-8" />
            </button>

            <Image
              src="/assets/img/belt-size-chart.webp"
              alt={SIZE_CHART_ALT}
              width={1440}
              height={1800}
              sizes="(min-width: 1024px) 480px, calc(100vw - 48px)"
              // 4:5 artwork, 480px wide at most, and never taller than the
              // screen leaves room for once the close button is above it.
              className="h-auto w-[min(calc(100vw-48px),480px,calc((100svh-160px)*0.8))]"
            />
          </dialog>,
          document.body,
        )}
    </>
  );
}
