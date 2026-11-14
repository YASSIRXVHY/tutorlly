'use client';

/**
 * Home — the front page: rotating headline word, the live-lesson panel with
 * an animated waveform, the language index, featured tutors, how it works,
 * a pull quote from the review corpus, and the subscription CTA band.
 */
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowDownRight, Radio, Users, CreditCard, PenLine } from "lucide-react";
import { LANGUAGES } from "../data/languages";
import { TUTORS, tutorById } from "../data/tutors";
import { tutorsByLanguage } from "../data/tutors";
import { generateReviews } from "../data/reviews";
import { TutorCard } from "../components/tutors/TutorCard";
import { Waveform } from "../components/home/Waveform";
import { RotatingWord } from "../components/home/RotatingWord";
import { navigate } from "../router/router";
import { useApp } from "../store/AppStore";
import { prefersReducedMotion } from "../utils/misc";

const LIVE_TUTOR_ID = "kenji";
const LIVE_PHRASES = [
  { line: "「毎日、声に出して読みましょう。」", en: "Every day, out loud — that's the deal." },
  { line: "「『は』と『が』、もう一度。」", en: "Ha and ga — one more time, together." },
  { line: "「発音は形から。口を大きく。」", en: "Pronunciation starts with shape — open wide." },
  { line: "「上手になりましたね。」", en: "You've gotten good at this." },
];

const FEATURED = ["mariana", "kenji", "camille", "jiwoo"];

