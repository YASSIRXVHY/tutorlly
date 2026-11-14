'use client';

/**
 * Home — Tutorly's front door. A rotating-word headline over a working
 * subject search, six category doors, a live "later today" strip fed by the
 * real availability engine, the top-rated four, how it works, and the CTA.
 * No footer or header here — the app shell provides those.
 */
import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight, BadgePercent, CalendarCheck, GraduationCap, Search, ShieldCheck, Video, Wallet, Zap,
} from "lucide-react";
import { CATEGORIES, SUBJECTS, subjectsForCategory } from "../data/subjects";
import { TUTORS, isOnline, primarySubject, tutorSubjects } from "../data/tutors";
import type { Tutor } from "../data/tutors";
import { bookableSlots } from "../data/availability";
import { TutorCard } from "../components/tutors/TutorCard";
import { SectionHead } from "../components/common/atoms";
import { Avatar } from "../components/common/Avatar";
import { Stars } from "../components/common/Stars";
import { RotatingWord } from "../components/home/RotatingWord";
import { Link, navigate } from "../router/router";
import { cx, formatMoney } from "../utils/misc";
import { addDays, dateISO, hourLabel } from "../utils/time";

import "../styles/home.css";

/* ---------------- static page data ---------------- */

const ROTATING_WORDS = ["Spanish", "calculus", "Python", "guitar", "chemistry", "IELTS"];

const POPULAR_SUBJECTS = [
  { id: "spanish", label: "Spanish" },
  { id: "calculus", label: "Calculus" },
  { id: "python", label: "Python" },
  { id: "guitar", label: "Guitar" },
  { id: "ielts", label: "IELTS" },
];

const HOW_ICONS = [Search, CalendarCheck, Video] as const;

/** {count} fills with the live catalogue size at render time. */
const HOW_COPY = [
  {
    num: "01", title: "Find your match",
    copy: `Filters that actually filter: subject, price, rating, native speakers, this week's calendar. {count} tutors, zero endless scroll.`,
  },
  {
    num: "02", title: "Book a trial at half price",
    copy: "Pick a real slot from the tutor's calendar. The checkout is fully simulated — any Luhn-valid card works, and 4242… is the classic.",
  },
  {
    num: "03", title: "Meet in the live classroom",
    copy: "Peer-to-peer video, a shared whiteboard both can draw on, and class chat. Bring headphones and your worst questions.",
  },
] as const;

