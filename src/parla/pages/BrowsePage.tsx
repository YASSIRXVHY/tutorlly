'use client';

/**
 * Browse — the staff catalogue. Filter rail (language, max price, min rating,
 * native-only, open-this-week, specialties), removable chips, five sort
 * orders, live count, designed empty state, loading skeletons.
 */
import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { TUTORS, tutorLanguage, SPECIALTIES } from "../data/tutors";
import { LANGUAGES } from "../data/languages";
import { availableThisWeek } from "../data/availability";
import { TutorCard } from "../components/tutors/TutorCard";
import { BookingFlow } from "../components/booking/BookingFlow";
import { SkelTutorCard, EmptyState } from "../components/common/atoms";
import { useRoute } from "../router/router";
import { cx } from "../utils/misc";
type SortKey = "recommended" | "price-asc" | "price-desc" | "rating" | "popularity";

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "recommended", label: "Recommended" },
  { key: "price-asc", label: "Price · low to high" },
  { key: "price-desc", label: "Price · high to low" },
  { key: "rating", label: "Highest rated" },
  { key: "popularity", label: "Most booked" },
];

const PRICE_FLOOR = 15;
const PRICE_CEIL = 32;

export function BrowsePage() {
  const route = useRoute();
  // A language can arrive via global search (?lang=ko) or the home tiles —
  // remounting on it gives the page a fresh, deterministic view of that language.
  const q = route.query.lang;
  const initialLang = q && LANGUAGES.some((l) => l.code === q) ? q : "all";
  return <BrowseInner key={initialLang} initialLang={initialLang} />;
}

