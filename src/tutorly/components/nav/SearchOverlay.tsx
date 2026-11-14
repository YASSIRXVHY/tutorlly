'use client';

/**
 * SearchOverlay — the ⌘K command palette. Pages, all 25 subjects and all
 * tutors, keyboard-first (↑↓ + Enter + Esc), mouse-friendly too. Opens from
 * the navbar search button or Ctrl/Cmd+K anywhere.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  Search,
  Home,
  Compass,
  MessageCircle,
  CalendarCheck,
  Presentation,
  CornerDownLeft,
  ArrowRight,
  GraduationCap,
  ShieldCheck,
  LogIn,
} from "lucide-react";
import { useApp, isStudent } from "../../store/AppStore";
import { navigate } from "../../router/router";
import { TUTORS, tutorSubjects } from "../../data/tutors";
import { CATEGORIES, SUBJECTS } from "../../data/subjects";
import type { LucideIcon } from "lucide-react";
import { Avatar } from "../common/Avatar";
import { cx } from "../../utils/misc";

import "../../styles/search.css";

interface Entry {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon?: LucideIcon;
  avatar?: { name: string; src?: string };
  go: () => void;
}

export function SearchOverlay() {
  const { state, dispatch } = useApp();
  const open = state.ui.searchOpen;
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = () => dispatch({ type: "setSearch", open: false });
  const openAuth = useCallback(() => dispatch({ type: "openAuth" }), [dispatch]);
  // Student-only pages (Messages, My lessons) only surface for students;
  // guests are offered the login instead.
  const student = isStudent(state);

  // Global shortcut: Ctrl/Cmd + K toggles.
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

  useEffect(() => {
    if (open) {
      setQ("");
      setCursor(0);
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [open]);

  const entries = useMemo<Entry[]>(() => buildEntries(q, student, openAuth), [q, student, openAuth]);

  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(0, entries.length - 1)));
  }, [entries.length]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor, entries.length]);

  if (!open) return null;

  const run = (entry: Entry) => {
    entry.go();
    close();
  };

  const onKeyNav = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (c + 1) % Math.max(1, entries.length));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (c - 1 + Math.max(1, entries.length)) % Math.max(1, entries.length));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const entry = entries[cursor];
      if (entry) run(entry);
    }
  };

  return (
    <div className="palette-scrim" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search Tutorly"
        onKeyDown={onKeyNav}
      >
        <div className="palette-input-row">
          <Search size={17} aria-hidden />
          <input
            ref={inputRef}
            className="palette-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tutors, subjects, pages…"
            aria-label="Search query"
            spellCheck={false}
          />
          <button type="button" className="kbd palette-esc" onClick={close} aria-label="Close search">
            esc
          </button>
        </div>

        <div className="palette-list scroll-quiet" ref={listRef}>
          {entries.length === 0 ? (
            <div className="palette-empty">
              <strong>Nothing matches “{q}”</strong>
              <span>Try a language, “calculus”, “Python”, or a tutor's name.</span>
            </div>
          ) : (
            renderGroups(entries, cursor, setCursor, run)
          )}
        </div>

        <div className="palette-foot">
          <span><span className="kbd">↑</span><span className="kbd">↓</span> navigate</span>
          <span><span className="kbd">↵</span> open</span>
          <span><span className="kbd">esc</span> close</span>
          <span className="palette-foot-right">Search runs entirely in your browser</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- entries ---------------- */

