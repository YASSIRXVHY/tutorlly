'use client';

/**
 * Tutor card — the catalog entry. Sharp frame, portrait, price stamp,
 * specialties, favorite heart. The whole media block routes to the profile.
 */
import { Heart, CalendarClock } from "lucide-react";
import type { Tutor } from "../../data/tutors";
import { tutorLanguage } from "../../data/tutors";
import { generateReviews } from "../../data/reviews";
import { availableThisWeek } from "../../data/availability";
import { Avatar } from "../common/Avatar";
import { Stars, StarsText } from "../common/Stars";
import { Link } from "../../router/router";
import { useApp } from "../../store/AppStore";
import { cx } from "../../utils/misc";
import { languageByCode } from "../../data/languages";

export function reviewCount(tutor: Tutor): number {
  // Deterministic corpus size + anything the student themself published.
  return generateReviews(tutor).length;
}

interface TutorCardProps {
  tutor: Tutor;
  /** Pre-computed availability flag (browse computes it for filtering anyway). */
  openThisWeek?: boolean;
  onBook?: (tutor: Tutor) => void;
}

export function TutorCard({ tutor, openThisWeek, onBook }: TutorCardProps) {
  const { state, dispatch } = useApp();
  const lang = tutorLanguage(tutor);
  const reviews = reviewCount(tutor);
  const isFavorite = state.favorites.includes(tutor.id);
  const open = openThisWeek ?? availableThisWeek(tutor);

  const toggleFavorite = () => {
    if (!state.session) {
      dispatch({
        type: "openAuth",
        notice: "Sign in to save tutors to your account — favorites live in this browser.",
      });
      return;
    }
    dispatch({ type: "toggleFavorite", tutorId: tutor.id });
    dispatch({
      type: "toast",
      text: isFavorite
        ? `${tutor.firstName} removed from your saved list.`
        : `${tutor.name} saved. Find her or him again under Dashboard → Saved tutors.`,
      kind: isFavorite ? "info" : "success",
    });
  };

  return (
    <article className="tutorcard">
      <Link to={`/tutor/${tutor.id}`} className="tutorcard-media" aria-label={`View ${tutor.name}'s profile`}>
        <Avatar tutor={tutor} fill className="tutorcard-img" />
        <span className="tutorcard-cc mono-label">{tutor.cc}</span>
        {open && <span className="tutorcard-open mono-label">open this week</span>}
      </Link>

      <div className="tutorcard-body">
        <div className="tutorcard-title-row">
          <Link to={`/tutor/${tutor.id}`} className="tutorcard-name">
            {tutor.name}
          </Link>
          <button
            type="button"
            className={cx("icon-btn icon-btn--sm", isFavorite && "icon-btn--active")}
            onClick={toggleFavorite}
            aria-label={isFavorite ? `Remove ${tutor.name} from saved tutors` : `Save ${tutor.name}`}
            aria-pressed={isFavorite}
          >
            <Heart size={14} strokeWidth={2.2} aria-hidden fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </div>

        <p className="tutorcard-tagline">{tutor.tagline}</p>

        <div className="tutorcard-meta">
          <Stars value={tutor.rating} size={13} note={<span className="num">{tutor.rating.toFixed(1)}</span>} />
          <StarsText value={tutor.rating} />
          <span className="tutorcard-reviews num">({reviews} reviews)</span>
          <span className="tutorcard-sep" aria-hidden>/</span>
          <span className="mono-label">{lang.name} · {tutor.city}</span>
        </div>

        <div className="tutorcard-chips">
          {tutor.specialties.slice(0, 2).map((s) => (
            <span key={s} className="chip">
              {s}
            </span>
          ))}
          {tutor.specialties.length > 2 && (
            <span className="chip">+{tutor.specialties.length - 2}</span>
          )}
        </div>

        <div className="tutorcard-foot">
          <span className="price-tag">
            {tutor.trial && (
              <span className="price-strike num">${Math.round(tutor.price * 2)}</span>
            )}
            <span className="price-amount num">${tutor.price}</span>
            <span className="price-unit">/ 50 min</span>
          </span>
          <div className="tutorcard-actions">
            {onBook && (
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => onBook(tutor)}
              >
                <CalendarClock size={13} aria-hidden className="btn-ico" />
                Book
              </button>
            )}
            <Link to={`/tutor/${tutor.id}`} className="btn btn--sm btn--solid tutorcard-view">
              Profile
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Small row card used in saved tutors + messages list. */
export function TutorMini({ tutor, right }: { tutor: Tutor; right?: React.ReactNode }) {
  const lang = languageByCode(tutor.lang);
  return (
    <Link to={`/tutor/${tutor.id}`} className="tutormini">
      <Avatar tutor={tutor} size={44} corner={false} />
      <span className="tutormini-copy">
        <span className="tutormini-name">{tutor.name}</span>
        <span className="mono-label">
          {lang?.name} · {tutor.city}
        </span>
      </span>
      {right}
    </Link>
  );
}
