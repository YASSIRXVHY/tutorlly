'use client';

/**
 * AppRoot — providers, the navbar/footer chrome, the hash-router switch,
 * the global Ctrl/Cmd+K listener (inside SearchOverlay), an error boundary,
 * and the toast/search/auth overlay systems. The classroom route renders
 * with its own focused chrome (no navbar/footer) — a room, not a page.
 */
import { Component, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { TriangleAlert, GraduationCap, RotateCcw } from "lucide-react";

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/ui.css";
import "./styles/layout.css";

import { AppProvider, useApp, STORAGE_KEY } from "./store/AppStore";
import { useRoute, matchPath, useScrollTopOnRoute, navigate, Link } from "./router/router";
import { Navbar } from "./components/nav/Navbar";
import { SearchOverlay } from "./components/nav/SearchOverlay";
import { AuthModal } from "./components/nav/AuthModal";
import { Toaster } from "./components/common/Toaster";
import { EmptyState } from "./components/common/atoms";
import { HomePage } from "./pages/HomePage";
import { BrowsePage } from "./pages/BrowsePage";
import { TutorProfilePage } from "./pages/TutorProfilePage";
import { MessagesPage } from "./pages/MessagesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ClassroomPage } from "./pages/ClassroomPage";
import { AdminPage } from "./pages/AdminPage";
import { CATEGORIES } from "./data/subjects";

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
  const route = useRoute();
  const mounted = useIsClient();
  useScrollTopOnRoute(route);

  if (!mounted) {
    // One quiet frame while the marketplace hydrates.
    return (
      <div className="app-shell">
        <div className="splash" role="status" aria-live="polite">
          <span className="splash-brand">
            <span className="logo-badge">
              <GraduationCap size={17} aria-hidden />
            </span>
            tutor<em className="splash-em">ly</em>
          </span>
          <span className="spinner" aria-hidden />
          <span className="mono-label">loading the marketplace…</span>
        </div>
      </div>
    );
  }

  const tutorMatch = matchPath("/tutor/:id", route.path);
  const classroomMatch = matchPath("/classroom/:lessonId", route.path);

  let page: ReactNode;
  let bareChrome = false;

  if (route.path === "/") page = <HomePage />;
  else if (route.path === "/browse") page = <BrowsePage />;
  else if (tutorMatch) page = <TutorProfilePage tutorId={tutorMatch.id} />;
  else if (route.path === "/messages") page = <MessagesPage />;
  else if (route.path === "/dashboard") page = <DashboardPage />;
  else if (route.path === "/admin") {
    // The admin console has its own chrome — a console, not a storefront.
    page = <AdminPage />;
    bareChrome = true;
  } else if (classroomMatch) {
    page = <ClassroomPage lessonId={classroomMatch.lessonId} />;
    bareChrome = true;
  } else page = <NotFound />;

  if (bareChrome) {
    // The classroom and the admin console are full-attention screens:
    return (
      <div className="app-shell">
        <a
          className="skip-link"
          href="#content"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("content")?.focus();
          }}
        >
          Skip to content
        </a>
        <main id="content" className="shell-main" tabIndex={-1}>
          <Boundary key={route.path}>{page}</Boundary>
        </main>
        <Toaster />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <a
        className="skip-link"
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
      <main id="content" className="shell-main" tabIndex={-1}>
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
    <div className="page-std">
      <div className="container container--narrow">
        <EmptyState icon={TriangleAlert} title="404 — this page never made it to the catalogue">
          The URL you typed exists nowhere in the building. The front page, however, is exactly where
          you left it.
        </EmptyState>
        <div className="empty-actions">
          <button type="button" className="btn btn--primary" onClick={() => navigate("/")}>
            Back to the front page
          </button>
          <button type="button" className="btn btn--outline" onClick={() => navigate("/browse")}>
            Browse the tutors
          </button>
        </div>
      </div>
    </div>
  );
}

function goHowItWorks() {
  navigate("/");
  setTimeout(() => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 120);
}

function Footer() {
  const { dispatch } = useApp();

  const resetDemo = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
    dispatch({
      type: "toast",
      kind: "info",
      text: "Demo data reset — the account, lessons, messages and reviews return to first-run state.",
    });
    setTimeout(() => window.location.reload(), 650);
  };

  return (
    <footer className="foot">
      <div className="container">
        <div className="foot-grid">
          <div>
            <Link to="/" className="foot-brand" aria-label="Tutorly home">
              <span className="logo-badge">
                <GraduationCap size={17} aria-hidden />
              </span>
              <span className="logo-word">
                tutor<em>ly</em>
              </span>
            </Link>
            <p className="foot-tag">
              1-on-1 online tutoring — languages, math, science, code and music. A portfolio build:
              seeded RNG data, local-only accounts, deterministic calendars.
            </p>
          </div>

          <nav aria-label="Subjects">
            <div className="foot-label">Subjects</div>
            <div className="foot-col">
              {CATEGORIES.map((c) => (
                <Link key={c.id} className="foot-link" to={`/browse?cat=${c.id}`}>
                  {c.label}
                </Link>
              ))}
            </div>
          </nav>

          <nav aria-label="Explore">
            <div className="foot-label">Explore</div>
            <div className="foot-col">
              <Link className="foot-link" to="/browse">Find tutors</Link>
              <Link className="foot-link" to="/messages">Messages</Link>
              <Link className="foot-link" to="/dashboard">My lessons</Link>
              <Link className="foot-link" to="/classroom/demo">Practice classroom</Link>
              <Link className="foot-link" to="/classroom/demo?role=tutor">Demo teacher room</Link>
              <Link className="foot-link" to="/admin">Admin console</Link>
              <button type="button" className="foot-link foot-link--btn" onClick={goHowItWorks}>
                How it works
              </button>
            </div>
          </nav>

          <nav aria-label="Support">
            <div className="foot-label">Support</div>
            <div className="foot-col">
              <Link className="foot-link" to="/browse">Book a trial lesson</Link>
              <Link className="foot-link" to="/dashboard">Reschedule or cancel</Link>
              <button type="button" className="foot-link foot-link--btn" onClick={resetDemo}>
                <RotateCcw size={12} aria-hidden /> Reset demo data
              </button>
            </div>
          </nav>
        </div>
        <div className="foot-legal">
          <span>© 2025 Tutorly — a portfolio demo, not a business</span>
          <span>Simulated marketplace · demo card 4242 4242 4242 4242 · accounts live in localStorage</span>
        </div>
      </div>
    </footer>
  );
}

/** If something snaps, we show a designed apology, not a white screen. */
class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (typeof console !== "undefined") console.error("[tutorly]", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="page-std">
          <div className="container container--narrow">
            <div className="card card--pad-lg" role="alert">
              <EmptyState icon={TriangleAlert} title="Something in this page snapped mid-lesson">
                A rendering error occurred — details are in the browser console. The rest of the
                marketplace is fine; reload and the page resets itself.
              </EmptyState>
              <div className="empty-actions">
                <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
                  Reload this page
                </button>
                <button
                  type="button"
                  className="btn btn--outline"
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
