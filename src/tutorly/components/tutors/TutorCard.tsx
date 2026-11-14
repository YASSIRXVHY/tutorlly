'use client';

/**
 * TutorCard — the exemplar marketplace card. Photo, name + verified check,
 * rating with review count, tagline, subject chips, price with trial stamp,
 * favourite heart. The whole card is a profile link (overlay anchor pattern).
 */
import { BadgeCheck, Heart, Sparkles } from "lucide-react";
import type { Tutor } from "../../data/tutors";
import { tutorSubjects, isOnline } from "../../data/tutors";
import { Link } from "../../router/router";
import { Avatar } from "../common/Avatar";
import { Stars } from "../common/Stars";
import { useApp } from "../../store/AppStore";
import { cx } from "../../utils/misc";
import { formatMoney } from "../../utils/misc";

import "../../styles/cards.css";

export function TutorCard({ tutor }: { tutor: Tutor }) {
  const { state, dispatch } = useApp();
  const fav = state.favorites.includes(tutor.id);
  const online = isOnline(tutor.id);

  const subjects = tutorSubjects(tutor);
  const shown = subjects.slice(0, 3);
  const more = subjects.length - shown.length;

  const toggleFav = () => {
    if (!state.session) {
      dispatch({
        type: "openAuth",
        notice: "Log in to save tutors to your favourites — then tap the heart again.",
      });
      return;
    }
    dispatch({ type: "toggleFavorite", tutorId: tutor.id });
    dispatch({
      type: "toast",
      text: fav
        ? `${tutor.firstName} removed from your favourites`
        : `${tutor.firstName} saved to your favourites`,
      kind: fav ? "info" : "success",
    });
  };

  return (
    <article className="tcard card card--link" aria-label={`Tutor: ${tutor.name}`}>
      <Link to={`/tutor/${tutor.id}`} className="tcard-link">
        <span className="sr-only">View {tutor.name}'s profile</span>
      </Link>

      <div className="tcard-main">
        <Avatar
          name={tutor.name}
          src={tutor.portrait}
          size="lg"
          shape="square"
          status={online ? "online" : null}
        />
        <div className="tcard-body">
          <div className="tcard-name">
            <span>{tutor.name}</span>
            <BadgeCheck size={16} className="tcard-verified" aria-label="Verified tutor" />
          </div>
          <div className="tcard-meta">
            {tutor.reviewCount > 0 ? (
              <Stars rating={tutor.rating} count={tutor.reviewCount} />
            ) : (
              <span className="tcard-new">
                <Sparkles size={12} aria-hidden /> New on Tutorly
              </span>
            )}
            <span className="tcard-meta-dot" aria-hidden>·</span>
            <span>{tutor.country}</span>
            {online ? (
              <>
                <span className="tcard-meta-dot" aria-hidden>·</span>
                <span className="tcard-online">
                  <span className="livedot" aria-hidden /> online
                </span>
              </>
            ) : null}
          </div>
          <p className="tcard-tagline">{tutor.tagline}</p>
          <div className="tcard-subjects">
            {shown.map((s) => (
              <span
                key={s.id}
                className={cx(
                  "tcard-subject-chip",
                  s.cat === "languages" && "tcard-subject-chip--native"
                )}
              >
                {s.label}
              </span>
            ))}
            {more > 0 ? (
              <span className="tcard-subject-chip">+{more}</span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          className={cx("tcard-heart", fav && "tcard-heart--on")}
          onClick={toggleFav}
          aria-pressed={fav}
          aria-label={fav ? `Remove ${tutor.name} from favourites` : `Save ${tutor.name} to favourites`}
        >
          <Heart size={15} fill={fav ? "currentColor" : "none"} aria-hidden />
        </button>
      </div>

      <div className="tcard-foot">
        <div className="tcard-price">
          <span className="tcard-price-num">{formatMoney(tutor.price)}</span>
          <span className="tcard-price-per">per 50-min lesson</span>
          {tutor.trial ? (
            <span className="tcard-trial">trial −50%</span>
          ) : (
            <span className="tcard-price-per">no-trial tutor</span>
          )}
        </div>
        <Link to={`/tutor/${tutor.id}`} className="btn btn--outline btn--sm tcard-cta">
          View profile
        </Link>
      </div>
    </article>
  );
}
