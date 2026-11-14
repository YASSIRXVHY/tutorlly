'use client';

/**
 * Tutorly — a multi-subject tutoring marketplace (languages, math, science,
 * programming, music, test prep). The entire marketplace is a client-side
 * single-page application: a hand-built hash router handles navigation, all
 * state lives in Context + useReducer with localStorage persistence, and
 * live lessons run peer-to-peer over WebRTC via PeerJS.
 */
import { AppRoot } from "@/tutorly/AppRoot";

export default function Page() {
  return <AppRoot />;
}
