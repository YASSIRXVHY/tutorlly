'use client';

/**
 * The simulated intro video — no media file, all stagecraft: the tutor's
 * portrait under a slow editorial pan, captions in the target language
 * with English subtitles that auto-advance on a timeline, play/pause, a
 * scrubbable progress bar, and a timecode. Pausing pauses the pan;
 * finishing offers a replay.
 */
import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Volume2 } from "lucide-react";
import type { Tutor } from "../../data/tutors";
import { Avatar } from "../common/Avatar";
import { prefersReducedMotion } from "../../utils/misc";
import { cx } from "../../utils/misc";

const SECONDS_PER_LINE = 5;

function fmt(t: number): string {
  const s = Math.floor(t);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function IntroVideo({ tutor }: { tutor: Tutor }) {
  const duration = tutor.video.length * SECONDS_PER_LINE;
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [ended, setEnded] = useState(false);
  const rafRef = useRef<number>(0);
  const lastRef = useRef<number>(0);
  const elapsedRef = useRef(0);

  const applyElapsed = (t: number) => {
    elapsedRef.current = t;
    setElapsed(t);
  };

  useEffect(() => {
    if (!playing) return;
    lastRef.current = performance.now();
    const step = (now: number) => {
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      const next = elapsedRef.current + dt;
      if (next >= duration) {
        applyElapsed(duration);
        setPlaying(false);
        setEnded(true);
        return;
      }
      applyElapsed(next);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, duration]);

  const lineIndex = Math.min(
    tutor.video.length - 1,
    Math.floor(elapsed / SECONDS_PER_LINE)
  );
  const caption = tutor.video[lineIndex];
  const progress = Math.min(1, elapsed / duration);

  const toggle = () => {
    if (ended) {
      applyElapsed(0);
      setEnded(false);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const t = ratio * duration;
    applyElapsed(t);
    setEnded(t >= duration);
    if (t >= duration) setPlaying(false);
  };

  return (
    <figure className="introvideo" aria-label={`Simulated intro video by ${tutor.name}`}>
      <div className={cx("introvideo-stage", playing && "introvideo-stage--playing")}>
        <div
          className={
            playing && !prefersReducedMotion()
              ? "introvideo-pan introvideo-pan--run"
              : "introvideo-pan"
          }
        >
          <Avatar tutor={tutor} fill corner={false} />
        </div>

        <button
          type="button"
          className="introvideo-playbtn"
          onClick={toggle}
          aria-label={ended ? "Replay intro" : playing ? "Pause intro" : "Play intro"}
        >
          {ended ? (
            <RotateCcw size={18} aria-hidden />
          ) : playing ? (
            <Pause size={18} aria-hidden />
          ) : (
            <Play size={18} aria-hidden />
          )}
        </button>

        <span className="introvideo-tag mono-label">
          <Volume2 size={11} aria-hidden /> intro · simulated
        </span>
      </div>

      <div className="introvideo-caption" aria-live="polite">
        <p className="introvideo-line" lang={tutor.lang === "zh-sichuan" ? "zh" : tutor.lang === "en" ? "en" : tutor.lang}>
          {caption.line}
        </p>
        <p className="introvideo-sub">{caption.en}</p>
      </div>

      <div
        className="introvideo-progress"
        onClick={seek}
        role="progressbar"
        aria-label="Video progress"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            const dir = e.key === "ArrowRight" ? 1 : -1;
            const t = Math.max(0, Math.min(duration, elapsed + dir * 2));
            applyElapsed(t);
            setEnded(t >= duration);
          }
        }}
      >
        <span className="introvideo-fill" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="introvideo-timecode mono-label num">
        <span>{fmt(elapsed)}</span>
        <span>{fmt(duration)}</span>
      </div>
    </figure>
  );
}
