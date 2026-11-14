'use client';

/**
 * CheckoutModal — the payment face of the booking funnel: live card
 * formatting with Luhn validation, a card-face preview that mirrors every
 * keystroke, a theatrical 1.8s "authorisation", then an animated success
 * state that dispatches the booked lessons exactly once.
 */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CreditCard, Lock } from "lucide-react";
import type { Tutor } from "../../data/tutors";
import { subjectById } from "../../data/subjects";
import { useApp } from "../../store/AppStore";
import type { Lesson } from "../../store/types";
import { shortCode } from "../../utils/rng";
import { cx, expiryValid, formatCardNumber, formatExpiry, formatMoney, luhnValid } from "../../utils/misc";
import { addDays, dateISO, fromISO, hourLabel, shortDate } from "../../utils/time";
import { Modal, ModalHead } from "../common/Modal";
import { Spinner } from "../common/atoms";

export type PackageKind = "trial" | "standard" | "weekly";

export interface CheckoutModalProps {
  tutor: Tutor;
  subjectId: string;
  /** First lesson date — the weekly pack repeats from here. */
  iso: string;
  hour: number;
  kind: PackageKind;
  /** Per-lesson price (weekly uses the discounted one). */
  perLesson: number;
  /** Charged amount: per-lesson, or 4 × the discounted per-lesson price. */
  total: number;
  durationMin: number;
  /** Close the payment form without booking — back to the confirm step. */
  onCancel: () => void;
  /** Booking complete: "dashboard" navigates, "browse" just closes. */
  onDone: (to: "dashboard" | "browse") => void;
}

type Phase = "form" | "processing" | "success";
type FieldKey = "card" | "name" | "exp" | "cvc";

const ERRORS: Record<FieldKey, string> = {
  card: "That number fails the Luhn checksum — try 4242 4242 4242 4242.",
  name: "The name printed on the card — at least 2 characters.",
  exp: "Expiry looks past or malformed — MM/YY, in the future.",
  cvc: "3 or 4 digits, like 123.",
};

