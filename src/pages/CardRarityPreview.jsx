import Card from "@/components/game/Card";
import { getCardById } from "@/data/cards";
import { ACTIVE_CARD_RARITIES, getCardRarity } from "@/data/cardRarity";

const SAMPLE_CARD_IDS = {
  common: "sling_stone",
  uncommon: "doves_peace",
  rare: "sling_david",
  epic: "sling_david",
  legendary: "angel_lord",
};

export default function CardRarityPreview() {
  return (
    <main className="fixed inset-0 z-50 overflow-y-auto bg-[radial-gradient(circle_at_50%_20%,#1a2a49_0%,#0b1428_42%,#050914_100%)] px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-center">
      <header className="mx-auto mb-7 max-w-xl">
        <p className="font-serif text-[0.68rem] uppercase tracking-[0.32em] text-amber-300/55">Developer Preview</p>
        <h1 className="mt-2 font-serif text-2xl text-amber-100">Unified Card Rarities</h1>
        <p className="mt-2 text-sm text-slate-300/70">Touch Rare, Epic, or Legendary cards to inspect their restrained depth response.</p>
      </header>

      <section className="mx-auto grid max-w-5xl grid-cols-2 place-items-center gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-5" aria-label="Active card rarity samples">
        {ACTIVE_CARD_RARITIES.map((key) => {
          const rarity = getCardRarity(key);
          const sourceCard = getCardById(SAMPLE_CARD_IDS[key]);
          const previewCard = { ...sourceCard, rarity: key };
          return (
            <article key={key} className="flex flex-col items-center gap-2">
              <Card card={previewCard} small />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: rarity.labelColor }}>{rarity.displayName}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">Foil {Math.round(rarity.foilIntensity * 100)}% · Motion {Math.round(rarity.motionIntensity * 100)}%</p>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
