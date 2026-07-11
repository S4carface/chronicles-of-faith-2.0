import { Link } from "react-router-dom";
import {
  Heart,
  Gamepad2,
  Smartphone,
  Lightbulb,
  Users,
} from "lucide-react";

const contributors = [
  {
    name: "Cai",
    role: "Early Gameplay & Design Tester",
    description:
      "For early gameplay testing, UI feedback, mobile readability feedback, creative suggestions, encouragement, and helping shape the first-player experience.",
    icon: Gamepad2,
  },
  {
    name: "Brooklyn",
    role: "Young Player & Family Tester",
    description:
      "For younger-player feedback, inspiration, encouragement, and helping keep the game understandable and appropriate for families.",
    icon: Smartphone,
  },
];

export default function SpecialThanks() {
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
          to="/settings"
          className="text-sm text-amber-100/55 transition hover:text-amber-200"
        >
          ← Back to Settings
        </Link>

        <section className="mt-8 rounded-2xl border border-amber-500/25 bg-slate-950/35 p-6 shadow-2xl shadow-black/20 sm:p-10">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-amber-500/30 bg-slate-900/50">
              <Heart className="h-7 w-7 text-amber-300/80" />
            </div>
          </div>

          <p className="mt-5 text-center text-xs uppercase tracking-[0.28em] text-amber-300/65">
            Gratitude
          </p>

          <h1 className="mt-3 text-center font-serif text-4xl text-amber-200 sm:text-5xl">
            Special Thanks
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-center text-base leading-7 text-amber-50/70">
            Chronicles of Faith has been improved through the time, honesty,
            ideas, encouragement, and testing of people who believed in the
            project. Their feedback helps make the game clearer, fairer, more
            engaging, and more accessible to future players.
          </p>

          <div className="mt-9 space-y-4">
            {contributors.map((person) => {
              const Icon = person.icon;

              return (
                <article
                  key={person.name}
                  className="rounded-xl border border-amber-500/20 bg-slate-900/45 p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-slate-950/45">
                      <Icon className="h-5 w-5 text-amber-300/75" />
                    </div>

                    <div>
                      <h2 className="font-serif text-xl text-amber-100">
                        {person.name}
                      </h2>

                      <p className="mt-1 text-xs uppercase tracking-wider text-amber-300/55">
                        {person.role}
                      </p>

                      <p className="mt-3 text-sm leading-6 text-amber-100/55">
                        {person.description}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-8 rounded-xl border border-amber-500/15 bg-slate-900/35 p-5">
            <div className="flex items-start gap-3">
              <Lightbulb className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-300/70" />

              <div>
                <h2 className="font-serif text-lg text-amber-100">
                  Future Contributors
                </h2>

                <p className="mt-2 text-sm leading-6 text-amber-100/50">
                  This page may grow to recognize future testers, Bible
                  reviewers, translators, voice actors, artists, musicians,
                  and community supporters who contribute meaningfully to the
                  project.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-amber-100/35">
            <Users className="h-4 w-4" />
            Built independently, improved through community feedback.
          </div>
        </section>
      </main>
    </div>
  );
}