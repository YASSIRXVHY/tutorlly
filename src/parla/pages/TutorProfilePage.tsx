'use client';

/**
 * Tutor profile — stats row, languages with levels, About/Reviews tabs,
 * the review distribution bar chart, the simulated intro video, and the
 * booking sidebar with a live availability preview.
 */
import { useEffect, useMemo, useState } from "react";
import { MapPin, MessageSquare, Heart, Globe2, BadgeCheck, Clock3, GraduationCap, Users } from "lucide-react";
import { TUTORS, tutorLanguage, spokenLabel } from "../data/tutors";
import { generateReviews, distributionOf, type Review } from "../data/reviews";
import { nextOpenings } from "../data/availability";
import { IntroVideo } from "../components/tutors/IntroVideo";
import { BookingFlow } from "../components/booking/BookingFlow";
import { Stars, StarsText } from "../components/common/Stars";
import { SkelBlock, SkelLine } from "../components/common/atoms";
import { useApp } from "../store/AppStore";
import { navigate } from "../router/router";
import { hourLabel, reviewDateLabel, shortDate } from "../utils/time";
import { cx } from "../utils/misc";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2", "Native"] as const;

export function TutorProfilePage({ tutorId }: { tutorId: string }) {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<"about" | "reviews">("about");
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);

  const tutor = TUTORS.find((t) => t.id === tutorId);

  useEffect(() => {
    // The profile is "at the printers" for a third of a second on arrival.
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, []);

  const reviews = useMemo<Review[]>(() => {
    if (!tutor) return [];
    const userOnes = state.userReviews.filter((r) => r.tutorId === tutor.id);
    return [...generateReviews(tutor), ...userOnes];
  }, [tutor, state.userReviews]);

  const dist = useMemo(() => distributionOf(reviews), [reviews]);
  const distMax = Math.max(1, ...dist);
  const reviewsNewest = useMemo(
    () => [...reviews].sort((a, b) => b.date - a.date),
    [reviews]
  );

  const openings = useMemo(() => (tutor ? nextOpenings(tutor, 3) : []), [tutor]);
  const isFavorite = tutor ? state.favorites.includes(tutor.id) : false;

  if (!tutor) {
    return (
      <div className="page">
        <div className="container">
          <div className="page-head">
            <span className="kicker">Missing edition</span>
            <h1 className="page-title">This tutor is not on the staff</h1>
            <p className="page-sub">
              The page you asked for went to print without ink. Our staff of twelve is one
              click away.
            </p>
          </div>
          <button type="button" className="btn btn--solid" onClick={() => navigate("/browse")}>
            Back to the catalogue
          </button>
        </div>
      </div>
    );
  }

  const lang = tutorLanguage(tutor);

  const messageTutor = () => {
    if (!state.session) {
      dispatch({
        type: "openAuth",
        notice: "Sign in to message tutors — conversations live in this browser.",
      });
      return;
    }
    dispatch({ type: "ensureConversation", tutorId: tutor.id });
    navigate(`/messages?t=${tutor.id}`);
  };

  return (
    <div className="page">
      <div className="container">
        {loading ? (
          <div className="profile-load">
            <SkelBlock h={72} />
            <SkelLine w="50%" h={18} />
            <SkelLine w="34%" h={12} />
            <div className="profile-load-grid">
              <SkelBlock h={260} />
              <SkelBlock h={260} />
            </div>
            <span className="sr-only">Setting the profile page…</span>
          </div>
        ) : (
          <div className="split profile-split">
            <div>
              <nav className="crumbs mono-label" aria-label="Breadcrumb">
                <a href="#/browse">Tutors</a>
                <span aria-hidden>/</span>
                <span>{lang.name}</span>
                <span aria-hidden>/</span>
                <span>{tutor.name}</span>
              </nav>

              <div className="profile-mast">
                <h1 className="profile-name">{tutor.name}</h1>
                <p className="profile-tagline">{tutor.tagline}</p>
                <div className="profile-meta mono-label">
                  <span>
                    <MapPin size={12} aria-hidden /> {tutor.city}, {tutor.country}
                  </span>
                  <span className="profile-cc">{tutor.cc}</span>
                  {tutor.native ? (
                    <span className="profile-native">
                      <BadgeCheck size={12} aria-hidden /> Native speaker
                    </span>
                  ) : (
                    <span className="profile-native">
                      <Globe2 size={12} aria-hidden /> C2 · non-native, taught to mastery
                    </span>
                  )}
                  <span>
                    <GraduationCap size={12} aria-hidden /> Teaching since {tutor.since}
                  </span>
                </div>
              </div>

              <div className="profile-stats">
                <div className="statbox">
                  <Stars value={tutor.rating} size={12} />
                  <StarsText value={tutor.rating} />
                  <span className="statbox-value num">{tutor.rating.toFixed(1)}</span>
                  <span className="statbox-label">{reviews.length} reviews</span>
                </div>
                <div className="statbox">
                  <span className="statbox-value num">{tutor.lessonsTaught.toLocaleString("en-US")}</span>
                  <span className="statbox-label">lessons taught</span>
                </div>
                <div className="statbox">
                  <span className="statbox-value num">{tutor.students}</span>
                  <span className="statbox-label">students</span>
                </div>
                <div className="statbox">
                  <span className="statbox-value num">≈{tutor.responseHrs}h</span>
                  <span className="statbox-label">replies in</span>
                </div>
              </div>

              <div className="profile-video-block">
                <span className="kicker">
                  <Clock3 size={12} aria-hidden /> The introduction
                </span>
                <IntroVideo tutor={tutor} />
              </div>

              <div className="tabs profile-tabs" role="tablist" aria-label="Profile sections">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "about"}
                  className={cx("tab", tab === "about" && "tab--active")}
                  onClick={() => setTab("about")}
                >
                  About
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "reviews"}
                  className={cx("tab", tab === "reviews" && "tab--active")}
                  onClick={() => setTab("reviews")}
                >
                  Reviews <span className="tab-count num">{reviews.length}</span>
                </button>
              </div>

              {tab === "about" && (
                <div className="profile-about">
                  {tutor.bio.map((p, i) => (
                    <p key={i} className="profile-bio-p">
                      {p}
                    </p>
                  ))}

                  <div className="profile-langs">
                    <span className="mono-label">Languages spoken</span>
                    <ul>
                      {tutor.alsoSpeaks.map((s) => (
                        <li key={`${s.lang}-${s.level}`} className="spokenlang">
                          <span className="spokenlang-name">{spokenLabel(s.lang)}</span>
                          <span className="spokenlang-level mono-label">{s.level}</span>
                          <span className="spokenlang-meter" aria-hidden>
                            {LEVELS.map((lv) => (
                              <i
                                key={lv}
                                className={cx(
                                  LEVELS.indexOf(s.level as (typeof LEVELS)[number]) >=
                                    LEVELS.indexOf(lv) && "on"
                                )}
                              />
                            ))}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {tutor.alsoSpeaks.some((s) => s.lang === "zh-sichuan") && (
                      <span className="field-hint">
                        Sichuanese counts as a second mother tongue — Chengdu keeps its own.
                      </span>
                    )}
                  </div>

                  <div className="profile-specialties">
                    <span className="mono-label">Specialties</span>
                    <div className="profile-specialty-row">
                      {tutor.specialties.map((s) => (
                        <span key={s} className="chip">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <dl className="profile-facts">
                    <div className="datarow">
                      <dt>Also teaches</dt>
                      <dd>{lang.name} · {tutor.country}</dd>
                    </div>
                    <div className="datarow">
                      <dt>Lesson length</dt>
                      <dd className="num">50 minutes</dd>
                    </div>
                    <div className="datarow">
                      <dt>Teaches since</dt>
                      <dd className="num">{tutor.since}</dd>
                    </div>
                    <div className="datarow">
                      <dt>Students taught</dt>
                      <dd className="num">{tutor.students}</dd>
                    </div>
                    <div className="datarow">
                      <dt>Usually replies</dt>
                      <dd className="num">within ~{tutor.responseHrs}h</dd>
                    </div>
                    <div className="datarow">
                      <dt>Trial lesson</dt>
                      <dd>{tutor.trial ? `half price — ${Math.round(tutor.price / 2)} USD` : "not offered — bookings only"}</dd>
                    </div>
                  </dl>
                </div>
              )}

              {tab === "reviews" && (
                <div className="profile-reviews">
                  <div className="reviewdist">
                    <div className="reviewdist-head">
                      <Stars value={tutor.rating} size={16} />
                      <StarsText value={tutor.rating} />
                      <span className="reviewdist-note">
                        {tutor.rating.toFixed(1)} · {reviews.length} verified reviews
                      </span>
                    </div>
                    {dist.map((count, i) => (
                      <div key={i} className="rbar-row">
                        <span className="rbar-key">{5 - i} stars</span>
                        <span className="rbar-track">
                          <span className="rbar-fill" style={{ width: `${(count / distMax) * 100}%` }} />
                        </span>
                        <span className="rbar-val num">{count}</span>
                      </div>
                    ))}
                  </div>

                  <ul className="reviewlist scrollbox">
                    {reviewsNewest.map((r) => (
                      <li key={r.id} className="reviewitem">
                        <div className="reviewitem-head">
                          <Stars value={r.stars} size={12} />
                          <StarsText value={r.stars} />
                          <span className="reviewitem-author">
                            {r.author}
                            {r.verified && (
                              <span className="verified">
                                <BadgeCheck size={12} aria-hidden /> verified student
                              </span>
                            )}
                          </span>
                          <span className="reviewitem-date mono-label num">
                            {reviewDateLabel(r.date)}
                          </span>
                        </div>
                        <p className="reviewitem-text">{r.text}</p>
                        <div className="reviewitem-foot">
                          <span className="mono-label num">{r.lessons} lessons with {tutor.firstName}</span>
                          {r.tags && r.tags.length > 0 && (
                            <span className="reviewitem-tags">
                              {r.tags.map((tg) => (
                                <span key={tg} className="chip chip--accent">
                                  {tg}
                                </span>
                              ))}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <aside className="profile-side">
              <div className="bookpanel">
                <div className="bookpanel-price">
                  <span className="price-tag">
                    <span className="price-amount num">${tutor.price}</span>
                    <span className="price-unit">/ 50 min</span>
                  </span>
                  {tutor.trial && <span className="trial-flag">trial at ${Math.round(tutor.price / 2)}</span>}
                </div>

                <button
                  type="button"
                  className="btn btn--accent btn--block bookpanel-cta"
                  onClick={() => {
                    if (!state.session) {
                      dispatch({
                        type: "openAuth",
                        notice: "Sign in to book — checkout takes thirty seconds and a well-formed card number.",
                      });
                      return;
                    }
                    setBookingOpen(true);
                  }}
                >
                  Book a lesson
                </button>

                <div className="bookpanel-openings">
                  <span className="mono-label">Next openings</span>
                  <ul>
                    {openings.map((o) => (
                      <li key={`${o.iso}-${o.hour}`} className="num">
                        {shortDate(o.iso)} · {hourLabel(o.hour)}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="linkbtn"
                    onClick={() => {
                      if (!state.session) {
                        dispatch({
                          type: "openAuth",
                          notice: "Sign in to book — the timetable is right behind this button.",
                        });
                        return;
                      }
                      setBookingOpen(true);
                    }}
                  >
                    View full availability
                  </button>
                </div>

                <div className="bookpanel-actions">
                  <button type="button" className="btn btn--sm" onClick={messageTutor}>
                    <MessageSquare size={13} aria-hidden className="btn-ico" />
                    Message {tutor.firstName}
                  </button>
                  <button
                    type="button"
                    className={cx("btn btn--sm", isFavorite && "btn--solid")}
                    onClick={() => {
                      if (!state.session) {
                        dispatch({
                          type: "openAuth",
                          notice: "Sign in to save tutors — favorites live in this browser.",
                        });
                        return;
                      }
                      dispatch({ type: "toggleFavorite", tutorId: tutor.id });
                      dispatch({
                        type: "toast",
                        text: isFavorite
                          ? `${tutor.firstName} removed from your saved list.`
                          : `${tutor.name} saved — the heart remembers.`,
                        kind: isFavorite ? "info" : "success",
                      });
                    }}
                    aria-pressed={isFavorite}
                  >
                    <Heart size={13} aria-hidden className="btn-ico" fill={isFavorite ? "currentColor" : "none"} />
                    {isFavorite ? "Saved" : "Save tutor"}
                  </button>
                </div>

                <p className="bookpanel-note">
                  <Users size={12} aria-hidden /> Payment is held in escrow until the
                  lesson is delivered. No-show? Refunded, no correspondence required.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>

      <BookingFlow tutorId={bookingOpen ? tutor.id : null} onClose={() => setBookingOpen(false)} />
    </div>
  );
}
