'use client';

/**
 * BookingFlow — the three-step funnel: package → time → confirm, with the
 * payment dialog layered on top of the confirm step. Mount = open; a
 * completed (or abandoned) booking fires the parent's onClose and this
 * tree renders nothing. Availability is deterministic per tutor/day/hour,
 * and the student's own bookings knock their hours off the grid.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, Lock, Repeat, Sparkles, type LucideIcon } from "lucide-react";
import type { Tutor } from "../../data/tutors";
import { bookableSlots } from "../../data/availability";
import { subjectById } from "../../data/subjects";
import { useApp } from "../../store/AppStore";
import { cx, formatMoney } from "../../utils/misc";
import { addDays, dateISO, fromISO, hourLabel, longDate, MONTHS, shortDate, timezoneLabel, WEEKDAYS } from "../../utils/time";
import { navigate } from "../../router/router";
import { Modal, ModalHead } from "../common/Modal";
import { Avatar } from "../common/Avatar";
import { CheckoutModal, type PackageKind } from "./CheckoutModal";
import "../../styles/booking.css";

const STEP_TITLES = ["Pick a package", "Pick a time", "Confirm & pay"];
const STEP_LABELS = ["Package", "Time", "Confirm"];
const AUTH_NOTICE = "Log in to book — your lessons live in your browser, never on a server.";

interface Pack {
  kind: PackageKind;
  name: string;
  meta: string;
  note: string;
  perLesson: number;
  total: number;
  durationMin: number;
  icon: LucideIcon;
}

/** The three bookable packages, priced off the tutor's per-lesson rate. */
function packagesFor(tutor: Tutor): Pack[] {
  const packs: Pack[] = [
    {
      kind: "standard", name: "Standard", meta: "50 minutes · full price", icon: BookOpen,
      note: "The regular lesson — book one, or many.",
      perLesson: tutor.price, total: tutor.price, durationMin: 50,
    },
    {
      kind: "weekly", name: "Weekly ×4", meta: "4 × 50 minutes · −10%", icon: Repeat,
      note: "Same hour, four weeks in a row — the habit that actually works.",
      perLesson: Math.round(tutor.price * 0.9), total: Math.round(tutor.price * 0.9) * 4, durationMin: 50,
    },
  ];
  if (tutor.trial) {
    packs.unshift({
      kind: "trial", name: "Trial", meta: "30 minutes · half price", icon: Sparkles,
      note: "One per tutor, no strings — leave after it if it's not a match.",
      perLesson: Math.round(tutor.price / 2), total: Math.round(tutor.price / 2), durationMin: 30,
    });
  }
  return packs;
}

