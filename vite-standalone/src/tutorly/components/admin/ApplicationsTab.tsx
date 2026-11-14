'use client';

/**
 * Admin → Applications — the tutor review queue. Every "Become a tutor"
 * submission lands here: read the application, approve it (the profile goes
 * live in search immediately — same catalogue, same machinery) or reject it
 * with one of the canned verdicts. One fictional seeded applicant keeps the
 * queue demonstrable; it's labelled as a demo seed, not a real person.
 */
import { useState } from "react";
import { BadgeCheck, CircleAlert, Inbox, Sparkles } from "lucide-react";
import {
  REJECT_REASONS,
  allApplications,
  approveApplication,
  rejectApplication,
  timeAgo,
  useCommunityVersion,
  type TeacherApplication,
} from "../../data/community";
import { subjectById } from "../../data/subjects";
import { spokenLabel } from "../../data/tutors";
import { navigate } from "../../router/router";
import { useApp } from "../../store/AppStore";
import { Avatar } from "../common/Avatar";
import { EmptyState } from "../common/atoms";
import { Modal, ModalHead } from "../common/Modal";
import { cx, formatMoney } from "../../utils/misc";

export function ApplicationsTab() {
  useCommunityVersion(); // decisions anywhere (even another tab) refresh this
  const { dispatch } = useApp();

  const apps = allApplications();
  const pending = apps.filter((a) => a.status === "pending");
  const decided = apps.filter((a) => a.status !== "pending");

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<TeacherApplication | null>(null);
  const [reason, setReason] = useState<string>(REJECT_REASONS[0]);

  const approve = (app: TeacherApplication) => {
    if (approvingId) return;
    setApprovingId(app.id);
    // One believable beat of "reviewing", then the catalogue really changes.
    setTimeout(() => {
      const tutor = approveApplication(app.id);
      setApprovingId(null);
      dispatch({
        type: "toast",
        kind: tutor ? "success" : "error",
        text: tutor
          ? `${tutor.firstName} approved — the profile is live in search and the teacher roster now.`
          : "That application was already decided — refresh the queue.",
      });
    }, 550);
  };

  const confirmReject = () => {
    if (!rejecting) return;
    rejectApplication(rejecting.id, reason);
    dispatch({
      type: "toast",
      kind: "info",
      text: `${rejecting.payload.firstName} rejected with a note — they can edit and resubmit from /teach.`,
    });
    setRejecting(null);
  };

  return (
    <div className="adm-tab">
      <div className="adm-app-toolbar">
        <span className="mono-label">
          {pending.length} pending · {decided.length} decided
        </span>
        <span className="mono-label">approving compiles a live catalogue profile</span>
      </div>

      {pending.length === 0 && decided.length === 0 ? (
        <div className="card adm-panel">
          <EmptyState icon={Inbox} title="No applications yet">
            When someone applies through “Become a tutor”, the application lands here for review.
            Try it yourself from the teaching page.
          </EmptyState>
          <div className="empty-actions" style={{ marginTop: -12 }}>
            <button type="button" className="btn btn--outline btn--sm" onClick={() => navigate("/teach")}>
              Open the application form
            </button>
          </div>
        </div>
      ) : null}

      {pending.map((app) => (
        <article className="card adm-app" key={app.id} aria-label={`Application from ${app.payload.firstName} ${app.payload.lastName}`}>
          <div className="adm-app-head">
            <Avatar
              name={`${app.payload.firstName} ${app.payload.lastName}`}
              src={app.payload.portrait || undefined}
              size="lg"
              shape="square"
            />
            <div className="adm-app-id">
              <div className="adm-app-name">
                {app.payload.firstName} {app.payload.lastName}
                {app.seeded ? (
                  <span className="chip" title="Fictional applicant seeded for the demo — labelled, not real.">
                    <Sparkles size={11} aria-hidden /> demo seed
                  </span>
                ) : null}
              </div>
              <div className="mono-label">
                {app.applicantEmail} · {app.payload.city}, {app.payload.country}
              </div>
              <p className="adm-app-headline">{app.payload.headline}</p>
            </div>
            <div className="adm-app-when">
              <span className="mono-label">submitted</span>
              <span className="mono-label num">{timeAgo(app.submittedAt)}</span>
            </div>
          </div>

          <p className="adm-app-bio">{app.payload.bio}</p>

          <div className="adm-app-tags">
            {app.payload.subjects.map((id) => {
              const s = subjectById(id);
              const level =
                s?.cat === "languages" ? app.payload.languageLevels[id] || "All levels" : "All levels";
              return (
                <span className="chip chip--green" key={id}>
                  {s?.label ?? id} · {level}
                </span>
              );
            })}
            {app.payload.specialties.map((sp) => (
              <span className="chip" key={sp}>
                {sp}
              </span>
            ))}
          </div>

          <div className="adm-app-facts mono-label num">
            {formatMoney(app.payload.rate)}/lesson · native {spokenLabel(app.payload.nativeLanguage)}
            {app.payload.speaks.length > 0
              ? ` · speaks ${app.payload.speaks.map((s) => `${spokenLabel(s.code)} ${s.level}`).join(", ")}`
              : ""}{" "}
            · {app.payload.yearsTeaching} yrs teaching · ~{app.payload.studentsTaught} students
          </div>

          <div className="adm-app-actions">
            <button
              type="button"
              className="btn btn--accent btn--sm"
              disabled={approvingId === app.id}
              onClick={() => approve(app)}
            >
              {approvingId === app.id ? (
                <>
                  <span className="spinner spinner--light" role="status" aria-label="Approving" />
                  Compiling profile…
                </>
              ) : (
                <>
                  <BadgeCheck size={14} aria-hidden /> Approve &amp; go live
                </>
              )}
            </button>
            <button
              type="button"
              className="btn btn--danger btn--sm"
              onClick={() => {
                setReason(REJECT_REASONS[0]);
                setRejecting(app);
              }}
            >
              <CircleAlert size={14} aria-hidden /> Reject with a note
            </button>
          </div>
        </article>
      ))}

      {decided.length > 0 ? (
        <section className="card adm-panel" aria-label="Decided applications">
          <div className="adm-panel-head">
            <span className="mono-label">decided</span>
            <span className="mono-label">newest first</span>
          </div>
          <ul className="adm-app-done">
            {decided.map((app) => (
              <li key={app.id}>
                <span className={cx("pill", app.status === "approved" ? "pill--upcoming" : "pill--cancelled")}>
                  {app.status}
                </span>
                <span className="adm-app-done-name">
                  {app.payload.firstName} {app.payload.lastName}
                  {app.seeded ? " · demo seed" : ""}
                </span>
                <span className="mono-label num">
                  {app.payload.subjects.map((id) => subjectById(id)?.label ?? id).join(" + ")}
                </span>
                <span className="mono-label num">{timeAgo(app.decidedAt ?? app.submittedAt)}</span>
                {app.status === "approved" && app.tutorId ? (
                  <button
                    type="button"
                    className="adm-minilink"
                    onClick={() => navigate(`/tutor/${app.tutorId}`)}
                  >
                    view profile →
                  </button>
                ) : (
                  <span className="mono-label" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {app.rejectReason ? app.rejectReason : "live in search"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Modal
        open={rejecting !== null}
        onClose={() => setRejecting(null)}
        variant="sm"
        label="Reject application"
      >
        <ModalHead kicker="Review" title="Reject with a note" onClose={() => setRejecting(null)} />
        <div className="modal-body">
          <p className="field-hint" style={{ marginTop: -6 }}>
            The applicant sees this note at /teach and can edit &amp; resubmit — pick the one that
            helps most.
          </p>
          <div role="radiogroup" aria-label="Rejection reason" className="adm-app-reasons">
            {REJECT_REASONS.map((r) => (
              <label key={r} className="adm-app-reason">
                <input
                  type="radio"
                  name="reject-reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                />
                <span>{r}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRejecting(null)}>
            Keep them pending
          </button>
          <button type="button" className="btn btn--danger btn--sm" onClick={confirmReject}>
            Send the rejection
          </button>
        </div>
      </Modal>
    </div>
  );
}
