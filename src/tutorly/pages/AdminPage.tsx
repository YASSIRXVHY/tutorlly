'use client';

/**
 * The admin console — monitoring for every teacher and student on the
 * platform: overview KPIs and charts, teacher roster, student body, lesson
 * feed, live rooms, and system status. Its own chrome (no marketplace
 * navbar), behind a one-click demo gate.
 */
import { useState } from "react";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  CalendarCheck,
  Radio,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { navigate } from "../router/router";
import {
  generateStudents,
  generateRecentLessons,
  liveSessions,
  platformKpis,
  weeklyBookings,
  monthlySignups,
  revenueByCategory,
  onlineTutorCount,
  money,
} from "../data/adminData";
import { TUTORS } from "../data/tutors";
import { subjectById } from "../data/subjects";
import { Avatar } from "../components/common/Avatar";
import {
  TeachersTab,
  StudentsTab,
  LessonsTab,
  LiveTab,
  SystemCard,
} from "../components/admin/AdminTables";
import { cx } from "../utils/misc";

import "../styles/admin.css";

type TabId = "overview" | "teachers" | "students" | "lessons" | "live";

const ADMIN_FLAG = "tutorly.admin";

export function AdminPage() {
  const [entered, setEntered] = useState(() => {
    try {
      return localStorage.getItem(ADMIN_FLAG) === "1";
    } catch {
      return false;
    }
  });
  const [tab, setTab] = useState<TabId>("overview");

  if (!entered) {
    return <AdminGate onEnter={() => {
      try {
        localStorage.setItem(ADMIN_FLAG, "1");
      } catch {
        /* storage unavailable — in-memory session */
      }
      setEntered(true);
    }} />;
  }

  const tabs: Array<{ id: TabId; label: string; icon: typeof LayoutDashboard; count: number | null }> = [
    { id: "overview", label: "Overview", icon: LayoutDashboard, count: null },
    { id: "teachers", label: "Teachers", icon: GraduationCap, count: TUTORS.length },
    { id: "students", label: "Students", icon: Users, count: generateStudents().length + 1 },
    { id: "lessons", label: "Lessons", icon: CalendarCheck, count: generateRecentLessons().length },
    { id: "live", label: "Live rooms", icon: Radio, count: liveSessions().length },
  ];

  return (
    <div className="adm-root">
      <header className="adm-top">
        <span className="adm-top-logo">
          <GraduationCap size={16} aria-hidden />
        </span>
        <span className="adm-top-word">
          tutorly <em>admin</em>
        </span>
        <span className="adm-top-tag mono-label">demo console · deterministic data</span>
        <button type="button" className="adm-top-back" onClick={() => navigate("/")}>
          <ArrowLeft size={14} aria-hidden /> Back to marketplace
        </button>
      </header>

      <div className="container container--wide adm-body">
        <nav className="adm-side" aria-label="Admin sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={cx("adm-side-item", tab === t.id && "adm-side-item--on")}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
            >
              <t.icon size={15} aria-hidden />
              {t.label}
              {t.count != null ? <span className="adm-side-count num">{t.count}</span> : null}
            </button>
          ))}
          <div className="adm-side-foot">
            <span className="mono-label">signed in as</span>
            <span className="adm-side-user">admin@demo.tutorly</span>
            <span className="mono-label">localStorage only · no server</span>
          </div>
        </nav>

        <main className="adm-main">
          {tab === "overview" ? (
            <Overview onGo={(t) => setTab(t)} />
          ) : tab === "teachers" ? (
            <TeachersTab />
          ) : tab === "students" ? (
            <StudentsTab />
          ) : tab === "lessons" ? (
            <LessonsTab />
          ) : (
            <LiveTab />
          )}
        </main>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function AdminGate({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="adm-root">
      <header className="adm-top">
        <span className="adm-top-logo">
          <GraduationCap size={16} aria-hidden />
        </span>
        <span className="adm-top-word">
          tutorly <em>admin</em>
        </span>
        <span className="adm-top-tag mono-label">demo console</span>
        <button type="button" className="adm-top-back" onClick={() => navigate("/")}>
          <ArrowLeft size={14} aria-hidden /> Back to marketplace
        </button>
      </header>
      <div className="adm-gate-scrim">
        <div className="adm-gate card card--pad-lg">
          <span className="adm-gate-ico">
            <ShieldCheck size={26} aria-hidden />
          </span>
          <span className="mono-label">administration</span>
          <h1 className="section-title" style={{ fontSize: 26 }}>
            Tutorly admin console
          </h1>
          <p>
            Monitor every teacher and student on the platform: the roster with volume and online
            status, the student body, the booking feed, live rooms, and system health. Teacher and
            catalogue figures are real platform data; students, the feed and live telemetry are
            deterministic seeded simulations — honestly labelled, identical on every reload.
          </p>
          <span className="field-hint">
            Demo build: there is no password. The console remembers you in localStorage only.
          </span>
          <div className="adm-gate-actions">
            <button type="button" className="btn btn--accent btn--lg" onClick={onEnter}>
              <ShieldCheck size={16} aria-hidden /> Enter demo console
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => navigate("/")}>
              Back to marketplace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function Kpi({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="adm-kpi">
      <span className="adm-kpi-num">{value}</span>
      <span className="mono-label">{label}</span>
      <span className="adm-kpi-sub">{sub}</span>
    </div>
  );
}

function Overview({ onGo }: { onGo: (tab: TabId) => void }) {
  const kpis = platformKpis();
  const week = weeklyBookings();
  const maxWeek = Math.max(...week.map((d) => d.n));
  const cats = revenueByCategory();
  const signups = monthlySignups();
  const maxSignup = Math.max(...signups.map((s) => s.n)) || 1;
  const live = liveSessions().slice(0, 3);

  return (
    <div className="adm-tab">
      <div className="adm-kpis">
        <Kpi label="active teachers" value={kpis.tutors} sub={`${onlineTutorCount()} online now`} />
        <Kpi label="students" value={kpis.students.toLocaleString("en-US")} sub="lifetime, all tutors" />
        <Kpi label="lessons delivered" value={kpis.lessons.toLocaleString("en-US")} sub="50 minutes each" />
        <Kpi label="hours taught" value={kpis.hours.toLocaleString("en-US")} sub="on the platform" />
        <Kpi label="gross volume" value={money(kpis.gross)} sub="all-time bookings" />
        <Kpi label="platform revenue" value={money(kpis.commission)} sub="18% commission" />
        <Kpi label="average rating" value={kpis.rating} sub={`across ${kpis.tutors} tutors`} />
        <Kpi label="avg response" value={`${kpis.responseHrs}h`} sub="time to first reply" />
      </div>

      <div className="adm-grid2">
        <section className="card adm-panel" aria-label="Bookings this week">
          <div className="adm-panel-head">
            <span className="mono-label">bookings this week</span>
            <span className="mono-label">seeded</span>
          </div>
          <div className="adm-vbars">
            {week.map((d) => (
              <div key={d.label} className="adm-vbar" title={`${d.n} bookings`}>
                <span className="adm-vbar-val num">{d.n}</span>
                <span className="adm-vbar-track">
                  <span
                    className="adm-vbar-fill"
                    style={{ height: `${Math.round((d.n / maxWeek) * 100)}%` }}
                  />
                </span>
                <span className="adm-vbar-label">{d.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card adm-panel" aria-label="Lifetime volume by category">
          <div className="adm-panel-head">
            <span className="mono-label">lifetime volume by category</span>
            <span className="mono-label">real data</span>
          </div>
          <div className="adm-hbars">
            {cats.map((c) => (
              <div key={c.id} className="adm-hbar" title={`${money(c.revenue)} · ${Math.round(c.share * 100)}%`}>
                <span className="adm-hbar-label">{c.label}</span>
                <span className="meter adm-hbar-track">
                  <span className="meter-fill" style={{ width: `${Math.round(c.share * 100)}%` }} />
                </span>
                <span className="adm-hbar-val num">{money(c.revenue)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="adm-grid2">
        <section className="card adm-panel" aria-label="Signups, last 12 months">
          <div className="adm-panel-head">
            <span className="mono-label">signups · last 12 months</span>
            <span className="mono-label">seeded</span>
          </div>
          <div className="adm-sparks">
            {signups.map((s, i) => (
              <span
                key={i}
                className="adm-spark"
                style={{ height: `${Math.round((s.n / maxSignup) * 100)}%` }}
                title={`${s.label}: ${s.n}`}
              />
            ))}
          </div>
          <div className="adm-spark-labels mono-label">
            <span>{signups[0]?.label}</span>
            <span>{signups[signups.length - 1]?.label}</span>
          </div>
        </section>

        <section className="card adm-panel" aria-label="Live rooms now">
          <div className="adm-panel-head">
            <span className="mono-label">live now · simulated</span>
            <button type="button" className="adm-minilink" onClick={() => onGo("live")}>
              view all →
            </button>
          </div>
          <div className="adm-livemini">
            {live.map((s) => {
              const tutor = TUTORS.find((t) => t.id === s.tutorId);
              if (!tutor) return null;
              return (
                <div className="adm-livemini-row" key={s.id}>
                  <span className="pill pill--live">
                    <span className="pill-dot" aria-hidden /> live
                  </span>
                  <Avatar name={tutor.name} src={tutor.portrait} size="xs" shape="square" />
                  <div className="adm-livemini-mid">
                    <span className="adm-livemini-name">{tutor.name}</span>
                    <span className="adm-livemini-sub">
                      {subjectById(s.subject)?.label ?? s.subject} · {s.startedMinAgo} min in
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <SystemCard />
    </div>
  );
}
