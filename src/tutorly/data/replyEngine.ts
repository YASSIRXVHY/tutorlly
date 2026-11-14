/**
 * The reply engine — tutors answer messages in-thread by keyword matching.
 * Every reply interpolates that tutor's real facts (price, subject, exams).
 */
import type { Tutor } from "./tutors";
import { isLanguageTutor, primarySubject, tutorExams, nativeTaughtLanguage } from "./tutors";
import { subjectById } from "./subjects";
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
  | "homework"
  | "code"
  | "music"
  | "where"
  | "duration"
  | "thanks"
  | "fallback";

const PATTERNS: Array<[Topic, RegExp]> = [
  // Specific topics outrank greetings — "Hello, how much is a lesson?"
  // deserves the price answer, not just a wave back.
  ["price", /\b(price|cost|how much|fee|rate|charge|expensive|cheap|payment|pay)\b/i],
  ["trial", /\b(trial|first lesson|discount|half price|test lesson)\b/i],
  ["cancel", /\b(cancel|reschedul|refund|policy|postpone|move (my|the) lesson)\b/i],
  ["code", /\b(code|coding|python|javascript|program|programing|programming|bug|debug|repo|github|developer|bootcamp|career)\b/i],
  ["homework", /\b(homework|assignment|problem set|exercise|worksheet|take-?home|dread|due)\b/i],
  ["music", /\b(guitar|piano|song|chord|music theory|sing|playing)\b/i],
  ["exam", /\b(exam|dele|delf|dalf|jlpt|topik|hsk|ielts|toefl|goethe|ösd|osd|cils|celpe|sat|gre|ap |certific|test|level test)\b/i],
  ["beginner", /\b(beginner|beginers|zero|never studied|from scratch|start from zero|new to|absolute beginner|no experience)\b/i],
  ["duration", /\b(how long|duration|minutes|hour long|length|50 min|60 min)\b/i],
  ["where", /\b(where are you from|where (do )?you live|which country|your city|timezone do you)\b/i],
  ["availability", /\b(available|availability|schedule|free (time|slot)|when (are|can|do) you|slot|calendar|book|morning|evening|time( ?)zone|timezone)\b/i],
  ["method", /\b(how do you teach|method|structure|curriculum|lesson plan|what do we do|material|textbook|how are lessons|whiteboard)\b/i],
  ["thanks", /\b(thanks|thank you|thx|gracias|merci|grazie|obrigad|спасибо|شكرا|감사|ありがとう)\b/i],
  ["greeting", /\b(hi|hello|hey|good (morning|evening|afternoon)|hola|bonjour|ciao|olá|привет|مرحبا|안녕|こんにちは|hallo)\b/i],
];

