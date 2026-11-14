'use client';

/**
 * Wizard step 3 — Your lesson: the hourly rate (with live market context
 * computed from the real catalogue), experience numbers, the profile
 * headline and the bio. Counters keep the copy inside its honest limits.
 */
import { Lightbulb, TrendingUp } from "lucide-react";
import type { TeachDraft } from "../../data/community";
import { TUTORS } from "../../data/tutors";
import { subjectById } from "../../data/subjects";
import { formatMoney } from "../../utils/misc";
import { CharCount, FieldRow } from "./teachFields";
import type { StepProps } from "./StepBasics";

const RATE_MIN = 5;
const RATE_MAX = 80;

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function StepLesson({ draft, patch, errors }: StepProps) {
  const primary = subjectById(draft.subjects[0] ?? "");
  const peers = primary
    ? TUTORS.filter((t) => t.teaches.some((te) => te.subject === primary.id))
    : [];
  const prices = peers.map((t) => t.price);
  const low = prices.length ? Math.min(...prices) : RATE_MIN;
  const high = prices.length ? Math.max(...prices) : RATE_MAX;
  const mid = prices.length ? median(prices) : Math.round((RATE_MIN + RATE_MAX) / 2);

  const ratePct = ((draft.rate - RATE_MIN) / (RATE_MAX - RATE_MIN)) * 100;
  // 10 lessons a week, Tutorly keeps 18% — the admin console's real number.
  const monthlyKeep = draft.rate * 40 * 0.82;

  const parseNum = (v: string): number => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  };

  return (
    <div>
      <header className="teach-step-head">
        <div className="teach-step-kicker">Step 3 of 4</div>
        <h2 className="teach-step-title">Your lesson</h2>
        <p className="teach-step-sub">
          The number students weigh first, and the words that convince them anyway. Write like
          you talk — the profile is yours.
        </p>
      </header>

      <div className="field">
        <span className="field-label">
          Your rate per 50-minute lesson <span className="field-req" aria-hidden>*</span>
        </span>
        <div className="teach-rate">
          <span className="teach-rate-num num" aria-live="polite">
            {formatMoney(draft.rate)}
            <small>per 50-min lesson</small>
          </span>
          <div className="teach-rate-slider">
            <input
              type="range"
              className="range"
              min={RATE_MIN}
              max={RATE_MAX}
              step={1}
              value={draft.rate}
              aria-label="Your hourly rate in US dollars"
              aria-valuetext={`${formatMoney(draft.rate)} per lesson`}
              onChange={(e) => patch({ rate: Number(e.target.value) })}
              style={{ "--fill": `${ratePct}%` } as React.CSSProperties}
            />
            <div className="teach-rate-market">
              <TrendingUp size={13} aria-hidden />
              {peers.length > 0 ? (
                <span>
                  {peers.length} tutor{peers.length === 1 ? "" : "s"} teaching{" "}
                  {primary?.label} charge{" "}
                  <span className="num">
                    {formatMoney(low)}–{formatMoney(high)}
                  </span>{" "}
                  (median <span className="num">{formatMoney(mid)}</span>).
                </span>
              ) : (
                <span>
                  No one teaches this yet — you'd be first, so the price is entirely yours to set.
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="teach-earn" style={{ marginTop: 12 }}>
          <span className="num">{formatMoney(Math.round(monthlyKeep))}</span>
          <span>
            a month at 10 lessons a week, after the 18% platform fee (you keep 82% of every
            lesson).
          </span>
        </div>
      </div>

      <div className="teach-grid" style={{ marginTop: 18 }}>
        <FieldRow
          id="teach-years"
          label="Years you've been teaching"
          required
          error={errors.yearsTeaching}
          hint="Teaching counts: classrooms, tutoring, workshops — all of it."
        >
          <input
            id="teach-years"
            className="input"
            type="number"
            min={0}
            max={50}
            value={draft.yearsTeaching}
            onChange={(e) => patch({ yearsTeaching: parseNum(e.target.value) })}
          />
        </FieldRow>

        <FieldRow
          id="teach-students"
          label="Students taught (roughly)"
          required
          error={errors.studentsTaught}
          hint="An estimate is fine — it becomes a profile stat."
        >
          <input
            id="teach-students"
            className="input"
            type="number"
            min={0}
            max={10000}
            value={draft.studentsTaught}
            onChange={(e) => patch({ studentsTaught: parseNum(e.target.value) })}
          />
        </FieldRow>
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <span className="field-label">
          Profile headline <span className="field-req" aria-hidden>*</span>
        </span>
        <CharCount value={draft.headline.trim().length} min={8} max={70} />
        <input
          id="teach-headline"
          className="input"
          value={draft.headline}
          maxLength={80}
          aria-describedby="teach-headline-hint"
          onChange={(e) => patch({ headline: e.target.value })}
          placeholder="One promise, in your own voice — e.g. “Calculus for people who swear they hate it.”"
        />
        {errors.headline ? (
          <span className="field-error" role="alert">
            {errors.headline}
          </span>
        ) : (
          <span className="field-hint" id="teach-headline-hint">
            This line follows your name everywhere — search cards, messages, the classroom.
          </span>
        )}
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <span className="field-label">
          About you &amp; your lessons <span className="field-req" aria-hidden>*</span>
        </span>
        <CharCount value={draft.bio.trim().length} min={160} max={1200} />
        <textarea
          id="teach-bio"
          className="textarea"
          rows={7}
          value={draft.bio}
          maxLength={1300}
          aria-describedby="teach-bio-hint"
          onChange={(e) => patch({ bio: e.target.value })}
          placeholder="Who you are, how a lesson with you actually runs, and who you love teaching…"
        />
        {errors.bio ? (
          <span className="field-error" role="alert">
            {errors.bio}
          </span>
        ) : (
          <span className="field-hint" id="teach-bio-hint">
            Students read this before booking. 160–1200 characters.
          </span>
        )}
        <ul className="teach-tips">
          <li>
            <Lightbulb size={12} aria-hidden style={{ verticalAlign: -1 }} /> Name your method:
            drills, conversation-first, past papers, projects…
          </li>
          <li>Say who you're best for — absolute beginners, exam sprinters, shy speakers.</li>
          <li>One concrete detail beats three adjectives: “we start every lesson with your homework questions.”</li>
        </ul>
      </div>
    </div>
  );
}
