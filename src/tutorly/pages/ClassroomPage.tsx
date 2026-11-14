'use client';

/**
 * The Classroom — the centerpiece. Real peer-to-peer live sessions via
 * PeerJS: the student tab hosts, an invited "tutor device" tab joins, and
 * the two share audio, video, a synced whiteboard and chat — plus a full
 * solo demo mode (deterministic tutor replies) when no second device
 * arrives. A ticking 50-minute session clock with progress meter, an
 * agenda, notes that file into the lesson record, and an inline
 * end-of-lesson confirm that hands you to the review.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  ExternalLink,
  Link2,
  Undo2,
  Trash2,
  Download,
  Eraser,
  Minus,
  SquarePen,
  CheckCircle2,
  CircleSlash,
  PlayCircle,
  Clock,
} from "lucide-react";
import { useApp } from "../store/AppStore";
import { tutorById } from "../data/tutors";
import { subjectById } from "../data/subjects";
import { tutorReply } from "../data/replyEngine";
import { nextOpenings } from "../data/availability";
import { EmptyState } from "../components/common/atoms";
import { ReviewModal } from "../components/reviews/ReviewModal";
import { Whiteboard, type WhiteboardHandle, type StrokeSnapshot } from "../components/classroom/Whiteboard";
import { usePeerSession, type PeerMessage } from "../components/classroom/usePeerSession";
import { VideoTile } from "../components/classroom/VideoTile";
import { ChatPanel, type ChatLine } from "../components/classroom/ChatPanel";
import { navigate, useRoute } from "../router/router";
import { hhmmss, hourLabel, longDate, slotDate } from "../utils/time";
import { shortCode } from "../utils/rng";
import { cx, uid, clamp } from "../utils/misc";

import "../styles/classroom.css";

const INKS = [
  { name: "Ink", value: "#1c2b24" },
  { name: "Vermilion", value: "#c9391b" },
  { name: "Spruce", value: "#2e5440" },
  { name: "Amber", value: "#c9921e" },
];
const NIBS = [
  { name: "Fine", value: 3 },
  { name: "Medium", value: 6 },
  { name: "Broad", value: 12 },
];
const AGENDA = [
  { label: "Warm-up", from: 0, to: 10, note: "Loose ends from last time, spoken not read" },
  { label: "Target work", from: 10, to: 35, note: "The core of the day, drilled into muscle" },
  { label: "Free practice", from: 35, to: 50, note: "Whatever you want — notes taken for next time" },
];
const LESSON_MIN = 50;

export function ClassroomPage({ lessonId }: { lessonId: string }) {
  const { state, dispatch } = useApp();
  const route = useRoute();

  const isDemo = lessonId === "demo";
  const lesson = state.lessons.find((l) => l.id === lessonId);
  const tutor = lesson ? tutorById(lesson.tutorId) : isDemo ? tutorById("kenji") : undefined;
  const isTutorDevice = route.query.role === "tutor";
  // Students exit to their lessons; a guest in the practice room goes home —
  // the student desk isn't theirs yet.
  const leaveRoom = () => navigate(state.session ? "/dashboard" : "/");

  const [now, setNow] = useState(() => Date.now());
  const [phase, setPhase] = useState<"wait" | "live">("wait");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [ink, setInk] = useState(INKS[0].value);
  const [nib, setNib] = useState(NIBS[1].value);
  const [eraser, setEraser] = useState(false);
  const [notes, setNotes] = useState("");
  const [strokes, setStrokes] = useState(0);
  const [endAsk, setEndAsk] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [warmup, setWarmup] = useState<StrokeSnapshot[] | null>(null);

  const [lines, setLines] = useState<ChatLine[]>([]);
  const [typing, setTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const boardRef = useRef<WhiteboardHandle>(null);
  const applyingRemote = useRef(false);
  const liveToastFired = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const roomId = useMemo(() => shortCode(lessonId, "room"), [lessonId]);
  const subjectLabel = useMemo(() => {
    const sid = lesson?.subject;
    return sid ? (subjectById(sid)?.label ?? sid) : "Japanese";
  }, [lesson?.subject]);

  const appendLine = useCallback((l: Omit<ChatLine, "id" | "at">) => {
    setLines((prev) => [...prev.slice(-60), { ...l, id: uid("cl"), at: Date.now() }]);
  }, []);

  /* ---------------- peer message handling ---------------- */

  const onPeerMessage = useCallback((msg: PeerMessage) => {
    if (msg.t === "stroke" && msg.s) {
      applyingRemote.current = true;
      try {
        boardRef.current?.addRemoteStroke(msg.s);
        setStrokes(boardRef.current?.strokeCount() ?? 0);
      } finally {
        applyingRemote.current = false;
      }
      return;
    }
    if (msg.t === "clear") {
      applyingRemote.current = true;
      try {
        boardRef.current?.clear();
        setStrokes(0);
      } finally {
        applyingRemote.current = false;
      }
      return;
    }
    if (msg.t === "undo") {
      applyingRemote.current = true;
      try {
        boardRef.current?.popLast();
        setStrokes(boardRef.current?.strokeCount() ?? 0);
      } finally {
        applyingRemote.current = false;
      }
      return;
    }
    if (msg.t === "chat" && msg.text) {
      appendLine({ name: msg.name ?? "Tutor", text: msg.text, mine: false });
      return;
    }
    if (msg.t === "hello" && msg.name) {
      appendLine({ name: "system", text: `${msg.name === "tutor" ? "The tutor device" : "The student device"} joined the room — video, whiteboard and chat are live.`, mine: false, system: true });
    }
  }, [appendLine]);

  const start = slotDate(
    lesson?.dateISO ?? new Date().toISOString().slice(0, 10),
    lesson?.hour ?? new Date().getHours() + 1
  ).getTime();
  const remain = lesson ? start - now : 0;
  const autoLive = Boolean(lesson && lesson.status === "upcoming" && remain <= 15 * 60000);
  const live = isDemo || phase === "live" || autoLive;

  const peer = usePeerSession({
    roomId,
    role: isTutorDevice ? "guest" : "host",
    enabled: live,
    onMessage: onPeerMessage,
  });

  useEffect(() => {
    if (peer.status === "live" && !liveToastFired.current) {
      liveToastFired.current = true;
      dispatch({
        type: "toast",
        text: "Connected peer-to-peer — audio, video and the whiteboard are now shared between both windows.",
      });
    }
  }, [peer.status, dispatch]);

  /* ---------------- chat: live broadcast or demo replies ---------------- */

  const sendChat = useCallback(
    (text: string) => {
      if (!tutor) return;
      const myName = isTutorDevice
        ? `${tutor.firstName} (tutor device)`
        : state.session?.name ?? "Student";
      appendLine({ name: myName, text, mine: true });
      if (peer.status === "live") {
        peer.send({
          t: "chat",
          text,
          name: isTutorDevice ? tutor.firstName : (state.session?.name ?? "Student"),
        });
        return;
      }
      if (isTutorDevice) {
        // The tutor device is the human on the other side — no auto-replies here.
        return;
      }
      // Solo demo mode: the deterministic reply engine answers.
      const openings = nextOpenings(tutor, 3);
      const reply = tutorReply(tutor, text, openings);
      setTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        setTyping(false);
        appendLine({ name: tutor.firstName, text: reply.text, mine: false });
        setSpeaking(true);
        if (speakTimer.current) clearTimeout(speakTimer.current);
        speakTimer.current = setTimeout(() => setSpeaking(false), 2800);
      }, reply.delayMs);
    },
    [appendLine, dispatch, isTutorDevice, peer, state.session?.name, tutor]
  );

  /* ---------------- whiteboard sync ---------------- */

  const tool = useMemo(() => ({ color: ink, width: nib, eraser }), [ink, nib, eraser]);

  const onLocalStroke = useCallback(
    (s: StrokeSnapshot) => {
      if (!applyingRemote.current) peer.send({ t: "stroke", s });
    },
    [peer]
  );
  const onLocalClear = useCallback(() => {
    if (!applyingRemote.current) peer.send({ t: "clear" });
  }, [peer]);
  const onLocalUndo = useCallback(() => {
    if (!applyingRemote.current) peer.send({ t: "undo" });
  }, [peer]);

  /* ---------------- session lifecycle ---------------- */

  const beginLesson = () => {
    setWarmup(boardRef.current?.snapshot() ?? null);
    setPhase("live");
    setStartedAt(Date.now());
  };

  const endLesson = () => {
    peer.end();
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (speakTimer.current) clearTimeout(speakTimer.current);
    if (!lesson || !tutor) {
      navigate("/dashboard");
      return;
    }
    dispatch({ type: "completeLesson", lessonId: lesson.id, notes: notes.trim() || undefined });
    dispatch({
      type: "addMessage",
      tutorId: lesson.tutorId,
      from: "tutor",
      text: `Thank you for today's lesson — good work. ${
        notes.trim()
          ? "I kept your whiteboard notes in the lesson record; read them before next time."
          : "Homework: ten minutes of out-loud practice today, even to the kettle."
      } The review card is waiting on your dashboard.`,
    });
    dispatch({
      type: "toast",
      text: "Lesson completed — 50 minutes filed to your record. The review card is on your dashboard.",
    });
    setEndAsk(false);
    navigate("/dashboard");
  };

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    peer.myStream?.getAudioTracks().forEach((t) => (t.enabled = next));
  };
  const toggleCam = () => {
    const next = !camOn;
    setCamOn(next);
    peer.myStream?.getVideoTracks().forEach((t) => (t.enabled = next));
  };

  const inviteUrl = () =>
    `${window.location.origin}${window.location.pathname}#/classroom/${lessonId}?role=tutor`;

  const openTutorWindow = () => {
    window.open(inviteUrl(), "_blank", "noopener");
  };

  const copyInvite = async () => {
    const url = inviteUrl();
    try {
      await navigator.clipboard.writeText(url);
      dispatch({ type: "toast", text: "Invite link copied — open it in a second window to join as the tutor device." });
    } catch {
      dispatch({
        type: "toast",
        kind: "info",
        text: `Couldn't reach the clipboard — copy it by hand: ${url}`,
      });
    }
  };

  /* ---------------- session clock ---------------- */

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

  /* ---------------- renders ---------------- */

  if (!lesson && !isDemo) {
    return (
      <div className="page-std">
        <div className="container container--narrow">
          <EmptyState icon={CircleSlash} title="This classroom has no lesson">
            The door you knocked on doesn't match any booking. The study record lists every real room.
          </EmptyState>
          <div className="empty-actions">
            {state.session ? (
              <button type="button" className="btn btn--primary" onClick={() => navigate("/dashboard")}>
                Back to my lessons
              </button>
            ) : (
              <button type="button" className="btn btn--primary" onClick={() => navigate("/")}>
                Back to the front page
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="page-std">
        <div className="container container--narrow">
          <EmptyState icon={CircleSlash} title="The tutor for this room has retired">
            An administrative ghost. The catalogue still stands.
          </EmptyState>
          <div className="empty-actions">
            <button type="button" className="btn btn--primary" onClick={() => navigate("/browse")}>
              Back to the catalogue
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* -------- archived lessons (completed / cancelled) -------- */
  if (lesson && (lesson.status === "completed" || lesson.status === "cancelled")) {
    return (
      <div className="page-std">
        <div className="container container--narrow">
          <div className="cl-archive card card--pad-lg">
            <span className="mono-label">
              Classroom · {lesson.status === "completed" ? "archived lesson" : "cancelled lesson"}
            </span>
            <h2 className="cl-archive-title">
              {lesson.status === "completed" ? "This page is past tense" : "This lesson never started"}
            </h2>
            {lesson.status === "completed" ? (
              <>
                <p className="cl-archive-p">
                  {longDate(lesson.dateISO)} · {hourLabel(lesson.hour)} with {tutor.name} —
                  {lesson.durationMin} minutes, filed and counted.{" "}
                  {lesson.reviewed
                    ? "You reviewed it; the stars are in the archive."
                    : "The review card is still open — reviews publish straight onto the tutor's profile."}
                </p>
                {lesson.notes ? (
                  <blockquote className="cl-archive-notes">
                    <span className="mono-label">Your whiteboard notes</span>
                    <p>{lesson.notes}</p>
                  </blockquote>
                ) : null}
                <div className="cl-archive-actions">
                  {!lesson.reviewed ? (
                    <button type="button" className="btn btn--accent" onClick={() => setReviewOpen(true)}>
                      Leave the review
                    </button>
                  ) : null}
                  <button type="button" className="btn btn--outline" onClick={() => navigate(`/tutor/${tutor.id}`)}>
                    View {tutor.firstName}'s profile
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="cl-archive-p">
                  The {longDate(lesson.dateISO)} lesson with {tutor.name} was cancelled — the slot went
                  back to the calendar, no charge attached.
                </p>
                <div className="cl-archive-actions">
                  <button type="button" className="btn btn--primary" onClick={() => navigate("/dashboard")}>
                    Back to my lessons
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        {lesson.status === "completed" && reviewOpen ? (
          <ReviewModal lesson={lesson} onClose={() => setReviewOpen(false)} />
        ) : null}
      </div>
    );
  }

  /* -------- waiting room -------- */
  if (lesson && lesson.status === "upcoming" && !live) {
    const windowMs = 3600000;
    const progress = clamp(1 - remain / windowMs, 0, 1);
    return (
      <div className="page-std">
        <div className="container container--narrow">
          <div className="cl-gate card card--pad-lg">
            <span className="mono-label">Classroom · waiting room</span>
            <h2 className="cl-gate-title">
              {tutor.name}
              <span className="cl-gate-sub"> · {subjectLabel}</span>
            </h2>
            <div className="cl-gate-clock">
              <span className="cl-gate-count num" role="timer" aria-label="Time until lesson starts">
                {hhmmss(remain)}
              </span>
              <span className="mono-label">
                until {longDate(lesson.dateISO)} · {hourLabel(lesson.hour)} — your time
              </span>
              <div className="meter cl-gate-meter">
                <span className="meter-fill meter-fill--accent" style={{ width: `${progress * 100}%` }} />
              </div>
              <span className="field-hint">
                The room unlocks 15 minutes before start — or start now; nobody here checks watches.
                Live sessions are peer-to-peer: once inside, open the tutor window on a second device
                for real video, or stay solo and the tutor replies in chat.
              </span>
              <div className="cl-gate-actions">
                <button type="button" className="btn btn--accent btn--lg" onClick={beginLesson}>
                  <PlayCircle size={16} aria-hidden />
                  Start the lesson now
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => navigate("/classroom/demo")}>
                  Warm up in the practice room
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* -------- live session (or open practice room) -------- */
  const statusPill =
    peer.status === "live" ? (
      <span className="pill pill--connected"><span className="pill-dot" aria-hidden />live · p2p</span>
    ) : peer.status === "connecting" ? (
      <span className="pill pill--upcoming"><span className="spinner spinner--sm" aria-hidden style={{ width: 10, height: 10, borderWidth: 2 }} />connecting</span>
    ) : (
      <span className="pill pill--demo">demo mode</span>
    );

  const remoteTilePlaceholder =
    peer.status === "live"
      ? undefined
      : peer.status === "connecting"
      ? "connecting to the tutor device…"
      : isTutorDevice
      ? "waiting for the student device…"
      : "waiting for the tutor device — invite one, or chat solo";

  return (
    <div className="cl-root">
      <div className="container container--wide">
        <header className="cl-bar">
          <button type="button" className="btn btn--ghost btn--sm cl-back" onClick={leaveRoom}>
            <ChevronLeft size={15} aria-hidden />
            Leave
          </button>
          <div className="cl-bar-title">
            <span className="cl-bar-name">
              {isTutorDevice ? "Tutor device" : tutor.name} <span className="cl-bar-sub">· {subjectLabel}</span>
            </span>
            <span className="mono-label">
              {isDemo
                ? "open practice — no ticket, no clock, just the board"
                : `${longDate(lesson!.dateISO)} · ${hourLabel(lesson!.hour)} · ${lesson!.durationMin} min · $${lesson!.price}`}
            </span>
          </div>
          <div className="cl-bar-right">
            {statusPill}
            <span className="kbd" title="Room code — deterministic per booking">
              {roomId}
            </span>
            {!isTutorDevice ? (
              <button type="button" className="icon-btn icon-btn--sm" onClick={copyInvite} aria-label="Copy invite link" title="Copy invite link">
                <Link2 size={14} aria-hidden />
              </button>
            ) : null}
          </div>
        </header>

        <div className="cl-videos">
          <VideoTile
            stream={peer.remoteStream}
            name={tutor.name}
            label={isTutorDevice ? "Student" : tutor.firstName}
            avatarSrc={tutor.portrait}
            micOn
            speaking={speaking}
            placeholder={remoteTilePlaceholder}
            waiting={peer.status !== "live"}
            className={cx("cl-tile--remote", peer.status !== "live" && "cl-tile--invite")}
          >
            {!isTutorDevice && peer.status !== "live" ? (
              <button
                type="button"
                className="btn btn--accent btn--sm cl-invite"
                onClick={openTutorWindow}
                title="Opens a second window that joins this room as the tutor device"
              >
                <ExternalLink size={13} aria-hidden />
                Open tutor window
              </button>
            ) : null}
          </VideoTile>
          <VideoTile
            stream={peer.myStream}
            name={isTutorDevice ? tutor.name : (state.session?.name ?? "You")}
            label={isTutorDevice ? `${tutor.firstName} (you)` : "You"}
            avatarSrc={isTutorDevice ? tutor.portrait : undefined}
            isLocal
            micOn={micOn}
            camOn={camOn}
            placeholder={peer.cameraDenied ? "camera off — mic still live" : "camera starting…"}
            className="cl-tile--local"
          />
        </div>

        <div className="cl-controls" role="toolbar" aria-label="Session controls">
          <button
            type="button"
            className={cx("icon-btn", !micOn && "icon-btn--active")}
            onClick={toggleMic}
            aria-pressed={!micOn}
            aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
            title={micOn ? "Mute microphone" : "Unmute microphone"}
          >
            {micOn ? <Mic size={17} aria-hidden /> : <MicOff size={17} aria-hidden />}
          </button>
          <button
            type="button"
            className={cx("icon-btn", !camOn && "icon-btn--active")}
            onClick={toggleCam}
            aria-pressed={!camOn}
            aria-label={camOn ? "Turn camera off" : "Turn camera on"}
            title={camOn ? "Turn camera off" : "Turn camera on"}
          >
            {camOn ? <Video size={17} aria-hidden /> : <VideoOff size={17} aria-hidden />}
          </button>
          <span className="cl-controls-hint mono-label">
            {peer.status === "live"
              ? "peer-to-peer — no server in the middle"
              : "solo demo — the board is yours, chat still answers"}
          </span>
          {endAsk ? (
            <span className="cl-endask" role="alertdialog" aria-label="Confirm ending the lesson">
              <span className="cl-endask-q">End {isDemo ? "the session" : "& file 50 minutes"}?</span>
              <button type="button" className="btn btn--danger btn--sm" onClick={isDemo ? () => { peer.end(); leaveRoom(); } : endLesson}>
                <PhoneOff size={13} aria-hidden />
                {isDemo ? "Leave" : "End it"}
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEndAsk(false)}>
                Keep going
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="btn btn--danger btn--sm cl-endbtn"
              onClick={() => setEndAsk(true)}
              aria-label={isDemo ? "Leave the practice room" : "End the lesson"}
            >
              <PhoneOff size={13} aria-hidden />
              {isDemo ? "Leave the room" : "End lesson"}
            </button>
          )}
        </div>

        <div className="cl-main">
          <div className="cl-board-col">
            <div className="cl-tools" role="toolbar" aria-label="Whiteboard tools">
              <div className="cl-tools-group" role="group" aria-label="Ink colour">
                {INKS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    className={cx("cl-ink", ink === c.value && !eraser && "cl-ink--active")}
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
              <div className="cl-tools-group" role="group" aria-label="Nib width">
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
              <div className="cl-tools-group" role="group" aria-label="Modifiers">
                <button
                  type="button"
                  className={cx("icon-btn icon-btn--sm", eraser && "icon-btn--active")}
                  onClick={() => setEraser((v) => !v)}
                  aria-label="Eraser"
                  aria-pressed={eraser}
                  title="Eraser"
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
              <span className="mono-label num cl-tools-count">{strokes} strokes</span>
            </div>

            <Whiteboard
              tool={tool}
              ref={boardRef}
              initialStrokes={warmup ?? undefined}
              onStrokeEnd={(n) => setStrokes(n)}
              onLocalStroke={onLocalStroke}
              onLocalClear={onLocalClear}
              onLocalUndo={onLocalUndo}
              className="cl-board"
            />
            <span className="field-hint cl-board-hint">
              Draw with mouse, finger or stylus — strokes travel peer-to-peer to the other window and
              back; undo and clear are shared courtesies.
            </span>
          </div>

          <aside className="cl-rail">
            {!isDemo ? (
              <section className="cl-railblock" aria-label="Session clock">
                <div className="cl-railblock-head">
                  <Clock size={13} aria-hidden />
                  <span className="mono-label">Session clock</span>
                </div>
                <div className="cl-clock" role="timer" aria-label="Session time remaining">
                  <span className="cl-clock-remain num">{hhmmss(sessionRemain * 1000)}</span>
                  <div className="meter meter--brand cl-clock-meter">
                    <span
                      className="meter-fill"
                      style={{ width: `${(1 - sessionRemain / (LESSON_MIN * 60)) * 100}%` }}
                    />
                  </div>
                </div>
                <ol className="cl-agenda">
                  {agendaNow.map((a) => (
                    <li key={a.label} className={cx("cl-agenda-item", `cl-agenda-item--${a.state}`)}>
                      <span className="cl-agenda-check">
                        {a.state === "done" ? (
                          <CheckCircle2 size={15} aria-hidden />
                        ) : (
                          <span className="cl-agenda-bullet" aria-hidden />
                        )}
                      </span>
                      <span className="cl-agenda-copy">
                        <span className="cl-agenda-label">{a.label}</span>
                        <span className="cl-agenda-note">{a.note}</span>
                        <span className="mono-label num cl-agenda-time">
                          {a.from}–{a.to} min
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            <section className="cl-railblock cl-railblock--chat" aria-label="Class chat">
              <ChatPanel
                lines={lines}
                typing={typing}
                tutorFirstName={tutor.firstName}
                onSend={sendChat}
              />
            </section>

            {!isDemo ? (
              <section className="cl-railblock" aria-label="Lesson notes">
                <div className="cl-railblock-head">
                  <SquarePen size={13} aria-hidden />
                  <span className="mono-label">Notes from the board</span>
                </div>
                <textarea
                  className="textarea cl-notes"
                  value={notes}
                  rows={5}
                  placeholder="Saved into the lesson record when you end the lesson…"
                  onChange={(e) => setNotes(e.target.value)}
                  aria-label="Lesson notes"
                />
              </section>
            ) : null}

            {!isDemo ? (
              <p className="cl-railnote field-hint">
                Ending the lesson files the minutes, saves these notes, and opens the review on your
                dashboard.
              </p>
            ) : (
              <p className="cl-railnote field-hint">
                Practice room: the board is fully yours — invite a second window for a real call, or
                just sketch. Nothing here files a lesson.
              </p>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
