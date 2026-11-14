/**
 * Admin console data — everything the monitoring screens show.
 * Teacher and catalogue figures are real platform facts (computed from the
 * catalogue); the student body, activity feed and live-room telemetry are
 * deterministic seeded simulations — honestly labelled in the UI, stable
 * within the current day/hour on every machine.
 */
import { TUTORS, tutorSubjects, isOnline } from "./tutors";
import { SUBJECTS, CATEGORIES } from "./subjects";
import { rng, shortCode } from "../utils/rng";
import { addDays, dateISO, MONTHS } from "../utils/time";

export interface AdminStudent {
  id: string;
  name: string;
  country: string;
  cc: string;
  joinedISO: string;
  lessons: number;
  spend: number;
  favorite: string;
  lastActiveDays: number;
  status: "active" | "idle" | "new";
}

export interface AdminLessonEvent {
  id: string;
  dateISO: string;
  hour: number;
  student: string;
  tutorId: string;
  subject: string;
  price: number;
  status: "completed" | "upcoming" | "cancelled";
}

export interface LiveSession {
  id: string;
  tutorId: string;
  subject: string;
  startedMinAgo: number;
  durationMin: number;
}

const FIRST = [
  "Sofia", "Mateo", "Priya", "Noah", "Hana", "Lucas", "Emma", "Diego",
  "Clara", "Hugo", "Alina", "Omar", "Sanne", "Marta", "Jonas", "Aiko",
  "Ravi", "Mia", "Felix", "Zoe", "Karin", "Selim", "Anya", "Marco",
  "Yuki", "Freya", "Ade", "Petra", "Ivan", "Leila", "George", "Rosa",
  "Iker", "Ada", "Milan", "Nora", "Theo", "Nadia", "Elif", "Tomás",
];

const LAST = [
  "Andrade", "Kowalski", "Sharma", "Bennett", "Mori", "Fernandes", "Thaler", "Alvarez",
  "Vieira", "Poser", "Zielinski", "Haddad", "Jansen", "Gomez", "Eriksson", "Yamada",
  "Chowdhury", "Novak", "Brandt", "Adeyemi", "Osterman", "Baysal", "Romanova", "De Luca",
  "Tanaka", "Larsen", "Okafor", "Novakova", "Petrovic", "Farah", "Bailey", "Quintana",
  "Mendizabal", "Wong", "Horvat", "Vidal", "Keller", "Rahimi", "Dog", "Reyes",
];

const COUNTRIES: Array<[string, string]> = [
  ["Brazil", "BR"], ["Poland", "PL"], ["India", "IN"], ["Germany", "DE"],
  ["Japan", "JP"], ["Portugal", "PT"], ["Spain", "ES"], ["Netherlands", "NL"],
  ["Turkey", "TR"], ["Mexico", "MX"], ["South Korea", "KR"], ["Italy", "IT"],
  ["Morocco", "MA"], ["Nigeria", "NG"], ["France", "FR"], ["Sweden", "SE"],
  ["Vietnam", "VN"], ["Canada", "CA"], ["Argentina", "AR"], ["Croatia", "HR"],
];

let studentsCache: AdminStudent[] | null = null;

/** The simulated student body — 48 seeded learners, stable across reloads. */
export function generateStudents(): AdminStudent[] {
  if (studentsCache) return studentsCache;
  const r = rng("admin", "students", "v1");
  const used = new Set<string>();
  const today = new Date();
  const out: AdminStudent[] = [];
  while (out.length < 48) {
    const name = `${r.pick(FIRST)} ${r.pick(LAST)}`;
    if (used.has(name)) continue;
    used.add(name);
    const [country, cc] = r.pick(COUNTRIES);
    const lessons = r.int(1, 120);
    const spend = lessons * r.int(11, 33);
    const lastActiveDays = r.int(0, 30);
    out.push({
      id: `st-${shortCode(name, out.length)}`,
      name,
      country,
      cc,
      joinedISO: dateISO(addDays(today, -r.int(20, 1000))),
      lessons,
      spend,
      favorite: r.pick(SUBJECTS).label,
      lastActiveDays,
      status: lastActiveDays <= 2 && lessons >= 4 ? "active" : lessons <= 3 ? "new" : "idle",
    });
  }
  studentsCache = out;
  return out;
}

