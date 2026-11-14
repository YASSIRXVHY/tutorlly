'use client';

/**
 * Browse — the marketplace search page. The URL is the only filter state:
 * every control (rail, chips, sort, search box) patches the query string and
 * this component is a pure function of that string. 12 tutors, 28 subjects,
 * and nothing on this page that doesn't actually filter.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Search, SearchX, SlidersHorizontal, X } from "lucide-react";
import { navigate, useRoute } from "../router/router";
import { TUTORS, nativeTaughtLanguage } from "../data/tutors";
import { availableThisWeek } from "../data/availability";
import { TutorCard } from "../components/tutors/TutorCard";
import { EmptyState } from "../components/common/atoms";
import { Modal, ModalHead } from "../components/common/Modal";
import {
  FilterSidebar,
  PRICE_MAX,
  SORT_OPTIONS,
  activeChips,
  filterAndSort,
  parseFilters,
  toBrowseUrl,
  type FilterPatch,
  type SortKey,
} from "../components/browse/FilterSidebar";

import "../styles/browse.css";

const ALL_TUTORS = TUTORS.length;

/** Strip every filter but keep the sort — the “browse everyone” reset. */
const CLEAR_FILTERS: FilterPatch = {
  cat: "",
  subjects: [],
  q: "",
  max: PRICE_MAX,
  rating: 0,
  native: false,
  week: false,
  spec: [],
};

