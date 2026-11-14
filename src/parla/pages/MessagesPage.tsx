'use client';

/**
 * Messages — the correspondence desk. Conversation list with unread
 * markers, thread view with day dividers, a typing indicator, and a
 * keyword-matching reply engine (price, trial, availability, exams,
 * beginners, cancellations, greetings…). Everything persists.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CalendarDays, CornerDownLeft } from "lucide-react";
import { useApp, unreadTotal } from "../store/AppStore";
import { tutorById } from "../data/tutors";
import { nextOpenings } from "../data/availability";
import { tutorReply } from "../data/replyEngine";
import { Avatar } from "../components/common/Avatar";
import { EmptyState, SkelLine } from "../components/common/atoms";
import { BookingFlow } from "../components/booking/BookingFlow";
import { navigate, useRoute } from "../router/router";
import { dayDividerLabel } from "../utils/time";
import { cx } from "../utils/misc";
import type { Conversation, Message } from "../store/types";

export function MessagesPage() {
  const route = useRoute();
  const { state, dispatch } = useApp();
  const [activeTutorId, setActiveTutorId] = useState<string | null>(() => {
    const q = route.query.t;
    return q && tutorById(q) ? q : null;
  });
  const [draft, setDraft] = useState("");
  const [typingTutorId, setTypingTutorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingTutorId, setBookingTutorId] = useState<string | null>(null);
  const [mobileThread, setMobileThread] = useState(() => Boolean(route.query.t));
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const threadRef = useRef<HTMLDivElement>(null);
  // Mirrors the session so late reply timers can check they're still welcome.
  const sessionRef = useRef(state.session);

  useEffect(() => {
    sessionRef.current = state.session;
  }, [state.session]);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  // Deep link (/messages?t=kenji) — derive during render, the documented
  // pattern for syncing state to changing inputs without effects.
  const deepTutor = route.query.t ?? null;
  if (deepTutor && deepTutor !== activeTutorId && tutorById(deepTutor)) {
    setActiveTutorId(deepTutor);
    setMobileThread(true);
    setDraft("");
  }

  // Mark read when the thread is open.
  useEffect(() => {
    if (activeTutorId && state.conversations.some((c) => c.tutorId === activeTutorId && !c.read)) {
      dispatch({ type: "markConversationRead", tutorId: activeTutorId });
    }
  }, [activeTutorId, state.conversations, dispatch]);

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  const sorted = useMemo(() => {
    return [...state.conversations].sort((a, b) => lastAt(b) - lastAt(a));
  }, [state.conversations]);

  const active = state.conversations.find((c) => c.tutorId === activeTutorId);
  const activeTutor = tutorById(activeTutorId);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active?.messages.length, typingTutorId]);

  const openThread = (tutorId: string) => {
    setActiveTutorId(tutorId);
    setMobileThread(true);
    setDraft("");
    navigate("/messages");
  };

  const send = () => {
    const text = draft.trim();
    if (!text || !activeTutorId || !activeTutor) return;
    dispatch({ type: "addMessage", tutorId: activeTutorId, from: "me", text });
    setDraft("");

    const tutorId = activeTutorId;
    const openings = nextOpenings(activeTutor, 1);
    const reply = tutorReply(activeTutor, text, openings);
    timers.current.push(
      setTimeout(() => setTypingTutorId(tutorId), 650)
    );
    const replyTimer = setTimeout(() => {
      setTypingTutorId(null);
      timers.current = timers.current.filter((t) => t !== replyTimer);
      // If the account signed out mid-reply, the letter goes nowhere.
      if (!sessionRef.current) return;
      dispatch({ type: "addMessage", tutorId, from: "tutor", text: reply.text });
    }, 650 + reply.delayMs);
    timers.current.push(replyTimer);
  };

  if (!state.session) {
    return (
      <div className="page">
        <div className="container">
          <div className="page-head">
            <span className="kicker">The correspondence desk</span>
            <h1 className="page-title">Messages</h1>
          </div>
          <EmptyState
            mark="Readers' desk closed"
            title="Sign in to read your letters"
            action={
              <button
                type="button"
                className="btn btn--solid"
                onClick={() =>
                  dispatch({
                    type: "openAuth",
                    notice: "Sign in — your messages and drafts live in this browser.",
                  })
                }
              >
                Sign in
              </button>
            }
          >
            Conversations with your tutors live behind the desk. Sign in (any
            well-formed email works — this is a demo, not an interrogation).
          </EmptyState>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-head">
          <span className="kicker">The correspondence desk</span>
          <h1 className="page-title">Messages</h1>
          <p className="page-sub">
            Write to a tutor before booking — ask about pace, exams, or the state of
            their calendar. Replies arrive with alarming punctuality for a demo.
          </p>
        </div>

        <div className={cx("msgboard", mobileThread && "msgboard--thread")}>
          <div className="msglist" aria-label="Conversations">
            <div className="msglist-head mono-label">
              <span>{sorted.length} conversation{sorted.length === 1 ? "" : "s"}</span>
              <span>{unreadTotal(state.conversations)} unread</span>
            </div>
            {loading ? (
              <div className="msglist-load">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                    <SkelLine w="55%" h={12} />
                    <SkelLine w="80%" h={9} />
                  </div>
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <div className="msglist-empty">
                <p>Nothing here yet — the desk is clean.</p>
                <button type="button" className="btn btn--sm btn--solid" onClick={() => navigate("/browse")}>
                  Write to a tutor
                </button>
              </div>
            ) : (
              sorted.map((c) => {
                const t = tutorById(c.tutorId);
                if (!t) return null;
                const last = c.messages[c.messages.length - 1];
                return (
                  <button
                    key={c.tutorId}
                    type="button"
                    className={cx(
                      "msgrow",
                      activeTutorId === c.tutorId && "msgrow--active",
                      !c.read && "msgrow--unread"
                    )}
                    onClick={() => openThread(c.tutorId)}
                    aria-current={activeTutorId === c.tutorId}
                  >
                    <Avatar tutor={t} size={44} corner={false} />
                    <span className="msgrow-copy">
                      <span className="msgrow-name">{t.name}</span>
                      <span className="msgrow-preview">
                        {last ? `${last.from === "me" ? "You: " : ""}${last.text.split("\n")[0].slice(0, 46)}` : "No messages yet"}
                      </span>
                    </span>
                    <span className="msgrow-side">
                      <span className="mono-label num">
                        {last ? dayDividerLabel(last.at) : ""}
                      </span>
                      {!c.read && (
                        <>
                          <span className="msgrow-badge" aria-hidden />
                          <span className="sr-only">unread</span>
                        </>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="msgthread" aria-label="Conversation">
            {activeTutor && active ? (
              <>
                <div className="msgthread-head">
                  {mobileThread && (
                    <button
                      type="button"
                      className="icon-btn icon-btn--sm msgthread-back"
                      onClick={() => setMobileThread(false)}
                      aria-label="Back to conversations"
                    >
                      <ArrowLeft size={15} aria-hidden />
                    </button>
                  )}
                  <Avatar tutor={activeTutor} size={40} corner={false} />
                  <div className="msgthread-title">
                    <a className="msgthread-name" href={`#/tutor/${activeTutor.id}`}>
                      {activeTutor.name}
                    </a>
                    <span className="mono-label">
                      <span className="online-dot" aria-hidden /> usually replies in ~{activeTutor.responseHrs}h
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() => setBookingTutorId(activeTutor.id)}
                  >
                    <CalendarDays size={13} aria-hidden className="btn-ico" />
                    Book
                  </button>
                </div>

                <div className="msgthread-scroll scrollbox" ref={threadRef}>
                  <ThreadBody
                    conversation={active}
                    typing={typingTutorId === active.tutorId}
                  />
                </div>

                <div className="msgcomposer">
                  <label className="sr-only" htmlFor="composer">
                    Write a message to {activeTutor.name}
                  </label>
                  <textarea
                    id="composer"
                    className="textarea"
                    rows={2}
                    value={draft}
                    placeholder={`Ask ${activeTutor.firstName} anything — prices, exams, availability…`}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn--solid msgcomposer-send"
                    onClick={send}
                    disabled={!draft.trim()}
                    aria-label="Send message"
                  >
                    <CornerDownLeft size={15} aria-hidden />
                    Send
                  </button>
                </div>
                <div className="msgcomposer-hint mono-label">
                  Enter sends · Shift+Enter starts a new line
                </div>
              </>
            ) : (
              <div className="msgthread-empty">
                {sorted.length > 0 ? (
                  <>
                    <span className="mono-label">Pick a letter from the left</span>
                    <p>
                      Every tutor on your desk is listed with their last line — choose one
                      to continue the correspondence.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="mono-label">Empty desk</span>
                    <p>
                      No tutors have heard from you yet. Find one in the catalogue and
                      open a conversation — the reply engine does the rest.
                    </p>
                    <button type="button" className="btn btn--solid btn--sm" onClick={() => navigate("/browse")}>
                      Browse the staff
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <BookingFlow tutorId={bookingTutorId} onClose={() => setBookingTutorId(null)} />
    </div>
  );
}

function lastAt(c: Conversation): number {
  return c.messages.length ? c.messages[c.messages.length - 1].at : 0;
}

function ThreadBody({
  conversation,
  typing,
}: {
  conversation: Conversation;
  typing: boolean;
}) {
  if (conversation.messages.length === 0) {
    return (
      <div className="threadblank">
        <span className="mono-label">No messages yet</span>
        <p>
          An empty page in the correspondence. Break the ice below — ask about
          pace, exams, or the state of the calendar. Replies land with alarming
          punctuality.
        </p>
      </div>
    );
  }
  return (
    <>
      {conversation.messages.map((m, i) => {
        const dayLabel = dayDividerLabel(m.at);
        const prev = conversation.messages[i - 1];
        const showDivider = !prev || dayDividerLabel(prev.at) !== dayLabel;
        return (
          <div key={m.id}>
            {showDivider && (
              <div className="msgday">
                <span className="msgday-rule" aria-hidden />
                <span className="msgday-label mono-label">{dayLabel}</span>
                <span className="msgday-rule" aria-hidden />
              </div>
            )}
            <div className={cx("msgbubble", m.from === "me" ? "msgbubble--me" : "msgbubble--tutor")}>
              <p>{m.text}</p>
              <span className="msgbubble-time mono-label num" aria-hidden>
                {new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        );
      })}
      {typing && (
        <div className="msgbubble msgbubble--tutor msgbubble--typing" aria-live="polite">
          <span className="typing-dots" aria-label="Tutor is typing">
            <i /><i /><i />
          </span>
          <span className="sr-only">{tutorById(conversation.tutorId)?.firstName} is typing…</span>
        </div>
      )}
    </>
  );
}
