'use client';

/**
 * Global search — Ctrl/Cmd+K anywhere, arrow keys to travel,
 * Enter to open. Searches tutors, languages and pages.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Home, BookOpen, MessageSquare, LayoutDashboard, GraduationCap, Languages as LanguagesIcon } from "lucide-react";
import { useApp } from "../../store/AppStore";
import { navigate } from "../../router/router";
import { TUTORS, tutorLanguage } from "../../data/tutors";
import { LANGUAGES } from "../../data/languages";
import { Avatar } from "../common/Avatar";
interface Row {
  key: string;
  group: "Tutors" | "Languages" | "Pages";
  title: string;
  sub: string;
  icon: React.ReactNode;
  run: () => void;
}

export function SearchOverlay() {
  const { state, dispatch } = useApp();
  // Mount-per-open: a fresh overlay starts with an empty query.
  if (!state.ui.searchOpen) return null;
  return <SearchOverlayInner onClose={() => dispatch({ type: "setSearch", open: false })} />;
}

function SearchOverlayInner({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    const out: Row[] = [];

    const tutorMatches = TUTORS.filter((t) => {
      if (!q) return false;
      const lang = tutorLanguage(t);
      return (
        t.name.toLowerCase().includes(q) ||
        lang.name.toLowerCase().includes(q) ||
        lang.nativeName.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        t.tagline.toLowerCase().includes(q)
      );
    }).slice(0, 5);

    for (const t of tutorMatches) {
      out.push({
        key: `t-${t.id}`,
        group: "Tutors",
        title: t.name,
        sub: `${tutorLanguage(t).name} · ${t.city} · from $${t.price}/lesson`,
        icon: <Avatar tutor={t} size={30} corner={false} />,
        run: () => navigate(`/tutor/${t.id}`),
      });
    }

    const langMatches = LANGUAGES.filter((l) => {
      if (!q) return false;
      return (
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code === q
      );
    }).slice(0, 4);
    for (const l of langMatches) {
      out.push({
        key: `l-${l.code}`,
        group: "Languages",
        title: l.name,
        sub: `Browse ${l.name} tutors · ${l.nativeName}`,
        icon: <LanguagesIcon size={16} aria-hidden className="search-row-ico" />,
        run: () => navigate(`/browse?lang=${l.code}`),
      });
    }

    const pages: Array<[string, string, string, () => void]> = [
      ["The front page", "Home", "/", () => navigate("/")],
      ["All twelve tutors", "Browse", "/browse", () => navigate("/browse")],
      ["Your conversations", "Messages", "/messages", () => navigate("/messages")],
      ["Lessons & study record", "Dashboard", "/dashboard", () => navigate("/dashboard")],
      ["Open practice room", "Classroom", "/classroom/demo", () => navigate("/classroom/demo")],
    ];
    const pageMatches = pages.filter((p) => {
      if (!q) return true;
      return p[0].toLowerCase().includes(q) || p[1].toLowerCase().includes(q);
    });
    const pageIcons = [
      <Home key="h" size={16} aria-hidden className="search-row-ico" />,
      <BookOpen key="b" size={16} aria-hidden className="search-row-ico" />,
      <MessageSquare key="m" size={16} aria-hidden className="search-row-ico" />,
      <LayoutDashboard key="d" size={16} aria-hidden className="search-row-ico" />,
      <GraduationCap key="g" size={16} aria-hidden className="search-row-ico" />,
    ];
    pageMatches.forEach((p, i) => {
      out.push({
        key: `p-${p[1]}`,
        group: "Pages",
        title: p[1],
        sub: p[0],
        icon: pageIcons[pages.indexOf(p)] ?? pageIcons[i % pageIcons.length],
        run: p[3],
      });
    });

    return out;
  }, [query]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, []);

  let lastGroup: string | null = null;
  const flatIndex = (row: Row) => rows.indexOf(row);

  const close = onClose;

  const choose = (row?: Row) => {
    const target = row ?? rows[active];
    if (!target) return;
    target.run();
    close();
  };

  return (
    <div className="search-overlay" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="search-panel" role="dialog" aria-modal="true" aria-label="Search Parla">
        <div className="search-bar">
          <Search size={18} aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
                e.preventDefault();
                setActive((a) => (rows.length ? (a + 1) % rows.length : 0));
              } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
                e.preventDefault();
                setActive((a) => (rows.length ? (a - 1 + rows.length) % rows.length : 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                choose();
              } else if (e.key === "Escape") {
                e.preventDefault();
                close();
              }
            }}
            placeholder="Search tutors, languages, pages…"
            aria-label="Search Parla"
            spellCheck={false}
          />
          <span className="kbd search-esc" aria-hidden>
            Esc
          </span>
        </div>

        <div className="search-body scrollbox">
          {rows.length === 0 && (
            <div className="search-empty">
              <span className="mono-label">Nothing in this edition matches “{query}”</span>
              <p>
                The archive holds twelve tutors and eleven languages — try a language name,
                a city, or a tutor.
              </p>
            </div>
          )}
          {rows.map((row) => {
          const header =
            row.group !== lastGroup ? row.group : null;
          lastGroup = row.group;
          return (
            <div key={row.key}>
                {header && <div className="search-group-label">{header}</div>}
                <button
                  type="button"
                  className="search-row"
                  data-active={flatIndex(row) === active}
                  onMouseEnter={() => setActive(flatIndex(row))}
                  onClick={() => choose(row)}
                >
                  {row.icon}
                  <span className="search-row-copy">
                    <span className="search-row-title">{row.title}</span>
                    <span className="search-row-sub">{row.sub}</span>
                  </span>
                  <span className="search-row-idx num">
                    {flatIndex(row) + 1}/{rows.length}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="search-foot">
          <span>
            <span className="kbd">↑</span> <span className="kbd">↓</span> to move ·{" "}
            <span className="kbd">Enter</span> opens
          </span>
          <span>{rows.length} result{rows.length === 1 ? "" : "s"}</span>
        </div>
      </div>
    </div>
  );
}
