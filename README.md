# Parla — The Language Press

A complete, production-quality language-tutoring marketplace front-end, built as a
single React application with **zero backend**. Students browse twelve tutors across
eleven languages, read profiles, book lessons through a deterministic calendar,
check out with a validated payment form, attend a live classroom with a working
canvas whiteboard, message tutors through a keyword reply engine, and publish
reviews that land live on the tutor's profile.

The art direction is **mid-century editorial print**: a warm paper stock, one ink,
one vermillion accent, hairline rules, hard offset shadows, sharp corners, and a
deliberate two-font pairing. The signature moment is the **boarding-pass lesson
ticket with a generated barcode**.

---

## Run it

```bash
# in this directory
npm install       # or: bun install
npm run dev       # or: bun run dev
```

The dev server starts on port 3000. Open the preview and click through —
everything below is live and functional.

> **About React 18 + Vite:** this sandbox hosts the demo through a Next.js dev
> server (only one route is exposed). The app itself is framework-agnostic
> React — a hand-built hash router, plain CSS imports, Context + useReducer —
> so a complete **Vite + React 18 port ships in `vite-standalone/`**:
> copy `src/parla` and `public` in, `npm install && npm run dev`.
> The only Next-specific code is the 3-line entry page (`src/app/page.tsx`).

---

## Demo credentials

There are none — this is a demo. **Sign in with any well-formed email and an
8+ character password.** Signing in loads a furnished demo account (a lesson
tonight, two completed lessons, three conversations, saved tutors). Creating
a fresh account starts honestly empty, so every designed empty state is on the
tour. Everything lives in `localStorage` (`parla.v1`) and never leaves the page.

Checkout demo card: `4242 4242 4242 4242` — the bank is imaginary, but the
Luhn checksum and expiry validation are real.

---

## Feature map (everything wired)

| Area | What actually works |
| --- | --- |
| **Home** | Rotating headline word (Fraunces italic, vermillion underline), live-lesson panel with a canvas oscilloscope waveform + auto-advancing captions, language index (11 tiles), four featured tutors, how-it-works, pull quote from the review corpus, CTA band. |
| **Browse** | 12 tutors / 11 languages. Filter rail: language, max-price range slider (diamond thumb), min rating, native-only, available-this-week, 10 specialty checkboxes with counts. Removable filter chips + clear-all, 5 sort orders, live result count, loading skeletons, designed empty state with reset. |
| **Tutor profile** | Stats row, languages spoken with CEFR level meters, About/Reviews tabs, review distribution bar chart, deterministic review corpus, simulated intro-video player (target-language captions + English subtitles, play/pause, scrubbable progress, auto-advance), booking sidebar with live "next openings". |
| **Booking** | Modal with a 14-day date strip (open-slot counts per day), per-tutor availability deterministic per date, slots grouped morning/afternoon/evening, already-booked slots disabled, weekly-repeat packages (4-pack −10%, 8-pack −15%). Checkout modal: card number auto-formatting, Luhn validation, expiry-not-in-the-past, CVC rules, processing spinner, animated boarding pass with a generated barcode. |
| **Messages** | Conversation list with unread markers and nav badge, thread view with day dividers (Today / Yesterday / dates), typing indicator, and a keyword-matching reply engine (greetings, price, trial, availability, exams, beginners, cancellations, method, thanks + fallbacks). Book directly from a thread. |
| **Dashboard** | Next-lesson card with a live ticking countdown + progress meter, full lesson ledger with status pills, inline cancel confirmation, post-lesson review modal (star picker, tag chips, optional text) that publishes into the tutor's live reviews, stats, saved tutors, deterministic daily recommendations. |
| **Classroom** | Waiting room with countdown + progress bar ("start now" included — it's a demo), then the live session: a fully functional notebook whiteboard (four inks, three nib widths, eraser, undo, clear, PNG export, pointer + touch + stylus), 50-minute session clock, self-checking agenda, lesson notes that save into the lesson record, and an end-of-lesson flow that completes the lesson and opens the review. |
| **Platform** | Sign-in/sign-up modal with real validation, favorites, global search on Ctrl/Cmd+K (tutors, languages, pages; arrow-key navigation), custom toast system, custom modal system (Esc, focus trap, focus restore, scroll lock), 404 and error-boundary pages, responsive down to 375px, `prefers-reduced-motion` respected. |

No `alert()` / `confirm()` / `prompt()`. No stubs, no dead links, no lorem ipsum.

---

## Determinism

All probabilistic data — slot availability, review corpora, rating
distributions, reply variants, barcodes, recommendations — is generated by
**mulberry32 fed with a string hash** (`src/parla/utils/rng.ts`). No
`Math.random()` anywhere. The demo is byte-identical on every machine and
every reload; only the wall clock (countdowns, "today") moves.

## State

`Context + useReducer` (`src/parla/store/AppStore.tsx`), persisted to
`localStorage` with debounced writes and corruption recovery. Sessions,
bookings, favorites, reviews and conversations survive reloads.

## Type and icon systems

TypeScript throughout, strict. Icons are `lucide-react`. Portraits are
AI-generated two-tone risograph illustrations (ink + vermillion on cream)
living in `public/tutors/`, with a deterministic monogram fallback if an
image ever fails.

---

## Architecture

```
src/
  app/                    Next.js entry (3 lines of glue)
    layout.tsx            fonts (<link>), metadata, viewport
    page.tsx               renders <AppRoot/>
  parla/
    AppRoot.tsx            providers, chrome, router switch, error boundary
    router/router.tsx      hand-built hash router + <Link>
    store/                 types, reducer, persistence, demo seed
    data/                  languages, tutors, reviews (seeded), availability,
                           reply engine
    components/
      common/              Modal, Toaster, atoms (Stars, Avatar, Barcode…)
      nav/                 Navbar, SearchOverlay, AuthModal
      tutors/              TutorCard, IntroVideo
      booking/             BookingFlow, CheckoutModal, BoardingPass
      reviews/             ReviewModal
      classroom/           Whiteboard (canvas)
      home/                Waveform (canvas), RotatingWord
    pages/                 Home, Browse, TutorProfile, Messages, Dashboard,
                           Classroom
    styles/                the hand-written design system (10 CSS files)
    utils/                 rng, time, misc (luhn, formatting)
public/tutors/             twelve generated portraits
vite-standalone/           the pure Vite + React 18 port (see above)
```

## Design notes

- **Two Google fonts only.** Fraunces (display + reading voice, with the `WONK`
  axis on for character) and IBM Plex Mono (the timetable voice — labels,
  prices, timecodes, tickets).
- **Palette:** paper `#F6F1E5`, ink `#1A150F`, vermillion `#C9391B`, spruce
  `#2E5440`, mustard `#C9921E`. No gradients, no glass, no rounded gray cards.
- **Print grammar:** 1px ink hairlines, 3px masthead rules, hard offset
  shadows on hover, uppercase mono labels with tracked letter-spacing, corner
  registration tabs on portraits, dashed perforation on the boarding pass.
- **Accessibility:** focus-visible rings everywhere, modal focus traps,
  Esc handlers, ARIA roles on tabs/radiogroups/dialogs/progress, screen-reader
  text for star ratings, a skip link, and a global reduced-motion kill-switch.
