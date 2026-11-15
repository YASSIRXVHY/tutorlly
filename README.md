# Tutorly — the multi-subject tutoring marketplace

A complete, production-quality tutoring marketplace front-end, built as a single
React application with **zero backend**. Students browse tutors across **six
subject categories — languages, math, science, programming, music and test
prep** — read profiles, book lessons through a deterministic calendar, check out
with a validated payment form, meet in a **live peer-to-peer classroom (PeerJS
video + a shared whiteboard + class chat)**, message tutors through a reply
engine, and publish reviews that land live on the tutor's profile.

And it works from the other side of the desk, too: **teachers apply through the
"Become a tutor" flow** — a four-step application wizard — get reviewed in the
**admin console**, and their compiled profile goes live in the same search,
booking and messaging machinery the hand-authored tutors use.

The art direction is **clean and friendly like Preply**: warm cream paper, deep
forest green, one bright signal green, rounded cards with soft shadows, and a
deliberate two-font pairing (Plus Jakarta Sans + DM Mono).

---

## Run it

```bash
# in this directory
bun install        # or: npm install
bun run dev        # or: npm run dev
```

The dev server starts on port 3000. Open the preview and click through —
everything below is live and functional.

> **About React 18 + Vite:** this sandbox hosts the demo through a Next.js dev
> server (only one route is exposed). The app itself is framework-agnostic
> React — a hand-built hash router, plain CSS imports, Context + useReducer —
> so a complete **Vite + React 18 port ships in `vite-standalone/`**: it
> contains the full `src/tutorly` tree, the portrait assets and both fonts.
> `npm install && npm run dev` inside it works on the first try. The only
> Next-specific code is the 3-line entry page (`src/app/page.tsx`).

> **Live classroom networking:** the demo classroom runs peer-to-peer via
> PeerJS. A tiny **local PeerJS broker** ships as a mini-service
> (`mini-services/peer-broker/`, started with the dev environment) so two
> browser tabs connect without touching the public PeerJS cloud. If the broker
> is unreachable, the classroom degrades honestly (own video + whiteboard + a
> visible "offline" state) rather than pretending.

---

## Demo credentials

There are none — this is a demo. **Sign in with any well-formed email and a
6+ character password.** Signing in loads a furnished demo account (a lesson
tonight, completed lessons, conversations, saved tutors). Creating a fresh
account starts honestly empty, so every designed empty state is on the tour.
Everything lives in `localStorage` (`tutorly.v2`) and never leaves the page.

Checkout demo card: `4242 4242 4242 4242` — the bank is imaginary, but the
Luhn checksum and expiry validation are real.

**Teaching demo:** the "Become a tutor" flow (navbar → *Become a tutor*) walks
the whole pipeline: four wizard steps with per-step validation and a draft that
survives reloads, a locked preview of your marketplace card, submission behind
a login gate, then a live status timeline. Approve the application in the
**admin console** (`/admin`, one-click demo gate → *Applications*) and watch
the profile compile into the live catalogue — search, booking, messaging, the
teacher roster, all of it. Rejecting sends the applicant a note and a one-click
"edit & resubmit" path. One fictional seeded applicant (labelled *demo seed*)
waits in the queue so the reviewer side is demonstrable immediately.

---

## Feature map (everything wired)

