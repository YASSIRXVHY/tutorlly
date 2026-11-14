'use client';

/** The masthead — brand lockup, section tabs, search, messages, account. */
import { useEffect, useRef, useState } from "react";
import { Menu, Search, MessageSquare, LayoutDashboard, BookOpen, Heart, LogOut, User } from "lucide-react";
import { useApp, unreadTotal } from "../../store/AppStore";
import { useRoute, Link } from "../../router/router";
import { initialsOf } from "../../data/tutors";

function issueNumber(now: Date): number {
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return week;
}

export function Navbar() {
  const { state, dispatch } = useApp();
  const route = useRoute();
  const unread = unreadTotal(state.conversations);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnchor = useRef<HTMLDivElement>(null);
  const isMac = typeof navigator !== "undefined" && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // The navbar is keyed to the route in AppRoot, so drawer and menu state
  // reset naturally whenever the section changes — no effects needed.

  // Outside click closes the user menu.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuAnchor.current && !menuAnchor.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  return (
    <header className="masthead">
      <div className="issue-strip">
        <span>Parla · The Language Press</span>
        <span className="issue-opt">Est. 2025</span>
        <span className="issue-opt">{today}</span>
        <span className="issue-opt">
          Vol. 1 · No. {issueNumber(new Date())}
        </span>
        <span>
          Fluency, hot off the press
          <span className="issue-dot"> ●</span>
        </span>
      </div>

      <div className="masthead-inner">
        <Link to="/" className="brand" aria-label="Parla — home">
          <span className="brand-word">
            Parla<span className="brand-dot">.</span>
          </span>
          <span className="brand-sub">The Language Press</span>
        </Link>

        <nav className="navlinks" aria-label="Primary">
          <Link to="/browse" className="navlink" activeClassName="navlink--active">
            Tutors
          </Link>
          <Link
            to="/messages"
            className="navlink"
            activeClassName="navlink--active"
            aria-label={`Messages${unread > 0 ? `, ${unread} unread` : ""}`}
          >
            Messages
            {unread > 0 && <span className="navlink-badge num">{unread}</span>}
          </Link>
          <Link to="/dashboard" className="navlink" activeClassName="navlink--active">
            Dashboard
          </Link>
          <Link to="/classroom/demo" className="navlink" activeClassName="navlink--active">
            Classroom
          </Link>
        </nav>

        <div className="masthead-actions">
          <button
            type="button"
            className="icon-btn search-trigger"
            onClick={() => dispatch({ type: "setSearch", open: true })}
            aria-label={`Search (${isMac ? "Cmd" : "Ctrl"} K)`}
            title={`Search Parla — ${isMac ? "Cmd" : "Ctrl"} K`}
          >
            <Search size={16} strokeWidth={2.2} aria-hidden />
            <span className="kbd" aria-hidden>
              {isMac ? "⌘" : "Ctrl"}K
            </span>
          </button>

          <Link to="/messages" className="icon-btn" aria-label={`Messages, ${unread} unread`}>
            <MessageSquare size={16} strokeWidth={2.2} aria-hidden />
            {unread > 0 && <span className="navlink-badge num messages-badge">{unread}</span>}
          </Link>

          {state.session ? (
            <div className="usermenu-anchor" ref={menuAnchor}>
              <button
                type="button"
                className="usermenu-trigger"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Account menu"
              >
                <span className="usermenu-avatar" aria-hidden>
                  {initialsOf(state.session.name)}
                </span>
                <span className="usermenu-name-label">{state.session.name.split(" ")[0]}</span>
              </button>
              {menuOpen && (
                <div className="usermenu" role="menu">
                  <div className="usermenu-head">
                    <div className="usermenu-name">{state.session.name}</div>
                    <div className="mono-label" style={{ marginTop: 3 }}>
                      {state.session.email}
                    </div>
                  </div>
                  <Link to="/dashboard" className="usermenu-item" role="menuitem">
                    <LayoutDashboard aria-hidden /> Dashboard
                  </Link>
                  <Link to="/dashboard" className="usermenu-item" role="menuitem">
                    <Heart aria-hidden /> Saved tutors
                  </Link>
                  <Link to="/messages" className="usermenu-item" role="menuitem">
                    <MessageSquare aria-hidden /> Messages
                  </Link>
                  <Link to="/browse" className="usermenu-item" role="menuitem">
                    <BookOpen aria-hidden /> Browse tutors
                  </Link>
                  <button
                    type="button"
                    className="usermenu-item usermenu-item--danger"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      dispatch({ type: "signOut" });
                      dispatch({ type: "toast", text: "Signed out. The account leaves with you — it lives in this browser only.", kind: "info" });
                    }}
                  >
                    <LogOut aria-hidden /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="btn btn--solid btn--sm"
              onClick={() => dispatch({ type: "openAuth", notice: null })}
            >
              <User size={14} aria-hidden className="btn-ico" />
              Sign in
            </button>
          )}

          <button
            type="button"
            className="icon-btn nav-burger"
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((v) => !v)}
          >
            <Menu size={18} strokeWidth={2.2} aria-hidden />
          </button>
        </div>
      </div>

      {drawerOpen && (
        <nav className="mobiledrawer" aria-label="Mobile">
          <Link to="/browse" className="mobiledrawer-link" activeClassName="mobiledrawer-link--active">
            Tutors <span className="mono-label">11 languages</span>
          </Link>
          <Link to="/messages" className="mobiledrawer-link" activeClassName="mobiledrawer-link--active">
            Messages
            {unread > 0 && <span className="navlink-badge num">{unread}</span>}
          </Link>
          <Link to="/dashboard" className="mobiledrawer-link" activeClassName="mobiledrawer-link--active">
            Dashboard
          </Link>
          <Link to="/classroom/demo" className="mobiledrawer-link" activeClassName="mobiledrawer-link--active">
            Classroom
          </Link>
          <button
            type="button"
            className="mobiledrawer-link"
            onClick={() => dispatch({ type: "setSearch", open: true })}
          >
            Search Parla <span className="kbd">K</span>
          </button>
        </nav>
      )}
    </header>
  );
}
