/** A screen whose data source is not connected yet: the design's shell, and why it is empty. */
export function PendingPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-[26px] bg-panel p-5 sm:p-6 dt:p-7">
      <h2 className="font-sans text-[15px] font-medium text-white/78">{title}</h2>
      <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export function PendingKpi({ label, note }: { label: string; note: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-[26px] bg-card p-5 sm:p-6 dt:p-7">
      <p className="text-[15px] font-medium text-white/78">{label}</p>
      <p className="text-[22px] leading-[1.1] font-semibold text-[#525252] sm:text-[28px] dt:text-[32px]">—</p>
      <p className="text-[13px] text-[#737373]">{note}</p>
    </div>
  );
}
