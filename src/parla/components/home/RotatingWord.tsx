'use client';

/** The rotating headline word — set in Fraunces italic, inked in vermillion. */
import { useEffect, useState } from "react";

const WORDS = [
  "Italian",
  "Japanese",
  "Arabic",
  "Korean",
  "French",
  "Spanish",
  "German",
  "Mandarin",
  "Russian",
  "Portuguese",
];

const HOLD_MS = 2600;

export function RotatingWord() {
  const [index, setIndex] = useState(0);

  // The typesetter swaps the word on a fixed beat. Motion is done in CSS
  // (parla-word-in), so prefers-reduced-motion — the global kill-switch in
  // base.css — leaves a calm, instant swap with the same rhythm.
  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % WORDS.length), HOLD_MS);
    return () => clearInterval(t);
  }, []);

  const word = WORDS[index];

  return (
    <span className="rotword">
      <span key={word} className="rotword-word">
        {word}
      </span>
    </span>
  );
}
