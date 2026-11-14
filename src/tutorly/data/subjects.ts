/**
 * The catalogue taxonomy — six subject categories, twenty-eight subjects.
 * Tutorly is not just languages: math, science, code, music and test prep
 * live in the same marketplace with the same booking machinery.
 */
import {
  Languages,
  Sigma,
  FlaskConical,
  Code2,
  Music4,
  Target,
  type LucideIcon,
} from "lucide-react";

export type CategoryId =
  | "languages"
  | "math"
  | "science"
  | "programming"
  | "music"
  | "test-prep";

export interface SubjectCategory {
  id: CategoryId;
  label: string;
  blurb: string;
  icon: LucideIcon;
}

export interface Subject {
  id: string;
  label: string;
  cat: CategoryId;
  /** Languages carry their native name; other subjects leave it out. */
  nativeLabel?: string;
}

export const CATEGORIES: SubjectCategory[] = [
  {
    id: "languages",
    label: "Languages",
    blurb: "Speak from lesson one, with native tutors",
    icon: Languages,
  },
  {
    id: "math",
    label: "Math",
    blurb: "From times tables to multivariable calculus",
    icon: Sigma,
  },
  {
    id: "science",
    label: "Science",
    blurb: "Biology, chemistry and physics that make sense",
    icon: FlaskConical,
  },
  {
    id: "programming",
    label: "Programming",
    blurb: "Write your first line — or your first library",
    icon: Code2,
  },
  {
    id: "music",
    label: "Music",
    blurb: "Theory, keys and strings, patiently",
    icon: Music4,
  },
  {
    id: "test-prep",
    label: "Test prep",
    blurb: "IELTS to GRE, with past papers and a plan",
    icon: Target,
  },
];

export const SUBJECTS: Subject[] = [
  // — languages —
  { id: "english", label: "English", cat: "languages" },
  { id: "spanish", label: "Spanish", cat: "languages", nativeLabel: "Español" },
  { id: "french", label: "French", cat: "languages", nativeLabel: "Français" },
  { id: "german", label: "German", cat: "languages", nativeLabel: "Deutsch" },
  { id: "italian", label: "Italian", cat: "languages", nativeLabel: "Italiano" },
  { id: "portuguese", label: "Portuguese", cat: "languages", nativeLabel: "Português" },
  { id: "japanese", label: "Japanese", cat: "languages", nativeLabel: "日本語" },
  { id: "korean", label: "Korean", cat: "languages", nativeLabel: "한국어" },
  { id: "mandarin", label: "Mandarin", cat: "languages", nativeLabel: "中文" },
  { id: "arabic", label: "Arabic", cat: "languages", nativeLabel: "العربية" },
  // — math —
  { id: "algebra", label: "Algebra", cat: "math" },
  { id: "geometry", label: "Geometry", cat: "math" },
  { id: "calculus", label: "Calculus", cat: "math" },
  { id: "statistics", label: "Statistics", cat: "math" },
  // — science —
  { id: "biology", label: "Biology", cat: "science" },
  { id: "chemistry", label: "Chemistry", cat: "science" },
  { id: "physics", label: "Physics", cat: "science" },
  // — programming —
  { id: "python", label: "Python", cat: "programming" },
  { id: "javascript", label: "JavaScript", cat: "programming" },
  { id: "web-development", label: "Web development", cat: "programming" },
  // — music —
  { id: "music-theory", label: "Music theory", cat: "music" },
  { id: "piano", label: "Piano", cat: "music" },
  { id: "guitar", label: "Guitar", cat: "music" },
  // — test prep —
  { id: "ielts", label: "IELTS", cat: "test-prep" },
  { id: "toefl", label: "TOEFL", cat: "test-prep" },
  { id: "jlpt", label: "JLPT", cat: "test-prep" },
  { id: "sat", label: "SAT", cat: "test-prep" },
  { id: "gre", label: "GRE", cat: "test-prep" },
];

export const SUBJECT_MAP: Record<string, Subject> = Object.fromEntries(
  SUBJECTS.map((s) => [s.id, s])
);

export function subjectById(id: string): Subject | undefined {
  return SUBJECT_MAP[id];
}

export function subjectsForCategory(cat: CategoryId): Subject[] {
  return SUBJECTS.filter((s) => s.cat === cat);
}

export function categoryById(id: string): SubjectCategory | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

/** Exam names by language subject — used in profile copy and tutor replies. */
export const LANG_EXAMS: Record<string, string[]> = {
  english: ["IELTS", "TOEFL"],
  spanish: ["DELE"],
  french: ["DELF / DALF"],
  german: ["Goethe / ÖSD"],
  italian: ["CILS"],
  portuguese: ["CELPE-Bras"],
  japanese: ["JLPT"],
  korean: ["TOPIK"],
  mandarin: ["HSK"],
  arabic: ["CIEP proficiency"],
};

export const SPECIALTIES = [
  "Business",
  "Exam prep",
  "Conversation",
  "Grammar",
  "Pronunciation",
  "Beginners",
  "Kids",
  "Travel",
  "Homework help",
  "Interview prep",
  "Test strategy",
] as const;

export type Specialty = (typeof SPECIALTIES)[number];
