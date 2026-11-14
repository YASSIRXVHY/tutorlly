/** Small shared utilities. */

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function formatMoney(n: number, currency = "$"): string {
  const whole = Math.floor(n);
  const cents = Math.round((n - whole) * 100);
  if (cents === 0) return `${currency}${whole}`;
  return `${currency}${whole}.${String(cents).padStart(2, "0")}`;
}

/** Luhn checksum — the classic card-number validity test. */
export function luhnValid(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

/** Format a card number as typed: groups of 4, max 19 digits. */
export function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 19);
  const groups: string[] = [];
  for (let i = 0; i < digits.length; i += 4) {
    groups.push(digits.slice(i, i + 4));
  }
  return groups.join(" ");
}

/** Format expiry as MM/YY while typing. */
export function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length === 0) return "";
  let mm = digits.slice(0, 2);
  if (mm.length === 1) {
    if (Number(mm) > 1) mm = `0${mm}`;
    else return mm;
  }
  if (Number(mm) === 0) mm = "01";
  if (Number(mm) > 12) mm = "12";
  const yy = digits.slice(2, 4);
  return yy ? `${mm}/${yy}` : mm;
}

/** True when expiry is structurally valid and not in the past. */
export function expiryValid(value: string, now = new Date()): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!m) return false;
  const mm = Number(m[1]);
  const yy = 2000 + Number(m[2]);
  if (mm < 1 || mm > 12) return false;
  const endOfMonth = new Date(yy, mm, 1).getTime() - 1;
  return endOfMonth >= now.getTime();
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(performance.now() * 1000).toString(36)}`;
}
