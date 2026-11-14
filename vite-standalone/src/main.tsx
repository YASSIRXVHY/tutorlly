import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppRoot } from "./parla/AppRoot";

// The entire Parla application is framework-agnostic React:
// hand-built hash router, Context + useReducer, plain CSS imports,
// localStorage persistence. No Next.js, no Tailwind, no UI kit —
// this file is the only Vite-specific line of glue.
//
// Note: the "use client" directives inside src/parla are inert
// strings in plain React — they exist only for the Next.js host.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppRoot />
  </StrictMode>
);
