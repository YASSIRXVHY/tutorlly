/**
 * The teaching applications registry — Tutorly's "Become a tutor" pipeline.
 *
 * A teacher applies through the /teach wizard; the application lands in a
 * localStorage-backed queue with three states: pending → approved/rejected.
 * Approval compiles the application into a full catalogue Tutor and injects
 * it into the live TUTORS array, so the new teacher immediately appears in
 * search, booking, messages and the admin roster — the same machinery the
 * hand-authored tutors use, nothing stubbed.
 *
 * One fictional pending application (honestly labelled "demo seed") is seeded
 * on first run so the admin review queue is demonstrable without filling the
 * form yourself.
 */
import { useSyncExternalStore } from "react";
import { TUTORS, type CaptionLine, type Level, type Spoken, type Teach, type Tutor } from "./tutors";
import { subjectById, SPECIALTIES, type Specialty } from "./subjects";
import { shortCode } from "../utils/rng";

/* ------------------------------------------------------------------ */
/* Wizard option lists                                                 */
/* ------------------------------------------------------------------ */

export interface CountryOption {
  name: string;
  cc: string;
}

export const COUNTRIES: CountryOption[] = [
  { name: "Argentina", cc: "AR" },
  { name: "Australia", cc: "AU" },
  { name: "Austria", cc: "AT" },
  { name: "Belgium", cc: "BE" },
  { name: "Brazil", cc: "BR" },
  { name: "Canada", cc: "CA" },
  { name: "China", cc: "CN" },
  { name: "Colombia", cc: "CO" },
  { name: "Czechia", cc: "CZ" },
  { name: "Denmark", cc: "DK" },
  { name: "Egypt", cc: "EG" },
  { name: "France", cc: "FR" },
  { name: "Germany", cc: "DE" },
  { name: "Greece", cc: "GR" },
  { name: "India", cc: "IN" },
  { name: "Ireland", cc: "IE" },
  { name: "Italy", cc: "IT" },
  { name: "Japan", cc: "JP" },
  { name: "Mexico", cc: "MX" },
  { name: "Morocco", cc: "MA" },
  { name: "Netherlands", cc: "NL" },
  { name: "Nigeria", cc: "NG" },
  { name: "Poland", cc: "PL" },
  { name: "Portugal", cc: "PT" },
  { name: "South Korea", cc: "KR" },
  { name: "Spain", cc: "ES" },
  { name: "Sweden", cc: "SE" },
  { name: "Türkiye", cc: "TR" },
  { name: "Ukraine", cc: "UA" },
  { name: "United Kingdom", cc: "GB" },
  { name: "United States", cc: "US" },
  { name: "Vietnam", cc: "VN" },
];

/** Languages an applicant can claim as native (taught ones + a few more). */
export const NATIVE_LANGUAGES: Array<{ code: string; label: string }> = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Mandarin" },
  { code: "ar", label: "Arabic" },
  { code: "ru", label: "Russian" },
  { code: "cs", label: "Czech" },
  { code: "pl", label: "Polish" },
  { code: "nl", label: "Dutch" },
  { code: "tr", label: "Turkish" },
  { code: "hi", label: "Hindi" },
  { code: "vi", label: "Vietnamese" },
];

/** Proficiency levels for "other languages you speak". */
export const SPOKEN_LEVELS: Level[] = ["C2", "C1", "B2", "B1", "A2"];

/** Teaching levels offered per selected language subject. */
export const LANG_TEACH_LEVELS = [
  "All levels",
  "Beginners (A1–A2)",
  "Intermediate (B1–B2)",
  "Advanced (C1–C2)",
  "Native speaker",
] as const;

/** The canned reviewer verdicts the admin console can attach to a rejection. */
export const REJECT_REASONS = [
  "Your bio needs more detail — tell students how a lesson with you actually runs.",
  "Your headline is doing too much (or too little) — sharpen it to one promise.",
  "Your rate sits far outside the typical range for your subjects — adjust and resubmit.",
] as const;

/* ------------------------------------------------------------------ */
/* Shapes                                                              */
/* ------------------------------------------------------------------ */

export interface SpokenDraft {
  code: string;
  level: Level;
}

/** The wizard's single source of truth — also what gets persisted as a draft. */
export interface TeachDraft {
  firstName: string;
  lastName: string;
  email: string;
  country: string; // country name
  cc: string;
  city: string;
  nativeLanguage: string; // language code
  /** Data-URL portrait (downscaled by the wizard) — "" when none uploaded. */
  portrait: string;
  /** Subject ids, primary first, max 3. */
  subjects: string[];
  /** subjectId → teaching level, for language subjects only. */
  languageLevels: Record<string, string>;
  specialties: string[];
  speaks: SpokenDraft[];
  rate: number; // USD per 50-min lesson
  yearsTeaching: number;
  studentsTaught: number;
  headline: string;
  bio: string;
  agree: boolean;
}

