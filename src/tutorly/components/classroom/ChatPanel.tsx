'use client';

/**
 * ChatPanel — the classroom's side chat. Presentational + composer:
 * the parent owns the line list and decides where sends go (P2P channel in
 * live mode, the deterministic reply engine in demo mode).
 */
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Send, MessagesSquare } from "lucide-react";
import { cx } from "../../utils/misc";

export interface ChatLine {
  id: string;
  name: string;
  text: string;
  mine: boolean;
  at: number;
  /** System notices (join events) — rendered centered, not as a bubble. */
  system?: boolean;
}

export function ChatPanel({
  lines,
  typing,
  tutorFirstName,
  disabledNote,
  onSend,
  className,
}: {
  lines: ChatLine[];
  typing: boolean;
  tutorFirstName: string;
  /** Set when sending is impossible (e.g. peer failed) — replaces composer. */
  disabledNote?: string;
  onSend: (text: string) => void;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length, typing]);

  const submit = () => {
    const text = value.trim();
    if (!text || disabledNote) return;
    onSend(text);
    setValue("");
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className={cx("cl-chat", className)} role="region" aria-label="Class chat">
      <div className="cl-chat-head">
        <MessagesSquare size={14} aria-hidden />
        <span className="mono-label">Class chat</span>
        <span className="cl-chat-count num">{lines.length}</span>
      </div>
      <div className="cl-chat-scroll scroll-quiet" ref={scrollRef}>
        {lines.length === 0 ? (
          <div className="cl-chat-empty">
            <span className="mono-label">quiet so far</span>
            <p>Ask anything — “can you slow down?”, “explain that again”, or just “hello”.</p>
          </div>
        ) : (
          lines.map((l) =>
            l.system ? (
              <div key={l.id} className="cl-chat-system">
                <span className="mono-label">{l.text}</span>
              </div>
            ) : (
              <div key={l.id} className={cx("cl-chat-line", l.mine && "cl-chat-line--mine")}>
                <span className="cl-chat-line-name">{l.mine ? "You" : l.name}</span>
                <p>{l.text}</p>
                <span className="cl-chat-line-time num">
                  {new Date(l.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            )
          )
        )}
        {typing ? (
          <div className="cl-chat-typing" aria-live="polite">
            <span className="cl-dot" />
            <span className="cl-dot" />
            <span className="cl-dot" />
            <span className="sr-only">{tutorFirstName} is typing…</span>
          </div>
        ) : null}
      </div>
      {disabledNote ? (
        <div className="cl-chat-note">{disabledNote}</div>
      ) : (
        <div className="cl-chat-composer">
          <textarea
            ref={inputRef}
            rows={2}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKey}
              placeholder={`Write to the room… (${tutorFirstName} sees it live)`}
            aria-label={`Message ${tutorFirstName}`}
          />
          <button
            type="button"
            className="btn btn--accent btn--sm cl-chat-send"
            onClick={submit}
            disabled={!value.trim()}
            aria-label="Send message"
          >
            <Send size={14} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
