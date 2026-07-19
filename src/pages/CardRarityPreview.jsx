import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import Card from "@/components/game/Card";
import { getCardById } from "@/data/cards";
import { ACTIVE_CARD_RARITIES, getCardRarity } from "@/data/cardRarity";
import RareCardInspection from "@/components/ui/RareCardInspection";

const SAMPLE_DEFINITIONS = {
  common: { cardId: "sling_stone" },
  uncommon: { cardId: "doves_peace" },
  rare: { cardId: "sling_david" },
  epic: { cardId: "parting_waters", visualSample: true },
  legendary: { cardId: "angel_lord" },
};

function buildSample(rarityKey) {
  const definition = SAMPLE_DEFINITIONS[rarityKey];
  const sourceCard = getCardById(definition.cardId);
  if (!definition.visualSample) return { card: sourceCard, visualSample: false };
  return {
    card: {
      ...sourceCard,
      name: "Epic Visual Sample",
      rarity: rarityKey,
    },
    visualSample: true,
  };
}

export default function CardRarityPreview() {
  const [inspectedSample, setInspectedSample] = useState(null);
  const samples = useMemo(
    () => ACTIVE_CARD_RARITIES.map((key) => ({ key, ...buildSample(key) })),
    [],
  );

  useEffect(() => {
    if (!inspectedSample) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setInspectedSample(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [inspectedSample]);

  return (
    <main className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_50%_20%,#1a2a49_0%,#0b1428_42%,#050914_100%)] px-4 pb-[max(3rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-center [touch-action:pan-y]">
      <header className="mx-auto mb-6 max-w-xl">
        <p className="font-serif text-[0.68rem] uppercase tracking-[0.32em] text-amber-300/55">Developer Preview</p>
        <h1 className="mt-2 font-serif text-2xl text-amber-100">Unified Card Rarities</h1>
        <p className="mt-2 text-sm text-slate-300/75">Touch Rare, Epic, or Legendary cards to test tilt. Tap any card for a larger inspection view.</p>
        <p className="mx-auto mt-3 max-w-md rounded-lg border border-amber-400/15 bg-slate-950/35 px-3 py-2 text-[11px] leading-4 text-amber-100/55">
          Developer preview — cards shown represent rarity styling. Actual card rarity comes from card data.
        </p>
      </header>

      <section className="mx-auto grid max-w-3xl grid-cols-2 place-items-center gap-x-3 gap-y-8 sm:grid-cols-3" aria-label="Active card rarity samples">
        {samples.map((sample) => {
          const rarity = getCardRarity(sample.key);
          return (
            <article key={sample.key} className={`flex flex-col items-center gap-2 ${sample.key === "legendary" ? "col-span-2 sm:col-span-1" : ""}`}>
              <Card
                card={sample.card}
                small
                playable
                onClick={() => setInspectedSample(sample)}
                className="!h-[13.75rem] !w-[9.25rem] landscape:!h-[13.75rem] landscape:!w-[9.25rem]"
              />
              <div className="max-w-[9.5rem]">
                <p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: rarity.labelColor }}>{rarity.displayName}</p>
                {sample.visualSample && <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-violet-200/75">Visual Sample · no Epic card assigned</p>}
                <p className="mt-1 text-[10px] text-slate-400">Foil {Math.round(rarity.foilIntensity * 100)}% · Motion {Math.round(rarity.motionIntensity * 100)}%</p>
              </div>
            </article>
          );
        })}
      </section>

      {inspectedSample && (
        <div
          className="fixed inset-0 z-[70] overflow-y-auto bg-black/95 px-3 py-[max(1rem,env(safe-area-inset-top))] backdrop-blur-lg [touch-action:pan-y]"
          onClick={() => setInspectedSample(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Inspect ${inspectedSample.card.name}`}
        >
          <div className="flex min-h-full items-center justify-center py-8">
            <div className={`relative flex w-full flex-col items-center gap-4 rounded-2xl border border-amber-400/20 bg-[#081124]/95 px-4 py-6 shadow-2xl ${inspectedSample.key === "rare" ? "max-w-md" : "max-w-sm"}`} onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                onClick={() => setInspectedSample(null)}
                className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-amber-100/65 transition hover:bg-amber-400/10 hover:text-amber-100"
                aria-label="Close card inspection"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="pr-10 text-left self-stretch">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: getCardRarity(inspectedSample.key).labelColor }}>
                  {getCardRarity(inspectedSample.key).displayName}{inspectedSample.visualSample ? " Visual Sample" : " Card"}
                </p>
                <h2 className="mt-1 font-serif text-xl text-amber-100">{inspectedSample.card.name}</h2>
              </div>

              {inspectedSample.key === "rare" ? (
                <RareCardInspection card={inspectedSample.card} />
              ) : (
                <Card card={inspectedSample.card} playable />
              )}

              <p className="text-xs leading-5 text-amber-100/60">{inspectedSample.key === "rare" ? "Drag across the card to inspect its finish." : "Move across the card to inspect the foil and depth."} Tap outside or use Close to dismiss.</p>
              <button type="button" onClick={() => setInspectedSample(null)} className="min-h-11 rounded-lg border border-amber-400/30 px-6 text-sm font-semibold text-amber-100/75 hover:bg-amber-400/10">Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
