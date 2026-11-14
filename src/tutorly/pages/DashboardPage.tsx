'use client';

/**
 * Dashboard — "My lessons": next-lesson hero with a live ticking countdown,
 * the lesson ledger with real inline cancel confirmation, a post-lesson review
 * flow that genuinely publishes to the tutor's public profile, stats,
 * favourites and deterministic recommendations.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarOff, CalendarPlus, Heart, History, MessageCircle, PlayCircle, Star } from "lucide-react";
import { useApp } from "../store/AppStore";
import { TUTORS, isOnline, tutorById, type Tutor } from "../data/tutors";
import { subjectById } from "../data/subjects";
import { TutorCard } from "../components/tutors/TutorCard";
import { ReviewModal } from "../components/reviews/ReviewModal";
import { Avatar } from "../components/common/Avatar";
import { EmptyState, SectionHead } from "../components/common/atoms";
import { Link, navigate } from "../router/router";
import { hhmmss, hourLabel, longDate, shortDate, slotDate, timeBucket } from "../utils/time";
import { rng } from "../utils/rng";
import { clamp, cx, formatMoney } from "../utils/misc";
import type { Lesson } from "../store/types";

import "../styles/dashboard.css";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** A `now` that re-renders every second — the countdown's heartbeat. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function slotStart(l: Lesson): number {
  return slotDate(l.dateISO, l.hour).getTime();
}

function subjectLabel(l: Lesson): string {
  return subjectById(l.subject)?.label ?? l.subject;
}

/** "3h 20m" — completed minutes rendered the marketplace way. */
function hoursLabel(totalMin: number): string {
  return `${Math.floor(totalMin / 60)}h ${String(totalMin % 60).padStart(2, "0")}m`;
}

function icsStamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** Download a real .ics (VCALENDAR, local floating time) for one lesson. */
function downloadLessonIcs(lesson: Lesson, tutor: Tutor): boolean {
  try {
    const start = slotDate(lesson.dateISO, lesson.hour);
    const end = new Date(start.getTime() + lesson.durationMin * 60000);
    const subject = subjectLabel(lesson);
    const room = `${window.location.origin}${window.location.pathname}#/classroom/${lesson.id}`;
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Tutorly//Lessons//EN", "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${lesson.id}@tutorly.demo`,
      `DTSTAMP:${icsStamp(new Date())}`,
      `DTSTART:${icsStamp(start)}`,
      `DTEND:${icsStamp(end)}`,
      `SUMMARY:Tutorly — ${subject} with ${tutor.name}`,
      `DESCRIPTION:${lesson.durationMin}-minute ${subject} lesson with ${tutor.name}. The room opens 15 minutes before start: ${room}`,
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `tutorly-${tutor.id}-${lesson.dateISO}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch {
    return false;
  }
}

export function DashboardPage() {
  const { state, dispatch } = useApp();
  const now = useNow();
  const [reviewLessonId, setReviewLessonId] = useState<string | null>(null);

  const upcoming = useMemo(() => state.lessons
    .filter((l) => l.status === "upcoming")
    .sort((a, b) => slotStart(a) - slotStart(b)), [state.lessons]);
  const history = useMemo(() => state.lessons
    .filter((l) => l.status !== "upcoming")
    .sort((a, b) => slotStart(b) - slotStart(a)), [state.lessons]);
  const stats = useMemo(() => {
    const done = state.lessons.filter((l) => l.status === "completed");
    return { done: done.length, minutes: done.reduce((s, l) => s + l.durationMin, 0),
      tutors: new Set(done.map((l) => l.tutorId)).size };
  }, [state.lessons]);
  const recommendations = useMemo(() => {
    if (!state.session) return [];
    const excluded = new Set([...state.favorites, ...state.lessons.map((l) => l.tutorId)]);
    const pool = TUTORS.filter((t) => !excluded.has(t.id));
    const r = rng(state.session.email, "recs", "v1");
    const out: Tutor[] = [];
    while (out.length < 3 && pool.length > 0) {
      const i = r.pickIndex(pool);
      out.push(pool[i]);
      pool.splice(i, 1);
    }
    return out;
  }, [state.session, state.favorites, state.lessons]);

  if (!state.session) {
    return (
      <div className="dash">
        <div className="container">
          <div className="dash-gate">
            <EmptyState icon={CalendarOff} title="Your lessons live behind the login"
              actions={
                <button type="button" className="btn btn--primary" onClick={() => dispatch({ type: "openAuth" })}>
                  Log in / use the demo account
                </button>
              }>
              The demo account has four lessons waiting — one tonight with a live countdown, one
              calculus lesson awaiting your review.
            </EmptyState>
          </div>
        </div>
      </div>
    );
  }

  const firstName = state.session.name.split(" ")[0];
  const rest = upcoming.length > 0 ? upcoming.slice(1) : upcoming;
  const favourites = state.favorites.map((id) => tutorById(id)).filter((t): t is Tutor => Boolean(t));
  const reviewLesson = state.lessons.find((l) => l.id === reviewLessonId) ?? null;

  return (
    <div className="dash">
      <div className="container">
        <header className="dash-head">
          <h1 className="dash-h1">Good {timeBucket(new Date().getHours())}, {firstName}</h1>
          <p className="mono-label num">
            {state.lessons.length} {state.lessons.length === 1 ? "lesson" : "lessons"} booked · data stored in your browser — localStorage, not a server
          </p>
        </header>
        {upcoming[0] ? <HeroLesson lesson={upcoming[0]} now={now} /> : null}

        <section className="dash-section" aria-label="Upcoming lessons">
          <SectionHead eyebrow="YOUR LESSONS" title="Upcoming"
            sub="Everything after the headliner, earliest first — cancelling is inline and free." />
          {rest.length > 0 ? (
            <ul className="card dash-list">
              {rest.map((l) => <UpcomingRow key={l.id} lesson={l} />)}
            </ul>
          ) : (
            <div className="card">
              <EmptyState icon={CalendarPlus} title="No more upcoming lessons"
                actions={<Link to="/browse" className="btn btn--primary">Find a tutor</Link>}>
                The calendar likes company — your next tutor is 30 seconds and a trial lesson away.
              </EmptyState>
            </div>
          )}
        </section>

        <section className="dash-section" aria-label="Lesson history">
          <SectionHead eyebrow="YOUR LESSONS" title="Completed & cancelled"
            sub="The paper trail. Finished and unreviewed keeps a “Leave review” button — it publishes to the tutor's public profile." />
          {history.length > 0 ? (
            <ul className="card dash-list">
              {history.map((l) => <HistoryRow key={l.id} lesson={l} onReview={() => setReviewLessonId(l.id)} />)}
            </ul>
          ) : (
            <div className="card">
              <EmptyState icon={History} title="No history yet">
                Finished lessons land here — the good kind of receipts.
              </EmptyState>
            </div>
          )}
        </section>

        <section className="dash-section" aria-label="Your stats">
          <div className="dash-stats">
            <div className="card dash-stat"><span className="dash-stat-num num">{stats.done}</span><span className="mono-label">lessons completed</span></div>
            <div className="card dash-stat"><span className="dash-stat-num num">{hoursLabel(stats.minutes)}</span><span className="mono-label">hours learned</span></div>
            <div className="card dash-stat"><span className="dash-stat-num num">{stats.tutors}</span><span className="mono-label">tutors met</span></div>
            <div className="card dash-stat"><span className="dash-stat-num num">{state.favorites.length}</span><span className="mono-label">favourites saved</span></div>
          </div>
        </section>

        <section className="dash-section" aria-label="Your favourites">
          <SectionHead eyebrow="SAVED TUTORS" title="Your favourites"
            action={<Link to="/browse" className="btn btn--outline btn--sm">Find more</Link>} />
          {favourites.length > 0 ? (
            <div className="dash-grid">
              {favourites.map((t) => <TutorCard key={t.id} tutor={t} />)}
            </div>
          ) : (
            <div className="card">
              <EmptyState icon={Heart} title="No favourites yet"
                actions={<Link to="/browse" className="btn btn--primary">Browse tutors</Link>}>
                Tap the heart on any tutor card — they'll wait for you here.
              </EmptyState>
            </div>
          )}
        </section>

        {recommendations.length > 0 ? (
          <section className="dash-section" aria-label="Recommended this week">
            <SectionHead eyebrow="PICKED FOR YOU" title="Recommended this week"
              sub={<span className="mono-label">deterministic — the same three every reload, that's the point</span>} />
            <div className="dash-grid">
              {recommendations.map((t) => <TutorCard key={t.id} tutor={t} />)}
            </div>
          </section>
        ) : null}
      </div>

      {reviewLesson ? (
        <ReviewModal key={reviewLesson.id} lesson={reviewLesson} onClose={() => setReviewLessonId(null)} />
      ) : null}
    </div>
  );
}

/** The headliner: next upcoming lesson, live countdown, .ics export, inline cancel. */
function HeroLesson({ lesson, now }: { lesson: Lesson; now: number }) {
  const { dispatch } = useApp();
  const [confirming, setConfirming] = useState(false);
  const tutor = tutorById(lesson.tutorId);
  if (!tutor) return null;

  const remain = slotStart(lesson) - now;
  const live = remain <= 0; // lesson still upcoming — the room is open
  const progress = 1 - clamp(remain / WEEK_MS, 0, 1);

  const addCalendar = () => {
    const ok = downloadLessonIcs(lesson, tutor);
    dispatch({
      type: "toast", kind: ok ? "success" : "error",
      text: ok
        ? "Calendar file downloaded — open it and the lesson lands in your calendar."
        : "Couldn't build the calendar file — your browser blocked the download.",
    });
  };
  return (
    <section className="card card--pad-lg dash-hero" aria-label="Next lesson">
      <div className="dash-hero-top">
        <Avatar name={tutor.name} src={tutor.portrait} size="lg" shape="square"
          status={isOnline(tutor.id) ? "online" : null} />
        <div className="dash-hero-info">
          <h3 className="dash-hero-name">{tutor.name}</h3>
          <div className="dash-hero-tags">
            <span className="chip chip--green">{subjectLabel(lesson)}</span>
            {live ? (
              <span className="pill pill--live" title="The lesson is starting now"><span className="pill-dot" aria-hidden /> starting now</span>
            ) : (
              <span className="pill pill--upcoming" title="Lesson booked and confirmed">upcoming</span>
            )}
          </div>
          <p className="dash-mono">{longDate(lesson.dateISO)} · {hourLabel(lesson.hour)} · {lesson.durationMin} min</p>
        </div>
      </div>

      <div className="dash-count-wrap">
        <div className="dash-count-row">
          <span className={cx("dash-count num", live && "dash-count--live")} role="timer">{hhmmss(remain)}</span>
          <span className="mono-label">until lesson start</span>
        </div>
        <div className="meter" aria-hidden>
          <span className="meter-fill meter-fill--accent" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="field-hint">the room opens 15 min before start</p>
      </div>

      <div className="dash-hero-actions">
        <button type="button" className={cx("btn btn--accent btn--lg", live && "dash-cta-live")}
          onClick={() => navigate(`/classroom/${lesson.id}`)}>
          <PlayCircle size={16} className="btn-ico" aria-hidden /> Enter classroom
        </button>
        <button type="button" className="btn btn--outline" onClick={() => navigate(`/messages?tutor=${tutor.id}`)}>
          <MessageCircle size={15} className="btn-ico" aria-hidden /> Message {tutor.firstName}
        </button>
        <button type="button" className="btn btn--ghost" onClick={addCalendar}>
          <CalendarPlus size={15} className="btn-ico" aria-hidden /> Add to calendar
        </button>
      </div>

      {confirming ? (
        <CancelConfirm lesson={lesson} onDone={() => setConfirming(false)} />
      ) : (
        <button type="button" className="dash-cancel-quiet" onClick={() => setConfirming(true)}>
          Cancel lesson
        </button>
      )}
    </section>
  );
}

/** Inline (never modal) cancel confirmation — dispatches exactly once. */
function CancelConfirm({ lesson, onDone }: { lesson: Lesson; onDone: () => void }) {
  const { dispatch } = useApp();
  const fired = useRef(false);
  const tutor = tutorById(lesson.tutorId);
  if (!tutor) return null;

  const confirm = () => {
    if (fired.current) return;
    fired.current = true;
    dispatch({ type: "cancelLesson", lessonId: lesson.id });
    dispatch({ type: "toast", kind: "info", text: "Lesson cancelled — the slot went back to the calendar." });
    onDone();
  };

  return (
    <div className="dash-confirm" role="alertdialog" aria-label="Confirm cancellation">
      <p className="dash-confirm-text">
        Cancel this lesson? — the slot returns to {tutor.firstName}&rsquo;s calendar, no charge.
      </p>
      <div className="dash-confirm-actions">
        <button type="button" className="btn btn--danger btn--sm" onClick={confirm}>Yes, cancel it</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onDone}>Keep it</button>
      </div>
    </div>
  );
}

function UpcomingRow({ lesson }: { lesson: Lesson }) {
  const [confirming, setConfirming] = useState(false);
  const tutor = tutorById(lesson.tutorId);
  if (!tutor) return null;

  return (
    <li className="dash-row">
      <Avatar name={tutor.name} src={tutor.portrait} size="sm" shape="square"
        status={isOnline(tutor.id) ? "online" : null} />
      <div className="dash-row-body">
        <Link to={`/tutor/${tutor.id}`} className="dash-row-tutor">{tutor.name}</Link>
        <span className="dash-row-subject">{subjectLabel(lesson)}</span>
      </div>
      <p className="dash-mono dash-row-meta">
        {shortDate(lesson.dateISO)} · {hourLabel(lesson.hour)} · {formatMoney(lesson.price)}
      </p>
      <div className="dash-row-side">
        <span className="pill pill--upcoming" title="Lesson booked and confirmed">upcoming</span>
        {lesson.packSize ? (
          <span className="chip dash-pack" title={`Part of a ${lesson.packSize}-lesson weekly pack`}>×{lesson.packSize} pack</span>
        ) : null}
        <div className="dash-row-actions">
          <Link to={`/classroom/${lesson.id}`} className="dash-row-enter">
            <PlayCircle size={13} aria-hidden /> Enter room
          </Link>
          <button type="button" className="dash-cancel-quiet" onClick={() => setConfirming(true)}>Cancel</button>
        </div>
      </div>
      {confirming ? <CancelConfirm lesson={lesson} onDone={() => setConfirming(false)} /> : null}
    </li>
  );
}

function HistoryRow({ lesson, onReview }: { lesson: Lesson; onReview: () => void }) {
  const tutor = tutorById(lesson.tutorId);
  if (!tutor) return null;

  return (
    <li className={cx("dash-row", lesson.status === "cancelled" && "dash-row--cancelled")}>
      <Avatar name={tutor.name} src={tutor.portrait} size="sm" shape="square" className="avatar-offline" />
      <div className="dash-row-body">
        <Link to={`/tutor/${tutor.id}`} className="dash-row-tutor">{tutor.name}</Link>
        <span className="dash-row-subject">{subjectLabel(lesson)}</span>
      </div>
      <p className="dash-mono dash-row-meta">{shortDate(lesson.dateISO)} · {hourLabel(lesson.hour)}</p>
      <div className="dash-row-side">
        {lesson.status === "completed" ? (
          <span className="pill pill--completed" title="Lesson completed">completed</span>
        ) : (
          <span className="pill pill--cancelled" title="Cancelled — you were not charged">cancelled</span>
        )}
        {lesson.status === "completed" && lesson.reviewed ? (
          <span className="dash-reviewed" title="You reviewed this lesson">reviewed</span>
        ) : null}
        {lesson.packSize ? (
          <span className="chip dash-pack" title={`Part of a ${lesson.packSize}-lesson weekly pack`}>×{lesson.packSize} pack</span>
        ) : null}
        {lesson.status === "completed" && !lesson.reviewed ? (
          <button type="button" className="btn btn--outline btn--sm" onClick={onReview}>
            <Star size={13} className="btn-ico" aria-hidden /> Leave review
          </button>
        ) : null}
      </div>
    </li>
  );
}
