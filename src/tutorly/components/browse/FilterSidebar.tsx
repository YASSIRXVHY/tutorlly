'use client';

/**
 * FilterSidebar — the browse page's control column. It renders exactly what
 * the URL says and reports every change upward via onPatch; it keeps no
 * filter state of its own, so the desktop rail and the mobile drawer can
 * never disagree. The URL parse/build helpers live here too, next to the
 * controls that write them.
 */
import { useId } from "react";
import type { CSSProperties, ReactNode } from "react";
import { LayoutGrid, Star } from "lucide-react";
import {
  CATEGORIES,
  SPECIALTIES,
  SUBJECTS,
  categoryById,
  subjectById,
  subjectsForCategory,
} from "../../data/subjects";
import { TUTORS, tutorSubjects, type Tutor } from "../../data/tutors";
import { clamp, cx } from "../../utils/misc";

/* ================= URL plumbing ================= */

export type SortKey = "top" | "reviews" | "experience" | "price-asc" | "price-desc";

export const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: "top", label: "Top rated" },
  { value: "reviews", label: "Most reviewed" },
  { value: "experience", label: "Most experienced" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

/** Every filter the browse URL can carry — this is the page's whole state. */
export interface BrowseFilters {
  cat: string; // category id, "" = all six
  subjects: string[]; // subject ids, multi-select, OR semantics
  q: string; // free text
  max: number; // price ceiling, PRICE_MIN..PRICE_MAX
  rating: number; // 0 = any, else 4.5 | 4.7 | 4.8
  native: boolean; // only tutors teaching a language they speak natively
  week: boolean; // only tutors with an open slot in the next 7 days
  spec: string[]; // specialty names, multi-select, OR semantics
  sort: SortKey;
}

export type FilterPatch = Partial<BrowseFilters>;

export const PRICE_MIN = 10;
export const PRICE_MAX = 40;

const RATINGS: readonly number[] = [4.5, 4.7, 4.8];
const SORT_VALUES = new Set<string>(SORT_OPTIONS.map((o) => o.value));
const SPECIALTY_SET = new Set<string>(SPECIALTIES);

/** Cheapest lesson in the catalogue — the honest floor for the price note. */
const MIN_LISTED = Math.min(...TUTORS.map((t) => t.price));

const RATING_CHOICES: ReadonlyArray<{ value: number; label: string }> = [
  { value: 0, label: "Any" },
  { value: 4.5, label: "4.5+" },
  { value: 4.7, label: "4.7+" },
  { value: 4.8, label: "4.8+" },
];

/** The URL is the source of truth — parse it defensively, ignore junk. */
export function parseFilters(query: Record<string, string>): BrowseFilters {
  const rawMax = Number.parseInt(query.max ?? "", 10);
  const rawRating = Number(query.rating);
  const sort =
    query.sort && SORT_VALUES.has(query.sort) ? (query.sort as SortKey) : "top";
  return {
    cat: CATEGORIES.some((c) => c.id === query.cat) ? query.cat : "",
    subjects: [
      ...new Set(
        (query.subject ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter((id) => SUBJECTS.some((s) => s.id === id))
      ),
    ],
    q: query.q ?? "",
    max: Number.isFinite(rawMax) ? clamp(rawMax, PRICE_MIN, PRICE_MAX) : PRICE_MAX,
    rating: RATINGS.includes(rawRating) ? rawRating : 0,
    native: query.native === "1",
    week: query.week === "1",
    spec: [
      ...new Set(
        (query.spec ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter((s) => SPECIALTY_SET.has(s))
      ),
    ],
    sort,
  };
}

/** Filters → /browse URL, skipping defaults so shared links stay short. */
export function toBrowseUrl(f: BrowseFilters): string {
  const p = new URLSearchParams();
  if (f.cat) p.set("cat", f.cat);
  if (f.subjects.length) p.set("subject", f.subjects.join(","));
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.max < PRICE_MAX) p.set("max", String(f.max));
  if (f.rating > 0) p.set("rating", String(f.rating));
  if (f.native) p.set("native", "1");
  if (f.week) p.set("week", "1");
  if (f.spec.length) p.set("spec", f.spec.join(","));
  if (f.sort !== "top") p.set("sort", f.sort);
  const qs = p.toString();
  return qs ? `/browse?${qs}` : "/browse";
}

/* ================= filtering & sorting (pure) ================= */

/** Free text matches name, tagline, subject labels (incl. native names)
    and specialties — every word must appear somewhere. */
function matchesQuery(t: Tutor, words: string[]): boolean {
  if (words.length === 0) return true;
  const subjects = tutorSubjects(t)
    .map((s) => `${s.label} ${s.nativeLabel ?? ""}`)
    .join(" ");
  const hay = `${t.name} ${t.tagline} ${subjects} ${t.specialties.join(" ")}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

/** The composable pipeline: category → subjects → text → price → rating →
    native → week → specialties (OR), then the chosen sort order. */
export function filterAndSort(
  f: BrowseFilters,
  nativeIds: Set<string>,
  weekIds: Set<string>
): Tutor[] {
  const cat = f.cat ? categoryById(f.cat) : undefined;
  const catSubjectIds = cat
    ? new Set(subjectsForCategory(cat.id).map((s) => s.id))
    : null;
  const subjectIds = new Set(f.subjects);
  const specSet = new Set(f.spec);
  const words = f.q.trim().toLowerCase().split(/\s+/).filter(Boolean);

  const out = TUTORS.filter((t) => {
    if (catSubjectIds && !tutorSubjects(t).some((s) => catSubjectIds.has(s.id)))
      return false;
    if (subjectIds.size > 0 && !t.teaches.some((te) => subjectIds.has(te.subject)))
      return false;
    if (!matchesQuery(t, words)) return false;
    if (t.price > f.max) return false;
    if (f.rating > 0 && t.rating < f.rating) return false;
    if (f.native && !nativeIds.has(t.id)) return false;
    if (f.week && !weekIds.has(t.id)) return false;
    if (specSet.size > 0 && !t.specialties.some((s) => specSet.has(s))) return false;
    return true;
  });

  const bySort: Record<SortKey, (a: Tutor, b: Tutor) => number> = {
    top: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
    reviews: (a, b) => b.reviewCount - a.reviewCount,
    experience: (a, b) => b.lessonsTaught - a.lessonsTaught,
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
  };
  return out.sort(bySort[f.sort]);
}

/* ================= active-filter chips ================= */

export interface ActiveChip {
  key: string;
  label: ReactNode;
  a11y: string;
  clear: FilterPatch;
}

/** One removable chip per active filter, in a stable order. */
export function activeChips(f: BrowseFilters): ActiveChip[] {
  const chips: ActiveChip[] = [];
  const cat = f.cat ? categoryById(f.cat) : undefined;
  if (cat) chips.push({ key: "cat", label: cat.label, a11y: cat.label, clear: { cat: "" } });
  for (const id of f.subjects) {
    const s = subjectById(id);
    if (s)
      chips.push({
        key: `subject:${id}`,
        label: s.label,
        a11y: s.label,
        clear: { subjects: f.subjects.filter((x) => x !== id) },
      });
  }
  const q = f.q.trim();
  if (q) chips.push({ key: "q", label: `“${q}”`, a11y: `search ${q}`, clear: { q: "" } });
  if (f.max < PRICE_MAX)
    chips.push({
      key: "max",
      label: `≤ $${f.max}`,
      a11y: `max price $${f.max} per lesson`,
      clear: { max: PRICE_MAX },
    });
  if (f.rating > 0)
    chips.push({
      key: "rating",
      label: (
        <>
          {f.rating}+
          <Star size={11} className="br-chip-star" aria-hidden />
        </>
      ),
      a11y: `rating ${f.rating} and up`,
      clear: { rating: 0 },
    });
  if (f.native)
    chips.push({
      key: "native",
      label: "Native speakers",
      a11y: "native speakers",
      clear: { native: false },
    });
  if (f.week)
    chips.push({
      key: "week",
      label: "This week",
      a11y: "available this week",
      clear: { week: false },
    });
  for (const name of f.spec) {
    chips.push({
      key: `spec:${name}`,
      label: name,
      a11y: name,
      clear: { spec: f.spec.filter((x) => x !== name) },
    });
  }
  return chips;
}

/* ================= honest counts (whole catalogue, unfiltered) ================= */

const CAT_COUNT = new Map<string, number>();
const SUBJ_COUNT = new Map<string, number>();
const SPEC_COUNT = new Map<string, number>();
for (const t of TUTORS) {
  for (const cat of new Set(tutorSubjects(t).map((s) => s.cat))) {
    CAT_COUNT.set(cat, (CAT_COUNT.get(cat) ?? 0) + 1);
  }
  for (const te of t.teaches) {
    SUBJ_COUNT.set(te.subject, (SUBJ_COUNT.get(te.subject) ?? 0) + 1);
  }
  for (const sp of t.specialties) {
    SPEC_COUNT.set(sp, (SPEC_COUNT.get(sp) ?? 0) + 1);
  }
}

/* ================= the sidebar ================= */

interface FilterSidebarProps {
  filters: BrowseFilters;
  /** Merge a change into the URL — the page owns navigation. */
  onPatch: (patch: FilterPatch) => void;
  /** Quick-filter tallies over the full catalogue, for the switch rows. */
  nativeCount: number;
  weekCount: number;
}

export function FilterSidebar({
  filters,
  onPatch,
  nativeCount,
  weekCount,
}: FilterSidebarProps) {
  const catLabelId = useId();
  const subjLabelId = useId();
  const priceLabelId = useId();
  const ratingLabelId = useId();
  const specLabelId = useId();

  const activeCat = CATEGORIES.find((c) => c.id === filters.cat);
  // One list, two shapes: a category shows its own subjects; "all" shows
  // every subject grouped under its category, so nothing is hidden.
  const groups = activeCat
    ? [{ key: activeCat.id, label: "", subjects: subjectsForCategory(activeCat.id) }]
    : CATEGORIES.map((c) => ({
        key: c.id,
        label: c.label,
        subjects: subjectsForCategory(c.id),
      }));

  const toggle = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  return (
    <div className="br-filters">
      {/* ---- category ---- */}
      <section className="br-fgroup" aria-labelledby={catLabelId}>
        <h3 className="mono-label br-flabel" id={catLabelId}>
          Category
        </h3>
        <div className="br-catlist" role="radiogroup" aria-labelledby={catLabelId}>
          <button
            type="button"
            role="radio"
            aria-checked={!activeCat}
            className={cx("br-catitem", !activeCat && "br-catitem--on")}
            onClick={() => onPatch({ cat: "" })}
          >
            <LayoutGrid size={15} className="br-catitem-ico" aria-hidden />
            <span className="br-catitem-label">All subjects</span>
            <span className="br-catitem-count num">{TUTORS.length}</span>
          </button>
          {CATEGORIES.map((c) => {
            const on = activeCat?.id === c.id;
            const Icon = c.icon;
            return (
              <button
                type="button"
                role="radio"
                aria-checked={on}
                key={c.id}
                className={cx("br-catitem", on && "br-catitem--on")}
                onClick={() => onPatch({ cat: c.id, subjects: [] })}
              >
                <Icon size={15} className="br-catitem-ico" aria-hidden />
                <span className="br-catitem-label">{c.label}</span>
                <span className="br-catitem-count num">
                  {CAT_COUNT.get(c.id) ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ---- subjects ---- */}
      <section className="br-fgroup" aria-labelledby={subjLabelId}>
        <h3 className="mono-label br-flabel" id={subjLabelId}>
          Subjects
        </h3>
        <p className="field-hint">
          Pick as many as you like — a tutor who teaches any of them shows up.
        </p>
        <div
          className="br-sublist scroll-quiet"
          role="group"
          aria-labelledby={subjLabelId}
        >
          {groups.map((g) => (
            <div className="br-subgroup" key={g.key}>
              {g.label ? (
                <div className="br-subgroup-head mono-label">{g.label}</div>
              ) : null}
              {g.subjects.map((s) => (
                <CheckRow
                  key={s.id}
                  label={s.label}
                  note={s.nativeLabel}
                  count={SUBJ_COUNT.get(s.id) ?? 0}
                  checked={filters.subjects.includes(s.id)}
                  onToggle={() => onPatch({ subjects: toggle(filters.subjects, s.id) })}
                />
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ---- max price ---- */}
      <section className="br-fgroup" aria-labelledby={priceLabelId}>
        <h3 className="mono-label br-flabel" id={priceLabelId}>
          Max price
        </h3>
        <div className="br-price-row">
          <input
            type="range"
            className="range"
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={1}
            value={filters.max}
            aria-labelledby={priceLabelId}
            aria-valuetext={`up to $${filters.max} per lesson`}
            onChange={(e) =>
              onPatch({ max: clamp(Number(e.target.value), PRICE_MIN, PRICE_MAX) })
            }
            style={
              {
                "--fill": `${((filters.max - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100}%`,
              } as CSSProperties
            }
          />
          <span className="br-price-val">
            <strong className="num">${filters.max}</strong>
            <span className="br-price-per">/lesson</span>
          </span>
        </div>
        <p className="field-hint">
          {TUTORS.length} tutors, from ${MIN_LISTED} a lesson.
        </p>
      </section>

      {/* ---- rating ---- */}
      <section className="br-fgroup" aria-labelledby={ratingLabelId}>
        <h3 className="mono-label br-flabel" id={ratingLabelId}>
          Rating
        </h3>
        <div
          className="segmented segmented--full"
          role="radiogroup"
          aria-labelledby={ratingLabelId}
        >
          {RATING_CHOICES.map((r) => (
            <button
              type="button"
              role="radio"
              key={r.label}
              aria-checked={filters.rating === r.value}
              className={cx(
                "segmented-item",
                filters.rating === r.value && "segmented-item--on"
              )}
              onClick={() => onPatch({ rating: r.value })}
            >
              {r.label}
            </button>
          ))}
        </div>
      </section>

      {/* ---- quick filters ---- */}
      <section className="br-fgroup">
        <h3 className="mono-label br-flabel">Quick filters</h3>
        <div className="br-switchrow">
          <div className="br-switch-head">
            <label className="switch">
              <input
                className="switch-input"
                type="checkbox"
                checked={filters.native}
                onChange={(e) => onPatch({ native: e.target.checked })}
              />
              <span className="switch-track" aria-hidden />
              <span className="switch-text">Native-language tutors</span>
            </label>
            <span className="br-switch-count num">
              {nativeCount} of {TUTORS.length}
            </span>
          </div>
          <p className="field-hint">Tutors teaching a language they speak natively.</p>
        </div>
        <div className="br-switchrow">
          <div className="br-switch-head">
            <label className="switch">
              <input
                className="switch-input"
                type="checkbox"
                checked={filters.week}
                onChange={(e) => onPatch({ week: e.target.checked })}
              />
              <span className="switch-track" aria-hidden />
              <span className="switch-text">Available this week</span>
            </label>
            <span className="br-switch-count num">
              {weekCount} of {TUTORS.length}
            </span>
          </div>
          <p className="field-hint">Has an open slot in the next 7 days.</p>
        </div>
      </section>

      {/* ---- specialties ---- */}
      <section className="br-fgroup" aria-labelledby={specLabelId}>
        <h3 className="mono-label br-flabel" id={specLabelId}>
          Specialties
        </h3>
        <div className="br-sublist scroll-quiet" role="group" aria-labelledby={specLabelId}>
          {SPECIALTIES.map((name) => (
            <CheckRow
              key={name}
              label={name}
              count={SPEC_COUNT.get(name) ?? 0}
              checked={filters.spec.includes(name)}
              onToggle={() => onPatch({ spec: toggle(filters.spec, name) })}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

/* ---- one checkbox row, in the shared .checkrow idiom ---- */

function CheckRow({
  label,
  note,
  count,
  checked,
  onToggle,
}: {
  label: string;
  note?: string;
  count: number;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="checkrow">
      <input className="checkrow-input" type="checkbox" checked={checked} onChange={onToggle} />
      <span className="checkrow-box" aria-hidden>
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 12.5 4 8" />
        </svg>
      </span>
      <span className={cx("br-checkrow-label", count === 0 && "br-checkrow-label--zero")}>
        {label}
        {note ? <span className="br-checkrow-note"> · {note}</span> : null}
      </span>
      <span className="checkrow-count num">{count}</span>
    </label>
  );
}
