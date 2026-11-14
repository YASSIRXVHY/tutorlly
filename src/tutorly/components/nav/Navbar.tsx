'use client';

/**
 * Navbar — sticky cream header: logo, primary links (with unread badge),
 * search entry (⌘K), auth area / user menu, mobile burger sheet.
 */
import { useEffect, useRef, useState } from "react";
import {
  GraduationCap,
  Compass,
  MessageCircle,
  CalendarCheck,
  Search,
  Menu,
  ChevronDown,
  Heart,
  LogOut,
  X,
} from "lucide-react";
import { Link, useRoute, navigate } from "../../router/router";
import { useApp, unreadTotal } from "../../store/AppStore";
import { Avatar } from "../common/Avatar";
import { cx } from "../../utils/misc";

export function Navbar() {
  const { state, dispatch } = useApp();
  const route = useRoute();
  const unread = unreadTotal(state.conversations);

  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Any navigation closes overlays.
  useEffect(() => {
    setMenuOpen(false);
    setSheetOpen(false);
  }, [route.path, route.query]);

  // Click-outside closes the user dropdown.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const openSearch = () => dispatch({ type: "setSearch", open: true });
  const openLogin = () => dispatch({ type: "openAuth" });

  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" className="logo" aria-label="Tutorly home">
            <span className="logo-badge">
              <GraduationCap size={17} aria-hidden />
            </span>
            <span className="logo-word">
              tutor<em>ly</em>
            </span>
          </Link>

          <nav className="nav-links" aria-label="Primary">
            <Link to="/browse" className="nav-link" activeClassName="nav-link--active">
              <Compass size={15} aria-hidden /> Find tutors
            </Link>
            <Link to="/messages" className="nav-link" activeClassName="nav-link--active">
              <MessageCircle size={15} aria-hidden /> Messages
              {unread > 0 ? <span className="badge">{unread}</span> : null}
            </Link>
            <Link to="/dashboard" className="nav-link" activeClassName="nav-link--active">
              <CalendarCheck size={15} aria-hidden /> My lessons
            </Link>
          </nav>

          <button type="button" className="nav-search" onClick={openSearch} aria-label="Search tutors and subjects">
            <Search size={15} className="nav-search-ico" aria-hidden />
            <span className="nav-search-label">Search tutors, subjects…</span>
            <span className="kbd nav-search-kbd" aria-hidden>⌘K</span>
          </button>

          <div className="nav-actions">
            {state.session ? (
              <div className="nav-user" ref={menuRef}>
                <button
                  type="button"
                  className="nav-user-btn"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <Avatar name={state.session.name} size="sm" />
                  <span className="nav-user-name">{state.session.name}</span>
                  <ChevronDown size={14} aria-hidden style={{ flex: "none", color: "var(--ink-3)" }} />
                </button>
                {menuOpen ? (
                  <div className="dropdown" role="menu">
                    <div className="dropdown-head">
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{state.session.name}</div>
                      <div className="mono-label" style={{ marginTop: 3 }}>{state.session.email}</div>
                    </div>
                    <div className="dropdown-sep" />
                    <button type="button" className="dropdown-item" role="menuitem" onClick={() => navigate("/dashboard")}>
                      <CalendarCheck size={15} aria-hidden /> My lessons
                    </button>
                    <button type="button" className="dropdown-item" role="menuitem" onClick={() => navigate("/messages")}>
                      <MessageCircle size={15} aria-hidden /> Messages
                      {unread > 0 ? <span className="badge" style={{ marginLeft: "auto" }}>{unread}</span> : null}
                    </button>
                    <button type="button" className="dropdown-item" role="menuitem" onClick={() => navigate("/dashboard")}>
                      <Heart size={15} aria-hidden /> Favourites
                    </button>
                    <div className="dropdown-sep" />
                    <button
                      type="button"
                      className="dropdown-item dropdown-item--danger"
                      role="menuitem"
                      onClick={() => {
                        dispatch({ type: "signOut" });
                        dispatch({ type: "toast", text: "Signed out — see you at the next lesson.", kind: "info" });
                        setMenuOpen(false);
                      }}
                    >
                      <LogOut size={15} aria-hidden /> Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <>
                <button type="button" className="btn btn--ghost" onClick={openLogin}>
                  Log in
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => dispatch({ type: "openAuth" })}
                >
                  Sign up
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            className="icon-btn nav-burger"
            onClick={() => setSheetOpen(true)}
            aria-label="Open menu"
            aria-expanded={sheetOpen}
          >
            <Menu size={20} aria-hidden />
          </button>
        </div>
      </header>

      {sheetOpen ? (
        <div className="nav-sheet-scrim" onClick={(e) => { if (e.target === e.currentTarget) setSheetOpen(false); }}>
          <div className="nav-sheet" role="dialog" aria-modal="true" aria-label="Site menu">
            <div className="nav-sheet-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Link to="/" className="logo" aria-label="Tutorly home">
                <span className="logo-badge">
                  <GraduationCap size={17} aria-hidden />
                </span>
                <span className="logo-word">
                  tutor<em>ly</em>
                </span>
              </Link>
              <button type="button" className="icon-btn" onClick={() => setSheetOpen(false)} aria-label="Close menu">
                <X size={18} aria-hidden />
              </button>
            </div>
            <button type="button" className="nav-sheet-link" onClick={() => { setSheetOpen(false); openSearch(); }}>
              <Search size={17} aria-hidden /> Search tutors, subjects…
            </button>
            <Link to="/browse" className={cx("nav-sheet-link", route.path === "/browse" && "nav-sheet-link--active")}>
              <Compass size={17} aria-hidden /> Find tutors
            </Link>
            <Link to="/messages" className={cx("nav-sheet-link", route.path === "/messages" && "nav-sheet-link--active")}>
              <MessageCircle size={17} aria-hidden /> Messages
              {unread > 0 ? <span className="badge" style={{ marginLeft: "auto" }}>{unread}</span> : null}
            </Link>
            <Link to="/dashboard" className={cx("nav-sheet-link", route.path === "/dashboard" && "nav-sheet-link--active")}>
              <CalendarCheck size={17} aria-hidden /> My lessons
            </Link>
            {state.session ? (
              <button
                type="button"
                className="nav-sheet-link"
                onClick={() => {
                  dispatch({ type: "signOut" });
                  setSheetOpen(false);
                }}
              >
                <LogOut size={17} aria-hidden /> Sign out ({state.session.name})
              </button>
            ) : (
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button type="button" className="btn btn--ghost" style={{ flex: 1 }} onClick={() => { setSheetOpen(false); openLogin(); }}>
                  Log in
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  style={{ flex: 1 }}
                  onClick={() => { setSheetOpen(false); dispatch({ type: "openAuth" }); }}
                >
                  Sign up
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
