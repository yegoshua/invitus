import { cn } from "@site/lib/utils";
import { syncTime, worstState, type SyncRow, type SyncState } from "@/lib/live/sync-status";
import { RefreshButton } from "./refresh-button";

const DOT: Record<SyncState, string> = {
  ok: "bg-good",
  stale: "bg-primary",
  down: "bg-[var(--color-error)]",
  unknown: "bg-[#737373]",
  off: "border border-[#737373] bg-transparent",
};

function Dot({ state }: { state: SyncState }) {
  return <span className={cn("size-1.5 shrink-0 rounded-full", DOT[state])} />;
}

function label(row: SyncRow, now: Date): string {
  if (row.state === "off") return "не підключено";
  if (row.state === "unknown") return "—";
  return row.at ? syncTime(row.at, now) : "недоступний";
}

function Rows({ rows, now }: { rows: SyncRow[]; now: Date }) {
  return (
    <ul className="flex flex-col gap-1">
      {rows.map((row) => (
        <li key={row.name} className="flex items-center gap-2 text-[13px]">
          <Dot state={row.state} />
          <span className="text-muted-foreground">{row.name}</span>
          <span className="ml-auto text-xs text-[#737373] tabular-nums">{label(row, now)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * When each source was last read — KeyCRM on every open, Meta and Monobank
 * topped up when over ten minutes old — and «Оновити зараз». On the phone one
 * dot for the worst of them and KeyCRM's time; the rest unfold on tap.
 */
export function SyncBadge({ rows, compact = false }: { rows: SyncRow[]; compact?: boolean }) {
  const now = new Date();
  if (compact) {
    const keycrm = rows[0];
    return (
      <div className="flex items-center">
        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs text-[#737373] [&::-webkit-details-marker]:hidden">
            <Dot state={worstState(rows)} />
            <span className="tabular-nums">{label(keycrm, now)}</span>
          </summary>
          <div className="absolute top-full right-0 z-30 mt-2 w-56 rounded-[14px] border border-border bg-panel p-3 shadow-lg">
            <Rows rows={rows} now={now} />
          </div>
        </details>
        <RefreshButton compact />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <Rows rows={rows} now={now} />
      <RefreshButton />
    </div>
  );
}
