export function GlassPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-white/10 bg-white/[0.055] shadow-2xl shadow-black/25 backdrop-blur-2xl ${className}`}
    >
      {children}
    </section>
  );
}
