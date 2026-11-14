'use client';

/**
 * Wizard step 4 — Review & submit: a live preview of the exact marketplace
 * card students will see, an honest summary of everything entered with
 * jump-to-step edit links, the demo terms, and the submission itself.
 * Submitting requires a session — the auth modal opens in place if needed.
 */
import { useState, type FormEvent } from "react";
import { Check, Lock, Sparkles } from "lucide-react";
import type { TeachDraft, TeacherApplication } from "../../data/community";
import { submitApplication, tutorFromApplication } from "../../data/community";
import { subjectById } from "../../data/subjects";
import { spokenLabel, TUTORS } from "../../data/tutors";
import { useApp } from "../../store/AppStore";
import { TutorCard } from "../tutors/TutorCard";
import { formatMoney } from "../../utils/misc";
import type { StepProps } from "./StepBasics";

/** A synthetic pending application — enough shape to compile the preview tutor. */
function previewApplication(draft: TeachDraft): TeacherApplication {
  return {
    id: "preview",
    status: "pending",
    submittedAt: 0,
    decidedAt: null,
    rejectReason: null,
    applicantEmail: draft.email,
    payload: draft,
    seeded: false,
    tutorId: null,
  };
}

export function StepReview({
  draft,
  patch,
  onEditStep,
}: StepProps & { onEditStep: (step: number) => void }) {
  const { state, dispatch } = useApp();
  const [submitting, setSubmitting] = useState(false);
  const [termError, setTermError] = useState<string | null>(null);

  const preview = tutorFromApplication(previewApplication(draft));
  const primary = subjectById(draft.subjects[0] ?? "");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!draft.agree) {
      setTermError("The review team needs your confirmation first.");
      document.getElementById("teach-agree")?.focus();
      return;
    }
    setTermError(null);
    if (!state.session) {
      dispatch({
        type: "openAuth",
        notice: "Log in to submit your teaching application — it attaches to your account.",
      });
      return;
    }
    setSubmitting(true);
    // A believable moment of "the form is being filed" — then it's real state.
    setTimeout(() => {
      submitApplication(draft);
      dispatch({
        type: "toast",
        text: "Application submitted — the review team (that's you, in the admin console) takes it from here.",
      });
      setSubmitting(false);
    }, 900);
  };

  const summaryRows: Array<{ key: string; value: React.ReactNode; step: number }> = [
    {
      key: "name",
      step: 1,
      value: `${draft.firstName} ${draft.lastName}`.trim(),
    },
    {
      key: "location",
      step: 1,
      value: `${draft.city}, ${draft.country}`,
    },
    {
      key: "native",
      step: 1,
      value: spokenLabel(draft.nativeLanguage),
    },
    {
      key: "subjects",
      step: 2,
      value: (
        <span className="teach-chiprow">
          {draft.subjects.map((id) => {
            const s = subjectById(id);
            const level =
              s?.cat === "languages" ? draft.languageLevels[id] || "All levels" : "All levels";
            return (
              <span className="chip chip--green" key={id}>
                {s?.label ?? id} · {level}
              </span>
            );
          })}
        </span>
      ),
    },
    {
      key: "specialties",
      step: 2,
      value: draft.specialties.join(", "),
    },
    {
      key: "speaks",
      step: 2,
      value:
        draft.speaks.length > 0
          ? draft.speaks.map((s) => `${spokenLabel(s.code)} (${s.level})`).join(", ")
          : "Only their native language",
    },
    {
      key: "rate",
      step: 3,
      value: `${formatMoney(draft.rate)} per 50-min lesson · trial at ${formatMoney(draft.rate / 2)}`,
    },
    {
      key: "experience",
      step: 3,
      value: `${draft.yearsTeaching} ${draft.yearsTeaching === 1 ? "year" : "years"} teaching · ~${draft.studentsTaught} students`,
    },
    {
      key: "headline",
      step: 3,
      value: draft.headline.trim(),
    },
  ];

  return (
    <form onSubmit={submit}>
      <header className="teach-step-head">
        <div className="teach-step-kicker">Step 4 of 4</div>
        <h2 className="teach-step-title">Review &amp; submit</h2>
        <p className="teach-step-sub">
          This is exactly how you'll appear in search the moment the review approves. Fix anything,
          then send it off.
        </p>
      </header>

      <div className="teach-preview">
        <div
          className="teach-preview-lock"
          onClickCapture={(e) => e.preventDefault()}
          aria-label="Preview of your marketplace card"
        >
          <TutorCard tutor={preview} />
        </div>
        <span className="teach-preview-cap">
          <Lock size={11} aria-hidden /> preview — not clickable until you're live
        </span>
      </div>

      <div className="teach-summary" style={{ marginTop: 18 }} aria-label="Application summary">
        {summaryRows.map((row) => (
          <div className="teach-summary-row" key={row.key}>
            <span className="teach-summary-key">{row.key}</span>
            <span className="teach-summary-val">{row.value}</span>
            <button
              type="button"
              className="teach-summary-edit"
              onClick={() => onEditStep(row.step)}
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      <label className="teach-terms" htmlFor="teach-agree">
        <input
          id="teach-agree"
          type="checkbox"
          className="checkrow-input"
          checked={draft.agree}
          onChange={(e) => patch({ agree: e.target.checked })}
        />
        <span className="checkrow-box" aria-hidden>
          <Check size={12} />
        </span>
        <span>
          I confirm everything above is accurate and I'm happy to be reviewed by the Tutorly
          team. {termError ? <span className="field-error" role="alert">{termError}</span> : null}
        </span>
      </label>

      <div className="teach-nav">
        <span className="teach-nav-note">
          {state.session ? (
            <>submitting as {state.session.email}</>
          ) : (
            <>
              <Sparkles size={11} aria-hidden style={{ verticalAlign: -1 }} /> log-in required —
              the button will open it
            </>
          )}
        </span>
        <button
          type="submit"
          className="btn btn--accent btn--lg"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <span className="spinner spinner--light" role="status" aria-label="Submitting" />
              Submitting your application…
            </>
          ) : (
            <>
              <Check size={16} aria-hidden />
              {state.session ? "Submit my application" : "Log in & submit"}
            </>
          )}
        </button>
      </div>

      {primary ? (
        <p className="field-hint" style={{ marginTop: 14, textAlign: "center" }}>
          After approval you'll appear under {primary.label} alongside{" "}
          {TUTORS.filter((t) => t.teaches.some((te) => te.subject === primary.id)).length} other
          tutors — favourites, messages and bookings all work the same for you.
        </p>
      ) : null}
    </form>
  );
}
