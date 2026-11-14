'use client';

/**
 * Sign in / create account — demo-only credentials that never leave the
 * browser. Validation is real: email shape, password length, inline errors.
 */
import { useState } from "react";
import { Eye, EyeOff, Info } from "lucide-react";
import { useApp } from "../../store/AppStore";
import { Modal } from "../common/Modal";
import { cx } from "../../utils/misc";

type Mode = "signin" | "signup";

interface Errors {
  name?: string;
  email?: string;
  password?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * The auth modal — mount-per-open, so the form resets itself the honest
 * React way (a keyed component, not an effect full of setState).
 */
export function AuthModal() {
  const { state, dispatch } = useApp();
  if (!state.ui.authOpen) return null;
  return <AuthModalInner notice={state.ui.authNotice} />;
}

function AuthModalInner({ notice }: { notice: string | null }) {
  const { dispatch } = useApp();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Errors>({});

  const validate = (): Errors => {
    const e: Errors = {};
    if (mode === "signup") {
      if (!name.trim()) e.name = "A name helps the tutors greet you properly.";
      else if (name.trim().length < 2) e.name = "That is more of an initial than a name.";
    }
    if (!email.trim()) e.email = "An email is required — even fictional ones.";
    else if (!EMAIL_RE.test(email.trim())) e.email = "That address would bounce. Shape: you@somewhere.tld";
    if (!password) e.password = "A password of 8+ characters, please.";
    else if (password.length < 8) e.password = "8 characters minimum. Ambitious, we know.";
    return e;
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    setTouched({ name: true, email: true, password: true });
    if (Object.keys(e).length > 0) return;

    if (mode === "signin") {
      const firstName = name.trim() || email.split("@")[0].split(".")[0];
      const pretty = firstName.charAt(0).toUpperCase() + firstName.slice(1);
      dispatch({
        type: "signIn",
        user: { name: pretty, email: email.trim(), since: Date.now() },
      });
      dispatch({
        type: "toast",
        text: `Welcome back, ${pretty}. The demo account is on the table: one lesson tonight, two finished, three conversations.`,
      });
    } else {
      dispatch({
        type: "signUp",
        user: { name: name.trim(), email: email.trim(), since: Date.now() },
      });
      dispatch({
        type: "toast",
        text: `Account created — welcome to Parla, ${name.trim().split(" ")[0]}. You start honestly empty; the empty states are part of the tour.`,
      });
    }
  };

  const blur = (field: keyof Errors) => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(validate());
  };

  return (
    <Modal
      open
      onClose={() => dispatch({ type: "closeAuth" })}
      kicker="Readers' desk"
      title={mode === "signin" ? "Sign in to Parla" : "Create your account"}
      size="slim"
    >
      {notice && (
        <p className="auth-notice">
          <Info size={13} aria-hidden /> {notice}
        </p>
      )}

      <div className="tabs" role="tablist" aria-label="Authentication">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signin"}
          className={cx("tab", mode === "signin" && "tab--active")}
          onClick={() => {
            setMode("signin");
            setErrors({});
            setTouched({});
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          className={cx("tab", mode === "signup" && "tab--active")}
          onClick={() => {
            setMode("signup");
            setErrors({});
            setTouched({});
          }}
        >
          Create account
        </button>
      </div>

      <form className="auth-form" onSubmit={submit} noValidate>
        {mode === "signup" && (
          <div className={cx("field", touched.name && errors.name && "field--error")}>
            <label className="field-label" htmlFor="auth-name">
              Name
            </label>
            <input
              id="auth-name"
              className="input"
              value={name}
              autoComplete="name"
              placeholder="e.g. Ada Wren"
              onChange={(e) => setName(e.target.value)}
              onBlur={() => blur("name")}
              aria-invalid={Boolean(touched.name && errors.name)}
              aria-describedby={touched.name && errors.name ? "auth-name-err" : undefined}
            />
            {touched.name && errors.name && (
              <span className="field-error" id="auth-name-err">
                {errors.name}
              </span>
            )}
          </div>
        )}

        <div className={cx("field", touched.email && errors.email && "field--error")}>
          <label className="field-label" htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            className="input"
            type="email"
            value={email}
            autoComplete="email"
            placeholder="you@somewhere.tld"
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => blur("email")}
            aria-invalid={Boolean(touched.email && errors.email)}
            aria-describedby={touched.email && errors.email ? "auth-email-err" : undefined}
          />
          {touched.email && errors.email && (
            <span className="field-error" id="auth-email-err">
              {errors.email}
            </span>
          )}
        </div>

        <div className={cx("field", touched.password && errors.password && "field--error")}>
          <label className="field-label" htmlFor="auth-pw">
            Password
          </label>
          <div className="pw-wrap">
            <input
              id="auth-pw"
              className="input"
              type={showPw ? "text" : "password"}
              value={password}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="8+ characters"
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => blur("password")}
              aria-invalid={Boolean(touched.password && errors.password)}
              aria-describedby={touched.password && errors.password ? "auth-pw-err" : undefined}
            />
            <button
              type="button"
              className="pw-toggle"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
            </button>
          </div>
          {touched.password && errors.password && (
            <span className="field-error" id="auth-pw-err">
              {errors.password}
            </span>
          )}
        </div>

        <button type="submit" className="btn btn--solid btn--block">
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <aside className="auth-demo-note">
        <span className="kicker">Portfolio demo</span>
        <p>
          Accounts live only in this browser (localStorage) — no servers, no emails,
          no judgment. <strong>Signing in loads a furnished demo account</strong> — one
          lesson tonight, past lessons, conversations, saved tutors.{" "}
          <strong>Creating an account starts you off honestly empty</strong>, so every
          designed empty state is yours to tour.
        </p>
      </aside>
    </Modal>
  );
}