function buildEntries(qRaw: string, student: boolean, openAuth: () => void): Entry[] {
  const q = qRaw.trim().toLowerCase();
  const pages: Entry[] = [
    { id: "p-home", group: "Pages", label: "Home", icon: Home, hint: "The marketplace front page", go: () => navigate("/") },
    { id: "p-browse", group: "Pages", label: "Find tutors", icon: Compass, hint: "Filter the tutors across every subject", go: () => navigate("/browse") },
    { id: "p-teach", group: "Pages", label: "Become a tutor", icon: GraduationCap, hint: "Apply to teach — four steps, one human review", go: () => navigate("/teach") },
    ...(student
      ? [
          { id: "p-messages", group: "Pages", label: "Messages", icon: MessageCircle, hint: "Conversations with your tutors", go: () => navigate("/messages") },
          { id: "p-dash", group: "Pages", label: "My lessons", icon: CalendarCheck, hint: "Countdowns, history and reviews", go: () => navigate("/dashboard") },
        ]
      : [
          { id: "p-login", group: "Pages", label: "Log in or sign up", icon: LogIn, hint: "Students get messages, lessons and booking", go: openAuth },
        ]),
    { id: "p-demo", group: "Pages", label: "Practice classroom", icon: Presentation, hint: "The live room with whiteboard — no booking needed", go: () => navigate("/classroom/demo") },
    { id: "p-demo-teacher", group: "Pages", label: "Practice classroom — teacher side", icon: Presentation, hint: "Join the practice room as the demo teacher device", go: () => navigate("/classroom/demo?role=tutor") },
    { id: "p-admin", group: "Pages", label: "Admin console", icon: ShieldCheck, hint: "Monitor teachers, students, lessons and live rooms", go: () => navigate("/admin") },
  ];

  const subjectEntries: Entry[] = SUBJECTS.map((s) => {
    const cat = CATEGORIES.find((c) => c.id === s.cat);
    return {
      id: `s-${s.id}`,
      group: "Subjects",
      label: s.label,
      hint: `${cat?.label ?? ""} · jump to filtered results`,
      icon: cat?.icon,
      go: () => navigate(`/browse?subject=${s.id}`),
    };
  });

  const tutorEntries: Entry[] = TUTORS.map((t) => ({
    id: `t-${t.id}`,
    group: "Tutors",
    label: t.name,
    hint: `${tutorSubjects(t).map((s) => s.label).join(", ")} · ${t.city}`,
    avatar: { name: t.name, src: t.portrait },
    go: () => navigate(`/tutor/${t.id}`),
  }));

  if (!q) {
    // Idle state: pages, the six categories' top subjects, and top-rated tutors.
    const featured = [...TUTORS]
      .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
      .slice(0, 4);
    return [
      ...pages,
      ...subjectEntries.filter((s) =>
        ["spanish", "english", "calculus", "python", "guitar", "ielts"].includes(s.id)
      ),
      ...tutorEntries.filter((t) => featured.some((f) => `t-${f.id}` === t.id)),
    ];
  }

  const scored = [...subjectEntries, ...tutorEntries].filter((e) => {
    const hay = `${e.label} ${e.hint ?? ""}`.toLowerCase();
    return q.split(/\s+/).every((word) => hay.includes(word));
  });

  // Pages always match weakly last; subjects and tutors first.
  const pageHits = pages.filter((p) => p.label.toLowerCase().includes(q));
  return [...scored, ...pageHits].slice(0, 14);
}

function renderGroups(
  entries: Entry[],
  cursor: number,
  setCursor: (n: number) => void,
  run: (e: Entry) => void
) {
  const groups: Array<{ label: string; items: Entry[] }> = [];
  for (const e of entries) {
    const last = groups[groups.length - 1];
    if (last && last.label === e.group) last.items.push(e);
    else groups.push({ label: e.group, items: [e] });
  }
  let flat = 0;
  return groups.map((g) => (
    <div className="palette-group" key={g.label}>
      <div className="palette-group-label mono-label">{g.label}</div>
      {g.items.map((e) => {
        const idx = flat++;
        const active = idx === cursor;
        const Icon = e.icon;
        return (
          <button
            type="button"
            key={e.id}
            className={cx("palette-item", active && "palette-item--active")}
            data-active={active}
            onMouseMove={() => setCursor(idx)}
            onClick={() => run(e)}
            aria-selected={active}
            role="option"
          >
            {e.avatar ? (
              <Avatar name={e.avatar.name} src={e.avatar.src} size="sm" shape="square" />
            ) : Icon ? (
              <span className="palette-item-ico">
                <Icon size={15} aria-hidden />
              </span>
            ) : null}
            <span className="palette-item-label">{e.label}</span>
            {e.hint ? <span className="palette-item-hint">{e.hint}</span> : null}
            {active ? (
              <span className="palette-item-go">
                <CornerDownLeft size={13} aria-hidden />
              </span>
            ) : (
              <span className="palette-item-go palette-item-go--idle">
                <ArrowRight size={13} aria-hidden />
              </span>
            )}
          </button>
        );
      })}
    </div>
  ));
}