| Area | What actually works |
| --- | --- |
| **Home** | Rotating headline word, working subject search, six category doors with live tutor/subject counts, "happening later today" strip fed by the real availability engine, top-rated four, how-it-works, the teaching CTA band, student CTA band. |
| **Browse** | Every tutor and subject in the catalogue — hand-authored **and** community-approved. Filter rail: category, subject, max-price range slider, min rating, native-only, available-this-week, specialty checkboxes with counts. Removable filter chips + clear-all, 5 sort orders, live result count, loading skeletons, designed empty state with reset. |
| **Tutor profile** | Stats row, subjects & levels, exam-prep chips, simulated intro-video player (target-language captions + English subtitles, play/pause, scrubbable progress), About/Reviews tabs, review distribution bar chart, deterministic review corpus, booking sidebar with live "next openings". New community tutors show honest "New on Tutorly · first review pending" states instead of fabricated numbers. |
| **Become a tutor** | Four-step wizard (about you / what you teach / your lesson / review & submit) with per-step validation, focus-on-first-error, character counters, a portrait upload downscaled to a 256px data-URL in-browser, live market-rate context computed from the real catalogue, earnings estimate after the 18% platform fee, a live preview of the exact marketplace card, a summary with jump-to-step edit links, terms gate, login gate, autosaved draft with resume/start-over. Then: pending → approved/rejected status screens that update live from the admin console. |
| **Booking** | Modal with a 14-day date strip, per-tutor availability deterministic per date, slots grouped morning/afternoon/evening, already-booked slots disabled, packages (trial −50%, weekly ×4 −10%). Checkout: card number auto-formatting, Luhn validation, expiry-not-in-the-past, CVC rules, processing spinner, animated success state. |
| **Messages** | Conversation list with unread markers and nav badge, thread view with day dividers, typing indicator, and a reply engine that answers from the tutor's real calendar, prices and subjects. Book directly from a thread. |
| **Dashboard** | Next-lesson card with a live ticking countdown + progress meter, status pills, inline cancel confirmation, post-lesson review modal (star picker, tag chips, optional text) that publishes into the tutor's live reviews, stats, saved tutors, deterministic recommendations. |
| **Classroom** | Peer-to-peer video/audio over WebRTC (PeerJS) with mic/camera toggles, permission-denied and offline fallbacks, connection states; a shared whiteboard synced between peers over the data channel; class chat; the 50-minute session clock; lesson notes that save into the lesson record; end-of-lesson flow that completes the lesson and opens the review. |
| **Admin console** | One-click demo gate; overview KPIs and charts; the **tutor-application review queue** (approve → profile goes live instantly, reject with a canned reviewer's note); teacher roster (community tutors included); student body; lesson feed; live rooms; system health with a real broker probe. |
| **Platform** | Sign-in/sign-up modal with real validation, favourites, global search on Ctrl/Cmd+K (tutors, subjects, pages — including "Become a tutor"; arrow-key navigation), custom toast system, custom modal system (Esc, focus handling, scroll lock), 404 and error-boundary pages, responsive down to 375px, `prefers-reduced-motion` respected, skip link, ARIA roles throughout. |

No `alert()` / `confirm()` / `prompt()`. No stubs, no dead links, no lorem ipsum.

---

## Determinism

All probabilistic data — slot availability, review corpora, rating
distributions, reply variants, recommendations — is generated by
**mulberry32 fed with a string hash** (`src/tutorly/utils/rng.ts`). No
`Math.random()` anywhere. The demo is byte-identical on every machine and
every reload; only the wall clock (countdowns, "today") moves.

## State

`Context + useReducer` (`src/tutorly/store/AppStore.tsx`) for the student's
world, persisted to `localStorage` (`tutorly.v2`) with debounced writes and
corruption recovery. The teaching-application registry
(`src/tutorly/data/community.ts`) is its own localStorage store
(`tutorly.teachers.v1` + `tutorly.teach.draft.v1`) with a pub/sub version
signal — approvals anywhere (even another tab, via the `storage` event) update
every open page instantly.

## Type and icon systems

TypeScript throughout, strict. Icons are `lucide-react`. Portraits are
generated two-tone illustrations living in `public/tutors/`, with a
deterministic monogram fallback if an image ever fails — and every
community-approved tutor gets the same monogram treatment until they upload
a photo.

---

## Architecture

```
src/
  app/                    Next.js entry (3 lines of glue)
    layout.tsx            fonts (<link>), metadata, viewport
    page.tsx              renders <AppRoot/>
  tutorly/
    AppRoot.tsx            providers, chrome, hash-router switch, error boundary
    router/router.tsx      hand-built hash router + <Link>
    store/                 types, reducer, persistence, demo seed
    data/                  subjects taxonomy, tutors, reviews (seeded), availability,
                            reply engine, admin data, community (teaching applications)
    components/
      common/              Modal, Toaster, Avatar, Stars, atoms
      nav/                 Navbar, SearchOverlay, AuthModal
      tutors/              TutorCard, IntroVideo
      booking/             BookingFlow, CheckoutModal
      reviews/             ReviewModal
      browse/              FilterSidebar
      classroom/           Whiteboard (canvas), VideoTile, ChatPanel, peer session
      teach/               TeachWizard, the four wizard steps, TeacherStatus
      admin/               AdminTables, ApplicationsTab (the review queue)
      home/                RotatingWord
    pages/                 Home, Browse, TutorProfile, Messages, Dashboard,
                           Classroom, Teach, Admin
    styles/                the hand-written design system (16 CSS files)
    utils/                 rng, time, misc (luhn, formatting)
public/tutors/             twelve generated portraits
mini-services/peer-broker/ local PeerJS signalling server for the classroom
vite-standalone/           the pure Vite + React 18 port (see above)
```

## Design notes

- **Two Google fonts only.** Plus Jakarta Sans (the friendly marketplace
  voice — identity and body) and DM Mono (the marketplace stamp — prices,
  schedules, room codes, stats). Inter isn't the identity font.
- **Palette:** cream `#F7F4ED`, ink `#1C2B24`, forest green `#0E3E32`
  (primary), signal green `#1ED65F` (CTA), amber stars, one danger red.
  Soft warm shadows, rounded cards, pill buttons — clean like Preply.
- **Accessibility:** focus-visible rings everywhere, modal focus handling,
  Esc handlers, ARIA roles on tabs/radiogroups/dialogs/steppers, screen-reader
  text for star ratings, a skip link, and a global reduced-motion kill-switch.
- **Honesty as a design rule:** seeded simulations are labelled as seeded,
  new tutors start at zero with "first review pending" states, the payment
  is labelled simulated — nothing pretends to be more than it is.

---

## License & Copyright

**Proprietary & Closed Source. All Rights Reserved.**  
Copyright © 2026 Yassir ([@YASSIRXVHY](https://github.com/YASSIRXVHY)) and Yassir-YSR ([@yassirelhajjami](https://github.com/yassirelhajjami)).

This project and its source code are strictly proprietary. Unauthorized copying, downloading, modification, redistribution, or commercial use of this repository, in whole or in part, is strictly prohibited. See [LICENSE](file:///c:/Users/s/OneDrive/Desktop/tutorlly/LICENSE) for full legal terms.

