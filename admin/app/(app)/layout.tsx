import { LogOut } from "lucide-react";
import { SidebarNav, TabBar } from "@/components/nav";
import { requireAdmin } from "@/lib/auth/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 hidden h-svh flex-col border-r border-border px-4 py-6 lg:flex">
        <p className="px-3 font-heading text-2xl tracking-wide">INVITUS</p>
        <div className="mt-8 flex-1">
          <SidebarNav />
        </div>
        <form action="/auth/logout" method="post" className="border-t border-border pt-4">
          <p className="truncate px-3 text-sm text-muted-foreground">{session.name}</p>
          <button className="mt-1 flex w-full items-center gap-3 rounded-[12px] px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
            <LogOut className="size-4" aria-hidden />
            Вийти
          </button>
        </form>
      </aside>

      <div className="min-w-0 px-4 pb-28 pt-4 md:px-8 lg:pb-10 lg:pt-8">
        <header className="mb-6 flex items-center justify-between lg:hidden">
          <p className="font-heading text-xl tracking-wide">INVITUS</p>
          <form action="/auth/logout" method="post">
            <button
              aria-label={`Вийти (${session.name})`}
              className="flex size-10 items-center justify-center rounded-[12px] text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="size-5" aria-hidden />
            </button>
          </form>
        </header>
        {children}
      </div>
      <TabBar />
    </div>
  );
}
