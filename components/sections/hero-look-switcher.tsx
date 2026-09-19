"use client";

// TEMPORARY — a switcher for colleagues to compare hero video treatments on
// the preview deployment of feat/hero-video. Delete this file and its use in
// hero-section.tsx once a look is picked, then bake the winner into the video
// className and regenerate the poster to match.

import { useState, useSyncExternalStore } from "react";

export const SATURATIONS = [
  { value: 0, label: "Ч/б" },
  { value: 0.5, label: "Приглушений" },
  { value: 1, label: "Повний" },
] as const;

export const OPACITIES = [
  { value: 0.3, label: "30%" },
  { value: 0.5, label: "50%" },
  { value: 0.7, label: "70%" },
] as const;

export type HeroLook = { saturation: number; opacity: number };

const DEFAULT_LOOK: HeroLook = { saturation: 1, opacity: 0.5 };

// The choice lives in the URL (?sat=0.5&op=0.7) so a colleague can send back
// a link to exactly the variant they liked.
function parseLook(search: string): HeroLook {
  const params = new URLSearchParams(search);
  const sat = Number(params.get("sat"));
  const op = Number(params.get("op"));
  return {
    saturation: params.has("sat") && SATURATIONS.some((s) => s.value === sat) ? sat : DEFAULT_LOOK.saturation,
    opacity: OPACITIES.some((o) => o.value === op) ? op : DEFAULT_LOOK.opacity,
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
    url.searchParams.set("sat", String(next.saturation));
    url.searchParams.set("op", String(next.opacity));
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new Event(LOOK_EVENT));
  };

  return [parseLook(search), setLook];
}

function Row<T extends number>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: readonly { value: T; label: string }[];
  value: number;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-white/60">{title}</span>
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
    <div className="fixed bottom-4 left-4 z-[100] flex flex-col gap-2 rounded-2xl bg-black/80 p-4 text-sm text-white shadow-lg backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <span className="font-medium">Варіант відео в hero</span>
        <button type="button" onClick={() => setOpen(false)} className="text-white/60 hover:text-white" aria-label="Згорнути">
          ✕
        </button>
      </div>
      <Row title="Колір" options={SATURATIONS} value={look.saturation} onChange={(saturation) => onChange({ ...look, saturation })} />
      <Row title="Яскравість" options={OPACITIES} value={look.opacity} onChange={(opacity) => onChange({ ...look, opacity })} />
      <span className="text-xs text-white/40">Посилання в адресному рядку веде саме на цей варіант</span>
    </div>
  );
}
