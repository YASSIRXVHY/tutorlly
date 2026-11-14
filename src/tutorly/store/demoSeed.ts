/**
 * Demo seed — built when a visitor signs in (any credentials work).
 * A fresh sign-up gets the honest empty account; the demo sign-in gets a
 * coherent little world: one lesson tonight, two finished, one cancelled,
 * three conversations, one published review — across languages AND math,
 * so every dashboard state is reachable in one click.
 */
import type { Conversation, Lesson, UserReview } from "./types";
import { shortCode } from "../utils/rng";
import { dateISO } from "../utils/time";

function lesson(
  tutorId: string,
  subject: string,
  dateISO_: string,
  hour: number,
  price: number,
  status: Lesson["status"],
  reviewed: boolean
): Lesson {
  return {
    id: `ls-${shortCode(tutorId, dateISO_, hour, status)}`,
    tutorId,
    subject,
    dateISO: dateISO_,
    hour,
    durationMin: 50,
    price,
    status,
    createdAt: Date.now() - 86400000 * 3,
    reviewed,
  };
}

function msg(
  from: "me" | "tutor",
  text: string,
  hoursAgo: number
): Conversation["messages"][number] {
  return {
    id: `msg-${shortCode(from, text.slice(0, 24), hoursAgo)}`,
    from,
    text,
    at: Date.now() - hoursAgo * 3600000,
  };
}

/** First sensible slot at least 90 minutes ahead (demo lesson "tonight"). */
export function demoLessonSlot(now = new Date()): { dateISO: string; hour: number } {
  const t = new Date(now.getTime() + 95 * 60000);
  t.setMinutes(0, 0, 0);
  if (t.getHours() >= 7 && t.getHours() <= 22) {
    return { dateISO: dateISO(t), hour: t.getHours() };
  }
  const tmr = new Date(now);
  tmr.setDate(tmr.getDate() + 1);
  tmr.setHours(10, 0, 0, 0);
  return { dateISO: dateISO(tmr), hour: 10 };
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return dateISO(d);
}

function daysAheadISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dateISO(d);
}

export function buildDemoLessons(): Lesson[] {
  const slot = demoLessonSlot();
  return [
    // Tonight with Kenji — the countdown star of the dashboard.
    lesson("kenji", "japanese", slot.dateISO, slot.hour, 30, "upcoming", false),
    // Finished with Natalia (math), awaiting review — the review modal showcase.
    lesson("natalia", "calculus", daysAgoISO(2), 19, 34, "completed", false),
    // Finished, already reviewed — Mariana.
    lesson("mariana", "spanish", daysAgoISO(6), 18, 18, "completed", true),
    // Cancelled — shows the full pill taxonomy.
    lesson("beatriz", "portuguese", daysAheadISO(3), 11, 17, "cancelled", false),
  ];
}

export function buildDemoReviews(): UserReview[] {
  return [
    {
      id: `ur-${shortCode("mariana", "demo")}`,
      tutorId: "mariana",
      stars: 5,
      tags: ["Punctual", "Great energy", "Structured"],
      text: "Six lessons in and my listening has stopped being a wall of sound — Mariana pauses at exactly the right syllable. The mate is her secret weapon.",
      date: Date.now() - 86400000 * 5,
      author: "You",
      lessons: 6,
    },
  ];
}

export function buildDemoConversations(): Conversation[] {
  return [
    {
      tutorId: "kenji",
      read: false,
      messages: [
        msg("me", "Do you think N4 by December is realistic with two lessons a week?", 30),
        msg(
          "tutor",
          "Honestly: yes, with conditions. We drill twenty verbs a week, and you do fifteen minutes of shadowing daily. The December date is not the problem — the daily shadowing is the work. I will keep you honest about it.",
          29
        ),
        msg(
          "tutor",
          "Confirming our lesson tonight. I will have the video room open fifteen minutes before we start — it is on your dashboard.",
          3
        ),
        msg("tutor", "Bring the verbs we drilled last time. Leave the nerves at the door — I will handle those.", 2),
      ],
    },
    {
      tutorId: "natalia",
      read: false,
      messages: [
        msg(
          "tutor",
          "The worksheet you sent is classic: the chain rule is fine, your fractions panic in step four. Bring the sheet to Wednesday's lesson — we will fix the reasoning, not just the answer.",
          26
        ),
        msg("me", "That's a relief to hear honestly. See you Wednesday.", 25),
      ],
    },
    {
      tutorId: "mariana",
      read: true,
      messages: [
        msg("me", "Quick question — will the voseo confuse me when I talk to people from Mexico?", 70),
        msg(
          "tutor",
          "Not at all — think of it as regional seasoning. You'll understand everyone; they'll just find your '¿dónde podés?' delightfully Buenos Aires. Try it on a taxi driver and report back.",
          69
        ),
      ],
    },
  ];
}

export function buildDemoFavorites(): string[] {
  return ["mariana", "natalia"];
}