export function tutorReply(
  tutor: Tutor,
  userText: string,
  openings: Opening[]
): Reply {
  const primary = primarySubject(tutor);
  const topic = primary?.label ?? "the subject";
  const langTutor = isLanguageTutor(tutor);
  const nativeLang = nativeTaughtLanguage(tutor);
  const exams = tutorExams(tutor);
  const r = rng(tutor.id, userText.trim().toLowerCase(), "reply");
  const delayMs = r.int(1100, 2400);

  let topicKind: Topic = "fallback";
  for (const [t, re] of PATTERNS) {
    if (re.test(userText)) {
      topicKind = t;
      break;
    }
  }

  const firstOpening = openings[0];
  const openingLine = firstOpening
    ? `My next open slot is ${shortDate(firstOpening.iso)} at ${String(firstOpening.hour).padStart(2, "0")}:00 your time.`
    : "My calendar for this week is nearly full — a rare event.";

  const texts: Record<Topic, string> = {
    greeting: langTutor
      ? [
          `${tutor.video[0].line}\n(That's my hello in ${topic} — you'll be saying it too by lesson three.)\n\nWhat are you working on at the moment, and what should ${topic} be able to do for you in six months?`,
          `${tutor.video[0].line}\n\nNice to meet you! Tell me where you're starting from — total beginner, shaky intermediate, or "I understand everything but freeze when it matters" (the most common condition known to learners).`,
        ][r.int(0, 1)]
      : [
          `Hi — ${tutor.firstName} here, from ${tutor.city}. ${tutor.tagline}\n\nTell me where you're starting from and what the deadline is; I'll tell you honestly how much runway you need.`,
          `Hello! Nice to meet you. I teach ${tutor.teaches.map((t) => subjectLabelOf(t.subject)).join(", ")}. Where are you at right now, and where do you need to be?`,
        ][r.int(0, 1)],

    price: `My lessons are ${'$' + tutor.price} for 50 minutes, everything included — the lesson itself, my corrections in writing afterwards, and the practice plan between lessons. If it's your first time, the trial runs at half price, so the first risk is ${'$' + (Math.round(tutor.price / 2))}, not ${'$' + tutor.price}.`,

    trial: `Yes — the first lesson is a proper trial at half price (${Math.round(tutor.price / 2)} USD instead of ${tutor.price}). We do a real lesson, not a sales call: I find out where you are, where you want to be, and you decide afterwards with zero obligation. Fair warning from ${tutor.city}: most people stay.`,

    availability: `${openingLine}\n\nYou can see the full two-week calendar on my profile — the times show in your own timezone. ${tutor.responseHrs <= 2 ? "I usually reply within a couple of hours, so ask me anything before booking." : `I usually reply within about ${tutor.responseHrs} hours, so ask me anything before booking.`}`,

    exam: `${exams.length > 0 ? `Exam prep is one of my main tracks — ${exams.join(", ")} work with past papers under real clock conditions, plus the habits that quietly move scores.` : `I do coach toward exam preparation, though my main tracks are ${tutor.specialties.join(" / ").toLowerCase()}.`} Tell me your target and deadline, and I'll tell you honestly whether it's a realistic timeline — I'd rather fix the calendar now than the disappointment later.`,

    beginner: `Beginners are genuinely my favourite — ${
      tutor.specialties.includes("Beginners")
        ? "it's one of my declared specialties"
        : `even though my profile leads with ${tutor.specialties.join(" / ").toLowerCase()}, I keep a soft spot for first-timers`
    }. We start at zero with no assumptions, and no, you are not "too old" and not "not a ${topic} person" — you've just had bad teaching so far. Book the trial and bring your excuses; we'll dismantle them politely.`,

    cancel: `The rules of the road: free reschedule up to 24 hours before the lesson (life happens — trains, kids, deadlines), full credit if you cancel with notice. Inside 24 hours I keep the slot fee, because that hour can rarely be resold. Fair in both directions, I believe.`,

    method: `The shape of a lesson with me: we warm up with last week's loose ends, drill the target of the day, then work freely while I note what needs fixing for next time — on the shared whiteboard, which we both can draw on. You always leave knowing exactly what to practise. Homework is short and pointed — the kind that actually gets done between busy Tuesdays.`,

    homework: `Bring it — the homework you're dreading is exactly what the whiteboard is for. We'll do it together the honest way: you lead, I watch, and we fix the reasoning (not just the answer) when it wobbles. Book any open slot on my profile and upload nothing; just have the sheet at hand.`,

    code: `${tutor.id === "alejandro" || primary?.cat === "programming" ? `That's my home turf — I teach ${tutor.teaches.map((t) => subjectLabelOf(t.subject)).join(", ")} by making you type while I watch, which beats any video course. We debug together, never "delete everything and start over". Bring the error message you're stuck on; stack traces are my love language.` : `I can definitely help you reason through it — though for deep coding work my marketplace colleague Alejandro (Programming, Madrid) is the specialist. Between us, everything gets covered. For my own subjects — ${tutor.teaches.map((t) => subjectLabelOf(t.subject)).join(", ")} — I'm your person. What are you working on?`}`,

    music: `${tutor.teaches.some((t) => ["guitar", "piano", "music-theory"].includes(t.subject)) ? `Yes — I teach ${tutor.teaches.filter((t) => ["guitar", "piano", "music-theory"].includes(t.subject)).map((t) => subjectLabelOf(t.subject)).join(" / ")} alongside my main subjects. We start with the instrument in your hands from minute one; theory arrives exactly when it becomes useful. Do you already own one, or shall we start with the listening list?` : `Music isn't on my card — my subjects are ${tutor.teaches.map((t) => subjectLabelOf(t.subject)).join(", ")}. Klaus in Vienna (piano and theory) or Giulia in Rome (guitar) would be the right door to knock on. Anything in my own subjects I can help with right now?`}`,

    where: `I teach from ${tutor.city}, ${tutor.country} — my calendar shows in your local timezone automatically, so the distance never touches the schedule. ${langTutor ? `And yes, you get the ${nativeLang ? nativeLang.label.toLowerCase() : topic} accent with it, included in the price.` : ""}`,

    duration: `Lessons run 50 minutes — long enough to build something, short enough that your brain stays in the room. ${tutor.trial ? "The trial is the same length at half price, so you can judge the real thing." : "I don't do trials at a discount, but the first lesson has a no-questions exit."}`,

    thanks: `Thank you — that means a lot. Now go practise: ten minutes of ${topic.toLowerCase()} out loud today, even to the kettle. It counts, I promise.`,

    fallback: [
      `Good question — I'd rather answer it properly in the trial lesson than in a wall of text here. Short version: it depends on where you're starting from. Long version comes free with the coffee. (I'm in ${tutor.city}.)`,
      `Let me answer honestly: that's the kind of question that gets a better answer once I know your level. Book the ${tutor.trial ? "half-price trial" : "first lesson"}, and I'll give you a straight plan — even if you decide not to continue, you keep the plan.`,
      `Noted, and thank you for writing! If it helps: I teach ${tutor.teaches.map((t) => subjectLabelOf(t.subject)).join(", ")} at ${'$' + tutor.price} a lesson${tutor.trial ? ", trial at half price" : ""}. Anything specific you'd like drilled first?`,
    ][r.int(0, 2)],
  };

  return { text: texts[topicKind], delayMs };
}

function subjectLabelOf(subjectId: string): string {
  return subjectById(subjectId)?.label ?? subjectId;
}
