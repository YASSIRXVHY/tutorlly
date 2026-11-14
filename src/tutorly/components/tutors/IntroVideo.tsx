'use client';

/**
 * IntroVideo — the simulated introduction video. No media file, all
 * stagecraft: a warm dark-green stage, the tutor's portrait breathing
 * behind a play button, a waveform standing in for the voice, captions
 * in the taught language with English subtitles that auto-advance every
 * four seconds, plus timecode, progress strip and restart. The stage
 * itself is keyboard-toggleable (Enter / Space).
 */
import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import type { Tutor } from "../../data/tutors";
import { Avatar } from "../common/Avatar";
import { cx } from "../../utils/misc";

const CAPTION_MS = 4000;

function clock(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function IntroVideo({ tutor }: { tutor: Tutor }) {
  const total = tutor.video.length * CAPTION_MS;
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [ended, setEnded] = useState(false);
  const lastTick = useRef(0);

  // 200 ms ticker, wall-clock based — tab throttling can't stretch the video.
  useEffect(() => {
    if (!playing) return;
    lastTick.current = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = now - lastTick.current;
      lastTick.current = now;
      setElapsed((e) => Math.min(total, e + dt));
    }, 200);
    return () => window.clearInterval(id);
  }, [playing, total]);

  // Reaching the end stops playback and arms the replay state.
  useEffect(() => {
    if (playing && elapsed >= total) {
      setPlaying(false);
      setEnded(true);
    }
  }, [playing, elapsed, total]);

  const lineIndex = Math.min(tutor.video.length - 1, Math.floor(elapsed / CAPTION_MS));
  const caption = tutor.video[lineIndex];
  const progress = total > 0 ? Math.min(1, elapsed / total) : 0;
  const idle = !playing && elapsed === 0;

  const toggle = () => {
    if (ended) {
      setElapsed(0);
      setEnded(false);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  };

  const restart = () => {
    setElapsed(0);
    setEnded(false);
  };

  const onStageKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  // Clicks anywhere on the stage toggle — except on its real buttons.
  const onStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    toggle();
  };

  return (
    <div
      className={cx("iv-stage", playing && "iv-stage--playing")}
      role="button"
      tabIndex={0}
      aria-label="Introduction player"
      onKeyDown={onStageKey}
      onClick={onStageClick}
    >
      <div className="iv-top">
        <span className="pill pill--live">
          <span className="pill-dot" aria-hidden />
          intro
        </span>
        <span className="iv-time mono-label num" aria-hidden>
          {clock(elapsed)} / {clock(total)}
        </span>
      </div>

      <div className="iv-mid">
        <Avatar
          name={tutor.name}
          src={tutor.portrait}
          alt={`${tutor.name} in the introduction video`}
          size="xl"
          shape="square"
          ring
          className="iv-portrait"
        />
        <span className="wavebars iv-voice" aria-hidden>
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className="wavebar" />
          ))}
        </span>
      </div>

      <button
        type="button"
        className="iv-play"
        onClick={toggle}
        aria-label={
          ended ? "Replay introduction" : playing ? "Pause introduction" : "Play introduction"
        }
      >
        {playing ? <Pause size={19} aria-hidden /> : <Play size={19} aria-hidden />}
      </button>

      {elapsed > 0 ? (
        <button
          type="button"
          className="iv-restart"
          onClick={restart}
          aria-label="Restart introduction"
        >
          <RotateCcw size={15} aria-hidden />
        </button>
      ) : null}

      <div className={cx("iv-captions", idle && "iv-captions--idle")} aria-live="polite">
        {/* key forces a remount per caption so the fade-up re-runs */}
        <div className="iv-cap-swap" key={lineIndex}>
          <p className="iv-line">{caption.line}</p>
          {caption.en !== caption.line ? <p className="iv-en">{caption.en}</p> : null}
        </div>
      </div>

      <div
        className="meter iv-progress"
        role="progressbar"
        aria-label="Introduction progress"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span
          className="meter-fill meter-fill--accent"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
