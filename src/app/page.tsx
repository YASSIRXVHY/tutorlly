'use client';

/**
 * Parla — The Language Press
 * The entire marketplace is a client-side single-page application.
 * A hand-built hash router handles navigation; all state lives in
 * React Context + useReducer with localStorage persistence.
 */
import { AppRoot } from "@/parla/AppRoot";

export default function Page() {
  return <AppRoot />;
}
