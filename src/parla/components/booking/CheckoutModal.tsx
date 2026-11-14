'use client';

/**
 * Checkout — the printed invoice and a payment form with real validation:
 * Luhn-checked card numbers, auto-formatting, expiry-not-in-the-past,
 * CVC digits, processing spinner, then the animated boarding pass (in the
 * parent). The bank is imaginary; the validation is not.
 */
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CreditCard, Lock } from "lucide-react";
import { Modal } from "../common/Modal";
import { useApp } from "../../store/AppStore";
import type { BookingDraft, PackKind } from "./BookingFlow";
import { PACKS } from "./BookingFlow";
import { hourLabel, longDate, timezoneLabel } from "../../utils/time";
import { cx, expiryValid, formatCardNumber, formatExpiry, formatMoney, luhnValid } from "../../utils/misc";

interface CheckoutModalProps {
  drafts: BookingDraft[];
  total: number;
  onBack: () => void;
  onPaid: () => void;
}

type PayState = "form" | "processing";

export function CheckoutModal({ drafts, total, onBack, onPaid }: CheckoutModalProps) {
  const { state, dispatch } = useApp();
  const [payState, setPayState] = useState<PayState>("form");
  const [cardName, setCardName] = useState(state.session ? state.session.name : "");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const payTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // If the modal unmounts mid-authorisation, the bank of make-believe
  // politely forgets the transaction instead of dispatching from beyond.
  useEffect(() => {
    return () => {
      if (payTimer.current) clearTimeout(payTimer.current);
    };
  }, []);

  const first = drafts[0];
  const pack = PACKS[first?.pack ?? "single"];
  const unit = first ? first.tutor.price * (1 - pack.discount) : 0;

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!cardName.trim() || cardName.trim().length < 2) {
      e.name = "The name as printed on the card, please.";
    }
    const digits = cardNumber.replace(/\s/g, "");
    if (!digits) e.number = "A card number is required. 4242… works wonders here.";
    else if (digits.length < 13) e.number = "Too short — cards run 13–19 digits.";
    else if (!luhnValid(digits)) e.number = "The checksum says no. Try 4242 4242 4242 4242 — our bank's favourite.";
    if (!expiry) e.expiry = "Expiry, as MM/YY.";
    else if (!expiryValid(expiry)) e.expiry = "That card has expired — or the date is imaginary in the wrong way.";
    if (!cvc) e.cvc = "Three digits from the back of the card.";
    else if (!/^\d{3,4}$/.test(cvc)) e.cvc = "3 digits (4 for Amex) — numbers only.";
    return e;
  };

  const pay = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    setTouched({ name: true, number: true, expiry: true, cvc: true });
    if (Object.keys(e).length > 0) {
      dispatch({ type: "toast", text: "The invoice bounced — check the fields marked in red.", kind: "error" });
      return;
    }
    setPayState("processing");
    // The bank of make-believe takes a moment to rubber-stamp.
    payTimer.current = setTimeout(() => {
      payTimer.current = null;
      setPayState("form");
      onPaid();
    }, 1600);
  };

  const blur = (field: string) => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(validate());
  };

  if (!first) return null;
  const tutor = first.tutor;

  return (
    <Modal
      open
      onClose={payState === "processing" ? () => undefined : onBack}
      kicker="Checkout"
      title={`Pay ${formatMoney(total)} — ${tutor.name}`}
      locked={payState === "processing"}
    >
      <div className="invoice">
        <div className="invoice-head">
          <span className="mono-label">Order</span>
          <span className="invoice-title">
            {pack.label} · {tutor.name}
          </span>
        </div>
        <dl className="invoice-rows">
          <div className="datarow">
            <dt>Lessons</dt>
            <dd className="num">{drafts.length} × 50 min</dd>
          </div>
          <div className="datarow">
            <dt>Unit price</dt>
            <dd className="num">{formatMoney(unit)}</dd>
          </div>
          {pack.discount > 0 && (
            <div className="datarow">
              <dt>Package discount</dt>
              <dd className="num invoice-discount">−{Math.round(pack.discount * 100)}%</dd>
            </div>
          )}
          <div className="datarow invoice-total">
            <dt>Total due</dt>
            <dd className="num">{formatMoney(total)}</dd>
          </div>
        </dl>
        <ul className="invoice-dates">
          {drafts.map((d) => (
            <li key={d.dateISO} className="mono-label">
              {longDate(d.dateISO)} · {hourLabel(d.hour)}
            </li>
          ))}
        </ul>
        <p className="invoice-note">
          Times in {timezoneLabel()}. Free reschedule up to 24h before each lesson.
        </p>
      </div>

      {payState === "processing" ? (
        <div className="pay-processing" role="status" aria-live="polite">
          <span className="spin spin--lg" aria-hidden />
          <p>
            Authorising with the bank of make-believe…
            <br />
            <span className="mono-label">No real card was ever asked to care.</span>
          </p>
        </div>
      ) : (
        <form className="payform" onSubmit={pay} noValidate>
          <div className={cx("field", touched.name && errors.name && "field--error")}>
            <label className="field-label" htmlFor="cc-name">
              Name on card
            </label>
            <input
              id="cc-name"
              className="input"
              value={cardName}
              autoComplete="cc-name"
              placeholder="e.g. A. Wren"
              onChange={(e) => setCardName(e.target.value)}
              onBlur={() => blur("name")}
              aria-invalid={Boolean(touched.name && errors.name)}
              aria-describedby={touched.name && errors.name ? "cc-name-err" : undefined}
            />
            {touched.name && errors.name && (
              <span className="field-error" id="cc-name-err">
                {errors.name}
              </span>
            )}
          </div>

          <div className={cx("field", touched.number && errors.number && "field--error")}>
            <label className="field-label" htmlFor="cc-number">
              Card number
            </label>
            <div className="cc-wrap">
              <input
                id="cc-number"
                className="input"
                inputMode="numeric"
                autoComplete="cc-number"
                value={cardNumber}
                placeholder="4242 4242 4242 4242"
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                onBlur={() => blur("number")}
                aria-invalid={Boolean(touched.number && errors.number)}
                aria-describedby={touched.number && errors.number ? "cc-number-err" : undefined}
              />
              <CreditCard size={15} aria-hidden className="cc-ico" />
            </div>
            {touched.number && errors.number && (
              <span className="field-error" id="cc-number-err">
                {errors.number}
              </span>
            )}
            <span className="field-hint">
              Formatting is automatic; the checksum is honest. 4242… always clears.
            </span>
          </div>

          <div className="payform-row">
            <div className={cx("field", touched.expiry && errors.expiry && "field--error")}>
              <label className="field-label" htmlFor="cc-exp">
                Expiry
              </label>
              <input
                id="cc-exp"
                className="input"
                inputMode="numeric"
                autoComplete="cc-exp"
                value={expiry}
                placeholder="MM/YY"
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                onBlur={() => blur("expiry")}
                aria-invalid={Boolean(touched.expiry && errors.expiry)}
                aria-describedby={touched.expiry && errors.expiry ? "cc-exp-err" : undefined}
              />
              {touched.expiry && errors.expiry && (
                <span className="field-error" id="cc-exp-err">
                  {errors.expiry}
                </span>
              )}
            </div>
            <div className={cx("field", touched.cvc && errors.cvc && "field--error")}>
              <label className="field-label" htmlFor="cc-cvc">
                CVC
              </label>
              <input
                id="cc-cvc"
                className="input"
                inputMode="numeric"
                autoComplete="cc-csc"
                value={cvc}
                placeholder="123"
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                onBlur={() => blur("cvc")}
                aria-invalid={Boolean(touched.cvc && errors.cvc)}
                aria-describedby={touched.cvc && errors.cvc ? "cc-cvc-err" : undefined}
              />
              {touched.cvc && errors.cvc && (
                <span className="field-error" id="cc-cvc-err">
                  {errors.cvc}
                </span>
              )}
            </div>
          </div>

          <button type="submit" className="btn btn--accent btn--block paybtn">
            <Lock size={13} aria-hidden className="btn-ico" />
            Pay {formatMoney(total)}
          </button>

          <div className="payform-links">
            <button type="button" className="linkbtn" onClick={onBack}>
              <ArrowLeft size={11} aria-hidden /> Back to the timetable
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
