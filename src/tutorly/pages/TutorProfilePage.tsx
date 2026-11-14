'use client';

/**
 * Tutor profile — header card with stats strip, subjects & levels, the
 * simulated intro video, About / Reviews tabs (distribution chart, the
 * user's own reviews, paginated corpus) and the sticky booking sidebar:
 * subject select feeding BookingFlow, messaging, favourites, next
 * openings, trust rows. Route: /tutor/:id.
 */
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, BadgePercent, CircleSlash, Globe2, Heart, MessageSquare, ShieldCheck, Zap } from "lucide-react";
import { tutorById, tutorExams, spokenLabel, isOnline, isLanguageTutor } from "../data/tutors";
import { subjectById } from "../data/subjects";
import { generateReviews, distributionOf, sortReviewsNewest, type Review } from "../data/reviews";
import { nextOpenings } from "../data/availability";
import { navigate, Link } from "../router/router";
import { useApp } from "../store/AppStore";
import { Avatar } from "../components/common/Avatar";
import { Stars } from "../components/common/Stars";
import { EmptyState } from "../components/common/atoms";
import { IntroVideo } from "../components/tutors/IntroVideo";
import { BookingFlow } from "../components/booking/BookingFlow";
import { cx, formatMoney } from "../utils/misc";
import { hourLabel, reviewDateLabel, shortDate } from "../utils/time";

import "../styles/tutor.css";

const PAGE_SIZE = 6;

