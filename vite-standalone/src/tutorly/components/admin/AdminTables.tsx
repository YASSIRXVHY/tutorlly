'use client';

/**
 * Admin console tabs — teachers, students, lessons, live rooms, and the
 * system card. Real catalogue data where it exists; seeded simulation
 * honestly labelled where it doesn't.
 */
import { useMemo, useState } from "react";
import {
  Search,
  X,
  RefreshCw,
  Video,
  Presentation,
  ChevronLeft,
  ChevronRight,
  Wifi,
} from "lucide-react";
import { useApp } from "../../store/AppStore";
import { TUTORS, tutorSubjects, isOnline } from "../../data/tutors";
import { subjectById } from "../../data/subjects";
import {
  generateStudents,
  generateRecentLessons,
  liveSessions,
  onlineTutorCount,
  money,
} from "../../data/adminData";
import { Avatar } from "../common/Avatar";
import { Stars } from "../common/Stars";
import { Link } from "../../router/router";
import { resolveBroker, setBrokerMode, RELAY_QUERY_PORT } from "../classroom/broker";
import { openRoomWindow } from "../../utils/openRoom";
import { cx } from "../../utils/misc";
import { dateISO, shortDate, hourLabel } from "../../utils/time";

/* ================= teachers ================= */

type TeacherSort = "revenue" | "rating" | "lessons" | "name";

export function TeachersTab() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<TeacherSort>("revenue");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = TUTORS.filter((t) => {
      if (!needle) return true;
      const hay = [
        t.name,
        t.city,
        t.country,
        ...tutorSubjects(t).map((s) => s.label),
        ...t.specialties,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
    return [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "rating") return b.rating - a.rating || b.reviewCount - a.reviewCount;
      if (sort === "lessons") return b.lessonsTaught - a.lessonsTaught;
      return b.lessonsTaught * b.price - a.lessonsTaught * a.price;
    });
  }, [q, sort]);

  return (
    <div className="adm-tab">
      <div className="adm-toolbar">
        <div className="adm-search">
          <Search size={15} aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search teachers — name, subject, city…"
            aria-label="Search teachers"
          />
          {q ? (
            <button type="button" className="adm-search-x" onClick={() => setQ("")} aria-label="Clear search">
              <X size={13} aria-hidden />
            </button>
          ) : null}
        </div>
        <select
          className="select adm-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as TeacherSort)}
          aria-label="Sort teachers"
        >
          <option value="revenue">Sort: lifetime volume</option>
          <option value="rating">Sort: rating</option>
          <option value="lessons">Sort: lessons taught</option>
          <option value="name">Sort: name</option>
        </select>
        <span className="mono-label">
          {rows.length} of {TUTORS.length} teachers
        </span>
      </div>

      <div className="adm-tablewrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th scope="col">Teacher</th>
              <th scope="col">Subjects</th>
              <th scope="col">Rate</th>
              <th scope="col">Rating</th>
              <th scope="col">Lessons</th>
              <th scope="col">Students</th>
              <th scope="col">Volume</th>
              <th scope="col">Status</th>
              <th scope="col">Since</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const subs = tutorSubjects(t);
              const online = isOnline(t.id);
              return (
                <tr key={t.id}>
                  <td>
                    <div className="adm-cellperson">
                      <Avatar
                        name={t.name}
                        src={t.portrait}
                        size="sm"
                        shape="square"
                        status={online ? "online" : null}
                      />
                      <div>
                        <Link to={`/tutor/${t.id}`} className="adm-person-name">
                          {t.name}
                        </Link>
                        <span className="adm-person-sub">
                          {t.city}, {t.country}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="adm-chips">
                      {subs.slice(0, 2).map((s) => (
                        <span key={s.id} className="adm-chip">
                          {s.label}
                        </span>
                      ))}
                      {subs.length > 2 ? (
                        <span className="adm-chip adm-chip--more">+{subs.length - 2}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="adm-num">${t.price}</td>
                  <td>
                    <Stars rating={t.rating} size={11} />
                  </td>
                  <td className="adm-num">{t.lessonsTaught.toLocaleString("en-US")}</td>
                  <td className="adm-num">{t.students}</td>
                  <td className="adm-num adm-strong">{money(t.lessonsTaught * t.price)}</td>
                  <td>
                    <span className={cx("pill", online ? "pill--connected" : "pill--completed")}>
                      {online ? "online" : "offline"}
                    </span>
                  </td>
                  <td className="adm-num">{t.since}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <div className="adm-emptyrow">No teachers match “{q}” — the catalogue has 12.</div>
        ) : null}
      </div>
    </div>
  );
}

/* ================= students ================= */

