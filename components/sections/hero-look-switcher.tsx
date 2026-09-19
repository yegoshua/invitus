"use client";

// TEMPORARY — a switcher for colleagues to compare hero video treatments on
// the preview deployment of feat/hero-video. Delete this file and its use in
// hero-section.tsx once a look is picked, then bake the winner into the video
// className and regenerate the poster to match.

import { useState, useSyncExternalStore } from "react";

export const TREATMENTS = [
  { value: "bw", label: "Ч/б", filter: "grayscale(1)" },
  { value: "bw-contrast", label: "Ч/б контраст", filter: "grayscale(1) contrast(1.4) brightness(1.1)" },
  { value: "muted", label: "Приглушений", filter: "saturate(0.5)" },
  { value: "full", label: "Повний", filter: "none" },
  { value: "vivid", label: "Насичений", filter: "saturate(1.5) contrast(1.1)" },
  { value: "film", label: "Кіно", filter: "sepia(0.25) saturate(0.85) contrast(1.2)" },
  { value: "warm", label: "Теплий", filter: "sepia(0.45) saturate(1.3)" },
  { value: "cold", label: "Холодний", filter: "saturate(0.7) hue-rotate(-12deg) brightness(0.95) contrast(1.1)" },
  // The belt photographed in the brand's own coral: every hue collapsed onto
  // #E74223, light and shade kept.
  { value: "coral", label: "Корал (бренд)", filter: "grayscale(1) sepia(1) saturate(5) hue-rotate(-30deg)" },
] as const;

export const OPACITIES = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map((value) => ({
  value,
  label: `${Math.round(value * 100)}%`,
}));

// The dark layer over the video that keeps the white title readable. 60% is
// what production ships; less of it is what "brighter" actually needs, since
// even a 100% video is only 40% visible under it.
export const OVERLAYS = [0.6, 0.5, 0.4, 0.3, 0.2, 0].map((value) => ({
  value,
  label: `${Math.round(value * 100)}%`,
}));

export type HeroLook = { treatment: string; opacity: number; overlay: number };

const DEFAULT_LOOK: HeroLook = { treatment: "full", opacity: 0.5, overlay: 0.6 };

export function treatmentFilter(treatment: string): string {
  return TREATMENTS.find((t) => t.value === treatment)?.filter ?? "none";
}

function pick<T extends string | number>(raw: string | null, options: readonly { value: T }[], fallback: T): T {
  if (raw === null) return fallback;
  return options.find((o) => String(o.value) === raw)?.value ?? fallback;
}

// The choice lives in the URL (?look=film&op=0.8&ov=0.4) so a colleague can
// send back a link to exactly the variant they liked.
function parseLook(search: string): HeroLook {
  const params = new URLSearchParams(search);
  return {
    treatment: pick<string>(params.get("look"), TREATMENTS, DEFAULT_LOOK.treatment),
    opacity: pick(params.get("op"), OPACITIES, DEFAULT_LOOK.opacity),
    overlay: pick(params.get("ov"), OVERLAYS, DEFAULT_LOOK.overlay),
  };
}

const LOOK_EVENT = "hero-look-change";

function subscribe(onChange: () => void) {
  window.addEventListener(LOOK_EVENT, onChange);
  return () => window.removeEventListener(LOOK_EVENT, onChange);
}

export function useHeroLook(): [HeroLook, (look: HeroLook) => void] {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );

  const setLook = (next: HeroLook) => {
    const url = new URL(window.location.href);
    url.searchParams.set("look", next.treatment);
    url.searchParams.set("op", String(next.opacity));
    url.searchParams.set("ov", String(next.overlay));
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new Event(LOOK_EVENT));
  };

  return [parseLook(search), setLook];
}

function Row<T extends string | number>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-white/60">{title}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-full px-3 py-1 transition-colors ${
              option.value === value ? "bg-[#E74223] text-white" : "bg-white/10 text-white/80 hover:bg-white/20"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function HeroLookSwitcher({ look, onChange }: { look: HeroLook; onChange: (look: HeroLook) => void }) {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-[100] rounded-full bg-black/80 px-4 py-2 text-sm text-white backdrop-blur"
      >
        Варіанти hero
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] flex max-h-[70svh] max-w-md flex-col gap-3 overflow-y-auto rounded-2xl bg-black/80 p-4 text-sm text-white shadow-lg backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <span className="font-medium">Варіант відео в hero</span>
        <button type="button" onClick={() => setOpen(false)} className="text-white/60 hover:text-white" aria-label="Згорнути">
          ✕
        </button>
      </div>
      <Row<string> title="Колір" options={TREATMENTS} value={look.treatment} onChange={(treatment) => onChange({ ...look, treatment })} />
      <Row title="Яскравість відео" options={OPACITIES} value={look.opacity} onChange={(opacity) => onChange({ ...look, opacity })} />
      <Row title="Затемнення поверх (менше — яскравіше)" options={OVERLAYS} value={look.overlay} onChange={(overlay) => onChange({ ...look, overlay })} />
      <span className="text-xs text-white/40">Посилання в адресному рядку веде саме на цей варіант</span>
    </div>
  );
}