export function TutorProfilePage({ tutorId }: { tutorId: string }) {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<"about" | "reviews">("about");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [subjectPick, setSubjectPick] = useState("");
  const [bookingOpen, setBookingOpen] = useState(false);

  const tutor = tutorById(tutorId);

  // Every hook runs before the missing-tutor return, so the hook count stays
  // stable when navigating profile → profile (or profile → bad URL) in place.
  const corpus = useMemo(() => (tutor ? generateReviews(tutor) : []), [tutor]);
  const myReviews = useMemo(
    () => (tutor ? state.userReviews.filter((r) => r.tutorId === tutor.id) : []),
    [state.userReviews, tutor]
  );
  const openings = useMemo(() => (tutor ? nextOpenings(tutor, 5) : []), [tutor]);
  const dist = useMemo(() => distributionOf(corpus), [corpus]);
  const distMax = Math.max(1, ...dist);

  // Arriving at a different profile resets the ephemeral UI state.
  useEffect(() => {
    setTab("about");
    setVisibleCount(PAGE_SIZE);
    setSubjectPick("");
    setBookingOpen(false);
  }, [tutorId]);

  if (!tutor) {
    return (
      <div className="tp-page">
        <div className="container">
          <div className="card tp-404">
            <EmptyState
              icon={CircleSlash}
              title="This tutor has retired"
              actions={
                <Link to="/browse" className="btn btn--primary">Browse all tutors</Link>
              }
            >
              The URL points at a tutor who's no longer on the marketplace — the
              catalogue is still full.
            </EmptyState>
          </div>
        </div>
      </div>
    );
  }

  const online = isOnline(tutor.id);
  const exams = tutorExams(tutor);
  const shownCorpus = sortReviewsNewest(corpus).slice(0, visibleCount);
  const shownCount = myReviews.length + shownCorpus.length;
  const remaining = corpus.length - shownCorpus.length;
  const trialPrice = formatMoney(tutor.price / 2);
  const selectedSubjectId = tutor.teaches.some((t) => t.subject === subjectPick)
    ? subjectPick
    : tutor.teaches[0].subject;
  const fav = state.favorites.includes(tutor.id);

  const onBook = () => {
    if (!state.session) {
      dispatch({
        type: "openAuth",
        notice: "Log in to book — your lessons live in your browser, never on a server.",
      });
      return;
    }
    setBookingOpen(true);
  };

  const onMessage = () => {
    dispatch({ type: "ensureConversation", tutorId: tutor.id });
    navigate(`/messages?tutor=${tutor.id}`);
  };

  const onFav = () => {
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
    <div className="tp-page">
      <div className="container">
        <div className="tp-grid">
          <div className="tp-main">
            <article className="card card--pad-lg tp-head">
              <div className="tp-head-row">
                <Avatar
                  name={tutor.name}
                  src={tutor.portrait}
                  size="xl"
                  shape="square"
                  status={online ? "online" : null}
                />
                <div className="tp-head-id">
                  <div className="tp-name-row">
                    <h1 className="tp-name">{tutor.name}</h1>
                    <BadgeCheck size={16} className="tp-verified" aria-label="Verified tutor" />
                    {tutor.badges[0] ? (
                      <span className="chip chip--green">{tutor.badges[0]}</span>
                    ) : null}
                  </div>
                  <p className="tp-tagline">{tutor.tagline}</p>
                  <div className="tp-meta">
                    <Stars rating={tutor.rating} count={tutor.reviewCount} />
                    <span className="tp-meta-dot" aria-hidden>·</span>
                    <span>responds in ~{tutor.responseHrs}h</span>
                    <span className="tp-meta-dot" aria-hidden>·</span>
                    <span>{tutor.city}, {tutor.country}</span>
                    <span className="tp-meta-dot" aria-hidden>·</span>
                    <span>on Tutorly since {tutor.since}</span>
                  </div>
                </div>
              </div>
              <div className="tp-stats">
                <div className="tp-stat">
                  <span className="tp-stat-num num">{tutor.rating.toFixed(1)}</span>
                  <span className="mono-label">average</span>
                </div>
                <div className="tp-stat">
                  <span className="tp-stat-num num">{tutor.reviewCount.toLocaleString("en-US")}</span>
                  <span className="mono-label">reviews</span>
                </div>
                <div className="tp-stat">
                  <span className="tp-stat-num num">{tutor.lessonsTaught.toLocaleString("en-US")}</span>
                  <span className="mono-label">lessons taught</span>
                </div>
                <div className="tp-stat">
                  <span className="tp-stat-num num">{tutor.students.toLocaleString("en-US")}</span>
                  <span className="mono-label">students</span>
                </div>
              </div>
            </article>

            <section className="card card--pad" aria-label="Subjects and levels">
              <h3 className="tp-card-title">Subjects &amp; levels</h3>
              <ul className="tp-subjects">
                {tutor.teaches.map((te) => {
                  const s = subjectById(te.subject);
                  return (
                    <li className="tp-subject" key={te.subject}>
                      <span className="tp-subject-name">{s?.label ?? te.subject}</span>
                      <span
                        className={cx("tp-subject-tag", s?.cat === "languages" && "tp-subject-tag--native")}
                      >
                        {te.level}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {exams.length > 0 ? (
                <div className="tp-exams">
                  <span className="mono-label">Exam prep</span>
                  <div className="tp-exam-row">
                    {exams.map((e) => (
                      <span className="chip" key={e}>{e}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="card card--pad" aria-label="Introduction video">
              <div className="tp-card-head">
                <h3 className="tp-card-title">Introduction video</h3>
                <span className="mono-label">
                  {isLanguageTutor(tutor) ? "subtitled in English" : "captions"}
                </span>
              </div>
              <IntroVideo tutor={tutor} />
            </section>

            <div className="tp-tabs">
              <div className="segmented segmented--full" role="tablist" aria-label="Profile sections">
                <button
                  type="button"
                  role="tab"
                  id="tp-tab-about"
                  aria-selected={tab === "about"}
                  aria-controls="tp-panel"
                  className={cx("segmented-item", tab === "about" && "segmented-item--on")}
                  onClick={() => setTab("about")}
                >
                  About
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tp-tab-reviews"
                  aria-selected={tab === "reviews"}
                  aria-controls="tp-panel"
                  className={cx("segmented-item", tab === "reviews" && "segmented-item--on")}
                  onClick={() => setTab("reviews")}
                >
                  Reviews <span className="num tp-tab-count">{tutor.reviewCount}</span>
                </button>
              </div>

              {tab === "about" ? (
                <div className="tp-tabpanel" role="tabpanel" id="tp-panel" aria-labelledby="tp-tab-about" key="about">
                  <p className="tp-bio">{tutor.bio[0]}</p>
                  <p className="tp-bio">{tutor.bio[1]}</p>
                  <div className="tp-block">
                    <span className="mono-label">Specialties</span>
                    <div className="tp-chips">
                      {tutor.specialties.map((sp) => (
                        <span className="chip chip--green" key={sp}>{sp}</span>
                      ))}
                    </div>
                  </div>
                  <p className={cx("tp-trial-note", !tutor.trial && "tp-trial-note--plain")}>
                    <BadgePercent size={15} aria-hidden className="tp-note-ico" />
                    {tutor.trial
                      ? `Trial lesson: 30 minutes at half price (${trialPrice}) — book any open slot.`
                      : "This tutor doesn't offer a discounted trial — the first lesson is a full one, and the exit is still free."}
                  </p>
                </div>
              ) : (
                <div className="tp-tabpanel" role="tabpanel" id="tp-panel" aria-labelledby="tp-tab-reviews" key="reviews">
                  <div className="tp-reviews-head">
                    <h3 className="tp-card-title">Reviews</h3>
                    <span className="mono-label num">
                      showing {shownCount} most recent of {tutor.reviewCount}
                    </span>
                  </div>
                  <div className="tp-dist" aria-label="Rating distribution">
                    {dist.map((count, i) => (
                      <div className="tp-dist-row" key={5 - i}>
                        <span className="tp-dist-key">{5 - i}★</span>
                        <span className="meter tp-dist-meter">
                          <span className="meter-fill" style={{ width: `${(count / distMax) * 100}%` }} />
                        </span>
                        <span className="tp-dist-count num">{count}</span>
                      </div>
                    ))}
                  </div>
                  <ul className="tp-reviewlist" aria-label="Student reviews">
                    {myReviews.map((r) => (
                      <ReviewRow key={r.id} review={r} mine />
                    ))}
                    {shownCorpus.map((r) => (
                      <ReviewRow key={r.id} review={r} />
                    ))}
                  </ul>
                  {remaining > 0 ? (
                    <div className="tp-review-more">
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
                      >
                        Show more reviews
                      </button>
                    </div>
                  ) : (
                    <p className="mono-label tp-archive">
                      That's every recent review we show — {tutor.reviewCount - shownCount} older
                      ones live in the archive.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <aside className="tp-side">
            <div className="card card--pad-lg tp-book">
              <div className="tp-price">
                <span className="tp-price-num num">{formatMoney(tutor.price)}</span>
                <span className="tp-price-per">/ 50-min lesson</span>
              </div>
              {tutor.trial ? (
                <div className="tp-trial-row">
                  <span className="chip chip--green">Trial −50%</span>
                  <span className="tp-trial-price num">30 min · {trialPrice}</span>
                </div>
              ) : null}
              <label className="field">
                <span className="field-label">Subject</span>
                <select className="select" value={selectedSubjectId} onChange={(e) => setSubjectPick(e.target.value)}>
                  {tutor.teaches.map((te) => (
                    <option key={te.subject} value={te.subject}>
                      {subjectById(te.subject)?.label ?? te.subject} — {te.level}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn btn--accent btn--lg btn--block" onClick={onBook}>
                Book a lesson
              </button>
              <button type="button" className="btn btn--outline btn--block" onClick={onMessage}>
                <MessageSquare size={15} aria-hidden className="btn-ico" />
                Message {tutor.firstName}
              </button>
              <button type="button" className={cx("tp-fav", fav && "tp-fav--on")} onClick={onFav} aria-pressed={fav}>
                <Heart size={16} fill={fav ? "currentColor" : "none"} aria-hidden className="btn-ico" />
                <span>{fav ? "Saved — find it under My lessons" : "Save to favourites"}</span>
              </button>
              <hr className="divider" />
              <div className="tp-openings-block">
                <span className="mono-label">Next openings</span>
                <div className="tp-openings">
                  {openings.map((o) => (
                    <span className="tp-opening num" key={`${o.iso}-${o.hour}`}>
                      {shortDate(o.iso)} · {hourLabel(o.hour)}
                    </span>
                  ))}
                </div>
              </div>
              <p className="mono-label tp-book-note">
                Booking is simulated — no money moves, the calendar is real (deterministic).
              </p>
            </div>

            <div className="card card--pad card--quiet tp-trust">
              <ul>
                <li className="tp-trust-row">
                  <ShieldCheck size={15} aria-hidden />
                  <span>Verified &amp; background-checked</span>
                </li>
                <li className="tp-trust-row">
                  <Zap size={15} aria-hidden />
                  <span>Responds within ~{tutor.responseHrs} hours</span>
                </li>
                <li className="tp-trust-row">
                  <Globe2 size={15} aria-hidden />
                  <span>
                    Speaks {tutor.spoken.map((sp) => `${spokenLabel(sp.code)} (${sp.level})`).join(", ")}
                  </span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {bookingOpen ? (
        <BookingFlow tutor={tutor} subjectId={selectedSubjectId} onClose={() => setBookingOpen(false)} />
      ) : null}
    </div>
  );
}

/** One review row — bordered, not shadowed; the corpus is long and quiet wins. */
function ReviewRow({ review, mine = false }: { review: Review; mine?: boolean }) {
  return (
    <li className="tp-review">
      <div className="tp-review-head">
        <span className="tp-review-author">
          {review.author}
          {review.verified ? (
            <BadgeCheck size={13} className="tp-review-verified" aria-label="Verified student" />
          ) : null}
          {mine ? <span className="chip chip--green">Your review</span> : null}
        </span>
        <span className="tp-review-date mono-label num">{reviewDateLabel(review.date)}</span>
      </div>
      <Stars rating={review.stars} className="tp-review-stars" />
      <p className="tp-review-text">{review.text}</p>
      <div className="tp-review-foot">
        <span className="mono-label num">{review.lessons} lessons taken</span>
        {mine && review.tags && review.tags.length > 0 ? (
          <span className="tp-review-tags">
            {review.tags.map((tg) => (
              <span className="chip" key={tg}>{tg}</span>
            ))}
          </span>
        ) : null}
      </div>
    </li>
  );
}