export function BookingFlow({ tutor, subjectId, onClose }: { tutor: Tutor; subjectId: string; onClose: () => void }) {
  const { state, dispatch } = useApp();
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<PackageKind>(tutor.trial ? "trial" : "standard");
  const [iso, setIso] = useState<string | null>(null);
  const [hour, setHour] = useState<number | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const packs = useMemo(() => packagesFor(tutor), [tutor]);
  const pack = packs.find((p) => p.kind === kind) ?? packs[0];
  const subjectLabel = subjectById(subjectId)?.label ?? subjectId;
  const tz = useMemo(() => timezoneLabel(), []);

  // Hours this student already holds with the tutor (cancelled ones free up).
  const mine = useMemo(() => {
    const held = new Set<string>();
    for (const l of state.lessons) {
      if (l.tutorId === tutor.id && l.status !== "cancelled") held.add(`${l.dateISO}|${l.hour}`);
    }
    return held;
  }, [state.lessons, tutor.id]);

  // The 14-day strip — a day is pickable only if an open, unbooked hour survives.
  const days = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 14 }, (_, i) => {
      const d = addDays(base, i);
      const dayIso = dateISO(d);
      const off = !bookableSlots(tutor, dayIso).some((s) => s.open && !mine.has(`${dayIso}|${s.hour}`));
      return { iso: dayIso, wd: WEEKDAYS[d.getDay()], num: d.getDate(), mon: MONTHS[d.getMonth()], today: i === 0, off };
    });
  }, [tutor, mine]);

  // Default to the first open day; if the chosen day dies (booked out), roll forward.
  useEffect(() => {
    if (checkoutOpen) return;
    const cur = iso ? days.find((d) => d.iso === iso) : undefined;
    if (cur && !cur.off) return;
    const later = iso ? days.find((d) => !d.off && d.iso > iso) : undefined;
    const pick = later ?? days.find((d) => !d.off);
    setIso(pick ? pick.iso : null);
    setHour(null);
  }, [days, iso, checkoutOpen]);

  const slots = useMemo(() => (iso ? bookableSlots(tutor, iso) : []), [tutor, iso]);
  const groups = useMemo(
    () =>
      (["morning", "afternoon", "evening"] as const)
        .map((b) => ({ b, list: slots.filter((s) => s.bucket === b) }))
        .filter((g) => g.list.length > 0),
    [slots]
  );
  const weekDates = useMemo(
    () => (iso ? [0, 1, 2, 3].map((k) => dateISO(addDays(fromISO(iso), 7 * k))) : []),
    [iso]
  );

  // Close plumbing: stable identities keep the modal's focus effect calm, and
  // Esc while the payment dialog is up belongs to the payment dialog alone.
  const doneRef = useRef(onClose);
  useEffect(() => {
    doneRef.current = onClose;
  }, [onClose]);
  const checkoutRef = useRef(false);
  useEffect(() => {
    checkoutRef.current = checkoutOpen;
  }, [checkoutOpen]);
  const closeFlow = useCallback(() => {
    if (checkoutRef.current) return;
    setOpen(false);
    doneRef.current();
  }, []);
  const cancelCheckout = useCallback(() => setCheckoutOpen(false), []);
  const finishCheckout = useCallback((to: "dashboard" | "browse") => {
    setCheckoutOpen(false);
    if (to === "dashboard") navigate("/dashboard");
    setOpen(false);
    doneRef.current();
  }, []);

  const goCheckout = () => {
    if (!state.session) {
      dispatch({ type: "openAuth", notice: AUTH_NOTICE });
      return;
    }
    setCheckoutOpen(true);
  };

  if (!open && !checkoutOpen) return null;

  return (
    <>
      {open ? (
        <Modal open onClose={closeFlow} variant="md" label="Book a lesson">
          <ModalHead kicker={`Booking · ${tutor.firstName}`} title={STEP_TITLES[step]} onClose={closeFlow} />
          <div className="bk-steps" role="group" aria-label={`Step ${step + 1} of 3 — ${STEP_LABELS[step]}`}>
            {STEP_LABELS.map((label, i) => (
              <span key={label} className={cx("bk-step", i < step && "bk-step--done", i === step && "bk-step--on")}>
                <span className="bk-step-bar" />
                <span className="bk-step-label">{label}</span>
              </span>
            ))}
          </div>

          <div className="modal-body bk-body">
            {step === 0 ? (
              <div className="bk-packages" role="radiogroup" aria-label="Lesson package">
                {packs.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button key={p.kind} type="button" role="radio" aria-checked={kind === p.kind}
                      className={cx("bk-package", kind === p.kind && "bk-package--on")} onClick={() => setKind(p.kind)}>
                      <span className="bk-package-main">
                        <span className="bk-package-name"><Icon size={15} aria-hidden /> {p.name}</span>
                        <span className="bk-package-meta">{p.meta}</span>
                        <span className="bk-package-note">{p.note}</span>
                      </span>
                      <span className="bk-package-price">
                        {p.kind === "weekly" ? <span className="bk-package-per">per lesson</span> : null}
                        <span className="bk-package-amount num">{formatMoney(p.perLesson)}</span>
                        {p.kind === "weekly" ? <span className="bk-package-total num">total {formatMoney(p.total)}</span> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : step === 1 ? (
              <>
                <div className="bk-days" role="group" aria-label="Lesson day">
                  {days.map((d) => (
                    <button key={d.iso} type="button" disabled={d.off} aria-disabled={d.off} aria-pressed={iso === d.iso}
                      className={cx("bk-day", iso === d.iso && "bk-day--on", d.off && "bk-day--off")}
                      onClick={() => { setIso(d.iso); setHour(null); }}>
                      <span className="bk-day-wd">{d.wd}</span>
                      <span className="bk-day-num num">{d.num}</span>
                      <span className="bk-day-mon">{d.mon}</span>
                      {d.today ? <span className="bk-day-mark">Today</span> : null}
                    </button>
                  ))}
                </div>

                {iso ? (
                  <div className="bk-slots-wrap" role="group" aria-label="Lesson time">
                    {groups.map((g) => (
                      <div className="bk-group" key={g.b}>
                        <span className="mono-label">
                          {g.b === "morning" ? "Morning" : g.b === "afternoon" ? "Afternoon" : "Evening"}
                        </span>
                        <div className="bk-slots">
                          {g.list.map((s) => {
                            const mineHere = mine.has(`${iso}|${s.hour}`);
                            const taken = !s.open || mineHere;
                            return (
                              <button key={s.hour} type="button" disabled={taken} aria-disabled={taken}
                                aria-pressed={hour === s.hour}
                                title={taken ? (mineHere ? "You already booked this hour" : "Already booked") : undefined}
                                className={cx("bk-slot", hour === s.hour && "bk-slot--on")} onClick={() => setHour(s.hour)}>
                                {s.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="bk-none">
                    No open hours in the next two weeks — this tutor's calendar is full. Check back soon, or browse
                    another tutor.
                  </p>
                )}

                {kind === "weekly" && iso ? (
                  <div className="bk-weekinfo">
                    <Repeat size={15} aria-hidden />
                    <div>
                      <p>
                        Books the same slot for 4 consecutive weeks —{" "}
                        <strong>{shortDate(weekDates[0])} → {shortDate(weekDates[3])}</strong>. Free reschedules up to
                        24h before each.
                      </p>
                      <div className="bk-weekdates">
                        {weekDates.map((d, k) => (
                          <span className="kbd" key={d}>W{k + 1} · {shortDate(d)}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                <p className="mono-label bk-tz">Times in {tz} — the tutor's calendar, your clock.</p>
              </>
            ) : (
              <div className="bk-summary">
                <div className="bk-sum-head">
                  <Avatar name={tutor.name} src={tutor.portrait} size="md" />
                  <span className="bk-sum-id">
                    <strong>{tutor.name}</strong>
                    <span className="bk-sum-sub">{subjectLabel} · {tutor.city}, {tutor.country}</span>
                  </span>
                  {kind === "trial" ? <span className="pill pill--upcoming">Trial — half price</span> : null}
                </div>
                <div className="bk-sumrow"><span className="mono-label">Date</span><span>{longDate(iso ?? "")}</span></div>
                <div className="bk-sumrow">
                  <span className="mono-label">Time</span>
                  <span className="num">{hourLabel(hour ?? 0)} · {pack.durationMin} min</span>
                </div>
                <div className="bk-sumrow">
                  <span className="mono-label">Price</span>
                  <span className="num">{formatMoney(pack.perLesson)} per lesson</span>
                </div>
                {kind === "weekly" ? (
                  <>
                    <div className="bk-sumrow">
                      <span className="mono-label">Repeats</span>
                      <span className="num">{weekDates.map((d) => shortDate(d)).join(" · ")}</span>
                    </div>
                    <div className="bk-sumrow bk-sumrow--total">
                      <span className="mono-label">Total · 4 lessons</span>
                      <span className="num">{formatMoney(pack.total)}</span>
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>

          <div className={cx("modal-foot bk-foot", step === 2 && "bk-foot--col")}>
            {step > 0 ? (
              <button type="button" className="btn btn--ghost btn--sm bk-back" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={14} aria-hidden /> Back
              </button>
            ) : (
              <span className="bk-foot-meta">{pack.name} · <span className="num">{formatMoney(pack.total)}</span></span>
            )}
            {step === 0 ? (
              <button type="button" className="btn btn--accent" onClick={() => setStep(1)}>Continue</button>
            ) : null}
            {step === 1 ? (
              <span className="bk-foot-r">
                {hour != null ? (
                  <span className="bk-foot-meta num">{shortDate(iso ?? "")} · {hourLabel(hour)}</span>
                ) : (
                  <span className="bk-foot-hint">Pick an hour to continue</span>
                )}
                <button type="button" className="btn btn--accent" disabled={hour == null} onClick={() => setStep(2)}>
                  Continue
                </button>
              </span>
            ) : null}
            {step === 2 ? (
              <button type="button" className="btn btn--accent btn--block btn--lg" onClick={goCheckout}>
                <Lock size={16} aria-hidden /> Continue to payment
              </button>
            ) : null}
          </div>
        </Modal>
      ) : null}

      {checkoutOpen && iso && hour != null ? (
        <CheckoutModal
          tutor={tutor} subjectId={subjectId} iso={iso} hour={hour} kind={kind}
          perLesson={pack.perLesson} total={pack.total} durationMin={pack.durationMin}
          onCancel={cancelCheckout} onDone={finishCheckout}
        />
      ) : null}
    </>
  );
}
