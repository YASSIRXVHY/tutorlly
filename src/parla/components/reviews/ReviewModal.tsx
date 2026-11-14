'use client';

/**
 * The post-lesson review modal — star picker, tag chips, optional text.
 * Publishing writes into the tutor's live review list (visible on their
 * profile immediately) and into the study record.
 */
import { useState } from "react";
import { Check, FileText } from "lucide-react";
import { Modal } from "../common/Modal";
import { StarPicker } from "../common/Stars";
import { useApp } from "../../store/AppStore";
import type { Lesson } from "../../store/types";
import { tutorById } from "../../data/tutors";
import { cx } from "../../utils/misc";

const TAG_POOL = [
  "Punctual",
  "Great explanations",
  "Patient",
  "Well structured",
  "Fun",
  "Challenging",
  "Practical tips",
  "Beautiful accent",
  "Homework gold",
  "Would rebook",
];

interface ReviewModalProps {
  lesson: Lesson | null;
  onClose: () => void;
}

export function ReviewModal({ lesson, onClose }: ReviewModalProps) {
  // Keyed per lesson — the form resets by remounting, not by effects.
  if (!lesson) return null;
  return <ReviewModalInner key={lesson.id} lesson={lesson} onClose={onClose} />;
}

function ReviewModalInner({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const { dispatch } = useApp();
  const [stars, setStars] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [filed, setFiled] = useState(false);

  const tutor = tutorById(lesson.tutorId);
  if (!tutor) return null;

  const publish = () => {
    dispatch({
      type: "giveReview",
      lessonId: lesson.id,
      tutorId: tutor.id,
      stars,
      tags,
      text: text.trim() || "No written note — the stars say it.",
    });
    dispatch({
      type: "toast",
      text: `Review filed with ${tutor.name} — it is now live on their profile, top of the page.`,
    });
    setFiled(true);
  };

  return (
    <Modal
      open
      onClose={onClose}
      kicker="After the lesson"
      title={`How was ${tutor.firstName}?`}
      footer={
        filed ? (
          <div className="reviewfoot">
            <span className="field-hint">Filed to the archive — thank you.</span>
            <button type="button" className="btn btn--solid" onClick={onClose}>
              Close
            </button>
          </div>
        ) : (
          <div className="reviewfoot">
            <span className="field-hint">
              Reviews are signed "You" — a verified student with receipts.
            </span>
            <button type="button" className="btn btn--solid" onClick={publish}>
              Publish review
            </button>
          </div>
        )
      }
    >
      {filed ? (
        <div className="review-filed" role="status">
          <span className="review-filed-stamp">Filed</span>
          <p>
            Your review is live on {tutor.name}'s profile — top of the stack, marked
            "verified student", exactly where a hiring manager would look.
          </p>
          <div className="review-filed-tags">
            {tags.map((t) => (
              <span key={t} className="chip chip--accent">
                {t}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="review-form">
          <div className="review-lessonline">
            <span className="mono-label">
              Lesson · {lesson.dateISO} · {String(lesson.hour).padStart(2, "0")}:00 · 50 min
            </span>
          </div>

          <div className="field">
            <span className="field-label" id="stars-label">
              Your rating
            </span>
            <StarPicker value={stars} onChange={setStars} />
          </div>

          <div className="field">
            <span className="field-label">What stood out?</span>
            <div className="review-tags" role="group" aria-label="Review tags">
              {TAG_POOL.map((t) => {
                const on = tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    className={cx("chip", "chip--selectable", on && "chip--on")}
                    aria-pressed={on}
                    onClick={() =>
                      setTags((prev) => (on ? prev.filter((x) => x !== t) : [...prev, t]))
                    }
                  >
                    {on && <Check size={11} aria-hidden />}
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="review-text">
              A line for the archive <span style={{ textTransform: "none" }}>(optional)</span>
            </label>
            <textarea
              id="review-text"
              className="textarea"
              value={text}
              rows={4}
              maxLength={280}
              placeholder={`e.g. "${tutor.firstName} fixed a habit three textbooks had failed to mention…"`}
              onChange={(e) => setText(e.target.value)}
            />
            <span className="field-hint num">{text.length}/280</span>
          </div>

          <p className="review-note">
            <FileText size={12} aria-hidden /> The review lands on the tutor's profile
            the moment you publish — check the Reviews tab.
          </p>
        </div>
      )}
    </Modal>
  );
}
