'use client';

/**
 * The application status screens — what an applicant sees at /teach after
 * submitting. Pending shows the review timeline and a locked card preview;
 * approved shows the live profile with real CTAs; rejected shows the
 * reviewer's verdict and the road back in. All of it re-renders live: the
 * admin console's decision updates this screen without a reload.
 */
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Compass,
  Lock,
  ShieldCheck,
  Video,
} from "lucide-react";
import type { TeacherApplication } from "../../data/community";
import { tutorFromApplication } from "../../data/community";
import { tutorById } from "../../data/tutors";
import { subjectById } from "../../data/subjects";
import { navigate } from "../../router/router";
import { useApp } from "../../store/AppStore";
import { TutorCard } from "../tutors/TutorCard";
import { formatMoney } from "../../utils/misc";
import { timeAgo } from "../../data/community";

export function TeacherStatus({
  app,
  onResubmit,
}: {
  app: TeacherApplication;
  onResubmit: () => void;
}) {
  if (app.status === "approved") return <Approved app={app} />;
  if (app.status === "rejected") return <Rejected app={app} onResubmit={onResubmit} />;
  return <Pending app={app} />;
}

/* ------------------------------------------------------------------ */

function Pending({ app }: { app: TeacherApplication }) {
  const preview = tutorFromApplication(app);

  return (
    <div className="teach-status-wrap">
      <div className="card card--pad-lg teach-status-card">
        <div className="teach-status-head">
          <span className="teach-status-ico teach-status-ico--pending">
            <ShieldCheck size={24} aria-hidden />
          </span>
          <div>
            <h1 className="teach-status-title">Your application is in review</h1>
            <p className="teach-status-sub">
              Submitted {timeAgo(app.submittedAt)} as {app.applicantEmail}. Reviews typically take
              a day or two — in this demo, the review desk is yours to peek behind.
            </p>
          </div>
        </div>

        <ol className="teach-tl" aria-label="Application progress">
          <li className="teach-tl-step teach-tl-step--done">
            <span className="teach-tl-dot">
              <Check size={14} aria-hidden />
            </span>
            <span className="teach-tl-body">
              <span className="teach-tl-title">Application received</span>
              <span className="teach-tl-sub">
                {app.payload.subjects
                  .map((id) => subjectById(id)?.label ?? id)
                  .join(" and ")}{" "}
                · {formatMoney(app.payload.rate)} per lesson
              </span>
            </span>
          </li>
          <li className="teach-tl-step teach-tl-step--active">
            <span className="teach-tl-dot" />
            <span className="teach-tl-body">
              <span className="teach-tl-title">In review</span>
              <span className="teach-tl-sub">
                A human reads every application — subjects, rate, bio and headline. (In this
                build: that human is you, one click away.)
              </span>
            </span>
          </li>
          <li className="teach-tl-step teach-tl-step--todo">
            <span className="teach-tl-dot" />
            <span className="teach-tl-body">
              <span className="teach-tl-title">Live on the marketplace</span>
              <span className="teach-tl-sub">
                Once approved, your profile appears in search, bookings open, and the classroom
                is one click from your lessons.
              </span>
            </span>
          </li>
        </ol>

        <div className="teach-preview">
          <div
            className="teach-preview-lock"
            onClickCapture={(e) => e.preventDefault()}
            aria-label="Preview of your marketplace card"
          >
            <TutorCard tutor={preview} />
          </div>
          <span className="teach-preview-cap">
            <Lock size={11} aria-hidden /> how you'll appear once approved
          </span>
        </div>

        <div className="teach-status-actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => navigate("/admin?tab=applications")}
          >
            <ShieldCheck size={15} aria-hidden /> Open the review console
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/browse")}>
            <Compass size={15} aria-hidden /> Browse the competition
          </button>
        </div>

        <div className="teach-admin-hint">
          <Video size={15} aria-hidden />
          <span>
            Demo loop: approve your application (or the seeded fictional one) in the admin
            console and this page flips to “live” instantly — no reload. When students book you,
            lessons run in the same PeerJS classroom, teacher side included.
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Approved({ app }: { app: TeacherApplication }) {
  const { dispatch } = useApp();
  const tutor = app.tutorId ? tutorById(app.tutorId) : undefined;
  if (!tutor) {
    // Defensive: the tutor should always exist post-approval.
    return (
      <div className="teach-status-wrap">
        <div className="card card--pad-lg teach-status-card">
          <div className="teach-status-head">
            <span className="teach-status-ico teach-status-ico--approved">
              <Check size={24} aria-hidden />
            </span>
            <div>
              <h1 className="teach-status-title">You're approved — profile is compiling</h1>
              <p className="teach-status-sub">
                Something moved between the approval and this page. Reload once and the profile
                picks itself back up.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="teach-status-wrap">
      <div className="card card--pad-lg teach-status-card">
        <div className="teach-status-head">
          <span className="teach-status-ico teach-status-ico--approved">
            <Check size={26} aria-hidden />
          </span>
          <div>
            <h1 className="teach-status-title">You're live on the marketplace</h1>
            <p className="teach-status-sub">
              Approved {timeAgo(app.decidedAt ?? Date.now())}. Students can now find you in
              search, book your calendar, and message you — everything the hand-picked tutors
              get, you get.
            </p>
          </div>
        </div>

        <TutorCard tutor={tutor} />

        <div className="teach-status-actions">
          <button
            type="button"
            className="btn btn--accent"
            onClick={() => navigate(`/tutor/${tutor.id}`)}
          >
            View your live profile <ArrowRight size={15} aria-hidden />
          </button>
          <button
            type="button"
            className="btn btn--outline"
            onClick={() => navigate(`/browse?subject=${tutor.teaches[0]?.subject ?? ""}`)}
          >
            See yourself in search
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              dispatch({
                type: "toast",
                kind: "info",
                text: "Bookings land in My lessons — try booking your own tutor to walk the full student path.",
              });
              navigate("/dashboard");
            }}
          >
            Where bookings land
          </button>
        </div>

        <div className="teach-admin-hint">
          <Video size={15} aria-hidden />
          <span>
            Live lessons run peer-to-peer in the classroom — whiteboard, chat, video and all.
            Rehearse from the teacher's chair any time in the{" "}
            <a href="#/classroom/demo?role=tutor" className="teach-inline-link">
              practice classroom
            </a>
            .
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Rejected({ app, onResubmit }: { app: TeacherApplication; onResubmit: () => void }) {
  return (
    <div className="teach-status-wrap">
      <div className="card card--pad-lg teach-status-card">
        <div className="teach-status-head">
          <span className="teach-status-ico teach-status-ico--rejected">
            <CircleAlert size={24} aria-hidden />
          </span>
          <div>
            <h1 className="teach-status-title">Not this time — and it's fixable</h1>
            <p className="teach-status-sub">
              The reviewer left a note {timeAgo(app.decidedAt ?? Date.now())}. Nothing is lost:
              your application is prefilled and waiting, one edit away from a fresh review.
            </p>
          </div>
        </div>

        <div className="teach-reject-reason">
          <CircleAlert size={16} aria-hidden style={{ flex: "none", marginTop: 2 }} />
          <span>
            <strong>Reviewer's note:</strong> {app.rejectReason ?? "No reason recorded."}
          </span>
        </div>

        <div className="teach-status-actions">
          <button type="button" className="btn btn--primary" onClick={onResubmit}>
            Edit &amp; resubmit <ArrowRight size={15} aria-hidden />
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/browse")}>
            <ArrowLeft size={15} aria-hidden /> Back to browsing
          </button>
        </div>
      </div>
    </div>
  );
}
