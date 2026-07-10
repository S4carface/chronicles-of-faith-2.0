import { Link } from "react-router-dom";
import { BookOpen, Compass, Shield } from "lucide-react";

export default function About() {
  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse at top, #1A2744 0%, #0A0F1E 72%)",
      }}
    >
      <main className="mx-auto w-full max-w-4xl px-5 pb-12 pt-[calc(2rem+env(safe-area-inset-top))] sm:px-8">
        <Link
          to="/"
          className="text-sm text-amber-100/55 transition hover:text-amber-200"
        >
          ← Back to Chronicles of Faith
        </Link>

        <section className="mt-8 rounded-2xl border border-amber-500/25 bg-slate-950/35 p-6 shadow-2xl shadow-black/20 sm:p-10">
          <p className="text-xs uppercase tracking-[0.28em] text-amber-300/65">
            The Mission
          </p>

          <h1 className="mt-3 font-serif text-4xl text-amber-200 sm:text-5xl">
            About Chronicles of Faith
          </h1>

          <div className="mt-7 space-y-5 text-base leading-8 text-amber-50/75">
            <p>
              Chronicles of Faith is a Bible-inspired roguelike card game
              designed to combine Scripture, strategy, exploration, and
              replayable challenges. Players enter journeys inspired by
              biblical events, build and improve their decks, manage Faith as
              a resource, face enemies, make decisions, answer Bible trivia,
              and compete for stronger scores. The game is intended to feel
              like a real strategy card game rather than a sermon. Every card,
              battle, reward, and decision should contribute to meaningful
              gameplay.
            </p>

            <p>
              The game is built for strategy players, families, younger
              players, Christians, people who already know the Bible, and
              people who are simply curious about Scripture. Its purpose is
              not to replace reading the Bible. Instead, it offers a doorway
              into biblical stories through short references, story moments,
              questions, challenges, and opportunities to learn more. Clear
              onboarding and mobile readability are major priorities so that
              non-gamers can understand the game without feeling overwhelmed.
            </p>

            <p>
              Chronicles of Faith is independently designed and developed by
              its creator with feedback from gamers, non-gamers, younger
              players, family testers, and people who evaluate gameplay,
              design, accessibility, biblical accuracy, and fairness. The
              project is being developed carefully through focused updates,
              testing, and player feedback. Its visual identity uses navy,
              gold, light, sacred imagery, and restrained fantasy elements to
              create a sense of faith, adventure, and discovery.
            </p>
          </div>

          <div className="mt-9 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-amber-500/15 bg-slate-900/45 p-4">
              <Compass className="h-5 w-5 text-amber-300/75" />
              <h2 className="mt-3 font-serif text-lg text-amber-100">
                Strategy First
              </h2>
              <p className="mt-1 text-sm leading-6 text-amber-100/50">
                Deck building, meaningful choices, scoring, and replayable
                runs.
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/15 bg-slate-900/45 p-4">
              <BookOpen className="h-5 w-5 text-amber-300/75" />
              <h2 className="mt-3 font-serif text-lg text-amber-100">
                Bible Curiosity
              </h2>
              <p className="mt-1 text-sm leading-6 text-amber-100/50">
                Short, accurate content that encourages players to explore
                Scripture.
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/15 bg-slate-900/45 p-4">
              <Shield className="h-5 w-5 text-amber-300/75" />
              <h2 className="mt-3 font-serif text-lg text-amber-100">
                Built Carefully
              </h2>
              <p className="mt-1 text-sm leading-6 text-amber-100/50">
                Mobile clarity, fair challenges, biblical accuracy, and
                focused development.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