/** Rating desc, then review count desc — the deterministic "best of" order. */
function topRated(): Tutor[] {
  return [...TUTORS].sort(
    (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount
  );
}

/* ---------------- live-today sessions ---------------- */

interface LiveSession {
  tutor: Tutor;
  hour: number;
  when: "today" | "tomorrow";
}

/** The tutor's first bookable open slot on a given day, or null. */
function firstOpenHour(tutor: Tutor, iso: string): number | null {
  const slot = bookableSlots(tutor, iso).find((s) => s.open);
  return slot ? slot.hour : null;
}

/** One card per tutor — first open slot today; tomorrow only if today is full. */
function liveSessions(now: Date): LiveSession[] {
  const collect = (iso: string, when: "today" | "tomorrow"): LiveSession[] =>
    TUTORS.flatMap((tutor) => {
      const hour = firstOpenHour(tutor, iso);
      return hour === null ? [] : [{ tutor, hour, when }];
    });
  const byHour = (a: LiveSession, b: LiveSession) => a.hour - b.hour;
  const today = collect(dateISO(now), "today");
  if (today.length > 0) return today.sort(byHour).slice(0, 6);
  return collect(dateISO(addDays(now, 1)), "tomorrow").sort(byHour).slice(0, 6);
}

/** The little animated audio bars (ui.css) — decorative, so aria-hidden. */
function Wavebars() {
  return (
    <span className="wavebars" aria-hidden="true">
      {Array.from({ length: 7 }, (_, i) => (
        <span className="wavebar" key={i} />
      ))}
    </span>
  );
}

/* ---------------- the page ---------------- */

export function HomePage() {
  const [searchCat, setSearchCat] = useState("");
  const [searchQ, setSearchQ] = useState("");

  // Computed per render, not at module scope: tutors approved through the
  // teaching-application flow join the catalogue at runtime, and the front
  // page's numbers stay honest without a reload.
  const TOP_RATED = useMemo(() => topRated(), []);
  const HERO_MINIS = TOP_RATED.slice(0, 3);
  const FEATURED = TOP_RATED.slice(0, 4);
  const CATEGORY_STATS = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        subjects: subjectsForCategory(c.id).length,
        tutors: TUTORS.filter((t) => tutorSubjects(t).some((s) => s.cat === c.id)).length,
      })),
    []
  );

  const sessions = liveSessions(new Date());
  const showingTomorrow = sessions.length > 0 && sessions[0].when === "tomorrow";
  const onlineNow = TUTORS.filter((t) => isOnline(t.id)).length;

  const submitSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchCat) params.set("cat", searchCat);
    const q = searchQ.trim();
    if (q) params.set("q", q);
    const query = params.toString();
    navigate(query ? `/browse?${query}` : "/browse");
  };

  return (
    <div className="home">
      {/* ---------------- 1 · hero ---------------- */}
      <section className="container home-hero" aria-label="Find a tutor">
        <div className="home-hero-copy">
          <span className="mono-label home-eyebrow">
            {TUTORS.length} verified tutors · {SUBJECTS.length} subjects · every level
          </span>
          <h1 className="home-h1">
            Book your next tutor in
            <br />
            <RotatingWord words={ROTATING_WORDS} />
          </h1>
          <p className="home-lede">
            1-on-1 online lessons with verified tutors — languages, math, science,
            code and music. First lesson at half price, cancel anytime, no
            subscription.
          </p>

          <form className="home-search" onSubmit={submitSearch} role="search">
            <select className="home-search-select" aria-label="Subject category"
              value={searchCat} onChange={(e) => setSearchCat(e.target.value)}>
              <option value="">All subjects</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <input className="home-search-input" type="text"
              placeholder="What do you want to learn? (optional)"
              aria-label="What do you want to learn"
              value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
            <button type="submit" className="btn btn--accent home-search-btn">
              <Search size={16} aria-hidden className="btn-ico" />
              Find a tutor
            </button>
          </form>

          <div className="home-popular">
            <span className="mono-label">Popular:</span>
            <div className="home-popular-chips">
              {POPULAR_SUBJECTS.map((s) => (
                <Link key={s.id} to={`/browse?subject=${s.id}`} className="chip">
                  {s.label}
                </Link>
              ))}
            </div>
          </div>

          <ul className="home-trust">
            <li><ShieldCheck size={14} aria-hidden />Verified &amp; background-checked</li>
            <li><Zap size={14} aria-hidden />Responds within hours</li>
            <li><BadgePercent size={14} aria-hidden />First lesson half price</li>
          </ul>
        </div>

        <aside className="home-hero-side" aria-label="Top-rated tutors online now">
          <span className="chip chip--green home-online-chip">
            <span className="livedot" aria-hidden="true" />
            {onlineNow} tutors online now
          </span>
          <div className="home-cluster">
            {HERO_MINIS.map((t) => {
              const subject = primarySubject(t);
              return (
                <div className="home-mini-slot" key={t.id}>
                  <Link to={`/tutor/${t.id}`} className="home-mini card">
                    <Avatar name={t.name} src={t.portrait} size="md" shape="square" />
                    <span className="home-mini-body">
                      <span className="home-mini-name">{t.name}</span>
                      {subject ? <span className="home-tag">{subject.label}</span> : null}
                      <Stars rating={t.rating} size={12} count={t.reviewCount} />
                      <span className="home-mini-price num">
                        from {formatMoney(t.price)} /lesson
                      </span>
                    </span>
                  </Link>
                </div>
              );
            })}
          </div>
        </aside>
      </section>

      {/* ---------------- 2 · category grid ---------------- */}
      <section className="home-section" aria-label="Browse by subject category">
        <div className="container">
          <SectionHead
            eyebrow="BROWSE BY SUBJECT"
            title="What do you want to learn?"
            sub="Six doors into the same marketplace — every tutor vetted, every calendar real."
          />
          <div className="home-cats">
            {CATEGORIES.map((c, i) => {
              const Icon = c.icon;
              const stats = CATEGORY_STATS[i];
              return (
                <Link
                  key={c.id}
                  to={`/browse?cat=${c.id}`}
                  className={cx(
                    "home-cat card card--link home-anim",
                    i % 3 === 1 && "home-anim--d1",
                    i % 3 === 2 && "home-anim--d2"
                  )}
                >
                  <span className="home-cat-ico"><Icon size={21} aria-hidden /></span>
                  <span className="home-cat-label">{c.label}</span>
                  <span className="home-cat-blurb">{c.blurb}</span>
                  <span className="home-cat-foot">
                    <span className="home-cat-count num">
                      {stats.subjects} subject{stats.subjects === 1 ? "" : "s"} ·{" "}
                      {stats.tutors} tutor{stats.tutors === 1 ? "" : "s"}
                    </span>
                    <ArrowRight size={15} className="home-cat-arrow" aria-hidden />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------- 3 · live-today strip ---------------- */}
      <section className="home-section" aria-label="Live lessons happening later today">
        <div className="container">
          <SectionHead
            eyebrow="LIVE LESSONS"
            title="Happening later today"
            action={
              <Link to="/browse" className="home-see-all">
                See all tutors <ArrowRight size={12} aria-hidden />
              </Link>
            }
          />
          <div className="home-live-row">
            {sessions.map((s, i) => {
              const subject = primarySubject(s.tutor);
              return (
                <article
                  key={s.tutor.id}
                  className={cx(
                    "home-live-card card home-anim",
                    i % 3 === 1 && "home-anim--d1",
                    i % 3 === 2 && "home-anim--d2"
                  )}
                >
                  <div className="home-live-top">
                    <Avatar name={s.tutor.name} src={s.tutor.portrait} size="md" shape="square"
                      status={isOnline(s.tutor.id) ? "online" : null} />
                    <span className="home-live-info">
                      <span className="home-live-name">{s.tutor.name}</span>
                      <span className="home-live-when mono-label num">
                        {s.when === "today" ? "Today" : "Tomorrow"} · {hourLabel(s.hour)}
                      </span>
                    </span>
                  </div>
                  <span className="home-tag">
                    {subject ? subject.label : "All subjects"}
                  </span>
                  <div className="home-live-foot">
                    <Wavebars />
                    <Link to={`/tutor/${s.tutor.id}`} className="home-live-view">
                      View slot <ArrowRight size={12} aria-hidden />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
          {showingTomorrow ? (
            <p className="home-live-note field-hint">
              Today's calendars filled up — tomorrow still has room.
            </p>
          ) : null}
          <span className="home-scroll-hint mono-label" aria-hidden="true">
            ← drag to scroll
          </span>
        </div>
      </section>

      {/* ---------------- 4 · featured tutors ---------------- */}
      <section className="home-section" aria-label="Featured tutors">
        <div className="container">
          <SectionHead
            eyebrow="TOP RATED"
            title="Tutors learners keep"
            action={
              <Link to="/browse" className="btn btn--outline btn--sm">
                See all {TUTORS.length} tutors
              </Link>
            }
          />
          <div className="home-featured">
            {FEATURED.map((t) => (
              <TutorCard key={t.id} tutor={t} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- 5 · how it works ---------------- */}
      <section className="home-section" aria-label="How Tutorly works" id="how-it-works">
        <div className="container">
          <SectionHead eyebrow="HOW TUTORLY WORKS" title="Three steps and you're learning" />
          <ol className="home-steps">
            {HOW_COPY.map((step, i) => {
              const Icon = HOW_ICONS[i];
              return (
                <li className="home-step card home-anim" key={step.num}>
                  <span className="home-step-head">
                    <span className="home-step-ico"><Icon size={20} aria-hidden /></span>
                    <span className="home-step-num num">{step.num}</span>
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.copy.replace("{count}", String(TUTORS.length))}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ---------------- 6 · teach band ---------------- */}
      <section className="home-section" aria-label="Teach on Tutorly">
        <div className="container">
          <div className="home-teach">
            <div className="home-teach-copy">
              <span className="home-teach-eyebrow mono-label">for teachers</span>
              <h2>Do you teach? Apply once, go live.</h2>
              <p>
                The same marketplace works from the other side of the desk: apply with a
                four-step form, get reviewed by a human, and your profile joins{" "}
                <span className="num">{TUTORS.length}</span> tutors in search — bookings,
                messages and the live classroom included. You keep 82% of every lesson.
              </p>
              <div className="home-teach-actions">
                <Link to="/teach" className="btn btn--accent btn--lg">
                  <GraduationCap size={17} aria-hidden /> Become a tutor
                </Link>
                <span className="home-teach-props">
                  <span><Wallet size={13} aria-hidden /> set your rate</span>
                  <span><CalendarCheck size={13} aria-hidden /> your calendar</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 7 · CTA band ---------------- */}
      <section className="home-section" aria-label="Start learning">
        <div className="container">
          <div className="home-cta">
            <div className="home-cta-copy">
              <h2>Your first lesson is half price.</h2>
              <p>
                Browse tutors, pick a slot, meet your tutor — the only thing you
                can lose is the awkward silence.
              </p>
            </div>
            <Link to="/browse" className="btn btn--accent btn--lg">
              Find a tutor
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
