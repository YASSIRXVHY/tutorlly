'use client';

/**
 * RotatingWord — the headline word that swaps on a fixed beat.
 * The motion lives in CSS (styles/home.css, `home-word-in`), so the global
 * prefers-reduced-motion kill-switch in base.css leaves a calm, instant swap
 * on the same rhythm — the word still changes, it just doesn't slide.
 * aria-live="off" keeps screen readers from announcing every swap.
 */
import { useEffect, useState } from "react";

export function RotatingWord({
  words,
  intervalMs = 2800,
}: {
  words: string[];
  intervalMs?: number;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % words.length),
      intervalMs
    );
    return () => clearInterval(timer);
  }, [words.length, intervalMs]);

  const word = words[index] ?? "";

  return (
    <span className="home-rotword" aria-live="off" aria-hidden="false">
      <span key={word} className="home-rotword-word">
        {word}
      </span>
    </span>
  );
}
