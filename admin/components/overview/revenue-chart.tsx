"use client";

import { useState } from "react";
import { shortAmount, uah } from "@/lib/finance/format";

export interface ChartDay {
  /** Tooltip heading, e.g. "12 вер". */
  label: string;
  /** Axis tick, e.g. "12"; empty to skip. */
  tick: string;
  revenue: number;
  open: number;
}

// A round top for the axis: 1, 2, 2.5 or 5 times a power of ten.
function niceMax(v: number): number {
  const m = 10 ** Math.floor(Math.log10(v));
  for (const s of [1, 2, 2.5, 5, 10]) if (s * m >= v) return s * m;
  return 10 * m;
}

/**
 * Sales per day as solid bars, orders still in progress stacked on top as
 * translucent ones — the design's chart. The Profit line joins it once
 * Expenses exist (#109).
 */
export function RevenueChart({ days, subtitle }: { days: ChartDay[]; subtitle: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = days.length;
  const max = niceMax(Math.max(1000, ...days.map((d) => d.revenue + d.open)));
  const step = 100 / n;
  const h = (v: number) => `${(v / max) * 100}%`;
  const totalRevenue = days.reduce((s, d) => s + d.revenue, 0);
  const totalOpen = days.reduce((s, d) => s + d.open, 0);
  const hovered = hover != null ? days[hover] : null;

  return (
    <section style={{ gridArea: "chart" }} className="flex min-w-0 flex-col gap-[22px] rounded-[26px] bg-panel p-5 sm:p-6 dt:p-7" aria-labelledby="chart-title">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3.5">
        <div className="flex flex-col gap-1.5">
          <h2 id="chart-title" className="font-sans text-[15px] font-medium text-white/78">Виручка по днях</h2>
          <p className="text-[13px] text-[#737373]">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-x-7 gap-y-2.5">
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <span className="size-2.5 rounded-[3px] bg-primary" />
              Виручка
            </span>
            <span className="text-lg font-semibold">{uah(totalRevenue)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <span className="size-2.5 rounded-[3px] bg-primary/28 shadow-[inset_0_0_0_1px_rgba(231,66,35,0.6)]" />
              У роботі
            </span>
            <span className="text-lg font-semibold">{uah(totalOpen)}</span>
          </div>
        </div>
      </div>

      <div className="relative h-[180px] sm:h-[220px] dt:h-[260px]">
        <span className="absolute top-0 left-0 -translate-y-1/2 text-xs text-[#737373]">{shortAmount(max)}</span>
        <span className="absolute top-1/2 left-0 -translate-y-1/2 text-xs text-[#525252]">{shortAmount(max / 2)}</span>
        <span className="absolute bottom-0 left-0 translate-y-1/2 text-xs text-[#737373]">0</span>
        <div className="absolute inset-y-0 right-0 left-10 sm:left-11 dt:left-12" onMouseLeave={() => setHover(null)}>
          <div className="absolute inset-x-0 top-0 border-t border-dashed border-border" />
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-field" />
          {days.map((d, i) => (
            <div
              key={i}
              onMouseEnter={() => setHover(i)}
              className="absolute inset-y-0 rounded-md"
              style={{ left: `${i * step}%`, width: `${step}%`, background: hover === i ? "rgba(255,255,255,0.05)" : "transparent" }}
            >
              <div
                className="pointer-events-none absolute bottom-0 rounded-t"
                style={{ left: "16%", width: "68%", height: h(d.revenue), background: hover === i ? "#FF5A3C" : "#E74223" }}
              />
              {d.open > 0 && (
                <div
                  className="pointer-events-none absolute rounded-t bg-primary/22 shadow-[inset_0_0_0_1px_rgba(231,66,35,0.55)]"
                  style={{ left: "16%", width: "68%", bottom: h(d.revenue), height: h(d.open) }}
                />
              )}
            </div>
          ))}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-[#404040]" />
          {hovered && hover != null && (
            <div
              className="pointer-events-none absolute -top-1.5 z-10 flex -translate-x-1/2 -translate-y-full flex-col gap-1 rounded-xl border border-border bg-field px-3 py-2.5 text-[13px] whitespace-nowrap"
              style={{ left: `${Math.min(84, Math.max(16, (hover + 0.5) * step))}%` }}
            >
              <b className="font-semibold">{hovered.label}</b>
              <span className="text-muted-foreground">
                Виручка <span className="text-foreground">{uah(hovered.revenue)}</span>
              </span>
              <span className="text-muted-foreground">
                У роботі <span className="text-foreground">{uah(hovered.open)}</span>
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="relative -mt-2 ml-10 h-4 sm:ml-11 dt:ml-12">
        {days.map((d, i) =>
          d.tick ? (
            <span key={i} className="absolute -translate-x-1/2 text-xs text-[#737373]" style={{ left: `${(i + 0.5) * step}%` }}>
              {d.tick}
            </span>
          ) : null
        )}
      </div>
    </section>
  );
}
