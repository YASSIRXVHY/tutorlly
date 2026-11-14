'use client';

/**
 * Dashboard — the study record. Next-lesson card with a live countdown,
 * the full lesson ledger with status pills and inline cancel confirmation,
 * the post-lesson review flow, stats, saved tutors, and recommendations.
 */
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  Clock3,
  Heart,
  PlayCircle,
  Sparkles,
  X,
} from "lucide-react";
import { useApp } from "../store/AppStore";
import { tutorById, TUTORS } from "../data/tutors";
import { TutorCard, TutorMini } from "../components/tutors/TutorCard";
import { ReviewModal } from "../components/reviews/ReviewModal";
import { BookingFlow } from "../components/booking/BookingFlow";
import { EmptyState } from "../components/common/atoms";
import { navigate } from "../router/router";
import { countdownParts, hhmmss, longDate, slotDate } from "../utils/time";
import { rng } from "../utils/rng";
import { cx } from "../utils/misc";
import type { Lesson } from "../store/types";

function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function DashboardPage() {
  const { state, dispatch } = useApp();
  const now = useNow(1000);
  const [loading, setLoading] = useState(true);
  const [reviewLessonId, setReviewLessonId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [bookingTutorId, setBookingTutorId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 250);
    return () => clearTimeout(t);
  }, []);

  const lessons = state.lessons;
  const upcoming = useMemo(
    () =>
      lessons
        .filter((l) => l.status === "upcoming")
        .sort((a, b) => slotStart(a) - slotStart(b)),
    [lessons]
  );
  const completed = useMemo(
    () =>
      lessons
        .filter((l) => l.status === "completed")
        .sort((a, b) => slotStart(b) - slotStart(a)),
    [lessons]
  );
  const cancelled = useMemo(
    () =>
      lessons
        .filter((l) => l.status === "cancelled")
        .sort((a, b) => slotStart(b) - slotStart(a)),
    [lessons]
  );

  const next = upcoming.find((l) => slotStart(l) > now - 50 * 60000);

  const stats = useMemo(() => {
    const done = completed.length;
    const hours = Math.round((done * 50) / 6) / 10;
    const tutors = new Set(completed.map((l) => l.tutorId)).size;
    const avgGiven =
      state.userReviews.length > 0
        ? state.userReviews.reduce((s, r) => s + r.stars, 0) / state.userReviews.length
        : 0;
    return { done, hours, tutors, avgGiven };
  }, [completed, state.userReviews]);

  const recommendations = useMemo(() => {
    if (!state.session) return [];
    // Deterministic daily rotation (seeded), skipping saved tutors,
    // deduped so nobody prints twice.
    const r = rng("daily-picks", Math.floor(Date.now() / 86400000));
    const pool = TUTORS.filter((t) => !state.favorites.includes(t.id));
    if (pool.length === 0) return [];
    const out: typeof TUTORS = [];
    const seen = new Set<string>();
    while (out.length < Math.min(3, pool.length) && seen.size < pool.length) {
      const pick = r.pick(pool);
      if (!seen.has(pick.id)) {
        seen.add(pick.id);
        out.push(pick);
      }
    }
    return out;
  }, [state.session, state.favorites]);

  if (!state.session) {
    return (
      <div className="page">
        <div className="container">
          <div className="page-head">
            <span className="kicker">The study record</span>
            <h1 className="page-title">Dashboard</h1>
          </div>
          <EmptyState
            mark="Desk locked"
            title="The study record keeps itself for account holders"
            action={
              <button
                type="button"
                className="btn btn--solid"
                onClick={() =>
                  dispatch({
                    type: "openAuth",
                    notice: "Sign in — the dashboard holds lessons, stats, saved tutors and your reviews.",
                  })
                }
              >
                Sign in
              </button>
            }
          >
            Bookings, countdowns, the review archive and saved tutors all live here.
            Sign in with any well-formed email — the demo account arrives furnished.
          </EmptyState>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-head">
          <span className="kicker">The study record</span>
          <h1 className="page-title">
            Good {greeting()}, {state.session.name.split(" ")[0]}.
          </h1>
          <p className="page-sub">
            {stats.done > 0
              ? `${stats.done} completed lesson${stats.done === 1 ? "" : "s"} on record — the ledger below does not lie.`
              : "A clean ledger. Book a first lesson and this page starts filling itself in."}
          </p>
        </div>

        {loading ? (
          <div className="dash-load" aria-label="Loading dashboard">
            <span className="skel" style={{ height: 150, display: "block" }} />
            <span className="skel" style={{ height: 200, display: "block" }} />
          </div>
        ) : lessons.length === 0 ? (
          // A completely empty ledger earns the whole stage, not a side column.
          <div className="dash-empty-grid">
            <EmptyState
              mark="No lesson booked"
              title="Nothing on the timetable"
              action={
                <button type="button" className="btn btn--solid" onClick={() => navigate("/browse")}>
                  Find a tutor
                </button>
              }
            >
              The next-lesson card waits here, countdown and all, once you book
              your first lesson. The sidebar numbers will keep a respectful
              silence meanwhile.
            </EmptyState>
          </div>
        ) : (
          <div className="dashgrid">
            <div className="dashmain">
              {next ? (
                <NextLessonCard
                  lesson={next}
                  now={now}
                  onEnter={() => navigate(`/classroom/${next.id}`)}
                />
              ) : (
                <EmptyState
                  mark="No lesson booked"
                  title="Nothing on the timetable"
                  action={
                    <button type="button" className="btn btn--solid" onClick={() => navigate("/browse")}>
                      Find a tutor
                    </button>
                  }
                >
                  {completed.length > 0 || cancelled.length > 0
                    ? "The ledger below has history — but the future is unwritten. Book the next one."
                    : "The next-lesson card waits here, countdown and all, once you book your first lesson."}
                </EmptyState>
              )}

              {lessons.length > 0 && (
                <section className="dash-section" aria-label="All lessons">
                  <div className="section-head">
                    <h2 className="dash-h2">All lessons</h2>
                    <span className="mono-label num">{lessons.length} on record</span>
                  </div>
                  <ul className="lessonlist">
                    {[...upcoming, ...completed, ...cancelled].map((l) => (
                      <LessonRow
                        key={l.id}
                        lesson={l}
                        now={now}
                        cancelMode={cancelTarget === l.id}
                        onCancelAsk={() => setCancelTarget(l.id)}
                        onCancelDismiss={() => setCancelTarget(null)}
                        onCancelConfirm={() => {
                          dispatch({ type: "cancelLesson", lessonId: l.id });
                          dispatch({
                            type: "toast",
                            text: `Lesson with ${tutorById(l.tutorId)?.name ?? "the tutor"} cancelled. Free cancellation applied — the slot is released.`,
                            kind: "info",
                          });
                          setCancelTarget(null);
                        }}
                        onReview={() => setReviewLessonId(l.id)}
                        onEnter={() => navigate(`/classroom/${l.id}`)}
                        onRebook={() => setBookingTutorId(l.tutorId)}
                      />
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <aside className="dashside">
              <section className="dash-section" aria-label="Statistics">
                <div className="section-head">
                  <h2 className="dash-h2">The numbers</h2>
                </div>
                <div className="dash-stats">
                  <div className="statbox">
                    <span className="statbox-value num">{stats.done}</span>
                    <span className="statbox-label">lessons done</span>
                  </div>
                  <div className="statbox">
                    <span className="statbox-value num">{stats.hours}h</span>
                    <span className="statbox-label">study hours</span>
                  </div>
                  <div className="statbox">
                    <span className="statbox-value num">{stats.tutors}</span>
                    <span className="statbox-label">tutors studied with</span>
                  </div>
                  <div className="statbox">
                    <span className="statbox-value num">
                      {stats.avgGiven > 0 ? stats.avgGiven.toFixed(1) : "—"}
                    </span>
                    <span className="statbox-label">avg stars you gave</span>
                  </div>
                </div>
              </section>

              <section className="dash-section" aria-label="Saved tutors">
                <div className="section-head">
                  <h2 className="dash-h2">Saved tutors</h2>
                  <Heart size={15} aria-hidden className="dash-h2-ico" />
                </div>
                {state.favorites.length === 0 ? (
                  <p className="dash-side-note">
                    No saved tutors yet — the heart button on any tutor card files
                    them here.
                  </p>
                ) : (
                  <div className="dash-saved">
                    {state.favorites.map((id) => {
                      const t = tutorById(id);
                      if (!t) return null;
                      return (
                        <TutorMini
                          key={id}
                          tutor={t}
                          right={
                            <button
                              type="button"
                              className="btn btn--sm"
                              onClick={() => setBookingTutorId(t.id)}
                              aria-label={`Book with ${t.name}`}
                            >
                              Book
                            </button>
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="dash-section" aria-label="Recommendations">
                <div className="section-head">
                  <h2 className="dash-h2">Today's picks</h2>
                  <Sparkles size={15} aria-hidden className="dash-h2-ico" />
                </div>
                {recommendations.length === 0 ? (
                  <p className="dash-side-note">
                    You have saved the entire staff — an act of devotion, not strategy.
                  </p>
                ) : (
                  <div className="dash-recs">
                    {recommendations.map((t) => (
                      <TutorMini
                        key={t.id}
                        tutor={t}
                        right={
                          <button
                            type="button"
                            className="btn btn--sm"
                            onClick={() => setBookingTutorId(t.id)}
                            aria-label={`Book with ${t.name}`}
                          >
                            Book
                          </button>
                        }
                      />
                    ))}
                  </div>
                )}
              </section>
            </aside>
          </div>
        )}

        <section className="dash-section dash-section--full" aria-label="Recommended this week">
          <div className="section-head">
            <h2 className="dash-h2">Also in this week's edition</h2>
            <a className="section-link" href="#/browse">
              All tutors <ArrowRight size={11} aria-hidden />
            </a>
          </div>
          <div className="grid-3">
            {(recommendations.length > 0
              ? recommendations
              : TUTORS.slice(0, 3)
            ).map((t) => (
              <TutorCard key={t.id} tutor={t} onBook={(tt) => setBookingTutorId(tt.id)} />
            ))}
          </div>
        </section>
      </div>

      <ReviewModal
        lesson={lessons.find((l) => l.id === reviewLessonId) ?? null}
        onClose={() => setReviewLessonId(null)}
      />
      <BookingFlow tutorId={bookingTutorId} onClose={() => setBookingTutorId(null)} />
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "night owl";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

function slotStart(l: Lesson): number {
  return slotDate(l.dateISO, l.hour).getTime();
}

function NextLessonCard({
  lesson,
  now,
  onEnter,
}: {
  lesson: Lesson;
  now: number;
  onEnter: () => void;
}) {
  const tutor = tutorById(lesson.tutorId);
  if (!tutor) return null;
  const start = slotStart(lesson);
  const remain = start - now;
  const parts = countdownParts(remain);
  // The progress meter covers the final two hours before departure.
  const windowMs = 2 * 3600000;
  const progress = Math.max(0, Math.min(1, 1 - remain / windowMs));
  const soon = remain <= 20 * 60000;

  return (
    <section className="nextlesson" aria-label="Next lesson">
      <div className="nextlesson-head">
        <span className="kicker">
          <CalendarClock size={12} aria-hidden /> Next lesson
        </span>
        {remain <= 0 && parts.done ? (
          <span className="pill pill--live">boarding now</span>
        ) : (
          <span className="mono-label num">
            {longDate(lesson.dateISO)} · {String(lesson.hour).padStart(2, "0")}:00
          </span>
        )}
      </div>

      <div className="nextlesson-tutor">
        <TutorMini tutor={tutor} right={null} />
        <span className="mono-label">{lesson.durationMin} minutes · ${lesson.price}</span>
      </div>

      <div className="nextlesson-clock">
        <span className="nextlesson-count num" aria-label="Time until lesson">
          {hhmmss(Math.max(0, remain))}
        </span>
        <span className="mono-label">
          {remain > 0
            ? soon
              ? "the room is warm — come early, stretch your vowels"
              : "until the classroom opens"
            : "departure time — the room is open"}
        </span>
        <div className="meter nextlesson-meter">
          <span className="meter-fill" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <div className="nextlesson-actions">
        <button type="button" className="btn btn--solid" onClick={onEnter}>
          <PlayCircle size={14} aria-hidden className="btn-ico" />
          Enter classroom
        </button>
        <span className="field-hint">
          {lesson.packSize
            ? `Part of a ${lesson.packSize}-lesson weekly series.`
            : "The whiteboard is real. Bring a question."}
        </span>
      </div>
    </section>
  );
}

function LessonRow({
  lesson,
  now,
  cancelMode,
  onCancelAsk,
  onCancelDismiss,
  onCancelConfirm,
  onReview,
  onEnter,
  onRebook,
}: {
  lesson: Lesson;
  now: number;
  cancelMode: boolean;
  onCancelAsk: () => void;
  onCancelDismiss: () => void;
  onCancelConfirm: () => void;
  onReview: () => void;
  onEnter: () => void;
  onRebook: () => void;
}) {
  const tutor = tutorById(lesson.tutorId);
  if (!tutor) return null;
  const start = slotStart(lesson);
  const live = lesson.status === "upcoming" && start - now < 50 * 60000 && start + 50 * 60000 > now;

  return (
    <li className={cx("lessonrow", `lessonrow--${lesson.status}`)}>
      <div className="lessonrow-when">
        <span className="lessonrow-date num">
          {lesson.dateISO.slice(8)}/{lesson.dateISO.slice(5, 7)}
        </span>
        <span className="mono-label num">{String(lesson.hour).padStart(2, "0")}:00</span>
      </div>

      <div className="lessonrow-what">
        <a className="lessonrow-tutor" href={`#/tutor/${tutor.id}`}>
          {tutor.name}
        </a>
        <span className="mono-label">50 min · ${lesson.price}</span>
        {lesson.notes && (
          <span className="lessonrow-notes" title="Notes from the whiteboard">
            {lesson.notes.slice(0, 90)}
            {lesson.notes.length > 90 ? "…" : ""}
          </span>
        )}
      </div>

      <div className="lessonrow-status">
        {lesson.status === "upcoming" && (
          <span className={cx("pill", live ? "pill--live" : "pill--upcoming")}>
            {live ? "in session" : "upcoming"}
          </span>
        )}
        {lesson.status === "completed" && (
          <span className="pill pill--completed">
            {lesson.reviewed ? "reviewed" : "awaiting review"}
          </span>
        )}
        {lesson.status === "cancelled" && <span className="pill pill--cancelled">cancelled</span>}
      </div>

      <div className="lessonrow-actions">
        {lesson.status === "upcoming" && !cancelMode && (
          <>
            <button type="button" className="btn btn--sm btn--solid" onClick={onEnter}>
              Classroom
            </button>
            <button type="button" className="btn btn--sm btn--danger" onClick={onCancelAsk}>
              Cancel
            </button>
          </>
        )}
        {lesson.status === "upcoming" && cancelMode && (
          <div className="lessonrow-confirm" role="alertdialog" aria-label="Confirm cancellation">
            <span>Cancel this lesson?</span>
            <span className="lessonrow-confirm-note">Free now · slot released instantly</span>
            <button type="button" className="btn btn--sm btn--danger" onClick={onCancelConfirm}>
              <X size={11} aria-hidden /> Yes, cancel
            </button>
            <button type="button" className="btn btn--sm" onClick={onCancelDismiss}>
              Keep it
            </button>
          </div>
        )}
        {lesson.status === "completed" && !lesson.reviewed && (
          <button type="button" className="btn btn--sm btn--accent" onClick={onReview}>
            Leave a review
          </button>
        )}
        {lesson.status === "cancelled" && (
          <button type="button" className="btn btn--sm" onClick={onRebook}>
            <Clock3 size={11} aria-hidden className="btn-ico" />
            Book again
          </button>
        )}
      </div>
    </li>
  );
}
