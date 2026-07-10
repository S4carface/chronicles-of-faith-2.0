import { Link } from "react-router-dom";
import {
  Bug,
  Lightbulb,
  Scale,
  BookOpen,
  Mail,
} from "lucide-react";

const SUPPORT_EMAIL = "chroniclesoffaithgame@gmail.com";

const feedbackOptions = [
  {
    label: "Report a Bug",
    description: "Tell us what happened and where it occurred.",
    subject: "Chronicles of Faith - Bug Report",
    body: [
      "Hello,",
      "",
      "I found a bug in Chronicles of Faith.",
      "",
      "Where did it happen?",
      "",
      "What did you expect to happen?",
      "",
      "What actually happened?",
      "",
      "Device:",
      "",
      "Screenshot or video attached: Yes / No",
      "",
      "Thank you.",
    ].join("\n"),
    icon: Bug,
  },
  {
    label: "Suggest an Idea",
    description: "Share a gameplay, feature, or design suggestion.",
    subject: "Chronicles of Faith - Game Suggestion",
    body: [
      "Hello,",
      "",
      "I have an idea for Chronicles of Faith.",
      "",
      "My suggestion:",
      "",
      "Why I think it would improve the game:",
      "",
      "Where it should appear:",
      "",
      "Thank you.",
    ].join("\n"),
    icon: Lightbulb,
  },
  {
    label: "Balance Feedback",
    description: "Report cards, enemies, difficulty, or scoring issues.",
    subject: "Chronicles of Faith - Balance Feedback",
    body: [
      "Hello,",
      "",
      "I have balance feedback for Chronicles of Faith.",
      "",
      "Card, enemy, difficulty, or scoring issue:",
      "",
      "What feels too strong, too weak, or unfair?",
      "",
      "Difficulty played:",
      "",
      "Score or result:",
      "",
      "Thank you.",
    ].join("\n"),
    icon: Scale,
  },
  {
    label: "Bible Accuracy Feedback",
    description: "Report a Scripture, trivia, or story accuracy concern.",
    subject: "Chronicles of Faith - Bible Accuracy Feedback",
    body: [
      "Hello,",
      "",
      "I noticed a possible Bible accuracy issue.",
      "",
      "Where did it appear?",
      "",
      "Current wording or answer:",
      "",
      "Suggested correction:",
      "",
      "Bible reference:",
      "",
      "Thank you.",
    ].join("\n"),
    icon: BookOpen,
  },
];
function createEmailLink(subject, body) {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

export default function Contact() {
  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse at top, #1A2744 0%, #0A0F1E 72%)",
      }}
    >
      <main className="mx-auto w-full max-w-3xl px-5 pb-12 pt-[calc(2rem+env(safe-area-inset-top))] sm:px-8">
        <Link
          to="/settings"
          className="text-sm text-amber-100/55 transition hover:text-amber-200"
        >
          ← Back to Settings
        </Link>

        <section className="mt-8 rounded-2xl border border-amber-500/25 bg-slate-950/35 p-6 shadow-2xl shadow-black/20 sm:p-10">
          <p className="text-xs uppercase tracking-[0.28em] text-amber-300/65">
            Support & Feedback
          </p>

          <h1 className="mt-3 font-serif text-4xl text-amber-200 sm:text-5xl">
            Contact Chronicles of Faith
          </h1>

          <p className="mt-5 text-base leading-7 text-amber-50/70">
            Chronicles of Faith is actively being improved through player
            feedback. Report bugs, suggest ideas, share balance concerns, or
            flag Bible accuracy issues. Clear details and screenshots are
            especially helpful.
          </p>

          <div className="mt-8 space-y-3">
            {feedbackOptions.map((option) => {
              const Icon = option.icon;

              return (
                <a
                  key={option.label}
                  href={createEmailLink(option.subject, option.body)}
                  className="flex items-center gap-4 rounded-xl border border-amber-500/20 bg-slate-900/45 p-4 transition hover:border-amber-400/50 hover:bg-amber-500/5"
                >
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-slate-950/45">
                    <Icon className="h-5 w-5 text-amber-300/75" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="font-serif text-lg text-amber-100">
                      {option.label}
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-amber-100/45">
                      {option.description}
                    </p>
                  </div>

                  <span className="text-xl text-amber-300/55">›</span>
                </a>
              );
            })}
          </div>

          <div className="mt-8 rounded-xl border border-amber-500/15 bg-slate-900/35 p-5 text-center">
            <Mail className="mx-auto h-5 w-5 text-amber-300/70" />

            <p className="mt-3 text-sm text-amber-100/55">
              You can also email directly:
            </p>

            <a
              href={createEmailLink(
  "Chronicles of Faith - General Feedback",
  [
    "Hello,",
    "",
    "I would like to contact you about Chronicles of Faith.",
    "",
    "Message:",
    "",
    "",
    "Thank you.",
  ].join("\n")
)}
              className="mt-2 inline-block break-all font-medium text-amber-200 hover:text-amber-100"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-amber-100/35">
            Please do not send passwords, payment information, addresses, or
            other sensitive personal information.
          </p>
        </section>
      </main>
    </div>
  );
}