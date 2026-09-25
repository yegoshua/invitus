import { LogOut } from "lucide-react";
import { Suspense } from "react";
import { RailNav, SidebarNav, TabBar } from "@/components/shell/nav";
import { SyncBadge } from "@/components/shell/sync-badge";
import { requireAdmin } from "@/lib/auth/server";
import { loadSourceSync } from "@/lib/ingest/live";
import { loadOrders } from "@/lib/keycrm-orders";
import { syncRows } from "@/lib/live/sync-status";

function Wordmark({ size }: { size: "lg" | "sm" }) {
  return (
    <span className="flex items-baseline gap-2">
      <span className={size === "lg" ? "font-heading text-[20px] tracking-[0.05em] text-white" : "font-heading text-base tracking-[0.05em] text-white"}>
        INVITUS
      </span>
      <span className={size === "lg" ? "text-[13px] text-[#737373]" : "text-xs text-[#737373]"}>Admin</span>
    </span>
  );
}

function LogoutButton({ className, label }: { className?: string; label?: string }) {
  return (
    <form action="/auth/logout" method="post">
      <button aria-label="Вийти" title="Вийти" className={className}>
        <LogOut className="size-4" aria-hidden />
        {label}
      </button>
    </form>
  );
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  // In parallel: KeyCRM, and the Meta/Monobank top-up the badge reports on.
  const [orders, sources] = await Promise.all([loadOrders(), loadSourceSync()]);
  const sync = syncRows(orders, sources);

  return (
    <div className="flex min-h-svh flex-col sm:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-[232px] shrink-0 border-r border-border dt:block">
        <div className="sticky top-0 flex h-svh flex-col gap-8 px-4 pt-7 pb-6">
          <div className="px-3">
            <Wordmark size="lg" />
          </div>
          <Suspense>
            <SidebarNav />
          </Suspense>
          <div className="mt-auto flex flex-col gap-4 px-3">
            <SyncBadge rows={sync} />
            <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
              <span className="truncate text-[13px] text-muted-foreground">{session.name}</span>
              <LogoutButton className="flex size-8 items-center justify-center rounded-lg text-[#737373] hover:bg-field hover:text-foreground" />
            </div>
          </div>
        </div>
      </aside>

      {/* Tablet rail */}
      <aside className="hidden w-[84px] shrink-0 border-r border-border sm:block dt:hidden">
        <div className="sticky top-0 flex h-svh flex-col items-center gap-7 py-6">
          <span className="font-heading text-[22px] text-white">I</span>
          <Suspense>
            <RailNav />
          </Suspense>
          <LogoutButton className="mt-auto flex size-10 items-center justify-center rounded-xl text-[#737373] hover:bg-field hover:text-foreground" />
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 pt-4 pb-6 sm:px-7 sm:pt-7 sm:pb-10 dt:px-12 dt:pt-9 dt:pb-14">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-5 sm:gap-6 dt:gap-7">
          {/* Phone top bar */}
          <div className="flex items-center justify-between sm:hidden">
            <Wordmark size="sm" />
            <div className="flex items-center gap-2">
              <SyncBadge rows={sync} compact />
              <LogoutButton className="flex size-8 items-center justify-center rounded-lg text-[#737373] hover:text-foreground" />
            </div>
          </div>
          {children}
        </div>
      </main>

      <Suspense>
        <TabBar />
      </Suspense>
    </div>
  );
}