export function BrowsePage() {
  const { query } = useRoute();
  const filters = useMemo(() => parseFilters(query), [query]);

  /* First paint is a designed skeleton — the catalogue is local, but a
     marketplace that never loads anything feels like a lie. */
  const [booted, setBooted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBooted(true), 450);
    return () => clearTimeout(t);
  }, []);

  /* availableThisWeek scans 7 days per tutor — compute once per mount,
     not once per card. */
  const nativeIds = useMemo(
    () => new Set(TUTORS.filter((t) => nativeTaughtLanguage(t)).map((t) => t.id)),
    []
  );
  const weekIds = useMemo(
    () => new Set(TUTORS.filter((t) => availableThisWeek(t)).map((t) => t.id)),
    []
  );

  const results = useMemo(
    () => filterAndSort(filters, nativeIds, weekIds),
    [filters, nativeIds, weekIds]
  );

  /* All mutations funnel through patch(): merge into the URL, navigate.
     The ref keeps debounced callbacks from acting on a stale snapshot. */
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);
  const patch = useCallback((p: FilterPatch) => {
    navigate(toBrowseUrl({ ...filtersRef.current, ...p }));
  }, []);
  const patchRef = useRef(patch);
  useEffect(() => {
    patchRef.current = patch;
  }, [patch]);

  /* The one controlled input that needs instant echo: the search box keeps a
     keystroke buffer. It syncs from the URL when the URL moves (chip X,
     deep link) and pushes back, debounced, while you type. Results still
     derive from the URL alone. */
  const [draft, setDraft] = useState(filters.q);
  useEffect(() => {
    setDraft(filters.q);
  }, [filters.q]);
  useEffect(() => {
    if (draft === filters.q) return;
    const t = setTimeout(() => patchRef.current({ q: draft }), 220);
    return () => clearTimeout(t);
  }, [draft, filters.q]);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const chips = useMemo(() => activeChips(filters), [filters]);
  const activeCount = chips.length;
  /* Re-keyed when the result set or sort changes: the cards re-mount and
     play their fade-up — the “settling” after a filter change. */
  const gridKey = `${filters.sort}:${results.map((t) => t.id).join("|")}`;

  return (
    <div className="container br-page">
      <header className="br-head">
        <span className="mono-label br-kicker">Find tutors</span>
        <h1 className="br-title">Find your tutor</h1>
        <p className="mono-label br-sub" aria-live="polite">
          <span className="num br-sub-count">{results.length}</span>
          {` of ${ALL_TUTORS} tutors · filters that actually filter`}
        </p>
      </header>

      <div className="br-layout">
        <aside className="br-side card card--pad scroll-quiet" aria-label="Filter tutors">
          <FilterSidebar
            filters={filters}
            onPatch={patch}
            nativeCount={nativeIds.size}
            weekCount={weekIds.size}
          />
        </aside>

        <div className="br-results">
          <div className="br-toolbar">
            <div className="br-toolrow">
              <button
                type="button"
                className="btn btn--outline br-filters-btn"
                onClick={() => setDrawerOpen(true)}
                aria-haspopup="dialog"
              >
                <SlidersHorizontal size={15} aria-hidden />
                Filters
                {activeCount > 0 ? <span className="badge">{activeCount}</span> : null}
              </button>
              <div className="br-search">
                <Search size={16} className="br-search-ico" aria-hidden />
                <input
                  className="input br-search-input"
                  type="search"
                  placeholder="Name, subject, specialty…"
                  aria-label="Search tutors"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
              </div>
              <select
                className="select br-sort-select"
                aria-label="Sort results"
                value={filters.sort}
                onChange={(e) => patch({ sort: e.target.value as SortKey })}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {activeCount > 0 ? (
              <div className="br-chipsrow br-anim" key={activeCount}>
                {chips.map((c) => (
                  <span className="chip chip--removable" key={c.key}>
                    {c.label}
                    <button
                      type="button"
                      className="chip-x"
                      aria-label={`Remove filter: ${c.a11y}`}
                      onClick={() => patch(c.clear)}
                    >
                      <X size={11} aria-hidden />
                    </button>
                  </span>
                ))}
                {activeCount >= 2 ? (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => patch(CLEAR_FILTERS)}
                  >
                    Clear all
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {!booted ? (
            <SkeletonGrid />
          ) : results.length === 0 ? (
            <div className="card br-empty br-anim">
              <EmptyState
                icon={SearchX}
                title="No tutors match those filters"
                actions={
                  <>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => navigate("/browse")}
                    >
                      Clear all filters
                    </button>
                    <button
                      type="button"
                      className="btn btn--outline"
                      onClick={() => patch(CLEAR_FILTERS)}
                    >
                      Browse everyone
                    </button>
                  </>
                }
              >
                The filters are doing their job — a bit too well. Loosen the price
                ceiling or clear a filter or two.
              </EmptyState>
            </div>
          ) : (
            <div className="br-grid" key={gridKey}>
              {results.map((t) => (
                <TutorCard key={t.id} tutor={t} />
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        variant="left"
        label="Filters"
      >
        <ModalHead kicker="Browse" title="Filters" onClose={() => setDrawerOpen(false)} />
        <div className="modal-body">
          <FilterSidebar
            filters={filters}
            onPatch={patch}
            nativeCount={nativeIds.size}
            weekCount={weekIds.size}
          />
        </div>
        <div className="modal-foot">
          {activeCount > 0 ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => patch(CLEAR_FILTERS)}
            >
              Clear all
            </button>
          ) : (
            <span className="mono-label">No filters yet</span>
          )}
          <button
            type="button"
            className="btn btn--accent"
            onClick={() => setDrawerOpen(false)}
          >
            Show {results.length} {results.length === 1 ? "result" : "results"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

/* ================= first-paint skeleton ================= */

function SkeletonGrid() {
  return (
    <div className="br-grid br-anim" role="status" aria-label="Loading tutors" aria-busy="true">
      {[0, 1, 2, 3].map((i) => (
        <div className="br-sk card" key={i} aria-hidden>
          <div className="br-sk-main">
            <span className="skeleton br-sk-ava" />
            <div className="br-sk-lines">
              <span className="skeleton br-sk-l" style={{ width: "62%" }} />
              <span className="skeleton br-sk-l" style={{ width: "45%" }} />
              <span className="skeleton br-sk-l" style={{ width: "86%" }} />
            </div>
          </div>
          <div className="br-sk-chips">
            <span className="skeleton br-sk-chip" />
            <span className="skeleton br-sk-chip" />
            <span className="skeleton br-sk-chip" />
          </div>
          <div className="br-sk-foot">
            <span className="skeleton br-sk-price" />
            <span className="skeleton br-sk-btn" />
          </div>
        </div>
      ))}
    </div>
  );
}
