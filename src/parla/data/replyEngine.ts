/**
 * The reply engine — tutors answer messages in-thread by keyword matching.
 * Every reply interpolates that tutor's real facts (price, language, exam).
 */
import type { Tutor } from "./tutors";
import { tutorLanguage } from "./tutors";
import { rng } from "../utils/rng";
import { shortDate } from "../utils/time";
import type { Opening } from "./availability";

export interface Reply {
  text: string;
  /** Deterministic thinking time, 1.1–2.4s. */
  delayMs: number;
}

type Topic =
  | "greeting"
  | "price"
  | "trial"
  | "availability"
  | "exam"
  | "beginner"
  | "cancel"
  | "method"
  | "thanks"
  | "fallback";

const PATTERNS: Array<[Topic, RegExp]> = [
  // Specific topics outrank greetings — "Hello, how much is a lesson?"
  // deserves the price answer, not just a wave back.
  ["price", /\b(price|cost|how much|fee|rate|charge|expensive|cheap|payment|pay)\b/i],
  ["trial", /\b(trial|first lesson|discount|half price|test lesson)\b/i],
  ["cancel", /\b(cancel|reschedul|refund|policy|postpone|move (my|the) lesson)\b/i],
  ["exam", /\b(exam|dele|delf|dalf|jlpt|topik|hsk|ielts|toefl|goethe|ösd|osd|cils|celpe|torfl|трки|certific|test|level test)\b/i],
  ["beginner", /\b(beginner|beginers|zero|never studied|from scratch|start from zero|new to|absolute beginner|no experience)\b/i],
  ["availability", /\b(available|availability|schedule|free (time|slot)|when (are|can|do) you|slot|calendar|book|morning|evening|time( ?)zone|timezone)\b/i],
  ["method", /\b(how do you teach|method|structure|curriculum|lesson plan|what do we do|homework|material|textbook|how are lessons)\b/i],
  ["thanks", /\b(thanks|thank you|thx|gracias|merci|grazie|obrigad|спасибо|شكرا|감사|ありがとう)\b/i],
  ["greeting", /\b(hi|hello|hey|good (morning|evening|afternoon)|hola|bonjour|ciao|olá|привет|مرحبا|안녕|こんにちは|hallo)\b/i],
];

export function tutorReply(
  tutor: Tutor,
  userText: string,
  openings: Opening[]
): Reply {
  const lang = tutorLanguage(tutor).name;
  const exam = tutorLanguage(tutor).exam;
  const r = rng(tutor.id, userText.trim().toLowerCase(), "reply");
  const delayMs = r.int(1100, 2400);

  let topic: Topic = "fallback";
  for (const [t, re] of PATTERNS) {
    if (re.test(userText)) {
      topic = t;
      break;
    }
  }

  const firstOpening = openings[0];
  const openingLine = firstOpening
    ? `My next open slot is ${shortDate(firstOpening.iso)} at ${String(firstOpening.hour).padStart(2, "0")}:00 your time.`
    : "My calendar for this week is nearly full — a rare event.";

  const texts: Record<Topic, string> = {
    greeting: [
      `${tutor.video[0].line}\n(That's my hello in ${lang} — you'll be saying it too by lesson three.)\n\nWhat are you working on at the moment, and what should ${lang} be able to do for you in six months?`,
      `${tutor.video[0].line}\n\nNice to meet you! Tell me where you're starting from — total beginner, shaky intermediate, or "I understand everything but freeze when speaking" (the most common condition known to language learners).`,
    ][r.int(0, 1)],

    price: `My lessons are ${'$' + tutor.price} for 50 minutes, everything included — the lesson itself, my corrections in writing afterwards, and the homework plan between lessons. If it's your first time, the trial runs at half price, so the first risk is ${'$' + (Math.round(tutor.price / 2))}, not ${'$' + tutor.price}.`,

    trial: `Yes — the first lesson is a proper trial at half price (${Math.round(tutor.price / 2)} USD instead of ${tutor.price}). We do a real lesson, not a sales call: I find out where you are, where you want to be, and you decide afterwards with zero obligation. Fair warning from ${tutor.city}: most people stay.`,

    availability: `${openingLine}\n\nYou can see the full two-week calendar on my profile — tap "View availability" and it shows in your own timezone. ${tutor.responseHrs <= 2 ? "I usually reply within a couple of hours, so ask me anything before booking." : `I usually reply within about ${tutor.responseHrs} hours, so ask me anything before booking.`}`,

    exam: `${tutor.specialties.includes("Exam prep") ? `Exam prep is one of my main tracks — ${exam} work with past papers under real clock conditions, plus the examiner habits that quietly move scores. ` : `I do coach toward ${exam} preparation, though my main tracks are ${tutor.specialties.join(" / ").toLowerCase()}. `}Tell me your target level and deadline, and I'll tell you honestly whether it's a realistic timeline — I'd rather fix the calendar now than the disappointment later.`,

    beginner: `Beginners are genuinely my favourite — ${
      tutor.specialties.includes("Beginners")
        ? "it's one of my declared specialties"
        : `even though my profile leads with ${tutor.specialties.join(" / ").toLowerCase()}, I keep a soft spot for first-timers`
    }. We start at zero with no assumptions, and no, you are not "too old" and not "bad at languages" — you've just had bad teachers so far. Book the trial and bring your excuses; we'll dismantle them politely.`,

    cancel: `The rules of the road: free reschedule up to 24 hours before the lesson (life happens — trains, kids, deadlines), full credit if you cancel with notice. Inside 24 hours I keep the slot fee, because that hour can rarely be resold. Fair in both directions, I believe.`,

    method: `The shape of a lesson with me: we warm up with last week's loose ends, drill the target grammar or vocabulary of the day, then talk freely while I note what needs fixing for next time. You always leave knowing exactly what to practise. Homework is short and pointed — the kind that actually gets done between busy Tuesdays.`,

    thanks: `Thank you — that means a lot. Now go practise: ten minutes of ${lang} out loud today, even to the kettle. It counts, I promise.`,

    fallback: [
      `Good question — I'd rather answer it properly in the trial lesson than in a wall of text here. Short version: it depends on where you're starting from. Long version comes free with the coffee. (I'm in ${tutor.city} — the coffee is ${tutor.cc === 'IT' ? 'excellent' : 'good'}.)`,
      `Let me answer honestly: that's the kind of question that gets a better answer once I know your level. Book the half-price trial, and I'll give you a straight plan — even if you decide not to continue, you keep the plan.`,
      `Noted, and thank you for writing! If it helps: I teach ${tutor.specialties.join(" / ").toLowerCase()} at ${'$' + tutor.price} a lesson, trial at half price. Anything specific about ${lang} you'd like drilled first?`,
    ][r.int(0, 2)],
  };

  const text = texts[topic];
  return { text, delayMs };
}
