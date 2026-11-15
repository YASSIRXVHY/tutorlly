'use client';

/**
 * Wizard step 2 — What you'll teach: up to three subjects across the six
 * categories, a teaching level per language subject (with an honesty check:
 * "Native speaker" only if it truly is), 2–5 specialties, and the other
 * languages the applicant speaks.
 */
import { Plus, X } from "lucide-react";
import { LANG_TEACH_LEVELS, NATIVE_LANGUAGES, SPOKEN_LEVELS } from "../../data/community";
import { CATEGORIES, SPECIALTIES, subjectsForCategory, subjectById } from "../../data/subjects";
import { subjectCodeMatches, spokenLabel, type Level } from "../../data/tutors";
import { ChipToggle } from "./teachFields";
import type { StepProps } from "./StepBasics";

const MAX_SUBJECTS = 3;

export function StepSubjects({ draft, patch, errors }: StepProps) {
  const selected = new Set(draft.subjects);
  const full = draft.subjects.length >= MAX_SUBJECTS;

  const toggleSubject = (id: string) => {
    if (selected.has(id)) {
      const subjects = draft.subjects.filter((s) => s !== id);
      const languageLevels = { ...draft.languageLevels };
      delete languageLevels[id];
      patch({ subjects, languageLevels });
    } else if (!full) {
      patch({ subjects: [...draft.subjects, id] });
    }
  };

  const toggleSpecialty = (s: string) => {
    const has = draft.specialties.includes(s);
    if (has) {
      patch({ specialties: draft.specialties.filter((x) => x !== s) });
    } else if (draft.specialties.length < 5) {
      patch({ specialties: [...draft.specialties, s] });
    }
  };

  const setLangLevel = (subjectId: string, level: string) => {
    patch({ languageLevels: { ...draft.languageLevels, [subjectId]: level } });
  };

  const addSpeak = (code: string) => {
    if (!code) return;
    if (code === draft.nativeLanguage) return;
    if (draft.speaks.some((s) => s.code === code)) return;
    patch({ speaks: [...draft.speaks, { code, level: "B2" as Level }] });
  };

  const setSpeakLevel = (code: string, level: string) => {
    patch({ speaks: draft.speaks.map((s) => (s.code === code ? { ...s, level: level as Level } : s)) });
  };

  const removeSpeak = (code: string) => {
    patch({ speaks: draft.speaks.filter((s) => s.code !== code) });
  };

  const addableLanguages = NATIVE_LANGUAGES.filter(
    (l) => l.code !== draft.nativeLanguage && !draft.speaks.some((s) => s.code === l.code)
  );

  const languageSubjects = draft.subjects
    .map((id) => subjectById(id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s && s.cat === "languages"));

  return (
    <div>
      <header className="teach-step-head">
        <div className="teach-step-kicker">Step 2 of 4</div>
        <h2 className="teach-step-title">What you'll teach</h2>
        <p className="teach-step-sub">
          Tutorly isn't just languages — math, science, code, music and test prep live in the same
          catalogue. Pick up to {MAX_SUBJECTS} subjects; the first one leads your profile.
        </p>
      </header>

      <div className="field">
        <span className="field-label">
          Subjects <span className="field-req" aria-hidden>*</span>{" "}
          <span className="teach-counter" aria-live="polite">
            {draft.subjects.length} of {MAX_SUBJECTS} selected
          </span>
        </span>
        <div className="teach-subject-groups">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <div className="teach-subject-group" key={c.id}>
                <span className="teach-subject-group-label">
                  <Icon size={13} aria-hidden /> {c.label}
                </span>
                <div className="teach-chiprow">
                  {subjectsForCategory(c.id).map((s) => {
                    const on = selected.has(s.id);
                    const disabled = !on && full;
                    return (
                      <ChipToggle
                        key={s.id}
                        on={on}
                        disabled={disabled}
                        onToggle={() => toggleSubject(s.id)}
                        label={`${s.label}${on ? " — selected" : ""}`}
                      >
                        {s.label}
                      </ChipToggle>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        {errors.subjects ? (
          <span className="field-error" role="alert">
            {errors.subjects}
          </span>
        ) : (
          <span className="field-hint">Order matters: tap them in the order you want them shown.</span>
        )}
      </div>

      {languageSubjects.length > 0 ? (
        <div className="field" style={{ marginTop: 18 }}>
          <span className="field-label">Teaching level for your languages</span>
          <div className="teach-lang-rows">
            {languageSubjects.map((s) => {
              const errKey = `langLevel:${s.id}`;
              const isNative = subjectCodeMatches(draft.nativeLanguage, s.id);
              const level = draft.languageLevels[s.id] ?? "All levels";
              return (
                <div key={s.id}>
                  <div className="teach-lang-row">
                    <span className="field-label" style={{ fontWeight: 600 }}>
                      {s.label}
                      {isNative ? <span className="field-hint"> · your native language</span> : null}
                    </span>
                    <select
                      className="select"
                      aria-label={`Teaching level for ${s.label}`}
                      value={level}
                      onChange={(e) => setLangLevel(s.id, e.target.value)}
                    >
                      {LANG_TEACH_LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <span style={{ width: 40 }} aria-hidden />
                  </div>
                  {errors[errKey] ? (
                    <span className="field-error" role="alert" style={{ marginTop: 6 }}>
                      {errors[errKey]}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="field" style={{ marginTop: 18 }}>
        <span className="field-label">
          Specialties <span className="field-req" aria-hidden>*</span>{" "}
          <span className="teach-counter" aria-live="polite">
            {draft.specialties.length} of 5 selected · minimum 2
          </span>
        </span>
        <div className="teach-chiprow">
          {SPECIALTIES.map((s) => {
            const on = draft.specialties.includes(s);
            const disabled = !on && draft.specialties.length >= 5;
            return (
              <ChipToggle
                key={s}
                on={on}
                disabled={disabled}
                onToggle={() => toggleSpecialty(s)}
                label={`${s}${on ? " — selected" : ""}`}
              >
                {s}
              </ChipToggle>
            );
          })}
        </div>
        {errors.specialties ? (
          <span className="field-error" role="alert">
            {errors.specialties}
          </span>
        ) : (
          <span className="field-hint">These become the filterable tags on your profile.</span>
        )}
      </div>

      <div className="field" style={{ marginTop: 18 }}>
        <span className="field-label">Other languages you speak</span>
        <div className="teach-lang-rows">
          {draft.speaks.map((s) => (
            <div className="teach-lang-row" key={s.code}>
              <span className="field-label" style={{ fontWeight: 600 }}>
                {spokenLabel(s.code)}
              </span>
              <select
                className="select"
                aria-label={`Your level in ${spokenLabel(s.code)}`}
                value={s.level}
                onChange={(e) => setSpeakLevel(s.code, e.target.value)}
              >
                {SPOKEN_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="icon-btn icon-btn--sm"
                onClick={() => removeSpeak(s.code)}
                aria-label={`Remove ${spokenLabel(s.code)}`}
              >
                <X size={14} aria-hidden />
              </button>
            </div>
          ))}
          <div className="teach-lang-row">
            <select
              className="select"
              aria-label="Add a language you speak"
              value=""
              onChange={(e) => addSpeak(e.target.value)}
              disabled={addableLanguages.length === 0}
            >
              <option value="">
                {addableLanguages.length === 0 ? "All added — or it's your native one" : "Add a language…"}
              </option>
              {addableLanguages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <span style={{ gridColumn: "2 / -1" }} className="field-hint">
              <Plus size={12} aria-hidden style={{ verticalAlign: -2 }} /> Pick one to add it at
              B2 — adjust the level after.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
