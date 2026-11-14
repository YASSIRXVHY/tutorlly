'use client';

/**
 * Tutor portraits in a printed frame. Portraits are generated art assets;
 * the deterministic monogram (initials + seeded stock pattern) is the
 * graceful fallback if an image ever fails to load.
 */
import { useState } from "react";
import type { Tutor } from "../../data/tutors";
import { initialsOf } from "../../data/tutors";
import { hashString } from "../../utils/rng";
import { cx } from "../../utils/misc";

interface AvatarProps {
  tutor: Tutor;
  size?: number;
  /** Fill the nearest positioned parent (used by card media). */
  fill?: boolean;
  className?: string;
  /** Print the little vermillion corner tab (used on cards, not in lists). */
  corner?: boolean;
}

export function Avatar({ tutor, size = 44, fill, className, corner = true }: AvatarProps) {
  const [broken, setBroken] = useState(false);
  const pattern = hashString(tutor.id) % 3;
  const initials = initialsOf(tutor.name);

  return (
    <span
      className={cx("avatar", className)}
      data-pattern={broken ? String(pattern) : "plain"}
      style={fill ? { position: "absolute", inset: 0 } : { width: size, height: size }}
      aria-hidden
    >
      {broken ? (
        <>
          <span className="avatar-mono" style={{ fontSize: Math.max(12, size * 0.4) }}>
            {initials}
          </span>
        </>
      ) : (
        <img
          src={tutor.portrait}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
        />
      )}
      {corner && <span className="avatar-corner" />}
    </span>
  );
}
