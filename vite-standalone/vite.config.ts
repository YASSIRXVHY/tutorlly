import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Parla as a pure Vite + React 18 app.
// Copy ../src/parla and ../public next to this file, then: npm install && npm run dev
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
