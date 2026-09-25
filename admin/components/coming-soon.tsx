export function ComingSoon({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h1 className="text-h3">{title}</h1>
      <div className="mt-6 rounded-[26px] bg-card p-6 text-muted-foreground md:p-8">{children}</div>
    </>
  );
}
