'use client';

/**
 * The Classroom — the centerpiece. Countdown with progress bar while the
 * lesson waits; a full session once it starts: the notebook whiteboard with
 * a tool rail, a live 50-minute session clock, an agenda that checks itself
 * off as the lesson progresses, notes that save into the lesson record,
 * and an inline end-of-lesson confirmation that hands you to the review.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Brush,
  Eraser,
  Undo2,
  Trash2,
  Download,
  PlayCircle,
  DoorOpen,
  Minus,
  CheckCircle2,
  SquarePen,
} from "lucide-react";
import { useApp } from "../store/AppStore";
import { tutorById } from "../data/tutors";
import { EmptyState } from "../components/common/atoms";
import { ReviewModal } from "../components/reviews/ReviewModal";
import { Whiteboard, type WhiteboardHandle, type WhiteboardTool, type StrokeSnapshot } from "../components/classroom/Whiteboard";
import { navigate } from "../router/router";
import { hhmmss, hourLabel, longDate, slotDate } from "../utils/time";
import { cx } from "../utils/misc";

const INKS = [
  { name: "Ink", value: "#1a150f" },
  { name: "Vermillion", value: "#c9391b" },
  { name: "Spruce", value: "#2e5440" },
  { name: "Mustard", value: "#c9921e" },
];

const NIBS = [
  { name: "Fine", value: 3 },
  { name: "Medium", value: 6 },
  { name: "Broad", value: 12 },
];

const AGENDA: Array<{ label: string; from: number; to: number; note: string }> = [
  { label: "Warm-up", from: 0, to: 10, note: "Loose ends from last time, spoken not read" },
  { label: "Target drills", from: 10, to: 35, note: "The grammar of the day, beaten into muscle" },
  { label: "Free talk", from: 35, to: 50, note: "Anything you want — corrections noted for next time" },
];

const LESSON_MIN = 50;

export function ClassroomPage({ lessonId }: { lessonId: string }) {
  const { state, dispatch } = useApp();
  const [now, setNow] = useState(() => Date.now());
  const [phase, setPhase] = useState<"wait" | "live">("wait");
  const [ink, setInk] = useState(INKS[0].value);
  const [nib, setNib] = useState(NIBS[1].value);
  const [eraser, setEraser] = useState(false);
  const [notes, setNotes] = useState("");
  const [strokes, setStrokes] = useState(0);
  const [endAsk, setEndAsk] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [warmup, setWarmup] = useState<StrokeSnapshot[] | null>(null);
  const boardRef = useRef<WhiteboardHandle>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // /classroom/demo is the open practice room — fully functional, no ticket.
  const isDemo = lessonId === "demo";
  const lesson = state.lessons.find((l) => l.id === lessonId);
  const tutor = lesson ? tutorById(lesson.tutorId) : isDemo ? tutorById("kenji") : undefined;

  const start = slotDate(
    lesson?.dateISO ?? new Date().toISOString().slice(0, 10),
    lesson?.hour ?? new Date().getHours() + 1
  ).getTime();
  const remain = lesson ? start - now : 0;

  // The room auto-opens 15 minutes before departure — derived, not effected.
  const autoLive = Boolean(
    lesson && lesson.status === "upcoming" && remain <= 15 * 60000
  );
  const live = isDemo || phase === "live" || autoLive;

  const tool: WhiteboardTool = useMemo(
    () => ({ color: ink, width: nib, eraser }),
    [ink, nib, eraser]
  );

  if (!lesson && !isDemo) {
    return (
      <div className="page">
        <div className="container">
          <div className="page-head">
            <span className="kicker">Room not found</span>
            <h1 className="page-title">This classroom has no lesson</h1>
            <p className="page-sub">
              The door you knocked on leads to a corridor of unmatched keycards. The
              study record lists every real room.
            </p>
          </div>
          <button type="button" className="btn btn--solid" onClick={() => navigate("/dashboard")}>
            Back to the study record
          </button>
        </div>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="page">
        <div className="container">
          <EmptyState mark="Press stopped" title="The tutor for this room has retired">
            An administrative ghost. The catalogue still stands.
          </EmptyState>
          <button type="button" className="btn btn--solid" onClick={() => navigate("/browse")}>
            Back to the catalogue
          </button>
        </div>
      </div>
    );
  }

  // Session clock: anchored when the user started, or to the lesson's own
  // start time when the room auto-opened at T-15.
  const sessionAnchor = startedAt ?? Math.min(now, start);
  const sessionElapsed = live ? Math.max(0, (now - sessionAnchor) / 1000) : 0;
  const sessionRemain = Math.max(0, LESSON_MIN * 60 - sessionElapsed);
  const agendaNow = AGENDA.map((a) => ({
    ...a,
    state:
      sessionElapsed / 60 >= a.to
        ? ("done" as const)
        : sessionElapsed / 60 >= a.from
        ? ("current" as const)
        : ("todo" as const),
  }));

  const beginLesson = () => {
    setWarmup(boardRef.current?.snapshot() ?? null);
    setPhase("live");
    setStartedAt(Date.now());
  };

  const endLesson = () => {
    if (!lesson) return;
    dispatch({ type: "completeLesson", lessonId: lesson.id, notes: notes.trim() || undefined });
    dispatch({
      type: "addMessage",
      tutorId: lesson.tutorId,
      from: "tutor",
      text: `Thank you for today's lesson — good work. ${
        notes.trim()
          ? "I kept your whiteboard notes in the study record; read them before the shadowing."
          : "Homework: ten minutes of out-loud practice today, even to the kettle."
      } The review card is waiting on your dashboard.`,
    });
    dispatch({
      type: "toast",
      text: "Lesson completed — 50 minutes filed to the archive. The review card is on your dashboard.",
    });
    setEndAsk(false);
    setReviewOpen(true);
  };

  /* ---------------- WAITING ROOM ---------------- */
  if (lesson && lesson.status === "upcoming" && !live) {
    const windowMs = 3600000;
    const progress = Math.max(0, Math.min(1, 1 - remain / windowMs));
    return (
      <div className="page">
        <div className="container container--narrow">
          <div className="classgate">
            <div className="classgate-head">
              <span className="kicker">Classroom · waiting room</span>
              <h1 className="classgate-title">
                {tutor.name}
                <span className="classgate-lang"> · lesson in {tutorLanguageName(tutor.id)}</span>
              </h1>
            </div>
            <div className="classgate-clock">
              <span className="classgate-count num" role="timer" aria-label="Time until lesson starts">
                {hhmmss(remain)}
              </span>
              <span className="mono-label">
                until {longDate(lesson.dateISO)} · {hourLabel(lesson.hour)} — your time
              </span>
              <div className="meter classgate-meter">
                <span className="meter-fill" style={{ width: `${progress * 100}%` }} />
              </div>
              <span className="field-hint">
                The room unlocks 15 minutes before start — or start now; nobody here
                checks watches. This is a demo, and the tutor is patient by trade.
              </span>
              <button type="button" className="btn btn--accent" onClick={beginLesson}>
                <PlayCircle size={15} aria-hidden className="btn-ico" />
                Start the lesson now
              </button>
            </div>
            <div className="classgate-board">
              <Whiteboard tool={tool} ref={boardRef} className="wbwrap--gate" />
              <span className="mono-label">The board is already yours — warm up.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- ARCHIVED (completed / cancelled) ---------------- */
  if (lesson && (lesson.status === "completed" || lesson.status === "cancelled")) {
    return (
      <div className="page">
        <div className="container container--narrow">
          <div className="classgate">
            <div className="classgate-head">
              <span className="kicker">
                Classroom · {lesson.status === "completed" ? "archived lesson" : "cancelled lesson"}
              </span>
              <h1 className="classgate-title">
                {lesson.status === "completed" ? "This page is past tense" : "This lesson never boarded"}
              </h1>
            </div>
            {lesson.status === "completed" ? (
              <>
                <p className="classgate-p">
                  {longDate(lesson.dateISO)} · {hourLabel(lesson.hour)} with {tutor.name} —
                  50 minutes, filed and counted.{" "}
                  {lesson.reviewed
                    ? "You reviewed it; the stars are in the archive."
                    : "The review card is still open — reviews publish straight onto the tutor's profile."}
                </p>
                {lesson.notes && (
                  <blockquote className="classgate-notes">
                    <span className="mono-label">Your whiteboard notes</span>
                    <p>{lesson.notes}</p>
                  </blockquote>
                )}
                <div className="classgate-actions">
                  {!lesson.reviewed && (
                    <button type="button" className="btn btn--accent" onClick={() => setReviewOpen(true)}>
                      Leave the review
                    </button>
                  )}
                  <button type="button" className="btn" onClick={() => navigate(`/tutor/${tutor.id}`)}>
                    View {tutor.firstName}'s profile
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="classgate-p">
                  The {longDate(lesson.dateISO)} lesson with {tutor.name} was cancelled —
                  the slot went back to the timetable, no charge attached.
                </p>
                <div className="classgate-actions">
                  <button type="button" className="btn btn--solid" onClick={() => navigate("/dashboard")}>
                    Back to the study record
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <ReviewModal lesson={lesson} onClose={() => setReviewOpen(false)} />
      </div>
    );
  }

  /* ---------------- LIVE SESSION (or open practice room) ---------------- */
  return (
    <div className="page classroom-live">
      <div className="container container--wide">
        <div className="classlive-head">
          <div className="classlive-title">
            <span className="pill pill--live">{isDemo ? "practice room" : "lesson live"}</span>
            <h1 className="classlive-name">
              {tutor.name}
              <span className="classgate-lang"> · {tutorLanguageName(tutor.id)}</span>
            </h1>
            {!isDemo && lesson && (
              <span className="mono-label num">
                {longDate(lesson.dateISO)} · {hourLabel(lesson.hour)} · {lesson.durationMin} min · ${lesson.price}
              </span>
            )}
            {isDemo && (
              <span className="mono-label">Open practice — no ticket, no timer, just the board</span>
            )}
          </div>
          {!isDemo && (
            <div className="classlive-timer" role="timer" aria-label="Session time remaining">
              <span className="classlive-remain num">{hhmmss(sessionRemain * 1000)}</span>
              <div className="meter meter--ink classlive-meter">
                <span
                  className="meter-fill"
                  style={{ width: `${(1 - sessionRemain / (LESSON_MIN * 60)) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="classlive-grid">
          <div className="classlive-boardcol">
            <div className="wbtool" role="toolbar" aria-label="Whiteboard tools">
              <div className="wbtool-group" role="group" aria-label="Ink colour">
                {INKS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    className={cx("wbink", ink === c.value && !eraser && "wbink--active")}
                    style={{ background: c.value }}
                    onClick={() => {
                      setInk(c.value);
                      setEraser(false);
                    }}
                    aria-label={`${c.name} ink`}
                    aria-pressed={ink === c.value && !eraser}
                  />
                ))}
              </div>
              <div className="wbtool-group" role="group" aria-label="Nib width">
                {NIBS.map((n) => (
                  <button
                    key={n.name}
                    type="button"
                    className={cx("icon-btn icon-btn--sm", nib === n.value && "icon-btn--active")}
                    onClick={() => setNib(n.value)}
                    aria-label={`${n.name} nib`}
                    aria-pressed={nib === n.value}
                    title={`${n.name} nib`}
                  >
                    <Minus size={13} aria-hidden style={{ strokeWidth: n.value / 2 + 1 }} />
                  </button>
                ))}
              </div>
              <div className="wbtool-group" role="group" aria-label="Modifiers">
                <button
                  type="button"
                  className={cx("icon-btn icon-btn--sm", eraser && "icon-btn--active")}
                  onClick={() => setEraser((v) => !v)}
                  aria-label="Eraser"
                  aria-pressed={eraser}
                  title="Eraser — rubs back to paper"
                >
                  <Eraser size={13} aria-hidden />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--sm"
                  onClick={() => {
                    boardRef.current?.undo();
                    setStrokes(boardRef.current?.strokeCount() ?? 0);
                  }}
                  aria-label="Undo last stroke"
                  title="Undo the last stroke"
                >
                  <Undo2 size={13} aria-hidden />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--sm"
                  onClick={() => {
                    boardRef.current?.clear();
                    setStrokes(0);
                  }}
                  aria-label="Clear the board"
                  title="Clear the board"
                >
                  <Trash2 size={13} aria-hidden />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--sm"
                  onClick={() => boardRef.current?.download()}
                  aria-label="Download the page as PNG"
                  title="Download the page as PNG"
                >
                  <Download size={13} aria-hidden />
                </button>
              </div>
              <span className="mono-label wbtool-count num" aria-live="off">
                {strokes} strokes
              </span>
            </div>

            <Whiteboard
              tool={tool}
              ref={boardRef}
              initialStrokes={warmup ?? undefined}
              onStrokeEnd={(n) => setStrokes(n)}
              className="classlive-board"
            />
            <span className="field-hint classlive-hint">
              Draw with mouse, finger or stylus — the page is a shared notebook; undo is
              honest, the export is a PNG you can keep.
            </span>
          </div>

          <aside className="classlive-rail">
            {!isDemo && (
              <section className="railblock" aria-label="Agenda">
                <div className="railblock-head">
                  <SquarePen size={13} aria-hidden />
                  <span className="mono-label">Agenda</span>
                  <span className="mono-label num">{hhmmss(sessionRemain * 1000)} left</span>
                </div>
                <ol className="agenda">
                  {agendaNow.map((a) => (
                    <li key={a.label} className={cx("agenda-item", `agenda-item--${a.state}`)}>
                      <span className="agenda-check">
                        {a.state === "done" ? (
                          <CheckCircle2 size={15} aria-hidden />
                        ) : (
                          <span className="agenda-bullet" aria-hidden />
                        )}
                      </span>
                      <span className="agenda-copy">
                        <span className="agenda-label">{a.label}</span>
                        <span className="agenda-note">{a.note}</span>
                        <span className="mono-label num agenda-time">
                          {a.from}–{a.to} min
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <section className="railblock" aria-label="Lesson notes">
              <div className="railblock-head">
                <Brush size={13} aria-hidden />
                <span className="mono-label">Notes from the board</span>
              </div>
              <textarea
                className="textarea railnotes"
                value={notes}
                rows={6}
                placeholder={
                  isDemo
                    ? "Practice room notes stay in this tab only — bring a real lesson to file them."
                    : "Saved into the lesson record when you end the lesson…"
                }
                onChange={(e) => setNotes(e.target.value)}
                aria-label="Lesson notes"
              />
            </section>

            <section className="railblock railblock--actions">
              {endAsk ? (
                <div className="endconfirm" role="alertdialog" aria-label="Confirm ending the lesson">
                  <span className="endconfirm-title">End the lesson?</span>
                  <p>
                    {isDemo
                      ? "The practice room closes; the board stays until you leave the page."
                      : "50 minutes will be filed to the record, notes saved, and the review card opens."}
                  </p>
                  <div className="endconfirm-actions">
                    <button type="button" className="btn btn--sm btn--danger" onClick={isDemo ? () => navigate("/dashboard") : endLesson}>
                      <DoorOpen size={12} aria-hidden className="btn-ico" />
                      {isDemo ? "Leave the room" : "End & file it"}
                    </button>
                    <button type="button" className="btn btn--sm" onClick={() => setEndAsk(false)}>
                      Keep working
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="btn btn--solid btn--block" onClick={() => setEndAsk(true)}>
                  <DoorOpen size={13} aria-hidden className="btn-ico" />
                  {isDemo ? "Leave the practice room" : "End the lesson"}
                </button>
              )}
              {!isDemo && (
                <p className="railnote">
                  Ending marks the lesson completed and opens the review —
                  your notes travel with it.
                </p>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function tutorLanguageName(tutorId: string): string {
  const t = tutorById(tutorId);
  if (!t) return "language";
  const names: Record<string, string> = {
    es: "Spanish", fr: "French", de: "German", it: "Italian", ja: "Japanese",
    ko: "Korean", zh: "Mandarin", ar: "Arabic", pt: "Portuguese", ru: "Russian", en: "English",
  };
  return names[t.lang] ?? t.lang;
}
