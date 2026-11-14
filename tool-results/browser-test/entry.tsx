/* Browser smoke entry — a minimal shell that mounts BrowsePage so the
   interactive wiring (URL-driven filters) can be tested in a real browser.
   Scratch file; never part of the app. */
import { createRoot } from "react-dom/client";
import { AppProvider } from "/home/z/my-project/src/tutorly/store/AppStore";
import { BrowsePage } from "/home/z/my-project/src/tutorly/pages/BrowsePage";
import "/home/z/my-project/src/tutorly/styles/tokens.css";
import "/home/z/my-project/src/tutorly/styles/base.css";
import "/home/z/my-project/src/tutorly/styles/ui.css";

if (!window.location.hash) window.location.hash = "#/browse";

const el = document.getElementById("root")!;
createRoot(el).render(
  <AppProvider>
    <BrowsePage />
  </AppProvider>
);