export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface TeacherApplication {
  id: string;
  status: ApplicationStatus;
  submittedAt: number;
  decidedAt: number | null;
  rejectReason: string | null;
  applicantEmail: string;
  payload: TeachDraft;
  /** True for the fictional seeded applicant — labelled in the admin UI. */
  seeded: boolean;
  /** The catalogue tutor id, set the moment the application is approved. */
  tutorId: string | null;
}

interface StoredRegistry {
  version: 1;
  applications: TeacherApplication[];
}

const STORE_KEY = "tutorly.teachers.v1";
const DRAFT_KEY = "tutorly.teach.draft.v1";

/* ------------------------------------------------------------------ */
/* A fresh draft                                                       */
/* ------------------------------------------------------------------ */

export function makeEmptyDraft(email = "", name = ""): TeachDraft {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts.length >= 1 ? parts[0] : "",
    lastName: parts.length >= 2 ? parts.slice(1).join(" ") : "",
    email,
    country: "",
    cc: "",
    city: "",
    nativeLanguage: "",
    portrait: "",
    subjects: [],
    languageLevels: {},
    specialties: [],
    speaks: [],
    rate: 18,
    yearsTeaching: 3,
    studentsTaught: 20,
    headline: "",
    bio: "",
    agree: false,
  };
}

/* ------------------------------------------------------------------ */
/* Persistence + pub/sub                                               */
/* ------------------------------------------------------------------ */

let applications: TeacherApplication[] | null = null;
let version = 0;
const listeners = new Set<() => void>();

function notify(): void {
  version += 1;
  for (const fn of listeners) fn();
}

export function subscribeCommunity(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Re-render any community-aware component when the registry changes. */
export function useCommunityVersion(): number {
  return useSyncExternalStore(
    subscribeCommunity,
    () => version,
    () => version
  );
}

function readRegistry(): StoredRegistry | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRegistry;
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.applications)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeRegistry(): void {
  try {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ version: 1, applications: registry() } satisfies StoredRegistry)
    );
  } catch {
    /* storage unavailable — the registry lives in memory for this session */
  }
}

/**
 * Lazy access to the registry — community.ts and tutors.ts import each other,
 * so the store must not touch module state while either module is still
 * mid-initialization. First access loads (and persists) the seed.
 */
function registry(): TeacherApplication[] {
  if (applications === null) {
    applications = load();
    writeRegistry();
  }
  return applications;
}

/** The fictional pending application that demonstrates the review queue. */
function seedApplication(): TeacherApplication {
  const payload: TeachDraft = {
    firstName: "Petra",
    lastName: "Nováková",
    email: "petra.novakova@example.com",
    country: "Czechia",
    cc: "CZ",
    city: "Brno",
    nativeLanguage: "cs",
    portrait: "",
    subjects: ["statistics", "german"],
    languageLevels: { german: "Advanced (C1–C2)" },
    specialties: ["Exam prep", "Homework help", "Beginners"],
    speaks: [
      { code: "en", level: "C1" },
      { code: "de", level: "C2" },
    ],
    rate: 15,
    yearsTeaching: 6,
    studentsTaught: 140,
    headline: "Statistics without the fear, German without the chalk dust.",
    bio:
      "I spent six years teaching statistics at a Brno gymnasium and tutoring German on the side, " +
      "which means I have seen every flavour of math panic and every case ending. My lessons start " +
      "from where you actually are — we diagnose the missing step, not the missing talent. With " +
      "German, we drill the grammar until it bores you, then we talk until it doesn't matter anymore.",
    agree: true,
  };
  return {
    id: "app-seed-petra",
    status: "pending",
    submittedAt: Date.now() - 3.2 * 3600_000,
    decidedAt: null,
    rejectReason: null,
    applicantEmail: payload.email,
    payload,
    seeded: true,
    tutorId: null,
  };
}

function load(): TeacherApplication[] {
  const stored = readRegistry();
  if (stored) return stored.applications;
  // First run: the seeded fictional applicant only.
  return [seedApplication()];
}

/* ------------------------------------------------------------------ */
/* Compilation: application → catalogue Tutor                          */
/* ------------------------------------------------------------------ */

/** Language subject id → spoken language code (native-language matching). */
const LANG_SUBJECT_CODE: Record<string, string> = {
  english: "en",
  spanish: "es",
  french: "fr",
  german: "de",
  italian: "it",
  portuguese: "pt",
  japanese: "ja",
  korean: "ko",
  mandarin: "zh",
  arabic: "ar",
};

const GREETINGS: Record<string, string> = {
  en: "Hello!",
  es: "¡Hola!",
  fr: "Bonjour !",
  de: "Hallo!",
  it: "Ciao!",
  pt: "Olá!",
  ja: "こんにちは！",
  ko: "안녕하세요!",
  zh: "你好！",
  ar: "مرحبا!",
};

