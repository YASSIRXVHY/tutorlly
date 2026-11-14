'use client';

/**
 * AppRoot — providers, the masthead/footer chrome, the hash-router switch,
 * the global Ctrl/Cmd+K listener, an error boundary, and the toast/search
 * overlay systems. The whole newspaper under one roof.
 */
import { Component, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/ui.css";
import "./styles/layout.css";
import "./styles/home.css";
import "./styles/browse.css";
import "./styles/tutor.css";
import "./styles/booking.css";
import "./styles/messages.css";
import "./styles/dashboard.css";
import "./styles/classroom.css";

import { AppProvider, useApp } from "./store/AppStore";
import { useRoute, matchPath, useScrollTopOnRoute } from "./router/router";
import { Navbar } from "./components/nav/Navbar";
import { SearchOverlay } from "./components/nav/SearchOverlay";
import { AuthModal } from "./components/nav/AuthModal";
import { Toaster } from "./components/common/Toaster";
import { HomePage } from "./pages/HomePage";
import { BrowsePage } from "./pages/BrowsePage";
import { TutorProfilePage } from "./pages/TutorProfilePage";
import { MessagesPage } from "./pages/MessagesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ClassroomPage } from "./pages/ClassroomPage";
import { LANGUAGES } from "./data/languages";
import { navigate } from "./router/router";

export function AppRoot() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

const emptySubscribe = () => () => {};

/** Hydration-safe client gate: true only after hydration settles. */
function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

function Shell() {
  const { state, dispatch } = useApp();
  const route = useRoute();
  const mounted = useIsClient();
  useScrollTopOnRoute(route);

  // Global search shortcut: Ctrl/Cmd + K from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        dispatch({ type: "setSearch", open: !state.ui.searchOpen });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch, state.ui.searchOpen]);

  if (!mounted) {
    // The paper is being typeset — one frame before the press starts.
    return (
      <div className="app-shell">
        <div className="presssplash" role="status" aria-live="polite">
          <span className="presssplash-brand">
            Parla<span className="brand-dot">.</span>
          </span>
          <span className="spin" aria-hidden />
          <span className="mono-label">Setting the type…</span>
        </div>
      </div>
    );
  }

  let page: ReactNode;
  const tutorMatch = matchPath("/tutor/:id", route.path);
  const classroomMatch = matchPath("/classroom/:lessonId", route.path);

  if (route.path === "/") page = <HomePage />;
  else if (route.path === "/browse") page = <BrowsePage />;
  else if (tutorMatch) page = <TutorProfilePage tutorId={tutorMatch.id} />;
  else if (route.path === "/messages") page = <MessagesPage />;
  else if (route.path === "/dashboard") page = <DashboardPage />;
  else if (classroomMatch) page = <ClassroomPage lessonId={classroomMatch.lessonId} />;
  else page = <NotFound />;

  return (
    <div className="app-shell">
      <a
        className="skiplink"
        href="#content"
        onClick={(e) => {
          // In-page anchor — must not touch the hash router's URL.
          e.preventDefault();
          document.getElementById("content")?.focus();
        }}
      >
        Skip to content
      </a>
      <Navbar key={route.path} />
      <main id="content" className="app-main" tabIndex={-1}>
        <Boundary key={route.path}>{page}</Boundary>
      </main>
      <Footer />
      <AuthModal />
      <SearchOverlay />
      <Toaster />
    </div>
  );
}

/* ---------------------------------------------------------------- */

function NotFound() {
  return (
    <div className="page">
      <div className="container">
        <div className="page-head">
          <span className="kicker">Missing edition</span>
          <h1 className="page-title">404 — this page went to print without ink</h1>
          <p className="page-sub">
            The URL you typed exists nowhere in the building. The front page, however,
            is exactly where you left it.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn btn--solid" onClick={() => navigate("/")}>
            Back to the front page
          </button>
          <button type="button" className="btn" onClick={() => navigate("/browse")}>
            Browse the tutors
          </button>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="colophon">
      <div className="colophon-inner">
        <div className="colophon-grid">
          <div>
            <div className="colophon-brand">
              Parla<span className="brand-dot">.</span>
            </div>
            <p className="colophon-tag">
              The language press. Fluency, hot off the press — one tutor, one whiteboard,
              one living language at a time.
            </p>
          </div>
          <nav aria-label="Sections">
            <div className="colophon-label">Sections</div>
            <a className="colophon-link" href="#/">
              Front page
            </a>
            <a className="colophon-link" href="#/browse">
              The tutors
            </a>
            <a className="colophon-link" href="#/messages">
              Messages
            </a>
            <a className="colophon-link" href="#/dashboard">
              Study record
            </a>
            <a className="colophon-link" href="#/classroom/demo">
              Practice room
            </a>
          </nav>
          <nav aria-label="Languages">
            <div className="colophon-label">Languages</div>
            {LANGUAGES.slice(0, 8).map((l) => (
              <a key={l.code} className="colophon-link" href={`#/browse?lang=${l.code}`}>
                {l.name}
              </a>
            ))}
          </nav>
          <div>
            <div className="colophon-label">Colophon</div>
            <p className="colophon-note">
              Set in Fraunces (display, by Phakedokas &amp; Uppercut) and IBM Plex Mono
              (the timetable voice). Printed on recycled pixels in your browser — no
              servers were consulted. Availability, reviews and barcodes are seeded
              with mulberry32: identical on every machine, every run.
            </p>
          </div>
        </div>
        <div className="colophon-legal">
          <span>© 2025 Parla Press — a portfolio build, not a business</span>
          <span>Demo card 4242 4242 4242 4242 · accounts live in localStorage only</span>
        </div>
      </div>
    </footer>
  );
}

/** If the press jams, we show a designed apology, not a white screen. */
class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (typeof console !== "undefined") console.error("[parla]", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="page">
          <div className="container container--narrow">
            <div className="pressjam" role="alert">
              <TriangleAlert size={20} aria-hidden />
              <span className="kicker">The press jammed</span>
              <h1 className="display">Something in this page snapped a roller</h1>
              <p>
                A rendering error occurred — details are in the browser console. The
                rest of the newspaper is fine; reload the page and the edition
                reprints itself.
              </p>
              <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn--solid"
                  onClick={() => window.location.reload()}
                >
                  Reprint this page
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    this.setState({ error: null });
                    navigate("/");
                  }}
                >
                  Back to the front page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