export function CheckoutModal({
  tutor, subjectId, iso, hour, kind, perLesson, total, durationMin, onCancel, onDone,
}: CheckoutModalProps) {
  const { state, dispatch } = useApp();
  const [phase, setPhase] = useState<Phase>("form");
  const [card, setCard] = useState("");
  const [holder, setHolder] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [zip, setZip] = useState("");
  const [shown, setShown] = useState<Record<FieldKey, boolean>>({ card: false, name: false, exp: false, cvc: false });
  const [shaking, setShaking] = useState(false);
  const bookedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const ok: Record<FieldKey, boolean> = {
    card: luhnValid(card.replace(/\D/g, "")),
    name: holder.trim().length >= 2,
    exp: expiryValid(exp),
    cvc: /^\d{3,4}$/.test(cvc),
  };
  const subjectLabel = subjectById(subjectId)?.label ?? subjectId;
  const weekDates = kind === "weekly" ? [0, 1, 2, 3].map((k) => dateISO(addDays(fromISO(iso), 7 * k))) : [];

  const fieldCx = (k: FieldKey) =>
    cx("field", shown[k] && !ok[k] && "field--error", shown[k] && ok[k] && "field--valid");
  const err = (k: FieldKey) => (shown[k] && !ok[k] ? <span className="field-error">{ERRORS[k]}</span> : null);
  const touch = (k: FieldKey) => setShown((s) => ({ ...s, [k]: true }));
  const nudge = () => {
    setShaking(false);
    requestAnimationFrame(() => setShaking(true));
    window.setTimeout(() => setShaking(false), 480);
  };

  const pay = (e: FormEvent) => {
    e.preventDefault();
    setShown({ card: true, name: true, exp: true, cvc: true });
    if (!ok.card || !ok.name || !ok.exp || !ok.cvc) {
      nudge();
      return;
    }
    setPhase("processing");
    timerRef.current = setTimeout(() => {
      if (!bookedRef.current) {
        bookedRef.current = true;
        dispatch({
          type: "addLessons",
          lessons: buildLessons(state.lessons, { tutor, subjectId, iso, hour, kind, perLesson, durationMin }),
        });
        dispatch({
          type: "toast",
          text: kind === "weekly"
            ? `Weekly pack booked — starts ${shortDate(iso)}. The room opens 15 minutes before.`
            : `Lesson booked — see you ${shortDate(iso)}. The room opens 15 minutes before.`,
        });
      }
      setPhase("success");
    }, 1800);
  };

  const close = () => {
    if (phase === "processing") return; // a transaction is in flight — hold still
    if (phase === "success") onDone("browse");
    else onCancel();
  };

  return (
    <Modal open onClose={close} variant="sm" label="Payment">
      <ModalHead kicker="Secure-ish" title="Checkout — simulated" onClose={close} />

      {phase === "form" ? (
        <>
          <p className="mono-label bk-note">
            No money moves. Any Luhn-valid card works; 4242 4242 4242 4242 is the classic.
          </p>
          <form className="modal-body bk-pay" onSubmit={pay} noValidate>
            <div className="bk-cardface" aria-hidden="true">
              <div className="bk-cardface-top">
                <span>Tutorly · demo card</span>
                <CreditCard size={16} strokeWidth={2.2} />
              </div>
              <div className="bk-cardface-num num">{card || "•••• •••• •••• ••••"}</div>
              <div className="bk-cardface-bottom">
                <span className="bk-cardface-exp num">{exp || "••/••"}</span>
                <span className="bk-cardface-name">{holder.trim() || "Cardholder"}</span>
              </div>
            </div>

            <div className={fieldCx("card")}>
              <label className="field-label" htmlFor="bk-card">
                Card number <span className="field-req" aria-hidden>*</span>
              </label>
              <input id="bk-card" className="input num" inputMode="numeric" autoComplete="cc-number"
                maxLength={23} placeholder="4242 4242 4242 4242" value={card}
                onChange={(e) => setCard(formatCardNumber(e.target.value))} onBlur={() => touch("card")} />
              {err("card")}
            </div>

            <div className={fieldCx("name")}>
              <label className="field-label" htmlFor="bk-name">
                Name on card <span className="field-req" aria-hidden>*</span>
              </label>
              <input id="bk-name" className="input" autoComplete="cc-name" placeholder="Sofia Andrade"
                value={holder} onChange={(e) => setHolder(e.target.value)} onBlur={() => touch("name")} />
              {err("name")}
            </div>

            <div className="bk-pay-row">
              <div className={fieldCx("exp")}>
                <label className="field-label" htmlFor="bk-exp">
                  Expiry <span className="field-req" aria-hidden>*</span>
                </label>
                <input id="bk-exp" className="input num" inputMode="numeric" autoComplete="cc-exp" maxLength={5}
                  placeholder="MM/YY" value={exp}
                  onChange={(e) => setExp(formatExpiry(e.target.value))} onBlur={() => touch("exp")} />
                {err("exp")}
              </div>
              <div className={fieldCx("cvc")}>
                <label className="field-label" htmlFor="bk-cvc">
                  CVC <span className="field-req" aria-hidden>*</span>
                </label>
                <input id="bk-cvc" className="input num" inputMode="numeric" autoComplete="cc-csc" maxLength={4}
                  placeholder="123" value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))} onBlur={() => touch("cvc")} />
                {err("cvc")}
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="bk-zip">
                ZIP <span className="bk-optional">· optional</span>
              </label>
              <input id="bk-zip" className="input" autoComplete="postal-code"
                placeholder="Billing ZIP — skip it if you like" value={zip} onChange={(e) => setZip(e.target.value)} />
            </div>

            <button type="submit" className={cx("btn btn--accent btn--block btn--lg", shaking && "bk-shake")}>
              <Lock size={16} aria-hidden /> Pay {formatMoney(total)}
            </button>
            <span className="field-hint bk-pay-hint">
              Simulated payment — nothing leaves this tab and the numbers are forgotten on close.
            </span>
          </form>
        </>
      ) : phase === "processing" ? (
        <div className="modal-body bk-processing">
          <Spinner large label="Authorising payment" />
          <p className="mono-label">Authorising with absolutely no bank…</p>
        </div>
      ) : (
        <div className="modal-body bk-success">
          <svg className="bk-check" viewBox="0 0 56 56" aria-hidden="true">
            <circle className="bk-check-circle" cx="28" cy="28" r="24" pathLength={44} />
            <path className="bk-check-mark" d="M17 28.5l7.5 7.5L39 20" pathLength={44} />
          </svg>
          <h3 className="bk-success-title">Booked!</h3>
          <p className="bk-success-sub">
            {kind === "weekly" ? "4 lessons booked · room codes in My lessons" : `Paid ${formatMoney(total)} — simulated, of course.`}
          </p>
          <div className="bk-success-lines">
            <div className="bk-line"><span className="mono-label">Tutor</span><span>{tutor.name}</span></div>
            <div className="bk-line"><span className="mono-label">Subject</span><span>{subjectLabel}</span></div>
            {kind === "weekly" ? (
              <div className="bk-line">
                <span className="mono-label">Dates</span>
                <span className="num">{weekDates.map((d) => shortDate(d)).join(" · ")}</span>
              </div>
            ) : (
              <>
                <div className="bk-line">
                  <span className="mono-label">When</span>
                  <span>{shortDate(iso)} · <span className="num">{hourLabel(hour)}</span> · {durationMin} min</span>
                </div>
                <div className="bk-line">
                  <span className="mono-label">Room code</span>
                  <span className="kbd">{shortCode(tutor.id, iso, hour)}</span>
                </div>
              </>
            )}
          </div>
          <div className="bk-success-actions">
            <button type="button" className="btn btn--primary btn--lg" onClick={() => onDone("dashboard")}>
              Go to my lessons
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => onDone("browse")}>
              Keep browsing
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** Lesson records for the store — deterministic ids with a collision guard. */
function buildLessons(
  existing: Lesson[],
  o: { tutor: Tutor; subjectId: string; iso: string; hour: number; kind: PackageKind; perLesson: number; durationMin: number }
): Lesson[] {
  const taken = new Set(existing.map((l) => l.id));
  const fresh = (base: string) => {
    let id = base;
    let n = 2;
    while (taken.has(id)) id = `${base}-${n++}`;
    taken.add(id);
    return id;
  };
  const at = Date.now();
  if (o.kind === "weekly") {
    const packId = `pw-${shortCode(o.tutor.id, o.iso, o.hour)}`;
    return [0, 1, 2, 3].map((k) => ({
      id: fresh(`ls-${shortCode(o.tutor.id, o.iso, o.hour, o.kind)}`),
      tutorId: o.tutor.id,
      subject: o.subjectId,
      dateISO: dateISO(addDays(fromISO(o.iso), 7 * k)),
      hour: o.hour,
      durationMin: 50,
      price: o.perLesson,
      status: "upcoming" as const,
      createdAt: at,
      packId,
      packSize: 4,
    }));
  }
  return [{
    id: fresh(`ls-${shortCode(o.tutor.id, o.iso, o.hour, o.kind)}`),
    tutorId: o.tutor.id,
    subject: o.subjectId,
    dateISO: o.iso,
    hour: o.hour,
    durationMin: o.durationMin,
    price: o.perLesson,
    status: "upcoming" as const,
    createdAt: at,
  }];
}
