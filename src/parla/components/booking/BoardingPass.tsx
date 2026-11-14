'use client';

/**
 * The boarding pass — Parla's signature moment. A lesson ticket with a
 * generated barcode, perforation, and gate data, rotated one degree like
 * it was just torn off the press. Deterministic per lesson.
 */
import type { BookingDraft } from "./BookingFlow";
import { PACKS } from "./BookingFlow";
import { tutorLanguage } from "../../data/tutors";
import { Barcode } from "../common/atoms";
import { hourLabel, longDate, timezoneLabel } from "../../utils/time";
import { formatMoney } from "../../utils/misc";
import { shortCode } from "../../utils/rng";

export function BoardingPass({ drafts }: { drafts: BookingDraft[] }) {
  const first = drafts[0];
  if (!first) return null;
  const tutor = first.tutor;
  const lang = tutorLanguage(tutor);
  const pack = PACKS[first.pack];
  const ticketNo = shortCode("ticket", tutor.id, first.dateISO, first.hour, first.pack);

  return (
    <div className="boardingpass" aria-label="Lesson boarding pass">
      <div className="bp-main">
        <div className="bp-routelabel">
          <span>Parla · Fluency Line</span>
          <span className="bp-class">Lesson class · {pack.lessons > 1 ? "SERIES" : "SINGLE"}</span>
        </div>
        <div className="bp-route">
          <span className="bp-from">TONGUE-TIED</span>
          <span className="bp-arrow" aria-hidden>
            <span className="bp-arrow-line">— — —</span>
            <span className="bp-arrow-glyph">»</span>
            <span className="bp-arrow-line">— — —</span>
          </span>
          <span className="bp-to">FLUENT</span>
        </div>
        <dl className="bp-fields">
          <div>
            <dt>Date</dt>
            <dd>{longDate(first.dateISO)}</dd>
          </div>
          <div>
            <dt>Departs</dt>
            <dd className="num">{hourLabel(first.hour)}</dd>
          </div>
          <div>
            <dt>Tutor</dt>
            <dd>{tutor.name}</dd>
          </div>
          <div>
            <dt>Language</dt>
            <dd>{lang.name}</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd className="num">50 min</dd>
          </div>
          <div>
            <dt>Gate</dt>
            <dd className="num">#/classroom</dd>
          </div>
        </dl>
        {pack.lessons > 1 && (
          <div className="bp-series">
            <span className="mono-label">Weekly series · {pack.lessons} lessons</span>
            <span className="bp-series-dates num">
              {drafts.map((d) => d.dateISO.slice(5).replace("-", "/")).join(" · ")}
            </span>
          </div>
        )}
        <div className="bp-fineprint">
          Gate opens 15 minutes before departure · Reschedule free up to 24h ·
          Board with questions, leave with fewer
        </div>
      </div>

      <div className="bp-perf" aria-hidden />

      <div className="bp-stub">
        <div className="bp-stub-head">
          <span className="bp-brand">
            Parla<span className="brand-dot">.</span>
          </span>
          <span className="mono-label">Boarding pass</span>
        </div>
        <Barcode value={`PRL-${ticketNo}`} />
        <div className="bp-stub-row">
          <span className="mono-label">Ticket</span>
          <span className="num bp-ticketno">PRL-{ticketNo}</span>
        </div>
        <div className="bp-stub-row">
          <span className="mono-label">Paid</span>
          <span className="num">
            {formatMoney(first.tutor.price * (1 - pack.discount) * pack.lessons)}
          </span>
        </div>
        <div className="bp-stub-row bp-stub-tz">
          <span className="mono-label">Local</span>
          <span className="mono-label">{timezoneLabel()}</span>
        </div>
      </div>
    </div>
  );
}
