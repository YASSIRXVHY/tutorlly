'use client';

/**
 * Messages — Tutorly's correspondence desk. A conversation list with unread
 * dots beside a thread view: day dividers, deep-green student bubbles
 * against white tutor ones, a typing indicator while the deterministic
 * reply engine "thinks", and quick prompts that fill — never fire — the
 * composer. Mobile shows one pane at a time.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Lock, MessageSquare, MessagesSquare, Send } from "lucide-react";
import { useApp } from "../store/AppStore";
import { isOnline, tutorById, tutorSubjects, type Tutor } from "../data/tutors";
import { nextOpenings } from "../data/availability";
import { tutorReply } from "../data/replyEngine";
import { Avatar } from "../components/common/Avatar";
import { EmptyState } from "../components/common/atoms";
import { Link, useRoute } from "../router/router";
import { dayDividerLabel } from "../utils/time";
import { cx } from "../utils/misc";
import type { Conversation, Message } from "../store/types";
import "../styles/messages.css";

const QUICK_PROMPTS = [
  "Is there a trial lesson?", "What's your availability?",
  "I'm a complete beginner", "Can you help with homework?",
];

/** One tutor's outbound queue: texts awaiting a reply, FIFO, capped. */
interface ReplyQueue { waiting: string[]; busy: boolean; }

