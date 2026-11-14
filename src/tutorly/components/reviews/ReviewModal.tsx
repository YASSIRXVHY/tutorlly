'use client';

/**
 * The post-lesson review modal. Mount = open; the parent unmounts to close.
 * Publishing is real: giveReview writes into state.userReviews, which the
 * tutor's profile page renders — the review is public the moment this closes.
 */
import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import { Modal, ModalHead } from "../common/Modal";
import { Spinner } from "../common/atoms";
import { useApp } from "../../store/AppStore";
import { tutorById } from "../../data/tutors";
import { subjectById } from "../../data/subjects";
import { cx } from "../../utils/misc";
import type { Lesson } from "../../store/types";

import "../../styles/dashboard.css";

const TAGS = [
  "Punctual",
  "Great energy",
  "Structured",
  "Patient",
  "Challenging",
  "Fun",
  "Practical",
  "Would rebook",
];

export function ReviewModal({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const { dispatch } = useApp();
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef<{ stars: number; tags: string[]; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tutor = tutorById(lesson.tutorId);

  // Idempotent via `pending` — safe against double-clicks, the timer, and unmount.
  const fireOnce = () => {
    const p = pending.current;
    if (!p || !tutor) return;
    pending.current = null;
    dispatch({ type: "giveReview", lessonId: lesson.id, tutorId: tutor.id, ...p });
    dispatch({
      type: "toast",
      text: `Review published — it's live on ${tutor.firstName}'s profile now.`,
    });
    onClose();
  };

  const publish = () => {
    if (pending.current || stars < 1) return;
    pending.current = {
      stars,
      tags,
      text: text.trim() || "No written note — stars and tags only.",
    };
    setSubmitting(true);
    timer.current = setTimeout(fireOnce, 500);
  };

  // Unmounting mid-submit (Esc, scrim) still publishes — a click on Publish is a promise.
  // The captured first-render closure is safe: refs are live, and the payload
  // is frozen into `pending` at click time.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      fireOnce();
    },
     
    []
  );

  if (!tutor) return null;
  const subject = subjectById(lesson.subject)?.label ?? lesson.subject;
  const shown = hover ?? stars;

  const toggleTag = (tag: string) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  return (
    <Modal open variant="sm" label="Leave a review" onClose={onClose}>
      <ModalHead
        kicker="POST-LESSON"
        title={`How was ${subject} with ${tutor.firstName}?`}
        onClose={onClose}
      />
      <form
        className="modal-body"
        onSubmit={(e) => {
          e.preventDefault();
          publish();
        }}
      >
        <div className="field">
          <span className="field-label">Your rating</span>
          <div className="rv-stars" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                className={cx("rv-star", i <= shown && "rv-star--on")}
                role="radio"
                aria-checked={stars === i}
                aria-label={`${i} star${i === 1 ? "" : "s"}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => setStars(i)}
              >
                <Star size={28} fill={i <= shown ? "currentColor" : "none"} aria-hidden />
              </button>
            ))}
          </div>
          <span className="field-hint">Required — tap a star; it publishes with the review.</span>
        </div>

        <div className="field">
          <span className="field-label">What stood out?</span>
          <div className="rv-tags" role="group" aria-label="Review tags">
            {TAGS.map((tag) => {
              const on = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={cx("chip", "rv-tag", on && "chip--active")}
                  aria-pressed={on}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor={`rv-text-${lesson.id}`}>
            Anything else? <span className="rv-opt">(optional — this appears on their public profile)</span>
          </label>
          <textarea
            id={`rv-text-${lesson.id}`}
            className="textarea"
            rows={4}
            maxLength={420}
            value={text}
            placeholder="The specific stuff: what clicked, what didn't, who they'd suit."
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn--accent btn--block" disabled={stars < 1 || submitting}>
          {submitting ? <Spinner light label="Publishing review" /> : null}
          {submitting ? "Publishing…" : "Publish review"}
        </button>

        <p className="mono-label rv-foot">
          Published to their profile — the review corpus there is seeded; yours lands on top, marked You.
        </p>
      </form>
    </Modal>
  );
}