/** Recent platform bookings — deterministic within the current day. */
export function generateRecentLessons(count = 26): AdminLessonEvent[] {
  const r = rng("admin", "feed", dateISO(new Date()));
  const today = new Date();
  const out: AdminLessonEvent[] = [];
  for (let i = 0; i < count; i++) {
    const t = r.pick(TUTORS);
    const daysAgo = r.int(0, 18);
    const roll = r.next();
    out.push({
      id: `ev-${shortCode(t.id, i, daysAgo)}`,
      dateISO: dateISO(addDays(today, -daysAgo)),
      hour: r.int(7, 22),
      student: `${r.pick(FIRST)} ${r.pick(LAST)}`,
      tutorId: t.id,
      subject: r.pick(t.teaches).subject,
      price: t.price,
      status: roll < 0.68 ? "completed" : roll < 0.88 ? "upcoming" : "cancelled",
    });
  }
  return out.sort((a, b) =>
    a.dateISO < b.dateISO ? 1 : a.dateISO > b.dateISO ? -1 : b.hour - a.hour
  );
}

/** Seeded bookings-per-weekday bars. */
export function weeklyBookings(): Array<{ label: string; n: number }> {
  const r = rng("admin", "week", "v1");
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => ({
    label,
    n: r.int(120, 260),
  }));
}

/** Seeded signup bars for the last 12 months. */
export function monthlySignups(): Array<{ label: string; n: number }> {
  const r = rng("admin", "signups", "v1");
  const now = new Date();
  const out: Array<{ label: string; n: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ label: MONTHS[d.getMonth()], n: r.int(70, 190) });
  }
  return out;
}

/** Lifetime booking volume attributed to each subject category (real data). */
export function revenueByCategory(): Array<{
  id: string;
  label: string;
  revenue: number;
  share: number;
}> {
  const sums = new Map<string, number>();
  for (const t of TUTORS) {
    const cat = tutorSubjects(t)[0]?.cat ?? "languages";
    sums.set(cat, (sums.get(cat) ?? 0) + t.lessonsTaught * t.price);
  }
  const total = [...sums.values()].reduce((a, b) => a + b, 0) || 1;
  return [...sums.entries()]
    .map(([id, revenue]) => ({
      id,
      label: CATEGORIES.find((c) => c.id === id)?.label ?? id,
      revenue,
      share: revenue / total,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/** Platform totals computed from the real catalogue. */
export function platformKpis() {
  const lessons = TUTORS.reduce((a, t) => a + t.lessonsTaught, 0);
  const students = TUTORS.reduce((a, t) => a + t.students, 0);
  const gross = TUTORS.reduce((a, t) => a + t.lessonsTaught * t.price, 0);
  const rating = TUTORS.reduce((a, t) => a + t.rating, 0) / TUTORS.length;
  const response = TUTORS.reduce((a, t) => a + t.responseHrs, 0) / TUTORS.length;
  return {
    tutors: TUTORS.length,
    subjects: SUBJECTS.length,
    students,
    lessons,
    hours: Math.round((lessons * 50) / 60),
    gross,
    commission: Math.round(gross * 0.18),
    rating: rating.toFixed(2),
    responseHrs: response.toFixed(1),
  };
}

/** Simulated live-room telemetry — stable within the current hour. */
export function liveSessions(salt = 0): LiveSession[] {
  const r = rng("admin", "live", new Date().getHours(), salt);
  const n = r.int(3, 7);
  const out: LiveSession[] = [];
  for (let i = 0; i < n; i++) {
    const t = r.pick(TUTORS);
    out.push({
      id: `lv-${shortCode(t.id, "live", i, salt)}`,
      tutorId: t.id,
      subject: r.pick(t.teaches).subject,
      startedMinAgo: r.int(2, 38),
      durationMin: 50,
    });
  }
  return out.sort((a, b) => a.startedMinAgo - b.startedMinAgo);
}

/** How many tutors show "online now" (deterministic per hour). */
export function onlineTutorCount(): number {
  return TUTORS.filter((t) => isOnline(t.id)).length;
}

export function money(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}