export function MessagesPage() {
  const route = useRoute();
  const { state, dispatch } = useApp();

  // null → the list pane; a tutor id → the thread pane (mobile shows one).
  const [activeId, setActiveId] = useState<string | null>(null);
  const [typingTutors, setTypingTutors] = useState<string[]>([]);

  const queues = useRef<Record<string, ReplyQueue>>({});
  // Replies in flight check they are still welcome before they land.
  const sessionRef = useRef(state.session);
  useEffect(() => { sessionRef.current = state.session; }, [state.session]);

  // Deep link ?tutor=kenji — honored once, so the mobile back button can
  // still close the very thread the link opened.
  const honoredRef = useRef<string | null>(null);
  useEffect(() => {
    const q = route.query.tutor;
    if (!q || !tutorById(q) || honoredRef.current === q) return;
    honoredRef.current = q;
    setActiveId(q);
  }, [route.query.tutor]);

  // Opening a thread registers it (deep links) and clears its unread dot.
  useEffect(() => {
    if (!activeId || !tutorById(activeId)) return;
    const conv = state.conversations.find((c) => c.tutorId === activeId);
    if (!conv) dispatch({ type: "ensureConversation", tutorId: activeId });
    else if (!conv.read) dispatch({ type: "markConversationRead", tutorId: activeId });
  }, [activeId, state.conversations, dispatch]);

  const sorted = useMemo(
    () => [...state.conversations].sort(
      (a, b) => lastAt(b) - lastAt(a) || (tutorById(a.tutorId)?.name ?? "").localeCompare(tutorById(b.tutorId)?.name ?? "")
    ),
    [state.conversations]
  );

  const activeTutor = activeId ? tutorById(activeId) : undefined;
  // A deep link to a tutor never yet messaged still deserves a thread.
  const activeConv =
    state.conversations.find((c) => c.tutorId === activeId) ??
    (activeTutor ? { tutorId: activeTutor.id, messages: [] as Message[], read: true } : undefined);

  const send = (text: string) => {
    const tutor = activeTutor;
    const trimmed = text.trim();
    if (!tutor || !trimmed) return;
    dispatch({ type: "addMessage", tutorId: tutor.id, from: "me", text: trimmed });
    enqueue(tutor.id, trimmed);
  };

  /** Queue the reply — each letter gets its own; three may wait at once. */
  const enqueue = (tutorId: string, text: string) => {
    const q = (queues.current[tutorId] ??= { waiting: [], busy: false });
    q.waiting.push(text);
    if (q.waiting.length > 3) {
      // Over capacity: the older lines travel together as one letter.
      const merged = q.waiting.slice(0, q.waiting.length - 2).join(" — ");
      q.waiting = [merged, ...q.waiting.slice(-2)];
    }
    pump(tutorId);
  };

  const pump = (tutorId: string) => {
    const q = queues.current[tutorId];
    if (!q || q.busy) return;
    const text = q.waiting.shift();
    if (text === undefined) return;
    q.busy = true;
    setTypingTutors((ids) => (ids.includes(tutorId) ? ids : [...ids, tutorId]));
    // Computed after the student's dispatch: the reply reads the letter it answers.
    const tutor = tutorById(tutorId);
    const reply = tutor ? tutorReply(tutor, text, nextOpenings(tutor, 3)) : null;
    setTimeout(() => {
      q.busy = false;
      // Signed out mid-thought: the rest of the queue goes nowhere.
      if (reply && sessionRef.current) dispatch({ type: "addMessage", tutorId, from: "tutor", text: reply.text });
      else q.waiting = [];
      if (q.waiting.length > 0) pump(tutorId);
      else setTypingTutors((ids) => ids.filter((id) => id !== tutorId));
    }, reply ? reply.delayMs : 1200);
  };

  if (!state.session) {
    return (
      <div className="msg-page">
        <div className="container">
          <EmptyState
            icon={Lock}
            title="Messages live behind the login"
            actions={<button type="button" className="btn btn--primary" onClick={() => dispatch({ type: "openAuth" })}>Log in / use the demo account</button>}
          >
            The demo account has three conversations waiting — Kenji about tonight's
            lesson, Natalia about a calculus worksheet, Mariana about voseo.
          </EmptyState>
        </div>
      </div>
    );
  }

  return (
    <div className="msg-page">
      <div className="container">
        <div className={cx("msg-layout", activeId ? "msg-layout--thread" : "msg-layout--list")}>
          <ConversationList conversations={sorted} activeId={activeId} onOpen={setActiveId} />
          {activeTutor && activeConv ? (
            <ThreadView key={activeTutor.id} tutor={activeTutor} conversation={activeConv}
              typing={typingTutors.includes(activeTutor.id)} onSend={send} onBack={() => setActiveId(null)} />
          ) : (
            <ThreadPicker count={sorted.length} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ConversationList({ conversations, activeId, onOpen }: {
  conversations: Conversation[]; activeId: string | null; onOpen: (tutorId: string) => void;
}) {
  const hours = useMemo(() => {
    const hrs = conversations.map((c) => tutorById(c.tutorId)?.responseHrs)
      .filter((h): h is number => typeof h === "number");
    if (hrs.length === 0) return "";
    const min = Math.min(...hrs);
    const max = Math.max(...hrs);
    return ` · replies in ~${min === max ? min : `${min}–${max}`}h`;
  }, [conversations]);

  return (
    <section className="card msg-list" aria-label="Conversations">
      <header className="msg-list-head">
        <h1 className="msg-title">Messages</h1>
        <p className="mono-label">{conversations.length} conversation{conversations.length === 1 ? "" : "s"}{hours}</p>
      </header>
      {conversations.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="No conversations yet"
          actions={<Link to="/browse" className="btn btn--primary">Find a tutor</Link>}
        >
          Every tutor answers within hours — say hello from any profile, or start
          with a question you'd normally be embarrassed to ask.
        </EmptyState>
      ) : (
        <ul className="msg-rows scroll-quiet">
          {conversations.map((c) => {
            const tutor = tutorById(c.tutorId);
            if (!tutor) return null;
            const last = c.messages[c.messages.length - 1];
            return (
              <li key={c.tutorId}>
                <button
                  type="button"
                  className={cx("msg-row", activeId === c.tutorId && "msg-row--active", !c.read && "msg-row--unread")}
                  aria-current={activeId === c.tutorId ? "true" : undefined}
                  onClick={() => onOpen(c.tutorId)}
                >
                  <Avatar name={tutor.name} src={tutor.portrait} status={isOnline(tutor.id) ? "online" : null} />
                  <span className="msg-row-main">
                    <span className="msg-row-name">{tutor.name}</span>
                    <span className="msg-row-preview">{last
                      ? `${last.from === "me" ? "You: " : ""}${firstLine(last.text)}`
                      : `Say hello to ${tutor.firstName}`}</span>
                  </span>
                  <span className="msg-row-side">
                    <span className="mono-label num msg-row-time">{last ? dayDividerLabel(last.at) : "new"}</span>
                    {!c.read ? (<>
                      <span className="msg-dot" aria-hidden />
                      <span className="sr-only">unread</span>
                    </>) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function ThreadPicker({ count }: { count: number }) {
  return (
    <section className="card msg-thread msg-thread--none" aria-label="No conversation selected">
      <EmptyState
        icon={MessageSquare}
        title="Pick a conversation"
        actions={<Link to="/browse" className="btn btn--outline btn--sm">Browse tutors</Link>}
      >
        {count > 0 ? "Choose someone from the left — or find a new tutor to say hello to."
          : "Nobody has heard from you yet — find a tutor and say hello."}
      </EmptyState>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function ThreadView({ tutor, conversation, typing, onSend, onBack }: {
  tutor: Tutor; conversation: Conversation; typing: boolean;
  onSend: (text: string) => void; onBack: () => void;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstPaint = useRef(true);

  // The composer grows with the letter: one row to three, then it scrolls.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 88)}px`;
  }, [draft]);

  // Bottom-anchored: instant on arrival, smooth as the thread grows.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (firstPaint.current) {
      firstPaint.current = false;
      el.scrollTop = el.scrollHeight;
      return;
    }
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [conversation.messages.length, typing]);

  const subjects = tutorSubjects(tutor).slice(0, 3);
  const empty = conversation.messages.length === 0;

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
    inputRef.current?.focus();
  };

  const quickPrompt = (prompt: string) => { setDraft(prompt); inputRef.current?.focus(); };

  return (
    <section className="card msg-thread" aria-label={`Conversation with ${tutor.name}`}>
      <header className="msg-thread-head">
        <button type="button" className="msg-back" onClick={onBack}>
          <ChevronLeft size={16} aria-hidden /> Messages
        </button>
        <Avatar name={tutor.name} src={tutor.portrait} size="sm" status={isOnline(tutor.id) ? "online" : null} />
        <span className="msg-thread-name">{tutor.name}</span>
        <span className="msg-thread-facts">
          {subjects.length > 0 ? (
            <span className="msg-thread-chips">
              {subjects.map((s) => <span key={s.id} className="chip msg-chip">{s.label}</span>)}
            </span>
          ) : null}
          <span className="mono-label">{tutor.city} · replies in ~{tutor.responseHrs}h</span>
          <Link to={`/tutor/${tutor.id}`} className="btn btn--outline btn--sm msg-profile">
            View profile
          </Link>
        </span>
      </header>

      <div className="msg-scroll scroll-quiet" ref={scrollRef} role="log" aria-live="polite">
        {empty ? (
          <div className="msg-blank">
            <Avatar name={tutor.name} src={tutor.portrait} size="lg" />
            <strong className="msg-blank-title">Say hello — {tutor.firstName} replies to every message</strong>
            <span className="mono-label">Try asking:</span>
            <div className="msg-quick"><QuickChips onPick={quickPrompt} /></div>
          </div>
        ) : (
          <>
            {conversation.messages.map((m, i) => (
              <MessageBubble key={m.id} message={m}
                showDay={i === 0 || dayDividerLabel(conversation.messages[i - 1].at) !== dayDividerLabel(m.at)} />
            ))}
            {typing ? (
              <div className="msg-bubble msg-bubble--tutor msg-bubble--typing">
                <span className="msg-typing" aria-hidden><i /><i /><i /></span>
                <span className="sr-only">{tutor.firstName} is typing…</span>
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="msg-composer">
        {!empty ? (
          <div className="msg-prompts">
            <span className="mono-label">Try asking:</span>
            <QuickChips onPick={quickPrompt} />
          </div>
        ) : null}
        <div className="msg-input-row">
          <label className="sr-only" htmlFor={`msg-input-${tutor.id}`}>Write a message to {tutor.name}</label>
          <textarea
            id={`msg-input-${tutor.id}`} ref={inputRef} className="msg-input" rows={1} value={draft}
            placeholder={`Write to ${tutor.firstName}…`}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button type="button" className="btn btn--accent msg-send" onClick={send}
            disabled={!draft.trim()} aria-label="Send message">
            <Send size={16} aria-hidden />
          </button>
        </div>
        <span className="field-hint">Enter sends · Shift+Enter starts a new line</span>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

/** The starter prompts — chips that fill the composer, never send. */
function QuickChips({ onPick }: { onPick: (prompt: string) => void }) {
  return QUICK_PROMPTS.map((p) => (
    <button key={p} type="button" className="chip msg-quick-chip" onClick={() => onPick(p)}>{p}</button>
  ));
}

function MessageBubble({ message, showDay }: { message: Message; showDay: boolean }) {
  const mine = message.from === "me";
  return (
    <>
      {showDay ? (
        <div className="msg-day"><span className="msg-day-label">{dayDividerLabel(message.at)}</span></div>
      ) : null}
      <div className={cx("msg-bubble", mine ? "msg-bubble--me" : "msg-bubble--tutor")}>
        <p className="msg-bubble-text">{message.text}</p>
        <span className="msg-bubble-time num">{clockLabel(message.at)}</span>
      </div>
    </>
  );
}

function clockLabel(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function lastAt(c: Conversation): number {
  return c.messages.length ? c.messages[c.messages.length - 1].at : 0;
}

function firstLine(text: string): string {
  return text.split("\n")[0];
}
