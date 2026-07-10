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
    Chronicles of Faith is a Bible-inspired roguelike card game that combines
    strategy, deck building, exploration, Bible trivia, and replayable
    challenges. Players journey through events inspired by Scripture, build
    stronger decks, manage Faith, face enemies, make decisions, and improve
    their scores across repeated runs.
  </p>

  <p>
    The game is designed for strategy players, families, younger players,
    Christians, and people who are simply curious about the Bible. Its goal is
    to make biblical stories engaging without turning the experience into a
    sermon. Chronicles of Faith is not intended to replace reading Scripture.
    It is meant to encourage curiosity, learning, and further exploration of
    the Bible.
  </p>

  <p>
    Chronicles of Faith is independently created and developed by Cid Netto
    with help from player feedback, testing, and ongoing refinement. The game
    is being built with a focus on clear gameplay, mobile readability, fair
    scoring, biblical accuracy, and a sacred navy-and-gold adventure style.
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
