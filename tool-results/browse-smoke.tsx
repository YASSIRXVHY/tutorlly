/* Smoke test for the Tutorly BrowsePage — pure-function assertions plus a
   server render of the whole tree. Scratch file; deleted after the run. */
import { renderToString } from "react-dom/server";
import { AppProvider } from "../src/tutorly/store/AppStore";
import { BrowsePage } from "../src/tutorly/pages/BrowsePage";
import {
  parseFilters,
  toBrowseUrl,
  filterAndSort,
  activeChips,
} from "../src/tutorly/components/browse/FilterSidebar";
import { TUTORS, nativeTaughtLanguage, tutorSubjects } from "../src/tutorly/data/tutors";
import { availableThisWeek } from "../src/tutorly/data/availability";
import { subjectsForCategory, subjectById, SPECIALTIES } from "../src/tutorly/data/subjects";

let failures = 0;
function eq(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a === b) console.log("ok  ", name);
  else {
    failures++;
    console.error("FAIL", name, "\n  actual  :", a, "\n  expected:", b);
  }
}

/* ---------- parseFilters: junk tolerance ---------- */
eq("parse junk params", parseFilters({
  cat: "bogus", subject: "python, nope ,python", max: "999", rating: "4.6",
  sort: "zzz", native: "0", spec: "Business,Nope",
}), {
  cat: "", subjects: ["python"], q: "", max: 40, rating: 0,
  native: false, week: false, spec: ["Business"], sort: "top",
});
eq("parse max clamps low", parseFilters({ max: "3" }).max, 10);
eq("parse real params", parseFilters({
  cat: "math", subject: "algebra,calculus", max: "25", rating: "4.7",
  native: "1", week: "1", spec: "Business,Kids", sort: "price-asc",
}), {
  cat: "math", subjects: ["algebra", "calculus"], q: "", max: 25, rating: 4.7,
  native: true, week: true, spec: ["Business", "Kids"], sort: "price-asc",
});

/* ---------- toBrowseUrl: defaults skipped ---------- */
eq("url bare", toBrowseUrl(parseFilters({})), "/browse");
eq("url full", toBrowseUrl(parseFilters({
  cat: "math", subject: "algebra,calculus", q: "  py  ", max: "25", rating: "4.7",
  native: "1", week: "1", spec: "Business,Kids", sort: "price-asc",
})),
  "/browse?cat=math&subject=algebra%2Ccalculus&q=py&max=25&rating=4.7&native=1&week=1&spec=Business%2CKids&sort=price-asc");

/* ---------- filterAndSort: independent recomputations ---------- */
const nativeIds = new Set(TUTORS.filter(nativeTaughtLanguage).map((t) => t.id));
const weekIds = new Set(TUTORS.filter((t) => availableThisWeek(t)).map((t) => t.id));
console.log("info  native tutors:", nativeIds.size, "| available this week:", weekIds.size);

const run = (q: Record<string, string>) => filterAndSort(parseFilters(q), nativeIds, weekIds);

eq("all tutors", run({}).length, TUTORS.length);
eq("max price filter", run({ max: "18" }).length, TUTORS.filter((t) => t.price <= 18).length);
eq("rating filter", run({ rating: "4.8" }).length, TUTORS.filter((t) => t.rating >= 4.8).length);
eq("native filter", run({ native: "1" }).length, nativeIds.size);
eq("week filter", run({ week: "1" }).length, weekIds.size);

const mathIds = new Set(subjectsForCategory("math").map((s) => s.id));
eq("category filter", run({ cat: "math" }).length,
  TUTORS.filter((t) => tutorSubjects(t).some((s) => mathIds.has(s.id))).length);

eq("subjects OR", run({ subject: "python,spanish" }).length,
  TUTORS.filter((t) => t.teaches.some((te) => ["python", "spanish"].includes(te.subject))).length);

// free text: reimplemented independently from the raw data
const hay = (t: (typeof TUTORS)[number]) =>
  `${t.name} ${t.tagline} ${tutorSubjects(t).map((s) => s.label).join(" ")} ${t.specialties.join(" ")}`.toLowerCase();
eq("q single word", run({ q: "python" }).length,
  TUTORS.filter((t) => hay(t).includes("python")).length);
eq("q multi word (AND)", run({ q: "business spanish" }).length,
  TUTORS.filter((t) => ["business", "spanish"].every((w) => hay(t).includes(w))).length);

eq("specialties OR", run({ spec: "Kids,Exam prep" }).length,
  TUTORS.filter((t) => t.specialties.some((s) => ["Kids", "Exam prep"].includes(s))).length);

// composable: category + price + rating together
eq("composed filters", run({ cat: "languages", max: "22", rating: "4.8" }).length,
  TUTORS.filter((t) =>
    tutorSubjects(t).some((s) => s.cat === "languages") &&
    t.price <= 22 && t.rating >= 4.8).length);

eq("sort price-asc first", run({ sort: "price-asc" })[0].price, Math.min(...TUTORS.map((t) => t.price)));
eq("sort price-desc first", run({ sort: "price-desc" })[0].price, Math.max(...TUTORS.map((t) => t.price)));
eq("sort experience", run({ sort: "experience" })[0].lessonsTaught,
  Math.max(...TUTORS.map((t) => t.lessonsTaught)));
eq("sort reviews", run({ sort: "reviews" })[0].reviewCount,
  Math.max(...TUTORS.map((t) => t.reviewCount)));

eq("empty result on floor price", run({ max: "10" }).length, 0);

/* ---------- activeChips ---------- */
eq("chips none", activeChips(parseFilters({})).length, 0);
eq("chips every kind", activeChips(parseFilters({
  cat: "math", subject: "algebra,calculus", q: "py", max: "25", rating: "4.7",
  native: "1", week: "1", spec: "Business,Kids",
})).length, 10); // cat + 2 subjects + q + max + rating + native + week + 2 specs
eq("chip removal payloads", activeChips(parseFilters({ subject: "algebra,calculus" }))[1].clear,
  { subjects: ["algebra"] }); // second chip (calculus) removal leaves algebra

/* ---------- full server render (default view → skeletons) ---------- */
const html = renderToString(
  <AppProvider>
    <BrowsePage />
  </AppProvider>
);
console.log("info  ssr html length:", html.length);
for (const marker of [
  "Find your tutor",
  "br-side",
  "br-catitem",
  "All subjects",
  "br-sublist",
  "Max price",
  "Quick filters",
  "Native-language tutors",
  "Available this week",
  "Specialties",
  "br-search-input",
  "br-sort-select",
  "Top rated",
  "br-grid",
  "br-sk",
  "skeleton",
  "br-countline",
]) {
  if (!html.includes(marker)) {
    failures++;
    console.error("MISSING marker:", marker);
  } else console.log("ok  ", "marker:", marker);
}
// Adjacent text nodes render with SSR comment separators — match across them.
if (!/12(<!-- -->)? of (<!-- -->)?12(<!-- -->)? tutors/.test(html)) {
  failures++;
  console.error("MISSING countline text");
} else console.log("ok  ", "countline live count");

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