function slugify(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "tutor"
  );
}

function pluralYears(n: number): string {
  return `${n} ${n === 1 ? "year" : "years"}`;
}

/**
 * Compile an application into a full Tutor. Pure function of the payload —
 * the same application always compiles to the same profile, on every machine.
 */
export function tutorFromApplication(app: TeacherApplication): Tutor {
  const p = app.payload;
  const name = `${p.firstName.trim()} ${p.lastName.trim()}`.trim();
  const slug = slugify(name);

  const teaches: Teach[] = [];
  for (const sId of p.subjects) {
    const s = subjectById(sId);
    if (!s) continue;
    teaches.push({
      subject: sId,
      level:
        s.cat === "languages"
          ? p.languageLevels[sId] || "All levels"
          : "All levels",
    });
  }

  const spoken: Spoken[] = [{ code: p.nativeLanguage, level: "Native" }];
  for (const sp of p.speaks) {
    if (sp.code !== p.nativeLanguage && !spoken.some((x) => x.code === sp.code)) {
      spoken.push({ code: sp.code, level: sp.level });
    }
  }

  const subjectLabels = teaches
    .map((te) => subjectById(te.subject)?.label)
    .filter(Boolean)
    .join(" and ");
  const primary = subjectById(teaches[0]?.subject ?? "");
  const nativeGreeting =
    primary && primary.cat === "languages" && LANG_SUBJECT_CODE[primary.id] === p.nativeLanguage
      ? `${GREETINGS[p.nativeLanguage] ?? "Hello!"} `
      : "";

  const video: CaptionLine[] = [
    {
      line: `${nativeGreeting}I'm ${p.firstName.trim()} — I teach ${subjectLabels} on Tutorly.`,
      en: `Hello! I'm ${p.firstName.trim()} — I teach ${subjectLabels} on Tutorly.`,
    },
    {
      line: `My lessons lean on ${p.specialties
        .slice(0, 2)
        .join(" and ")
        .toLowerCase()}, with a plan for every student.`,
      en: `My lessons lean on ${p.specialties
        .slice(0, 2)
        .join(" and ")
        .toLowerCase()}, with a plan for every student.`,
    },
    {
      line: "Book a half-price trial lesson and see if we're a fit.",
      en: "Book a half-price trial lesson and see if we're a fit.",
    },
  ];

  const specialties = p.specialties.filter((s): s is Specialty =>
    (SPECIALTIES as readonly string[]).includes(s)
  );

  const bio2 =
    `${pluralYears(p.yearsTeaching)} of teaching and roughly ${p.studentsTaught} students so far. ` +
    `Lessons with me lean on ${p.specialties.slice(0, 2).join(" and ").toLowerCase()} — ` +
    `and every week ends with a clear plan for the next one.`;

  return {
    id: `tu-${slug}-${shortCode(slug, "community")}`.toLowerCase(),
    name,
    firstName: p.firstName.trim(),
    city: p.city.trim(),
    country: p.country,
    cc: p.cc,
    portrait: p.portrait,
    teaches,
    spoken,
    tagline: p.headline.trim(),
    bio: [p.bio.trim(), bio2],
    video,
    price: p.rate,
    // A new tutor starts honestly at zero — the profile shows "New" states.
    rating: 0,
    reviewCount: 0,
    lessonsTaught: 0,
    students: 0,
    since: new Date().getFullYear(),
    responseHrs: 2,
    specialties,
    openness: 0.55,
    trial: true,
    badges: [p.yearsTeaching >= 1 ? `${p.yearsTeaching} yrs teaching` : "New to tutoring"],
  };
}

/* ------------------------------------------------------------------ */
/* Registry mutations                                                  */
/* ------------------------------------------------------------------ */

/** Ids this module has injected into the shared TUTORS array. */
const injectedIds = new Set<string>();

/**
 * Fold approved community tutors into the catalogue array. Append-only and
 * idempotent; also removes injected tutors that are no longer approved
 * (the demo reset). Called at module-eval time on the client and after
 * every registry mutation.
 */
export function syncCommunityTutors(): void {
  if (typeof window === "undefined") return;

  const approved = registry().filter((a) => a.status === "approved" && a.tutorId);
  const wanted = new Set(approved.map((a) => a.tutorId as string));

  for (let i = TUTORS.length - 1; i >= 0; i--) {
    const id = TUTORS[i].id;
    if (injectedIds.has(id) && !wanted.has(id)) {
      TUTORS.splice(i, 1);
      injectedIds.delete(id);
    }
  }
  for (const a of approved) {
    const id = a.tutorId as string;
    if (injectedIds.has(id)) continue;
    if (TUTORS.some((t) => t.id === id)) {
      injectedIds.add(id);
      continue;
    }
    TUTORS.push(tutorFromApplication(a));
    injectedIds.add(id);
  }
}

