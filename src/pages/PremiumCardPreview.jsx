import PremiumCardShowcase from "@/components/ui/PremiumCardShowcase";

export default function PremiumCardPreview() {
  return (
    <main className="fixed inset-0 z-50 min-h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_50%_32%,#17294b_0%,#0a1328_42%,#050914_100%)] px-5 py-[max(2rem,env(safe-area-inset-top))] text-center text-[#f5e7bd]">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-xl flex-col items-center justify-center gap-6">
        <div className="space-y-2">
          <p className="font-serif text-[0.68rem] uppercase tracking-[0.34em] text-amber-300/60">Developer Prototype</p>
          <h1 className="font-serif text-2xl font-semibold tracking-wide text-amber-100">Premium Card Motion</h1>
          <p className="mx-auto max-w-sm text-sm text-slate-300/75">Touch or move across the card to test the restrained foil and depth response.</p>
        </div>

        <PremiumCardShowcase />

        <p className="text-xs text-amber-100/45">Device tilt is requested from the first touch when supported.</p>
      </div>
    </main>
  );
}
