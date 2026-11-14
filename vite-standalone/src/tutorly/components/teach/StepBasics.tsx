'use client';

/**
 * Wizard step 1 — About you: name, email, country, city, native language,
 * and an optional portrait (downscaled to a 256px square data-URL right in
 * the browser, so the demo stays light).
 */
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, UserRound } from "lucide-react";
import type { TeachDraft } from "../../data/community";
import { COUNTRIES, NATIVE_LANGUAGES } from "../../data/community";
import { Avatar } from "../common/Avatar";
import { cx } from "../../utils/misc";
import { FieldRow } from "./teachFields";

export type StepErrors = Record<string, string>;

export interface StepProps {
  draft: TeachDraft;
  patch: (p: Partial<TeachDraft>) => void;
  errors: StepErrors;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function StepBasics({ draft, patch, errors }: StepProps) {
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPhotoFile = (file: File | undefined) => {
    if (!file) return;
    setPhotoError(null);
    if (!file.type.startsWith("image/")) {
      setPhotoError("That file isn't an image — JPG or PNG, please.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setPhotoError("That image is over 6 MB — a smaller one keeps the demo light.");
      return;
    }
    setPhotoBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        // Cover-crop to a 256px square and re-encode — real portraits stay,
        // giant camera files don't.
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setPhotoError("This browser wouldn't let us shrink the photo — try a different one.");
          setPhotoBusy(false);
          return;
        }
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        patch({ portrait: canvas.toDataURL("image/jpeg", 0.85) });
        setPhotoBusy(false);
      };
      img.onerror = () => {
        setPhotoError("We couldn't read that image — it may be corrupted.");
        setPhotoBusy(false);
      };
      img.src = String(reader.result);
    };
    reader.onerror = () => {
      setPhotoError("Reading the file failed — try once more.");
      setPhotoBusy(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <header className="teach-step-head">
        <div className="teach-step-kicker">Step 1 of 4</div>
        <h2 className="teach-step-title">About you</h2>
        <p className="teach-step-sub">
          The basics students see first. Your email is only used to notify you about this
          application — it never appears on your profile.
        </p>
      </header>

      <div className="teach-grid">
        <FieldRow id="teach-first" label="First name" required error={errors.firstName}>
          <input
            id="teach-first"
            className="input"
            value={draft.firstName}
            autoComplete="given-name"
            onChange={(e) => patch({ firstName: e.target.value })}
            placeholder="e.g. Petra"
          />
        </FieldRow>

        <FieldRow id="teach-last" label="Last name" required error={errors.lastName}>
          <input
            id="teach-last"
            className="input"
            value={draft.lastName}
            autoComplete="family-name"
            onChange={(e) => patch({ lastName: e.target.value })}
            placeholder="e.g. Nováková"
          />
        </FieldRow>

        <FieldRow
          id="teach-email"
          label="Email"
          required
          error={errors.email}
          hint="Application updates only — never shown to students."
          full
        >
          <input
            id="teach-email"
            className="input"
            type="email"
            value={draft.email}
            autoComplete="email"
            onChange={(e) => patch({ email: e.target.value })}
            placeholder="you@example.com"
          />
        </FieldRow>

        <FieldRow id="teach-country" label="Country" required error={errors.country}>
          <select
            id="teach-country"
            className="select"
            value={draft.country}
            onChange={(e) => {
              const c = COUNTRIES.find((x) => x.name === e.target.value);
              patch({ country: e.target.value, cc: c?.cc ?? "" });
            }}
          >
            <option value="">Select a country…</option>
            {COUNTRIES.map((c) => (
              <option key={c.cc} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </FieldRow>

        <FieldRow id="teach-city" label="City" required error={errors.city}>
          <input
            id="teach-city"
            className="input"
            value={draft.city}
            autoComplete="address-level2"
            onChange={(e) => patch({ city: e.target.value })}
            placeholder="e.g. Brno"
          />
        </FieldRow>

        <FieldRow
          id="teach-native"
          label="Native language"
          required
          error={errors.nativeLanguage}
          hint="Shown on your profile as “Native” — and it unlocks the native-speaker filter if you teach it."
          full
        >
          <select
            id="teach-native"
            className="select"
            value={draft.nativeLanguage}
            onChange={(e) => patch({ nativeLanguage: e.target.value })}
          >
            <option value="">Select your native language…</option>
            {NATIVE_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </FieldRow>
      </div>

      <div className="field" style={{ marginTop: 16 }}>
        <span className="field-label">Photo (optional)</span>
        <div className={cx("teach-photo", photoError && "teach-photo--error")}>
          <div className="teach-photo-preview">
            <Avatar
              name={`${draft.firstName || "Y"} ${draft.lastName || "O"}`.trim()}
              src={draft.portrait || undefined}
              size="lg"
              shape="square"
            />
            <div className="teach-photo-copy">
              <strong>{draft.portrait ? "Photo ready" : "No photo yet"}</strong>
              <span>
                A friendly headshot earns clicks. We crop it to a square automatically; no photo
                and your initials stand in.
              </span>
            </div>
          </div>
          <div className="teach-photo-btns">
            <input
              ref={fileRef}
              id="teach-photo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => {
                onPhotoFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <label htmlFor="teach-photo" className="btn btn--outline btn--sm" tabIndex={0}>
              {draft.portrait ? <ImagePlus size={14} aria-hidden /> : <UserRound size={14} aria-hidden />}
              {draft.portrait ? "Replace photo" : "Upload photo"}
            </label>
            {draft.portrait ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => patch({ portrait: "" })}
              >
                <Trash2 size={14} aria-hidden /> Remove
              </button>
            ) : null}
          </div>
        </div>
        {photoBusy ? (
          <span className="field-hint" role="status" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <Loader2 size={12} className="spin" aria-hidden /> Shrinking your photo…
          </span>
        ) : null}
        {photoError ? (
          <span className="field-error" role="alert">
            {photoError}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function validEmail(v: string): boolean {
  return EMAIL_RE.test(v.trim());
}