function BrowseInner({ initialLang }: { initialLang: string }) {
  const [lang, setLang] = useState<string>(initialLang);
  const [maxPrice, setMaxPrice] = useState<number>(PRICE_CEIL);
  const [minRating, setMinRating] = useState<number>(0);
  const [nativeOnly, setNativeOnly] = useState(false);
  const [openThisWeek, setOpenThisWeek] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("recommended");
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    // The staff page is "being typeset" for half a second on arrival.
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const [bookingTutorId, setBookingTutorId] = useState<string | null>(null);

  // Filter+sort pipeline (deterministic, pure).
  const availabilityByTutor = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const t of TUTORS) map.set(t.id, availableThisWeek(t));
    return map;
  }, []);

  const results = useMemo(() => {
    let list = TUTORS.filter((t) => {
      if (lang !== "all" && t.lang !== lang) return false;
      if (t.price > maxPrice) return false;
      if (t.rating < minRating) return false;
      if (nativeOnly && !t.native) return false;
      if (openThisWeek && !availabilityByTutor.get(t.id)) return false;
      if (!specialties.every((s) => t.specialties.includes(s as never))) return false;
      return true;
    });
    list = [...list];
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list.sort((a, b) => b.rating - a.rating || b.lessonsTaught - a.lessonsTaught);
        break;
      case "popularity":
        list.sort((a, b) => b.students - a.students);
        break;
      default:
        list.sort(
          (a, b) =>
            b.rating * 40 +
            b.students / 60 +
            (availabilityByTutor.get(b.id) ? 6 : 0) -
            (a.rating * 40 + a.students / 60 + (availabilityByTutor.get(a.id) ? 6 : 0))
        );
    }
    return list;
  }, [lang, maxPrice, minRating, nativeOnly, openThisWeek, specialties, sort, availabilityByTutor]);

  const resetFilters = () => {
    setLang("all");
    setMaxPrice(PRICE_CEIL);
    setMinRating(0);
    setNativeOnly(false);
    setOpenThisWeek(false);
    setSpecialties([]);
    setSort("recommended");
  };

  const activeFilters =
    (lang !== "all" ? 1 : 0) +
    (maxPrice < PRICE_CEIL ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (nativeOnly ? 1 : 0) +
    (openThisWeek ? 1 : 0) +
    specialties.length;

  const langCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of TUTORS) m.set(t.lang, (m.get(t.lang) ?? 0) + 1);
    return m;
  }, []);

  const specialtyCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of TUTORS) for (const s of t.specialties) m.set(s, (m.get(s) ?? 0) + 1);
    return m;
  }, []);

  return (
    <div className="page">
      <div className="container">
        <div className="page-head">
          <span className="kicker">The staff catalogue</span>
          <h1 className="page-title">Browse the tutors</h1>
          <p className="page-sub">
            Twelve tutors, eleven languages, one standard. Every profile carries a
            rating built from verified lessons, and a calendar that updates as you read.
          </p>
        </div>

        <div className={cx("split", !filtersOpen && "browse-sidebar-collapsed")}>
          <aside className="sidebar" aria-label="Filters">
            <button
              type="button"
              className="btn btn--sm filters-toggle"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontal size={13} aria-hidden className="btn-ico" />
              {filtersOpen ? "Hide filters" : `Filters${activeFilters > 0 ? ` (${activeFilters})` : ""}`}
            </button>

            <div className="filterblock">
              <div className="filterblock-head">
                <span className="filterblock-title">Language</span>
                {(lang !== "all" || activeFilters > 0) && (
                  <button type="button" className="linkbtn" onClick={resetFilters}>
                    <RotateCcw size={11} aria-hidden /> Reset all
                  </button>
                )}
              </div>
              <select
                className="select"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                aria-label="Filter by language"
              >
                <option value="all">All languages (11)</option>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} ({langCounts.get(l.code) ?? 0})
                  </option>
                ))}
              </select>
            </div>

            <div className="filterblock">
              <span className="filterblock-title">Max price</span>
              <div className="price-readout">
                <span className="price-range">
                  ${PRICE_FLOOR}–<span className="price-max">${maxPrice}</span>
                </span>
                <span className="mono-label">per lesson</span>
              </div>
              <input
                type="range"
                className="range"
                min={PRICE_FLOOR}
                max={PRICE_CEIL}
                step={1}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                aria-label="Maximum price per lesson"
                aria-valuetext={`${maxPrice} dollars per lesson`}
              />
              <span className="field-hint">
                {results.length} of 12 tutors at or under ${maxPrice}.
              </span>
            </div>

            <div className="filterblock">
              <span className="filterblock-title">Minimum rating</span>
              <select
                className="select"
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                aria-label="Filter by minimum rating"
              >
                <option value={0}>Any rating</option>
                <option value={4.5}>4.5 and up</option>
                <option value={4.7}>4.7 and up</option>
                <option value={4.8}>4.8 and up</option>
              </select>
            </div>

            <label className="switch filterblock">
              <input
                type="checkbox"
                checked={nativeOnly}
                onChange={(e) => setNativeOnly(e.target.checked)}
              />
              <span className="switch-track" aria-hidden />
              <span className="switch-copy">
                <span className="mono-label">Native speakers only</span>
                <span className="filter-note">
                  Eleven of twelve teach their mother tongue — Grace teaches English she
                  sharpened to C2.
                </span>
              </span>
            </label>

            <label className="switch filterblock">
              <input
                type="checkbox"
                checked={openThisWeek}
                onChange={(e) => setOpenThisWeek(e.target.checked)}
              />
              <span className="switch-track" aria-hidden />
              <span className="switch-copy">
                <span className="mono-label">Available this week</span>
                <span className="filter-note">Has at least one open slot, next 7 days.</span>
              </span>
            </label>

            <div className="filterblock">
              <span className="filterblock-title">Specialties</span>
              {SPECIALTIES.map((s) => (
                  <label key={s} className="check">
                    <input
                      type="checkbox"
                      checked={specialties.includes(s)}
                      onChange={(e) =>
                        setSpecialties((prev) =>
                          e.target.checked ? [...prev, s] : prev.filter((x) => x !== s)
                        )
                      }
                    />
                    <span className="check-box">
                      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                        <path d="M1.5 6.5l3 3 6-7" />
                      </svg>
                    </span>
                    <span className="check-text">{s}</span>
                    <span className="check-count num">{specialtyCounts.get(s) ?? 0}</span>
                  </label>
                )
              )}
            </div>
          </aside>

          <div>
            <div className="results-head">
              <div className="results-count">
                <span className="results-number num">{results.length}</span>
                <span className="results-word">
                  {results.length === 1 ? "tutor on the staff" : "tutors on the staff"}
                </span>
              </div>
              <div className="results-tools">
                <label className="mono-label" htmlFor="sort-select">
                  Sort
                </label>
                <select
                  id="sort-select"
                  className="select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                >
                  {SORTS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {activeFilters > 0 && (
              <div className="filterchips" aria-label="Active filters">
                {lang !== "all" && (
                  <FilterChip
                    label={tutorLanguage(TUTORS.find((t) => t.lang === lang)!).name}
                    onRemove={() => setLang("all")}
                  />
                )}
                {maxPrice < PRICE_CEIL && (
                  <FilterChip
                    label={`≤ $${maxPrice} / lesson`}
                    onRemove={() => setMaxPrice(PRICE_CEIL)}
                  />
                )}
                {minRating > 0 && (
                  <FilterChip label={`${minRating}+ rating`} onRemove={() => setMinRating(0)} />
                )}
                {nativeOnly && (
                  <FilterChip label="Native speakers" onRemove={() => setNativeOnly(false)} />
                )}
                {openThisWeek && (
                  <FilterChip label="Open this week" onRemove={() => setOpenThisWeek(false)} />
                )}
                {specialties.map((s) => (
                  <FilterChip
                    key={s}
                    label={s}
                    onRemove={() => setSpecialties((prev) => prev.filter((x) => x !== s))}
                  />
                ))}
                {activeFilters > 1 && (
                  <button type="button" className="chip chip--removable" onClick={resetFilters}>
                    <RotateCcw size={10} aria-hidden /> Clear all
                  </button>
                )}
              </div>
            )}

            {loading ? (
              <div className="grid-3" aria-label="Loading tutors">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkelTutorCard key={i} />
                ))}
                <span className="sr-only">The staff page is being typeset…</span>
              </div>
            ) : results.length === 0 ? (
              <EmptyState
                mark="Press stopped"
                title="No tutor matches these filters"
                action={
                  <button type="button" className="btn btn--solid" onClick={resetFilters}>
                    Reset the page
                  </button>
                }
              >
                Even our most liberal editor cannot find a tutor within these margins.
                Loosen a filter — or reset the page and browse the full staff of twelve.
              </EmptyState>
            ) : (
              <div className="grid-3">
                {results.map((t) => (
                  <TutorCard
                    key={t.id}
                    tutor={t}
                    openThisWeek={availabilityByTutor.get(t.id)}
                    onBook={(tutor) => setBookingTutorId(tutor.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <BookingFlow
        tutorId={bookingTutorId}
        onClose={() => setBookingTutorId(null)}
      />
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button type="button" className="chip chip--removable" onClick={onRemove}>
      {label}
      <span className="chip__x" role="none">
        <svg viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M1 1l8 8M9 1l-8 8" />
        </svg>
      </span>
    </button>
  );
}