export function HomePage() {
  const { state, dispatch } = useApp();
  const [phraseIdx, setPhraseIdx] = useState(0);
  const liveTutor = tutorById(LIVE_TUTOR_ID);

  useEffect(() => {
    const t = setInterval(() => setPhraseIdx((i) => (i + 1) % LIVE_PHRASES.length), 4200);
    return () => clearInterval(t);
  }, []);

  const quote = useMemo(() => {
    const rv = generateReviews(liveTutor ?? TUTORS[0]).find((r) => r.stars === 5);
    return rv;
  }, [liveTutor]);

  const featured = FEATURED.map((id) => tutorById(id)).filter(Boolean) as typeof TUTORS;

  return (
    <div className="page home">
      {/* ---------------- HERO ---------------- */}
      <section className="hero container">
        <div className="hero-copy">
          <span className="kicker">The language press · est. 2025</span>
          <h1 className="display-hero hero-title">
            Speak <RotatingWord />
            <span className="hero-title-line">
              like you mean it.
            </span>
          </h1>
          <p className="lede hero-lede">
            One-to-one lessons with tutors who teach their living language — booked
            like train tickets, taught in a live classroom with a shared whiteboard.
            Twelve tutors, eleven languages, zero placeholders.
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="btn btn--solid"
              onClick={() => navigate("/browse")}
            >
              Find your tutor <ArrowRight size={14} aria-hidden className="btn-ico" />
            </button>
            <a
              className="btn btn--outline"
              href="#how-it-works"
              onClick={(e) => {
                // In-page anchor — the hash router must not see this click.
                e.preventDefault();
                document
                  .getElementById("how-it-works")
                  ?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
              }}
            >
              How lessons work <ArrowDownRight size={14} aria-hidden className="btn-ico" />
            </a>
          </div>
          <dl className="hero-facts">
            <div>
              <dt className="mono-label">Languages</dt>
              <dd className="num">11</dd>
            </div>
            <div>
              <dt className="mono-label">Tutors</dt>
              <dd className="num">12</dd>
            </div>
            <div>
              <dt className="mono-label">Lessons taught</dt>
              <dd className="num">
                {TUTORS.reduce((s, t) => s + t.lessonsTaught, 0).toLocaleString("en-US")}
              </dd>
            </div>
          </dl>
        </div>

        {liveTutor && (
          <aside className="livepanel" aria-label="Live lesson in session">
            <div className="livepanel-head">
              <span className="pill pill--live">Live now</span>
              <span className="mono-label">
                {liveTutor.name} · Japanese · Osaka {localTime(9)}
              </span>
            </div>
            <Waveform />
            <div className="livepanel-caption" aria-live="off">
              <p className="livepanel-line" key={phraseIdx}>
                {LIVE_PHRASES[phraseIdx].line}
              </p>
              <p className="livepanel-sub">{LIVE_PHRASES[phraseIdx].en}</p>
            </div>
            <div className="livepanel-foot">
              <span className="mono-label">
                <Users size={11} aria-hidden /> 12 watching · from $16/lesson
              </span>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => navigate(`/tutor/${liveTutor.id}`)}
              >
                <Radio size={12} aria-hidden className="btn-ico" />
                Tune in
              </button>
            </div>
          </aside>
        )}
      </section>

      {/* ---------------- LANGUAGE INDEX ---------------- */}
      <section className="section" aria-label="Languages taught">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="kicker">The index</span>
              <h2 className="display" style={{ marginTop: 10 }}>
                Eleven languages, one page each
              </h2>
            </div>
            <a className="section-link" href="#/browse">
              All tutors <ArrowRight size={11} aria-hidden />
            </a>
          </div>
          <div className="langindex">
            {LANGUAGES.map((l) => {
              const count = tutorsByLanguage(l.code).length;
              return (
                <button
                  key={l.code}
                  type="button"
                  className="langtile"
                  onClick={() => navigate(`/browse?lang=${l.code}`)}
                  aria-label={`${l.name} — ${count} tutor${count === 1 ? "" : "s"}`}
                >
                  <span className="langtile-code">{l.code.toUpperCase()}</span>
                  <span className="langtile-name">{l.name}</span>
                  <span className="langtile-native mono-label">{l.nativeName}</span>
                  <span className="langtile-count mono-label num">
                    {count} tutor{count === 1 ? "" : "s"}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              className="langtile langtile--all"
              onClick={() => navigate("/browse")}
              aria-label="All languages, all twelve tutors"
            >
              <span className="langtile-code langtile-code--accent">ALL</span>
              <span className="langtile-name">The full staff</span>
              <span className="langtile-native mono-label">12 tutors · 11 languages</span>
              <span className="langtile-count mono-label">Browse everyone →</span>
            </button>
          </div>
        </div>
      </section>

      {/* ---------------- FEATURED ---------------- */}
      <section className="section" aria-label="Featured tutors">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="kicker">This week's cover story</span>
              <h2 className="display" style={{ marginTop: 10 }}>
                Four of the twelve, on the front page
              </h2>
            </div>
            <a className="section-link" href="#/browse">
              Meet the full staff <ArrowRight size={11} aria-hidden />
            </a>
          </div>
          <div className="grid-4">
            {featured.map((t) => (
              <TutorCard key={t.id} tutor={t} onBook={(tt) => navigate(`/tutor/${tt.id}`)} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section className="section" id="how-it-works" aria-label="How it works">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="kicker">The procedure</span>
              <h2 className="display" style={{ marginTop: 10 }}>
                Three steps, no small print
              </h2>
            </div>
          </div>
          <ol className="howrow">
            <li className="howstep">
              <span className="howstep-num">01</span>
              <div className="howstep-body">
                <h3>Choose your tutor</h3>
                <p>
                  Filter twelve tutors by language, price, rating, specialty — or
                  availability this week. Every profile carries a simulated intro
                  video with captions in the language you're buying.
                </p>
                <a className="linkbtn" href="#/browse">
                  Browse the staff
                </a>
              </div>
            </li>
            <li className="howstep">
              <span className="howstep-num">02</span>
              <div className="howstep-body">
                <h3>Book a slot</h3>
                <p>
                  A fourteen-day timetable, deterministic availability, slots grouped
                  morning to evening. Single lesson or a weekly pack at a discount —
                  then a checkout that validates your card like it means it.
                </p>
              </div>
            </li>
            <li className="howstep">
              <span className="howstep-num">03</span>
              <div className="howstep-body">
                <h3>Enter the classroom</h3>
                <p>
                  A countdown opens the room; inside, a shared notebook whiteboard with
                  four inks, an agenda, lesson notes, and a boarding-pass receipt with
                  its own barcode.
                </p>
                <a className="linkbtn" href="#/classroom/demo">
                  Peek into the practice room
                </a>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* ---------------- PULL QUOTE ---------------- */}
      {quote && liveTutor && (
        <section className="section" aria-label="Reader review">
          <div className="container">
            <figure className="pullquote">
              <span className="pullquote-mark" aria-hidden>“</span>
              <blockquote>
                <p>{quote.text.replaceAll("{first}", liveTutor.firstName)}</p>
              </blockquote>
              <figcaption className="mono-label">
                — {quote.author} · {quote.lessons} lessons of Japanese, verified student
              </figcaption>
            </figure>
          </div>
        </section>
      )}

      {/* ---------------- CTA BAND ---------------- */}
      <section className="ctaband" aria-label="Start learning">
        <div className="container ctaband-inner">
          <div className="ctaband-copy">
            <span className="kicker ctaband-kicker">Subscription drive</span>
            <h2 className="ctaband-title">
              The first lesson is the trial — half price, full value.
            </h2>
            <p>
              No card tricks, no lock-in, and every cancellation up to 24 hours ahead is
              free. The only thing we keep is the grammar.
            </p>
          </div>
          <div className="ctaband-actions">
            <button type="button" className="btn btn--accent" onClick={() => navigate("/browse")}>
              <PenLine size={14} aria-hidden className="btn-ico" />
              Book a first lesson
            </button>
            {state.session ? (
              <button type="button" className="btn ctaband-ghost" onClick={() => navigate("/dashboard")}>
                Open your study record
              </button>
            ) : (
              <button
                type="button"
                className="btn ctaband-ghost"
                onClick={() => dispatch({ type: "openAuth", notice: null })}
              >
                <CreditCard size={14} aria-hidden className="btn-ico" />
                Sign in — demo account included
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function localTime(utcOffsetHours: number): string {
  // Wall-clock time at the tutor's longitude, printed like a timetable stamp.
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const there = new Date(utc + utcOffsetHours * 3600000);
  return `${String(there.getHours()).padStart(2, "0")}:${String(there.getMinutes()).padStart(2, "0")}`;
}
