/**
 * Review corpus — generated deterministically from the tutor id.
 * Same tutor, same reviews, every run, on every machine.
 */
import type { Tutor } from "./tutors";
import { rng } from "../utils/rng";
import { tutorLanguage } from "./tutors";

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

const FIVE = [
  "{first} has a rare gift: fifty minutes feel like fifteen, and my grammar anxiety left the room by week three.",
  "I booked a trial out of curiosity and stayed a year. My {lang} went from menu-reading to arguing about films.",
  "Structured, warm, and relentless about my weakest verb forms — exactly what I paid for.",
  "After ten lessons I took a work call in {lang} without notes. My manager assumed I'd been studying for years.",
  "Every class ends with a clear plan for the next one. I never wonder what I should be practising.",
  "I passed my {exam} on the first attempt, and I credit the mock-exam drills, not luck.",
  "{first} corrects pronunciation the way a good editor corrects a manuscript — you feel grateful, not small.",
  "The trial lesson was already worth the money; the twenty after it were worth more.",
  "I'm shy in my own language, never mind {lang}. Somehow, within a month I was telling jokes.",
  "Perfect pacing for a complete beginner. The homework is short, pointed, and actually gets done.",
  "My weekly lesson is the only meeting I never try to reschedule.",
  "Moved from textbook dialogues to real conversation in about six weeks. The method works.",
];

const FOUR = [
  "Very good lessons, though I'd have liked a little more written homework — I asked, and {first} adjusted it the same week.",
  "Excellent teaching; scheduling around two time zones was the only friction.",
  "Strong on grammar and patient with my questions. Accent drills could be more varied.",
  "Helpful, professional, and flexible when my calendar exploded mid-course.",
  "I recommend {first} without hesitation — just know the pace is brisk if you skip practice between lessons.",
  "Good tutor. Four stars only because the video connection wobbled some evenings.",
  "Clear explanations and a good plan every week. Would love slightly more feedback in writing.",
  "My comprehension improved noticeably within a month of starting.",
];

const THREE = [
  "Solid lessons, but the first two weeks were a bit repetitive for my level.",
  "Good teacher, not a perfect match for my exam focus — we figured it out by lesson four.",
  "Decent pace and clear material; I just wanted more conversation time than we did.",
  "Mixed start, strong finish — once we reset the goals together, the lessons got much better.",
];

const TWO = [
  "The teaching itself is fine, but my schedule changed and rescheduling took longer than I hoped.",
  "Not the style for me — very structured, while I wanted free conversation. Nothing personal, and {first} took it gracefully.",
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

const cache = new Map<string, Review[]>();

/**
 * Fixed print date for the review corpus — review timestamps are derived
 * from this constant, not the wall clock, so the whole corpus (including
 * dates and ordering) is identical on every machine, every run.
 */
const REVIEWS_EPOCH = Date.UTC(2026, 10, 14);

export function generateReviews(tutor: Tutor): Review[] {
  const hit = cache.get(tutor.id);
  if (hit) return hit;

  const lang = tutorLanguage(tutor).name;
  const exam = tutorLanguage(tutor).exam;
  const r = rng(tutor.id, "reviews", "v1");
  const count = r.int(17, 52);
  const weights = weightsFor(tutor.rating);

  const reviews: Review[] = [];
  for (let i = 0; i < count; i++) {
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
    const pool = stars === 5 ? FIVE : stars === 4 ? FOUR : stars === 3 ? THREE : stars === 2 ? TWO : ONE;
    const text = r
      .pick(pool)
      .replaceAll("{first}", tutor.firstName)
      .replaceAll("{lang}", lang)
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

/** Sort reviews newest first, most helpful tone first — simple: newest. */
export function sortReviewsNewest(reviews: Review[]): Review[] {
  return [...reviews].sort((a, b) => b.date - a.date);
}
