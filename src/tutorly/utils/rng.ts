/**
 * Deterministic randomness.
 *
 * The whole demo runs on a seeded RNG (mulberry32 fed by a string hash),
 * so tutor availability, review corpora and recommendations are
 * byte-for-byte identical on every machine and every reload.
 * No Math.random() anywhere in the app.
 */

/** xmur3 string hash — turns any string into a 32-bit seed. */
export function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** mulberry32 — a tiny, fast, high-quality 32-bit PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A seeded generator bound to a stable string key. */
export interface Rng {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(arr: readonly T[]): T;
  pickIndex<T>(arr: readonly T[]): number;
  chance(p: number): boolean;
}

/** Build an Rng from any set of parts — same parts, same numbers, forever. */
export function rng(...parts: (string | number)[]): Rng {
  const rand = mulberry32(hashString(parts.join("|")));
  const api: Rng = {
    next: rand,
    int(min, max) {
      return min + Math.floor(rand() * (max - min + 1));
    },
    pick<T>(arr: readonly T[]): T {
      return arr[Math.floor(rand() * arr.length)];
    },
    pickIndex<T>(arr: readonly T[]): number {
      return Math.floor(rand() * arr.length);
    },
    chance(p) {
      return rand() < p;
    },
  };
  return api;
}

/** Deterministic integer hash code for a lesson/room (readable, stable). */
export function shortCode(...parts: (string | number)[]): string {
  let n = hashString(parts.join("|"));
  const alphabet = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[n % alphabet.length];
    n = Math.floor(n / alphabet.length);
  }
  return out;
}
