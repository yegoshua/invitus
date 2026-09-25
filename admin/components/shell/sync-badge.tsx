import { cn } from "@site/lib/utils";

const TIME = new Intl.DateTimeFormat("uk-UA", { timeZone: "Europe/Kyiv", hour: "2-digit", minute: "2-digit" });
const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv" });

/** How fresh the KeyCRM numbers are — a green dot, or a red one when the read failed. */
export function SyncBadge({ fetchedAt, compact = false }: { fetchedAt: Date | null; compact?: boolean }) {
  const ok = fetchedAt !== null;
  const time = ok ? TIME.format(fetchedAt) : null;
  const today = ok && DAY.format(fetchedAt) === DAY.format(new Date());
  const dot = <span className={cn("size-1.5 shrink-0 rounded-full", ok ? "bg-good" : "bg-[var(--color-error)]")} />;

  if (compact) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-[#737373]">
        {dot}KeyCRM · {ok ? time : "недоступний"}
      </span>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
        {dot}
        {ok ? "KeyCRM синхронізовано" : "KeyCRM недоступний"}
      </span>
      {ok && (
        <span className="pl-3.5 text-xs text-[#737373]">
          {today ? "сьогодні" : DAY.format(fetchedAt)} о {time}
        </span>
      )}
    </div>
  );
}
