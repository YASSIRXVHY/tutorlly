'use client';

/**
 * TeachWizard — the four-step application orchestrator: stepper, per-step
 * validation with focus-on-first-error, a localStorage draft that survives
 * reloads (and says so), and the resume/start-over affordances. The steps
 * themselves are separate components; submission lives in StepReview.
 */
import { useEffect, useRef, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import type { TeachDraft } from "../../data/community";
import {
  clearTeachDraft,
  loadTeachDraft,
  makeEmptyDraft,
  saveTeachDraft,
} from "../../data/community";
import { subjectById } from "../../data/subjects";
import { subjectCodeMatches } from "../../data/tutors";
import { useApp } from "../../store/AppStore";
import { cx } from "../../utils/misc";
import { StepBasics, validEmail, type StepErrors } from "./StepBasics";
import { StepSubjects } from "./StepSubjects";
import { StepLesson } from "./StepLesson";
import { StepReview } from "./StepReview";

const STEPS = [
  { label: "About you" },
  { label: "What you teach" },
  { label: "Your lesson" },
  { label: "Review" },
] as const;

/** Field ids for focusing the first invalid control after a blocked step. */
const ERROR_FOCUS: Record<string, string> = {
  firstName: "teach-first",
  lastName: "teach-last",
  email: "teach-email",
  country: "teach-country",
  city: "teach-city",
  nativeLanguage: "teach-native",
  headline: "teach-headline",
  bio: "teach-bio",
};

export function TeachWizard({
  initial,
  onStartedFresh,
}: {
  /** Prefilled payload (resubmission) or a resumed draft — never both. */
  initial?: TeachDraft | null;
  onStartedFresh?: () => void;
}) {
  const { state } = useApp();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<StepErrors>({});
  const [draft, setDraft] = useState<TeachDraft>(() => {
    if (initial) return { ...makeEmptyDraft(), ...initial };
    const stored = loadTeachDraft();
    if (stored) return stored;
    return makeEmptyDraft(state.session?.email ?? "", state.session?.name ?? "");
  });
  const [resumed, setResumed] = useState(() => !initial && loadTeachDraft() !== null);
  const headRef = useRef<HTMLDivElement>(null);

  // Debounced draft autosave — leave mid-wizard, come back, continue.
  useEffect(() => {
    const t = setTimeout(() => saveTeachDraft(draft), 250);
    return () => clearTimeout(t);
  }, [draft]);

  const patch = (p: Partial<TeachDraft>) => {
    setDraft((d) => ({ ...d, ...p }));
    setErrors((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      const next = { ...prev };
      for (const k of Object.keys(p)) {
        delete next[k];
        if (k === "languageLevels" || k === "subjects") {
          for (const ek of Object.keys(next)) {
            if (ek.startsWith("langLevel:")) delete next[ek];
          }
        }
      }
      return next;
    });
  };

  const startOver = () => {
    clearTeachDraft();
    setDraft(makeEmptyDraft(state.session?.email ?? "", state.session?.name ?? ""));
    setStep(0);
    setErrors({});
    setResumed(false);
    onStartedFresh?.();
  };

  const goTo = (n: number) => {
    setStep(n);
    setErrors({});
    // Land focus on the step heading for keyboard users, then scroll it into view.
    requestAnimationFrame(() => {
      headRef.current?.focus();
      headRef.current?.scrollIntoView({ block: "nearest" });
    });
  };

  const validateStep = (n: number, d: TeachDraft): StepErrors => {
    const e: StepErrors = {};
    if (n === 0) {
      if (d.firstName.trim().length < 2) e.firstName = "Two characters minimum — students will use this.";
      if (d.lastName.trim().length < 2) e.lastName = "Two characters minimum.";
      if (!validEmail(d.email)) e.email = "That email doesn't look right — check the @ and the dot.";
      if (!d.country) e.country = "Pick your country — it shows on your profile.";
      if (d.city.trim().length < 2) e.city = "Your city helps with time-zone expectations.";
      if (!d.nativeLanguage) e.nativeLanguage = "Your native language — it anchors your profile.";
    }
    if (n === 1) {
      if (d.subjects.length === 0) {
        e.subjects = "Pick at least one subject — three maximum.";
      }
      for (const sId of d.subjects) {
        const s = subjectById(sId);
        if (s && s.cat === "languages") {
          const level = d.languageLevels[sId] ?? "All levels";
          if (level === "Native speaker" && !subjectCodeMatches(d.nativeLanguage, sId)) {
            e[`langLevel:${sId}`] =
              `${s.label} isn't your native language — pick a proficiency level instead.`;
          }
        }
      }
      if (d.specialties.length < 2) e.specialties = "Choose at least two — they're how students filter.";
      if (d.specialties.length > 5) e.specialties = "Five specialties maximum.";
    }
    if (n === 2) {
      if (d.rate < 5 || d.rate > 80) e.rate = "Rates run $5–$80 per lesson.";
      if (d.headline.trim().length < 8) e.headline = "A touch longer — give the headline at least 8 characters.";
      if (d.headline.trim().length > 70) e.headline = "70 characters keeps it sharp.";
      if (d.bio.trim().length < 160) e.bio = `A little more — ${160 - d.bio.trim().length} characters to go.`;
      if (d.bio.trim().length > 1200) e.bio = "1,200 characters is the ceiling.";
    }
    if (n === 3) {
      if (!d.agree) e.agree = "The review team needs your confirmation first.";
    }
    return e;
  };

  const next = () => {
    const e = validateStep(step, draft);
    setErrors(e);
    const keys = Object.keys(e);
    if (keys.length > 0) {
      const focusId = ERROR_FOCUS[keys.find((k) => ERROR_FOCUS[k]) ?? ""];
      if (focusId) document.getElementById(focusId)?.focus();
      return;
    }
    if (step < STEPS.length - 1) goTo(step + 1);
  };

  return (
    <div className="teach-form-wrap">
      {resumed ? (
        <div className="teach-resume" role="status">
          <Check size={14} aria-hidden style={{ color: "var(--brand)" }} />
          Draft restored — picking up where you left off.
          <button type="button" className="btn btn--ghost btn--sm" onClick={startOver}>
            <RotateCcw size={13} aria-hidden /> Start over
          </button>
        </div>
      ) : null}

      <ol className="teach-steps" aria-label="Application steps">
        {STEPS.map((s, i) => (
          <li
            key={s.label}
            className={cx(
              "teach-step",
              i < step && "teach-step--done",
              i === step && "teach-step--current"
            )}
            aria-current={i === step ? "step" : undefined}
          >
            <button
              type="button"
              className="teach-step-dot"
              disabled={i > step}
              onClick={() => i < step && goTo(i)}
              aria-label={`Step ${i + 1}: ${s.label}${i < step ? " (completed)" : i === step ? " (current)" : ""}`}
            >
              {i < step ? <Check size={14} aria-hidden /> : i + 1}
            </button>
            <span className="teach-step-label">{s.label}</span>
          </li>
        ))}
      </ol>

      <div className="card teach-form">
        <div ref={headRef} tabIndex={-1} style={{ outline: "none" }} />
        {step === 0 ? <StepBasics draft={draft} patch={patch} errors={errors} /> : null}
        {step === 1 ? <StepSubjects draft={draft} patch={patch} errors={errors} /> : null}
        {step === 2 ? <StepLesson draft={draft} patch={patch} errors={errors} /> : null}
        {step === 3 ? (
          <StepReview draft={draft} patch={patch} errors={errors} onEditStep={(s) => goTo(s - 1)} />
        ) : null}

        {step < 3 ? (
          <div className="teach-nav">
            {step > 0 ? (
              <button type="button" className="btn btn--ghost" onClick={() => goTo(step - 1)}>
                Back
              </button>
            ) : (
              <span className="teach-nav-note">everything saves as you type</span>
            )}
            <button type="button" className="btn btn--primary" onClick={next}>
              Continue
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
