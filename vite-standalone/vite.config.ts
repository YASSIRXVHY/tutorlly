import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tutorly as a pure Vite + React 18 app.
// The full ../src/tutorly tree and the portrait assets are already copied in
// (src/tutorly + public/), so: npm install && npm run dev works as-is.
export default defineConfig({
  base: "./",
  plugins: [react()],
  css: {
    postcss: {
      plugins: [],
    },
  },
});
