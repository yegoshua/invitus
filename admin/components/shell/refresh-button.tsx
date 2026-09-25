"use client";

import { RefreshCw } from "lucide-react";
import { useTransition } from "react";
import { refreshNow } from "@/app/(app)/sync-actions";
import { cn } from "@site/lib/utils";

/** «Оновити зараз»: KeyCRM, Meta and Monobank read again, then the page re-renders. */
export function RefreshButton({ compact = false }: { compact?: boolean }) {
  const [pending, start] = useTransition();
  const icon = <RefreshCw className={cn("size-3.5 shrink-0", pending && "animate-spin")} aria-hidden />;
  const onClick = () => start(() => refreshNow());

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-label={pending ? "Оновлюю…" : "Оновити зараз"}
        title="Оновити зараз"
        className="flex size-8 items-center justify-center rounded-lg text-[#737373] hover:text-foreground disabled:text-muted-foreground"
      >
        {icon}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="flex h-8 items-center gap-2 self-start rounded-lg px-2 -ml-2 text-xs text-muted-foreground hover:bg-field hover:text-foreground disabled:hover:bg-transparent"
    >
      {icon}
      {pending ? "Оновлюю…" : "Оновити зараз"}
    </button>
  );
}
