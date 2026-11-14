'use client';

/**
 * The booking flow — step one: date strip (14 days) + deterministic slots
 * grouped morning/afternoon/evening + weekly packages; step two: checkout
 * with real card validation; step three: the boarding pass.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import type { Tutor } from "../../data/tutors";
import { tutorById, tutorLanguage } from "../../data/tutors";
import { bookableSlots } from "../../data/availability";
import { useApp } from "../../store/AppStore";
import { Modal } from "../common/Modal";
import { CheckoutModal } from "./CheckoutModal";
import { BoardingPass } from "./BoardingPass";
import { navigate } from "../../router/router";
import { addDays, dateISO, fromISO, hourLabel, MONTHS, shortDate, timezoneLabel, WEEKDAYS } from "../../utils/time";
import { formatMoney, cx } from "../../utils/misc";

export type PackKind = "single" | "quad" | "octo";

export const PACKS: Record<
  PackKind,
  { label: string; lessons: number; discount: number; blurb: string }
> = {
  single: {
    label: "Single lesson",
    lessons: 1,
    discount: 0,
    blurb: "One 50-minute lesson. No commitment beyond showing up.",
  },
  quad: {
    label: "4-week pack",
    lessons: 4,
    discount: 0.1,
    blurb: "Same time, same weekday, four weeks running. Weekly rhythm included.",
  },
  octo: {
    label: "8-week pack",
    lessons: 8,
    discount: 0.15,
    blurb: "A proper term. Same slot, eight weeks, the deep-work option.",
  },
};

export interface BookingDraft {
  tutor: Tutor;
  dateISO: string;
  hour: number;
  pack: PackKind;
}

interface BookingFlowProps {
  tutorId: string | null;
  onClose: () => void;
}

export function BookingFlow({ tutorId, onClose }: BookingFlowProps) {
  const tutor = tutorById(tutorId);
  // Mount-per-open (keyed by tutor): the timetable resets by remounting,
  // never by an effect full of setState.
  if (!tutorId || !tutor) return null;
  return <BookingFlowInner key={tutorId} tutor={tutor} onClose={onClose} />;
}

function BookingFlowInner({ tutor, onClose }: { tutor: Tutor; onClose: () => void }) {
  const { state, dispatch } = useApp();
  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 14 }, (_, i) => {
      const d = addDays(today, i);
      return { iso: dateISO(d), date: d };
    });
  }, []);

  // Booked-by-you lookup so paid slots go grey and unclickable.
  const bookedSet = useMemo(() => {
    const s = new Set<string>();
    for (const l of state.lessons) {
      if (l.tutorId === tutor.id && l.status !== "cancelled") {
        s.add(`${l.dateISO}T${l.hour}`);
      }
    }
    return s;
  }, [state.lessons, tutor]);

  // Open on the first day that has anything open.
  const firstOpenIso =
    days.find((d) => countOpen(tutor, d.iso, bookedSet) > 0)?.iso ?? days[0].iso;
  const [activeIso, setActiveIso] = useState<string>(firstOpenIso);
  const [selected, setSelected] = useState<{ iso: string; hour: number } | null>(null);
  const [pack, setPack] = useState<PackKind>("single");
  const [checkout, setCheckout] = useState(false);
  const [paidLessons, setPaidLessons] = useState<BookingDraft[] | null>(null);

  // Auth gate for booking — a dispatch, not local setState.
  const gated = useRef(false);
  useEffect(() => {
    if (!state.session && !gated.current) {
      gated.current = true;
      dispatch({
        type: "openAuth",
        notice: "Sign in to book a lesson — your bookings live in this browser.",
      });
      onClose();
    }
  }, [state.session, dispatch, onClose]);

  const slots = bookableSlots(tutor, activeIso).map((s) => ({
    ...s,
    booked: bookedSet.has(`${activeIso}T${s.hour}`),
  }));

  const drafts: BookingDraft[] = selected
    ? Array.from({ length: PACKS[pack].lessons }, (_, i) => {
        const d = fromISO(selected.iso);
        d.setDate(d.getDate() + i * 7);
        return { tutor, dateISO: dateISO(d), hour: selected.hour, pack };
      })
    : [];

  const unit = tutor.price * (1 - PACKS[pack].discount);
  const total = unit * PACKS[pack].lessons;
  const lang = tutorLanguage(tutor);

  return (
    <>
      {!checkout && !paidLessons && (
        <Modal
          open
          onClose={onClose}
          kicker="Timetable"
          title={`Book a lesson with ${tutor.firstName}`}
          size="wide"
          footer={
            <div className="bookfoot">
              <div className="bookfoot-summary">
                {selected ? (
                  <>
                    <span className="mono-label">
                      {PACKS[pack].label} · {lang.name}
                    </span>
                    <span className="bookfoot-price num">
                      {formatMoney(total)} · {shortDate(selected.iso)} {hourLabel(selected.hour)}
                    </span>
                  </>
                ) : (
                  <span className="field-hint">
                    Pick a day, then an hour — shown in {timezoneLabel()}.
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn btn--solid"
                disabled={!selected}
                onClick={() => setCheckout(true)}
              >
                Continue to checkout
              </button>
            </div>
          }
        >
          <div className="datestrip-wrap">
            <span className="mono-label datestrip-label">
              <CalendarDays size={12} aria-hidden /> Next 14 days
            </span>
            <div className="datestrip" role="listbox" aria-label="Lesson date">
              {days.map((d) => {
                const openCount = countOpen(tutor, d.iso, bookedSet);
                const isToday = d.iso === dateISO(new Date());
                const active = d.iso === activeIso;
                return (
                  <button
                    key={d.iso}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={cx(
                      "dateslot",
                      active && "dateslot--active",
                      openCount === 0 && "dateslot--empty"
                    )}
                    disabled={openCount === 0}
                    onClick={() => {
                      setActiveIso(d.iso);
                      setSelected(null);
                    }}
                  >
                    <span className="dateslot-dow" aria-hidden>
                      {isToday ? "Today" : WEEKDAYS[d.date.getDay()]}
                    </span>
                    <span className="dateslot-day num" aria-hidden>
                      {d.date.getDate()}
                    </span>
                    <span className="dateslot-mon" aria-hidden>
                      {MONTHS[d.date.getMonth()]}
                    </span>
                    <span className="sr-only">
                      {`${d.date.getDate()} ${MONTHS[d.date.getMonth()]} — ${openCount} open slots`}
                    </span>
                    <span className="dateslot-count mono-label" aria-hidden>
                      {openCount ? `${openCount} open` : "full"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="slotgrid" aria-label="Available times">
            {(
              [
                ["morning", "Morning"],
                ["afternoon", "Afternoon"],
                ["evening", "Evening"],
              ] as const
            ).map(([bucket, label]) => {
              const group = slots.filter((s) => s.bucket === bucket);
              return (
                <div className="slotgroup" key={bucket}>
                  <div className="slotgroup-head">
                    <span className="mono-label">{label}</span>
                    <span className="mono-label slotgroup-count">
                      {group.filter((s) => s.open && !s.booked).length} open
                    </span>
                  </div>
                  <div className="slotgroup-grid">
                    {group.map((s) => (
                      <button
                        key={s.hour}
                        type="button"
                        className={cx(
                          "slotbtn num",
                          !s.open && !s.booked && "slotbtn--closed",
                          s.booked && "slotbtn--booked",
                          selected?.iso === activeIso && selected?.hour === s.hour && "slotbtn--selected"
                        )}
                        disabled={!s.open || s.booked}
                        onClick={() => setSelected({ iso: activeIso, hour: s.hour })}
                        title={s.booked ? "You already hold this slot" : undefined}
                      >
                        {s.label}
                        {s.booked && <span className="slotbtn-flag">booked</span>}
                        {!s.open && !s.booked && <span className="slotbtn-flag">closed</span>}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="packcards" role="radiogroup" aria-label="Package">
            <span className="mono-label">Package</span>
            <div className="packcards-row">
              {(Object.keys(PACKS) as PackKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={pack === k}
                  className={cx("packcard", pack === k && "packcard--active")}
                  onClick={() => setPack(k)}
                >
                  <span className="packcard-name">{PACKS[k].label}</span>
                  <span className="packcard-blurb">{PACKS[k].blurb}</span>
                  <span className="packcard-price">
                    {PACKS[k].discount > 0 && (
                      <span className="packcard-discount">−{Math.round(PACKS[k].discount * 100)}%</span>
                    )}
                    <span className="num">
                      {formatMoney(tutor.price * (1 - PACKS[k].discount) * PACKS[k].lessons)}
                    </span>
                    <span className="packcard-per">
                      {PACKS[k].lessons > 1 ? `/ ${PACKS[k].lessons} lessons` : "/ 1 lesson"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            {pack !== "single" && selected && (
              <span className="field-hint">
                Weekly repeat — same weekday, same hour: {drafts.map((d) => shortDate(d.dateISO)).join(" · ")}
              </span>
            )}
          </div>
        </Modal>
      )}

      {checkout && !paidLessons && (
        <CheckoutModal
          drafts={drafts}
          total={total}
          onBack={() => setCheckout(false)}
          onPaid={() => {
            dispatch({
              type: "addLessons",
              lessons: drafts.map((d) => ({
                id: `ls-${d.tutor.id}-${d.dateISO}-${d.hour}-${d.pack}`,
                tutorId: d.tutor.id,
                dateISO: d.dateISO,
                hour: d.hour,
                durationMin: 50,
                price: Math.round(d.tutor.price * (1 - PACKS[d.pack].discount)),
                status: "upcoming" as const,
                createdAt: Date.now(),
                packId: d.pack !== "single" ? `${d.pack}-${d.dateISO}-${d.hour}` : undefined,
                packSize: d.pack !== "single" ? PACKS[d.pack].lessons : undefined,
              })),
            });
            dispatch({
              type: "addMessage",
              tutorId: tutor.id,
              from: "tutor",
              text: `Confirmed — ${
                drafts.length === 1 ? "see you" : "the series starts"
              } ${shortDate(drafts[0].dateISO)} at ${hourLabel(drafts[0].hour)} your time. The classroom opens fifteen minutes early; I'll have the board markers ready. Anything you want on the agenda?`,
            });
            dispatch({
              type: "toast",
              text: `Paid ${formatMoney(total)} — lesson${
                drafts.length > 1 ? "s" : ""
              } booked. Your boarding pass${drafts.length > 1 ? "es are" : " is"} printed below.`,
            });
            setPaidLessons(drafts);
            setCheckout(false);
          }}
        />
      )}

      {paidLessons && (
        <Modal
          open
          onClose={() => {
            setPaidLessons(null);
            onClose();
          }}
          kicker="Paid & printed"
          title="Your boarding pass"
          footer={
            <div className="bookfoot">
              <span className="field-hint">The ticket also lives on your dashboard.</span>
              <button
                type="button"
                className="btn btn--solid"
                onClick={() => {
                  const first = paidLessons[0];
                  const id = `ls-${first.tutor.id}-${first.dateISO}-${first.hour}-${first.pack}`;
                  setPaidLessons(null);
                  onClose();
                  navigate(`/classroom/${id}`);
                }}
              >
                Go to the classroom
              </button>
            </div>
          }
        >
          <BoardingPass drafts={paidLessons} />
        </Modal>
      )}
    </>
  );
}

function countOpen(tutor: Tutor, iso: string, booked: Set<string>): number {
  return bookableSlots(tutor, iso).filter((s) => s.open && !booked.has(`${iso}T${s.hour}`)).length;
}
