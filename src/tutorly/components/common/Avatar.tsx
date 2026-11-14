'use client';

/**
 * Avatar — photo with a graceful initials fallback (if the portrait ever
 * fails to load), optional online status dot. Preply-square on cards,
 * round in chat and nav.
 */
import { useState } from "react";
import { initialsOf } from "../../data/tutors";
import { cx } from "../../utils/misc";

export interface AvatarProps {
  name: string;
  src?: string;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  shape?: "round" | "square";
  status?: "online" | "away" | null;
  ring?: boolean;
  className?: string;
}

export function Avatar({
  name,
  src,
  alt,
  size = "md",
  shape = "round",
  status = null,
  ring = false,
  className,
}: AvatarProps) {
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(src) && !broken;
  return (
    <span
      className={cx(
        "avatar",
        size !== "md" && `avatar--${size}`,
        shape === "square" && "avatar--square",
        ring && "avatar--ring",
        status === "online" && "avatar--on",
        className
      )}
      aria-hidden={false}
      role={showImage ? undefined : "img"}
      aria-label={showImage ? undefined : name}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt ?? name}
          onError={() => setBroken(true)}
          draggable={false}
        />
      ) : (
        <span>{initialsOf(name)}</span>
      )}
      {status ? (
        <span
          className={cx("avatar-dot", status === "away" && "avatar-dot--away")}
          aria-label={status === "online" ? "online now" : "away"}
          role="img"
        />
      ) : null}
    </span>
  );
}