/** Submit the wizard's payload: replaces any previous application of yours. */
export function submitApplication(draft: TeachDraft): TeacherApplication {
  const app: TeacherApplication = {
    id: `app-${shortCode(draft.email, Date.now())}`,
    status: "pending",
    submittedAt: Date.now(),
    decidedAt: null,
    rejectReason: null,
    applicantEmail: draft.email.trim(),
    payload: { ...draft, languageLevels: { ...draft.languageLevels }, speaks: [...draft.speaks] },
    seeded: false,
    tutorId: null,
  };
  applications = [app, ...registry().filter((a) => a.seeded)];
  writeRegistry();
  clearTeachDraft();
  notify();
  return app;
}

/** Approve: compile the tutor and put it live in the marketplace. */
export function approveApplication(id: string): Tutor | null {
  const app = registry().find((a) => a.id === id);
  if (!app || app.status !== "pending") return null;
  const tutor = tutorFromApplication(app);
  app.status = "approved";
  app.decidedAt = Date.now();
  app.tutorId = tutor.id;
  writeRegistry();
  syncCommunityTutors();
  notify();
  return tutor;
}

/** Reject with one of the canned reviewer verdicts. */
export function rejectApplication(id: string, reason: string): void {
  const app = registry().find((a) => a.id === id);
  if (!app || app.status !== "pending") return;
  app.status = "rejected";
  app.decidedAt = Date.now();
  app.rejectReason = reason;
  writeRegistry();
  notify();
}

/** Your own (non-seeded) application — newest first. */
export function myApplication(): TeacherApplication | null {
  return registry().find((a) => !a.seeded) ?? null;
}

/** Everything, pending first — the admin queue. */
export function allApplications(): TeacherApplication[] {
  return [...registry()].sort((a, b) => {
    const rank = (x: TeacherApplication) => (x.status === "pending" ? 0 : 1);
    return rank(a) - rank(b) || b.submittedAt - a.submittedAt;
  });
}

export function pendingCount(): number {
  return registry().filter((a) => a.status === "pending").length;
}

/** Restore first-run state: the seeded applicant only, no community tutors. */
export function resetCommunity(): void {
  try {
    localStorage.removeItem(STORE_KEY);
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage unavailable */
  }
  applications = [seedApplication()];
  writeRegistry();
  syncCommunityTutors();
  notify();
}

/* ------------------------------------------------------------------ */
/* Draft persistence                                                   */
/* ------------------------------------------------------------------ */

export function saveTeachDraft(draft: TeachDraft): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* storage unavailable — the wizard keeps working in memory */
  }
}

export function loadTeachDraft(): TeachDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TeachDraft;
    if (!parsed || typeof parsed !== "object") return null;
    // Blend with a fresh draft so new wizard fields never crash old drafts.
    return { ...makeEmptyDraft(), ...parsed };
  } catch {
    return null;
  }
}

export function clearTeachDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* storage unavailable */
  }
}

/* ------------------------------------------------------------------ */
/* Boot + cross-tab sync                                               */
/* ------------------------------------------------------------------ */

if (typeof window !== "undefined") {
  // Another tab approved/rejected/reset — fold it in and re-render.
  // (The initial catalogue merge is triggered by data/tutors.ts once the
  // TUTORS array is defined — this module must not read it during boot.)
  window.addEventListener("storage", (e) => {
    if (e.key !== STORE_KEY && e.key !== DRAFT_KEY) return;
    applications = load();
    if (e.key === STORE_KEY) writeRegistry();
    syncCommunityTutors();
    notify();
  });
}

/* ------------------------------------------------------------------ */
/* Small display helpers                                               */
/* ------------------------------------------------------------------ */

export function timeAgo(ts: number, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - ts) / 60000));
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "yesterday" : `${days} d ago`;
}

/** Is this draft complete enough to submit? Used by the review step. */
export function draftComplete(d: TeachDraft): boolean {
  return (
    d.firstName.trim().length >= 2 &&
    d.lastName.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim()) &&
    Boolean(d.country) &&
    d.city.trim().length >= 2 &&
    Boolean(d.nativeLanguage) &&
    d.subjects.length >= 1 &&
    d.subjects.length <= 3 &&
    d.specialties.length >= 2 &&
    d.specialties.length <= 5 &&
    d.rate >= 5 &&
    d.rate <= 80 &&
    d.yearsTeaching >= 0 &&
    d.studentsTaught >= 0 &&
    d.headline.trim().length >= 8 &&
    d.headline.trim().length <= 70 &&
    d.bio.trim().length >= 160 &&
    d.agree
  );
}
