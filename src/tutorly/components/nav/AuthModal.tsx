'use client';

/**
 * Auth modal — Log in / Sign up tabs with real validation, a one-click demo
 * account, honest microcopy. Log in lands in the seeded demo world; a fresh
 * sign-up starts honestly empty (the empty states are part of the design).
 */
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useApp } from "../../store/AppStore";
import { Modal } from "../common/Modal";
import { cx } from "../../utils/misc";

import "../../styles/auth.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Mode = "login" | "signup";

interface Errors {
  name?: string;
  email?: string;
  password?: string;
}

export function AuthModal() {
  const { state, dispatch } = useApp();
  const open = state.ui.authOpen;

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMode("login");
      setErrors({});
      setSubmitting(false);
    }
  }, [open]);

  if (!open) return null;

  const close = () => dispatch({ type: "closeAuth" });

  const switchMode = (m: Mode) => {
    setMode(m);
    setErrors({});
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (mode === "signup" && name.trim().length < 2) {
      next.name = "Tell us what to call you — two characters minimum.";
    }
    if (!EMAIL_RE.test(email.trim())) {
      next.email = "That email doesn't look right — check the @ and the dot.";
    }
    if (password.length < 6) {
      next.password = "At least 6 characters. This is a demo, but habits matter.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    // A believable half-second of "work" — the demo's only fake latency.
    setTimeout(() => {
      if (mode === "login") {
        const derived = nameFromEmail(email.trim());
        dispatch({
          type: "signIn",
          user: { name: derived, email: email.trim(), since: Date.now() },
        });
        dispatch({
          type: "toast",
          text: `Welcome back, ${derived} — your demo account has 4 lessons and 3 conversations.`,
        });
      } else {
        dispatch({
          type: "signUp",
          user: { name: name.trim(), email: email.trim(), since: Date.now() },
        });
        dispatch({
          type: "toast",
          text: `Account created — welcome to Tutorly, ${name.trim()}. Your calendar is a blank page; find a tutor to fill it.`,
        });
      }
      setSubmitting(false);
    }, 550);
  };

  const fillDemo = () => {
    setMode("login");
    setEmail("alex@demo.student");
    setPassword("lesson-demo");
    setErrors({});
  };

  return (
    <Modal open={open} onClose={close} variant="sm" label="Log in or sign up">
      <div className="modal-head">
        <div>
          <div className="modal-kicker">Welcome to Tutorly</div>
          <h2 className="modal-title">{mode === "login" ? "Log in" : "Create your account"}</h2>
        </div>
        <button type="button" className="modal-close" onClick={close} aria-label="Close dialog">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {state.ui.authNotice ? (
        <div className="modal-notice">
          <Sparkles size={15} aria-hidden />
          <span>{state.ui.authNotice}</span>
        </div>
      ) : null}

      <form className="modal-body auth-body" onSubmit={submit} noValidate>
        <div className="segmented segmented--full" role="tablist" aria-label="Auth mode">
          <button
            type="button"
            className={cx("segmented-item", mode === "login" && "segmented-item--on")}
            role="tab"
            aria-selected={mode === "login"}
            onClick={() => switchMode("login")}
          >
            Log in
          </button>
          <button
            type="button"
            className={cx("segmented-item", mode === "signup" && "segmented-item--on")}
            role="tab"
            aria-selected={mode === "signup"}
            onClick={() => switchMode("signup")}
          >
            Sign up
          </button>
        </div>

        {mode === "signup" ? (
          <div className={cx("field", errors.name && "field--error")}>
            <label className="field-label" htmlFor="auth-name">
              Your name <span className="field-req" aria-hidden>*</span>
            </label>
            <input
              id="auth-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sofia Andrade"
              autoComplete="name"
            />
            {errors.name ? <span className="field-error">{errors.name}</span> : null}
          </div>
        ) : null}

        <div className={cx("field", errors.email && "field--error")}>
          <label className="field-label" htmlFor="auth-email">
            Email <span className="field-req" aria-hidden>*</span>
          </label>
          <input
            id="auth-email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
          {errors.email ? <span className="field-error">{errors.email}</span> : null}
        </div>

        <div className={cx("field", errors.password && "field--error")}>
          <label className="field-label" htmlFor="auth-pass">
            Password <span className="field-req" aria-hidden>*</span>
          </label>
          <input
            id="auth-pass"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
          {errors.password ? <span className="field-error">{errors.password}</span> : null}
        </div>

        <button type="submit" className="btn btn--accent btn--block btn--lg" disabled={submitting}>
          {submitting ? (
            <span className="spinner spinner--light" role="status" aria-label="Signing in" />
          ) : (
            <>
              <CheckCircle2 size={16} aria-hidden />
              {mode === "login" ? "Log in and see my lessons" : "Create account"}
            </>
          )}
        </button>

        <button type="button" className="auth-demo" onClick={fillDemo}>
          <Sparkles size={13} aria-hidden />
          Use the demo account (alex@demo.student)
        </button>
        <span className="field-hint" style={{ textAlign: "center" }}>
          Demo build: any valid email + 6-char password works. Sessions live in
          your browser's localStorage only — nothing leaves this tab.
        </span>
      </form>
    </Modal>
  );
}

function nameFromEmail(email: string): string {
  const raw = email.split("@")[0] ?? "Student";
  const parts = raw.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return parts
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
  }
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
