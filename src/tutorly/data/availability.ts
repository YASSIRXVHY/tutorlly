/**
 * Availability — deterministic per (tutor, date, hour).
 * The calendar looks organic but is a pure function of stable inputs:
 * every machine, every run, the same open slots.
 */
import type { Tutor } from "./tutors";
import { rng, shortCode } from "../utils/rng";
import { dateISO, slotDate, timeBucket } from "../utils/time";

export const SLOT_MIN_HOUR = 7;
export const SLOT_MAX_HOUR = 22; // inclusive

export interface Slot {
  hour: number;
  label: string;
  open: boolean;
  bucket: "morning" | "afternoon" | "evening";
  /** stable id used to mark a booked slot in a lesson record */
  code: string;
}

function rawOpen(tutor: Tutor, iso: string, hour: number): boolean {
  const r = rng(tutor.id, iso, hour, "open");
  // openness tuned per tutor; weekends run slightly quieter
  const day = new Date(iso + "T00:00").getDay();
  const weekend = day === 0 || day === 6;
  const density = tutor.openness * (weekend ? 0.82 : 1);
  return r.chance(0.35 + density * 0.45);
}

/** All slots for a day; guarantees at least 4 open so no day is useless. */
export function slotsForDate(tutor: Tutor, iso: string): Slot[] {
  const slots: Slot[] = [];
  const opens: boolean[] = [];
  for (let h = SLOT_MIN_HOUR; h <= SLOT_MAX_HOUR; h++) {
    opens.push(rawOpen(tutor, iso, h));
  }
  let openCount = opens.filter(Boolean).length;
  if (openCount < 4) {
    const filler = rng(tutor.id, iso, "fill");
    const closed = opens.map((o, i) => (o ? -1 : i)).filter((i) => i >= 0);
    while (openCount < 4 && closed.length) {
      const idx = filler.pickIndex(closed);
      opens[closed[idx]] = true;
      closed.splice(idx, 1);
      openCount++;
    }
  }
  for (let h = SLOT_MIN_HOUR; h <= SLOT_MAX_HOUR; h++) {
    slots.push({
      hour: h,
      label: `${String(h).padStart(2, "0")}:00`,
      open: opens[h - SLOT_MIN_HOUR],
      bucket: timeBucket(h),
      code: shortCode(tutor.id, iso, h),
    });
  }
  return slots;
}

/** Slots still in the future for a given date (today's earlier hours close). */
export function bookableSlots(tutor: Tutor, iso: string, now = new Date()): Slot[] {
  const slots = slotsForDate(tutor, iso);
  const today = dateISO(now);
  return slots.map((s) => {
    const past = iso === today && slotDate(iso, s.hour).getTime() <= now.getTime() + 45 * 60000;
    return { ...s, open: s.open && !past };
  });
}

/** Does the tutor have any open slot in the coming 7 days? */
export function availableThisWeek(tutor: Tutor, now = new Date()): boolean {
  for (let d = 0; d < 7; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    const iso = dateISO(day);
    const slots = bookableSlots(tutor, iso, now);
    if (slots.some((s) => s.open)) return true;
  }
  return false;
}

/** Next few open slots across the next 10 days, for the profile sidebar. */
export interface Opening {
  iso: string;
  hour: number;
}

export function nextOpenings(tutor: Tutor, limit: number, now = new Date()): Opening[] {
  const out: Opening[] = [];
  for (let d = 0; d < 10 && out.length < limit; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    const iso = dateISO(day);
    for (const s of bookableSlots(tutor, iso, now)) {
      if (s.open) {
        out.push({ iso, hour: s.hour });
        if (out.length >= limit) break;
      }
    }
  }
  return out;
}
