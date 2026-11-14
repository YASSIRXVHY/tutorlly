import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppRoot } from "./tutorly/AppRoot";

// The entire Tutorly application is framework-agnostic React:
// hand-built hash router, Context + useReducer, plain CSS imports,
// localStorage persistence, PeerJS for the live classroom. No Next.js,
// no Tailwind, no UI kit — this file is the only Vite-specific line of glue.
//
// Note: the "use client" directives inside src/tutorly are inert strings
// in plain React — they exist only for the Next.js host.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppRoot />
  </StrictMode>
);
