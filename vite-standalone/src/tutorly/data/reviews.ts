/**
 * Review corpus — generated deterministically from the tutor id.
 * Same tutor, same reviews, every run, on every machine.
 * Templates interpolate {first}, {topic} (primary subject) and {exam};
 * each subject category carries its own flavour of five-star lines.
 */
import type { Tutor } from "./tutors";
import { rng } from "../utils/rng";
import { primarySubject, tutorExams } from "./tutors";
import { subjectById } from "./subjects";

export interface Review {
  id: string;
  author: string;
  stars: number;
  text: string;
  /** epoch ms */
  date: number;
  lessons: number;
  verified?: boolean;
  /** Tag chips — only present on reviews the student themself wrote. */
  tags?: string[];
}

/* ---- five-star pools ---- */

const FIVE_SHARED = [
  "{first} has a rare gift: fifty minutes feel like fifteen, and my confidence left the ceiling by week three.",
  "I booked a trial out of curiosity and stayed a year. My {topic} went from hesitant to genuinely useful.",
  "Structured, warm, and relentless about my weakest spots — exactly what I paid for.",
  "Every class ends with a clear plan for the next one. I never wonder what I should be practising.",
  "The trial lesson was already worth the money; the twenty after it were worth more.",
  "My weekly lesson is the only meeting I never try to reschedule.",
  "{first} corrects mistakes the way a good editor corrects a manuscript — you feel grateful, not small.",
  "Perfect pacing for a complete beginner. The homework is short, pointed, and actually gets done.",
];

const FIVE_LANG = [
  "After ten lessons I took a work call in {topic} without notes. My manager assumed I'd been studying for years.",
  "I'm shy in my own language, never mind {topic}. Somehow, within a month I was telling jokes.",
  "Moved from textbook dialogues to real conversation in about six weeks. The method works.",
  "I passed my {exam} on the first attempt, and I credit the mock-exam drills, not luck.",
];

const FIVE_MATH = [
  "My daughter went from hiding math homework to explaining it at dinner. {first} found the missing step nobody else bothered to look for.",
  "From a C to an A− in one semester of {topic}, with a plan instead of panic. Worth every dollar.",
  "I'm a career-changer who hadn't touched {topic} since school — the rebuild was patient and, dare I say, fun.",
  "GRE quant went from embarrassing to my strongest section. The drill library is no joke.",
];

const FIVE_SCIENCE = [
  "Chemistry finally made sense when {first} taught it as stories about electrons with opinions. Grades followed.",
  "My son's biology grade jumped two letters; more importantly, he stopped saying 'I'm just not a science person'.",
  "{topic} for the national exam — clear diagrams, endless patience, zero condescension.",
];

const FIVE_CODE = [
  "Career-changed into a junior dev role after six months with {first}. The code reviews were worth the price alone.",
  "I arrived unable to write a loop and left with a deployed project and a GitHub commit streak.",
  "{first} explains the 'why' behind every error, so debugging stopped feeling like punishment.",
  "From zero to a working web app in the trial lesson itself. I signed up on the spot.",
];

const FIVE_MUSIC = [
  "I played my first actual song by lesson three — {first} refuses to teach boredom.",
  "Music theory finally clicked when it moved to a keyboard. {first} teaches it as a language, not a rulebook.",
  "My stage fright and my timing both improved. So did my neighbours' opinion of my guitar.",
];

const FIVE_TESTPREP = [
  "Band 8.0 overall, up from 6.5 in eight weeks — the drills are brutal, honest and they work.",
  "The mock exams under real clock conditions took the fear out of the {exam} day. Walked in bored, walked out smiling.",
  "Points leak in strange places; {first} found mine in one session and patched them one by one.",
];

const FIVE_BY_CATEGORY: Record<string, string[]> = {
  languages: FIVE_LANG,
  math: FIVE_MATH,
  science: FIVE_SCIENCE,
  programming: FIVE_CODE,
  music: FIVE_MUSIC,
  "test-prep": FIVE_TESTPREP,
};

/* ---- other pools (category-neutral by design) ---- */

const FOUR = [
  "Very good lessons, though I'd have liked a little more written homework — I asked, and {first} adjusted it the same week.",
  "Excellent teaching; scheduling around two time zones was the only friction.",
  "Strong on fundamentals and patient with my questions. Drills could be more varied.",
  "Helpful, professional, and flexible when my calendar exploded mid-course.",
  "I recommend {first} without hesitation — just know the pace is brisk if you skip practice between lessons.",
  "Good tutor. Four stars only because the video connection wobbled some evenings.",
  "Clear explanations and a good plan every week. Would love slightly more feedback in writing.",
  "My comprehension improved noticeably within a month of starting.",
];

