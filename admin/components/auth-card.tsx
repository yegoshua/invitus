export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-[26px] bg-card p-8 text-center">
        <p className="font-heading text-3xl tracking-wide">INVITUS</p>
        {children}
      </div>
    </main>
  );
}