const PAGE_SIZE = 8;

interface StudentRow {
  id: string;
  name: string;
  country: string;
  cc: string;
  joinedISO: string;
  lessons: number;
  spend: number;
  favorite: string;
  lastActiveDays: number;
  status: "active" | "idle" | "new";
  you?: boolean;
}

export function StudentsTab() {
  const { state } = useApp();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const you = useMemo<StudentRow>(() => {
    const lessons = state.lessons.filter((l) => l.status !== "cancelled");
    const spend = lessons.reduce((a, l) => a + l.price, 0);
    return {
      id: "you",
      name: state.session?.name ?? "You",
      country: "this browser",
      cc: "",
      joinedISO: state.session ? dateISO(new Date(state.session.since)) : "",
      lessons: lessons.length,
      spend,
      favorite: `${state.favorites.length} favourites saved`,
      lastActiveDays: 0,
      status: "active",
      you: true,
    };
  }, [state]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const all: StudentRow[] = [you, ...generateStudents()];
    if (!needle) return all;
    return all.filter((s) =>
      `${s.name} ${s.country} ${s.favorite}`.toLowerCase().includes(needle)
    );
  }, [q, you]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const slice = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="adm-tab">
      <div className="adm-toolbar">
        <div className="adm-search">
          <Search size={15} aria-hidden />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Search students — name, country…"
            aria-label="Search students"
          />
          {q ? (
            <button type="button" className="adm-search-x" onClick={() => setQ("")} aria-label="Clear search">
              <X size={13} aria-hidden />
            </button>
          ) : null}
        </div>
        <span className="mono-label">
          {rows.length} students · seeded body + your demo account
        </span>
      </div>

      <div className="adm-tablewrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th scope="col">Student</th>
              <th scope="col">Country</th>
              <th scope="col">Joined</th>
              <th scope="col">Lessons</th>
              <th scope="col">Spend</th>
              <th scope="col">Favourite subject</th>
              <th scope="col">Last active</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((s) => (
              <tr key={s.id} className={cx(s.you && "adm-row--you")}>
                <td>
                  <div className="adm-cellperson">
                    <Avatar name={s.name} size="sm" />
                    <div>
                      <span className="adm-person-name">{s.name}</span>
                      {s.you ? (
                        <span className="adm-chip adm-chip--more" style={{ marginLeft: 8 }}>
                          demo
                        </span>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td>{s.country}</td>
                <td className="adm-num">{s.joinedISO ? shortDate(s.joinedISO) : "—"}</td>
                <td className="adm-num">{s.lessons}</td>
                <td className="adm-num adm-strong">{money(s.spend)}</td>
                <td>
                  <span className="adm-chip">{s.favorite}</span>
                </td>
                <td className="adm-num">
                  {s.lastActiveDays === 0 ? "today" : `${s.lastActiveDays}d ago`}
                </td>
                <td>
                  <span className={`adm-pill adm-pill--${s.status}`}>{s.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <div className="adm-emptyrow">No students match “{q}”.</div>
        ) : null}
      </div>

      <div className="adm-pager">
        <span className="mono-label">
          showing {safePage * PAGE_SIZE + 1}–{Math.min(rows.length, (safePage + 1) * PAGE_SIZE)} of{" "}
          {rows.length}
        </span>
        <button
          type="button"
          className="btn btn--outline btn--sm"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={safePage === 0}
        >
          <ChevronLeft size={13} aria-hidden /> Prev
        </button>
        <span className="mono-label">
          page {safePage + 1}/{pages}
        </span>
        <button
          type="button"
          className="btn btn--outline btn--sm"
          onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
          disabled={safePage >= pages - 1}
        >
          Next <ChevronRight size={13} aria-hidden />
        </button>
      </div>
    </div>
  );
}

/* ================= lessons feed ================= */

type LessonFilter = "all" | "completed" | "upcoming" | "cancelled";

interface LessonRow {
  id: string;
  dateISO: string;
  hour: number;
  student: string;
  tutorId: string;
  subject: string;
  price: number;
  status: "completed" | "upcoming" | "cancelled";
  you?: boolean;
}

export function LessonsTab() {
  const { state } = useApp();
  const [filter, setFilter] = useState<LessonFilter>("all");

  const rows = useMemo<LessonRow[]>(() => {
    const mine: LessonRow[] = state.lessons.map((l) => ({
      id: l.id,
      dateISO: l.dateISO,
      hour: l.hour,
      student: "You",
      tutorId: l.tutorId,
      subject: l.subject,
      price: l.price,
      status: l.status,
      you: true,
    }));
    const all = [...mine, ...generateRecentLessons()];
    const sorted = all.sort((a, b) =>
      a.dateISO < b.dateISO ? 1 : a.dateISO > b.dateISO ? -1 : b.hour - a.hour
    );
    return filter === "all" ? sorted : sorted.filter((r) => r.status === filter);
  }, [state.lessons, filter]);

  const FILTERS: Array<{ id: LessonFilter; label: string }> = [
    { id: "all", label: "All" },
    { id: "completed", label: "Completed" },
    { id: "upcoming", label: "Upcoming" },
    { id: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="adm-tab">
      <div className="adm-toolbar">
        <div className="segmented" role="radiogroup" aria-label="Filter lessons by status">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={cx("segmented-item", filter === f.id && "segmented-item--on")}
              onClick={() => setFilter(f.id)}
              aria-checked={filter === f.id}
              role="radio"
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="mono-label">{rows.length} bookings · your lessons + seeded feed</span>
      </div>

      <div className="adm-tablewrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Student</th>
              <th scope="col">Teacher</th>
              <th scope="col">Subject</th>
              <th scope="col">Price</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const tutor = TUTORS.find((t) => t.id === r.tutorId);
              return (
                <tr key={`${r.id}-${r.you ? "you" : "seed"}`} className={cx(r.you && "adm-row--you")}>
                  <td className="adm-num">
                    {shortDate(r.dateISO)} · {hourLabel(r.hour)}
                  </td>
                  <td>
                    <span style={{ fontWeight: r.you ? 800 : 500 }}>{r.student}</span>
                  </td>
                  <td>
                    {tutor ? (
                      <div className="adm-cellperson">
                        <Avatar name={tutor.name} src={tutor.portrait} size="xs" shape="square" />
                        <Link to={`/tutor/${tutor.id}`} className="adm-person-name">
                          {tutor.name}
                        </Link>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <span className="adm-chip">{subjectById(r.subject)?.label ?? r.subject}</span>
                  </td>
                  <td className="adm-num">${r.price}</td>
                  <td>
                    <span className={`pill pill--${r.status}`}>{r.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <div className="adm-emptyrow">No {filter} bookings in the feed right now.</div>
        ) : null}
      </div>
    </div>
  );
}

/* ================= live rooms ================= */

export function LiveTab() {
  const [salt, setSalt] = useState(0);
  const sessions = useMemo(() => liveSessions(salt), [salt]);

  return (
    <div className="adm-tab">
      <div className="adm-toolbar">
        <span className="mono-label">live rooms · simulated telemetry (hour-stable)</span>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setSalt(Date.now())}
          style={{ marginLeft: "auto" }}
        >
          <RefreshCw size={13} aria-hidden /> Re-sample
        </button>
      </div>

      <div className="card">
        {sessions.map((s) => {
          const tutor = TUTORS.find((t) => t.id === s.tutorId);
          if (!tutor) return null;
          return (
            <div className="adm-liverow" key={s.id}>
              <span className="pill pill--live">
                <span className="pill-dot" aria-hidden /> live
              </span>
              <Avatar name={tutor.name} src={tutor.portrait} size="sm" shape="square" />
              <div className="adm-liverow-mid">
                <span className="adm-liverow-name">{tutor.name}</span>
                <span className="adm-liverow-sub">
                  {subjectById(s.subject)?.label ?? s.subject} · started {s.startedMinAgo} min ago ·{" "}
                  {s.durationMin} min · 1 student
                </span>
              </div>
              <span className="kbd adm-liverow-code" title="Room code">
                {s.id.replace("lv-", "")}
              </span>
              <span className="wavebars" aria-hidden>
                <span className="wavebar" />
                <span className="wavebar" />
                <span className="wavebar" />
                <span className="wavebar" />
                <span className="wavebar" />
              </span>
            </div>
          );
        })}
        {sessions.length === 0 ? (
          <div className="adm-emptyrow">No rooms are signaling right now.</div>
        ) : null}
      </div>

      <div className="card card--pad adm-bench">
        <div className="adm-bench-copy">
          <span className="mono-label">real p2p · start your own</span>
          <p>
            Live rooms are peer-to-peer — the console can’t see inside them by design. Start one and
            watch it from both sides: the student window hosts, the demo teacher window joins, and
            video, whiteboard and chat sync directly between the two.
          </p>
        </div>
        <div className="adm-bench-actions">
          <button type="button" className="btn btn--primary" onClick={() => openRoomWindow("student")}>
            <Video size={15} aria-hidden /> Open student window
          </button>
          <button type="button" className="btn btn--outline" onClick={() => openRoomWindow("tutor")}>
            <Presentation size={15} aria-hidden /> Open demo teacher window
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= system card ================= */

type ProbeState = "idle" | "checking" | "ok" | "blocked" | "timeout";

export function SystemCard() {
  const { state, dispatch } = useApp();
  const broker = resolveBroker();
  const [probe, setProbe] = useState<ProbeState>("idle");
  const [online, setOnline] = useState(() => onlineTutorCount());

  const storeBytes = useMemo(() => {
    try {
      return (localStorage.getItem("tutorly.v2") ?? "").length;
    } catch {
      return 0;
    }
     
  }, [state.lessons, state.conversations, state.userReviews, state.favorites]);

  const runProbe = () => {
    const current = resolveBroker();
    setProbe("checking");
    const url =
      current.mode === "gateway"
        ? `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/?XTransformPort=${RELAY_QUERY_PORT}&j=/peerjs`
        : "wss://0.peerjs.com/peerjs";
    try {
      const ws = new WebSocket(url);
      const to = setTimeout(() => {
        try {
          ws.close();
        } catch {
          /* already closed */
        }
        setProbe("timeout");
      }, 4500);
      ws.onopen = () => {
        clearTimeout(to);
        try {
          ws.close();
        } catch {
          /* noop */
        }
        setProbe("ok");
      };
      ws.onerror = () => {
        clearTimeout(to);
        setProbe("blocked");
      };
    } catch {
      setProbe("blocked");
    }
  };

  const probeLabel =
    probe === "idle"
      ? "not tested"
      : probe === "checking"
      ? "testing…"
      : probe === "ok"
      ? "reachable"
      : probe === "timeout"
      ? "timed out"
      : "blocked here";

  return (
    <section className="card adm-panel adm-sys" aria-label="System status">
      <div className="adm-panel-head">
        <span className="mono-label">system status</span>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => setOnline(onlineTutorCount())}
        >
          <RefreshCw size={13} aria-hidden /> Refresh
        </button>
      </div>

      <div className="adm-sys-row">
        <span className="adm-sys-key">store</span>
        <span className="adm-sys-val">
          {storeBytes.toLocaleString("en-US")} bytes · {state.lessons.length}{" "}
          {state.lessons.length === 1 ? "lesson" : "lessons"} · {state.conversations.length}{" "}
          {state.conversations.length === 1 ? "conversation" : "conversations"} ·{" "}
          {state.userReviews.length} {state.userReviews.length === 1 ? "review" : "reviews"}
        </span>
      </div>

      <div className="adm-sys-row">
        <span className="adm-sys-key">session</span>
        <span className="adm-sys-val">
          {state.session ? `${state.session.name} · ${state.session.email}` : "signed out (marketplace)"}
        </span>
      </div>

      <div className="adm-sys-row">
        <span className="adm-sys-key">teachers</span>
        <span className="adm-sys-val">
          {online} of {TUTORS.length} online now · deterministic per hour
        </span>
      </div>

      <div className="adm-sys-row">
        <span className="adm-sys-key">signaling</span>
        <span className="adm-sys-val">
          <span className="adm-sys-actions">
            <span>{broker.label}</span>
            <label className="switch">
              <input
                className="switch-input"
                type="checkbox"
                checked={broker.mode === "gateway"}
                onChange={(e) => {
                  setBrokerMode(e.target.checked ? "gateway" : "cloud");
                  setProbe("idle");
                  dispatch({
                    type: "toast",
                    kind: "info",
                    text: e.target.checked
                      ? "Signaling switched to the gateway relay — restart any live rooms to pick it up."
                      : "Signaling switched to the PeerJS cloud — restart any live rooms to pick it up.",
                  });
                }}
                aria-label="Use the gateway relay for signaling"
              />
              <span className="switch-track" />
              <span className="switch-text">gateway relay</span>
            </label>
            <button type="button" className="btn btn--outline btn--sm" onClick={runProbe}>
              <Wifi size={13} aria-hidden /> Test
            </button>
            <span
              className={cx(
                "adm-sys-probe",
                probe === "ok" && "adm-sys-probe--ok",
                (probe === "blocked" || probe === "timeout") && "adm-sys-probe--bad",
                probe === "checking" && "adm-sys-probe--checking"
              )}
            >
              {probeLabel}
            </span>
          </span>
        </span>
      </div>

      <div className="adm-sys-row">
        <span className="adm-sys-key">note</span>
        <span className="adm-sys-val field-hint" style={{ fontWeight: 400 }}>
          The gateway relay rides the platform’s query-port route (XTransformPort={RELAY_QUERY_PORT})
          to the co-located broker; the cloud is the public PeerJS server. Both are signaling only —
          audio, video and whiteboard data never touch a server.
        </span>
      </div>
    </section>
  );
}
