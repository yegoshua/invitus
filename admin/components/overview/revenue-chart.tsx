"use client";

import { useId, useState } from "react";
import { shortAmount, uah } from "@/lib/finance/format";

export interface ChartDay {
  /** Tooltip heading, e.g. "12 вер". */
  label: string;
  /** Axis tick, e.g. "12"; empty to skip. */
  tick: string;
  revenue: number;
  open: number;
  /** Profit since the start of the period, to the end of this day; absent without Expenses. */
  profit?: number;
}

const GOOD = "#7EB693";
const BAD = "#FF453A";

// A round top for the axis: 1, 2, 2.5 or 5 times a power of ten.
function niceMax(v: number): number {
  const m = 10 ** Math.floor(Math.log10(v));
  for (const s of [1, 2, 2.5, 5, 10]) if (s * m >= v) return s * m;
  return 10 * m;
}

/**
 * Sales per day as solid bars, orders still in progress stacked on top as
 * translucent ones, and Profit since the start of the period as a line —
 * green above zero, red below. A month that bought stock dips under the zero
 * line and climbs back; that is the picture, not an alarm.
 */
export function RevenueChart({ days, subtitle }: { days: ChartDay[]; subtitle: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const gradientId = useId();
  const n = days.length;
  const max = niceMax(Math.max(1000, ...days.map((d) => d.revenue + d.open)));
  const step = 100 / n;
  const totalRevenue = days.reduce((s, d) => s + d.revenue, 0);
  const totalOpen = days.reduce((s, d) => s + d.open, 0);
  const hovered = hover != null ? days[hover] : null;

  const line = days.every((d) => d.profit !== undefined) ? days.map((d) => d.profit!) : null;
  // The line has its own scale, with room below zero when it goes there; the
  // bars stand on the same zero.
  let lo = 0, hi = 1;
  if (line) {
    const min = Math.min(0, ...line), top = Math.max(0, ...line);
    lo = min < 0 ? -niceMax(-min) : 0;
    // At least as much room above zero as below: a stock purchase ten times a
    // day's sales would otherwise push zero to the top and flatten every bar.
    hi = niceMax(Math.max(top, -lo, 1000));
  }
  const zero = line ? -lo / (hi - lo) : 0; // share of the height below zero
  const barH = (v: number) => `${(v / max) * (1 - zero) * 100}%`;
  const lineY = (v: number) => 100 - ((v - lo) / (hi - lo)) * 100;
  const last = line?.at(-1) ?? 0;
  const endColor = last < 0 ? BAD : GOOD;
  const plotRight = line ? "right-[54px] sm:right-[62px] dt:right-[70px]" : "right-0";
  const tickRight = line ? "mr-[54px] sm:mr-[62px] dt:mr-[70px]" : "";

  return (
    <section style={{ gridArea: "chart" }} className="flex min-w-0 flex-col gap-[22px] rounded-[26px] bg-panel p-5 sm:p-6 dt:p-7" aria-labelledby="chart-title">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3.5">
        <div className="flex flex-col gap-1.5">
          <h2 id="chart-title" className="font-sans text-[15px] font-medium text-white/78">
            {line ? "Виручка і прибуток по днях" : "Виручка по днях"}
          </h2>
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
          {line && (
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <span className="h-[3px] w-3.5 rounded-sm" style={{ background: endColor }} />
                Прибуток з початку
              </span>
              <span className="text-lg font-semibold" style={{ color: endColor }}>
                {uah(last)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="relative h-[180px] sm:h-[220px] dt:h-[260px]">
        <span className="absolute top-0 left-0 -translate-y-1/2 text-xs text-[#737373]">{shortAmount(max)}</span>
        <span className="absolute left-0 translate-y-1/2 text-xs text-[#525252]" style={{ bottom: `${(zero + (1 - zero) / 2) * 100}%` }}>
          {shortAmount(max / 2)}
        </span>
        <span className="absolute left-0 translate-y-1/2 text-xs text-[#737373]" style={{ bottom: `${zero * 100}%` }}>
          0
        </span>
        {line && (
          <span
            className="absolute right-0 -translate-y-1/2 rounded-[7px] px-[7px] py-[3px] text-xs font-semibold whitespace-nowrap"
            style={{ top: `${lineY(last)}%`, color: endColor, background: last < 0 ? "rgba(255,69,58,0.14)" : "rgba(126,182,147,0.14)" }}
          >
            {last > 0 ? "+" : ""}
            {shortAmount(last)}
          </span>
        )}
        <div className={`absolute inset-y-0 left-10 sm:left-11 dt:left-12 ${plotRight}`} onMouseLeave={() => setHover(null)}>
          <div className="absolute inset-x-0 top-0 border-t border-dashed border-border" />
          <div className="absolute inset-x-0 border-t border-dashed border-field" style={{ bottom: `${(zero + (1 - zero) / 2) * 100}%` }} />
          {days.map((d, i) => (
            <div
              key={i}
              onMouseEnter={() => setHover(i)}
              className="absolute inset-y-0 rounded-md"
              style={{ left: `${i * step}%`, width: `${step}%`, background: hover === i ? "rgba(255,255,255,0.05)" : "transparent" }}
            >
              <div
                className="pointer-events-none absolute rounded-t"
                style={{ left: "16%", width: "68%", bottom: `${zero * 100}%`, height: barH(d.revenue), background: hover === i ? "#FF5A3C" : "#E74223" }}
              />
              {d.open > 0 && (
                <div
                  className="pointer-events-none absolute rounded-t bg-primary/22 shadow-[inset_0_0_0_1px_rgba(231,66,35,0.55)]"
                  style={{ left: "16%", width: "68%", bottom: `calc(${zero * 100}% + ${barH(d.revenue)})`, height: barH(d.open) }}
                />
              )}
            </div>
          ))}
          <div className="pointer-events-none absolute inset-x-0 border-t border-[#404040]" style={{ bottom: `${zero * 100}%` }} />
          {line && (
            <>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden>
                <defs>
                  {/* Green above zero, red below: two stops at the same offset make a hard edge. */}
                  <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="100">
                    <stop offset={`${lineY(0)}%`} stopColor={GOOD} />
                    <stop offset={`${lineY(0)}%`} stopColor={BAD} />
                  </linearGradient>
                </defs>
                <polyline
                  points={line.map((v, i) => `${(i + 0.5) * step},${lineY(v)}`).join(" ")}
                  fill="none"
                  stroke={`url(#${gradientId})`}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div
                className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_4px_#141414]"
                style={{ left: `${(n - 0.5) * step}%`, top: `${lineY(last)}%`, background: endColor }}
              />
              {hover != null && (
                <div
                  className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-[0_0_0_3px_#141414]"
                  style={{ left: `${(hover + 0.5) * step}%`, top: `${lineY(line[hover])}%` }}
                />
              )}
            </>
          )}
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
              {hovered.profit !== undefined && (
                <span className="text-muted-foreground">
                  Прибуток з початку <span style={{ color: hovered.profit < 0 ? BAD : GOOD }}>{uah(hovered.profit)}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className={`relative -mt-2 ml-10 h-4 sm:ml-11 dt:ml-12 ${tickRight}`}>
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