const THREE = [
  "Solid lessons, but the first two weeks were a bit repetitive for my level.",
  "Good tutor, not a perfect match for my exam focus — we figured it out by lesson four.",
  "Decent pace and clear material; I just wanted more practice time than we did.",
  "Mixed start, strong finish — once we reset the goals together, the lessons got much better.",
];

const TWO = [
  "The teaching itself is fine, but my schedule changed and rescheduling took longer than I hoped.",
  "Not the style for me — very structured, while I wanted free practice. Nothing personal, and {first} took it gracefully.",
];

const ONE = [
  "The lesson was fine; the 6 a.m. slot I foolishly booked was the problem. Recommend the tutor, not the hour.",
];

const AUTHORS = [
  "Tomás R.", "Sofia L.", "Nadia K.", "Elif D.", "James W.", "Priya S.",
  "Noah B.", "Hana M.", "Lucas F.", "Emma T.", "Diego A.", "Clara V.",
  "Hugo P.", "Alina Z.", "Omar H.", "Sanne J.", "Marta G.", "Jonas E.",
  "Aiko Y.", "Ravi C.", "Mia N.", "Felix B.", "Zoe A.", "Karin O.",
  "Selim B.", "Anya R.", "Marco D.", "Yuki T.", "Freya L.", "Ade O.",
  "Petra M.", "Ivan S.", "Leila F.", "George B.", "Rosa Q.", "Iker M.",
  "Ada W.", "Milan S.", "Nora V.", "Theo K.",
];

/** Star weights per tutor rating band: [5,4,3,2,1]. */
function weightsFor(rating: number): number[] {
  if (rating >= 4.85) return [0.88, 0.09, 0.02, 0.007, 0.003];
  if (rating >= 4.75) return [0.8, 0.13, 0.05, 0.015, 0.005];
  return [0.72, 0.18, 0.07, 0.02, 0.01];
}

/**
 * Fixed print date for the review corpus — review timestamps derive from
 * this constant, not the wall clock, so the whole corpus is identical on
 * every machine, every run.
 */
const REVIEWS_EPOCH = Date.UTC(2026, 10, 14);

const cache = new Map<string, Review[]>();

export function generateReviews(tutor: Tutor): Review[] {
  const hit = cache.get(tutor.id);
  if (hit) return hit;

  // Community tutors approved through the teaching-application flow start
  // with an honest zero: no fabricated corpus, just an empty reviews tab.
  if (tutor.reviewCount === 0) {
    cache.set(tutor.id, []);
    return [];
  }

  const primary = primarySubject(tutor);
  const topic = primary?.label ?? "the subject";
  const exams = tutorExams(tutor);
  const exam = exams[0] ?? "the exam";

  const r = rng(tutor.id, "reviews", "v2");
  const shown = r.int(24, 38); // the recent slice of tutor.reviewCount
  const weights = weightsFor(tutor.rating);

  const fivePool = [
    ...FIVE_SHARED,
    ...(FIVE_BY_CATEGORY[primary?.cat ?? "languages"] ?? FIVE_LANG),
  ];

  const reviews: Review[] = [];
  for (let i = 0; i < shown; i++) {
    const roll = r.next();
    let acc = 0;
    let stars = 5;
    for (let s = 0; s < weights.length; s++) {
      acc += weights[s];
      if (roll <= acc) {
        stars = 5 - s;
        break;
      }
    }
    const pool =
      stars === 5 ? fivePool
      : stars === 4 ? FOUR
      : stars === 3 ? THREE
      : stars === 2 ? TWO
      : ONE;
    const text = r
      .pick(pool)
      .replaceAll("{first}", tutor.firstName)
      .replaceAll("{topic}", topic)
      .replaceAll("{exam}", exam);
    reviews.push({
      id: `rv-${tutor.id}-${i}`,
      author: r.pick(AUTHORS),
      stars,
      text,
      date: REVIEWS_EPOCH - r.int(2, 540) * 86400000,
      lessons: r.int(2, 46),
      verified: r.chance(0.87),
    });
  }

  cache.set(tutor.id, reviews);
  return reviews;
}

/** Star distribution counts [5..1] for the profile bar chart. */
export function distributionOf(reviews: Review[]): number[] {
  const counts = [0, 0, 0, 0, 0];
  for (const rv of reviews) counts[5 - rv.stars] += 1;
  return counts;
}

/** Sort reviews newest first. */
export function sortReviewsNewest(reviews: Review[]): Review[] {
  return [...reviews].sort((a, b) => b.date - a.date);
}
