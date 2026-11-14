'use client';

/**
 * Teach — the "Become a tutor" page. No application yet: a marketing hero
 * and the four-step wizard. Application in flight: the live status screens
 * (pending / approved / rejected) that update the moment the admin console
 * decides. Route: /teach.
 */
import { useEffect, useState } from "react";
import { CalendarCheck, GraduationCap, Wallet } from "lucide-react";
import { myApplication, useCommunityVersion, type TeachDraft } from "../data/community";
import { TeachWizard } from "../components/teach/TeachWizard";
import { TeacherStatus } from "../components/teach/TeacherStatus";

import "../styles/teach.css";

const PROPS = [
  {
    icon: Wallet,
    title: "Set your own rate",
    copy: "From $5 to $80 a lesson — you keep 82% of every booking; the platform takes 18%.",
  },
  {
    icon: CalendarCheck,
    title: "Your calendar, your pace",
    copy: "Open the hours you want, teach from anywhere, close a week when life happens.",
  },
  {
    icon: GraduationCap,
    title: "Students come to you",
    copy: "Search, filters and recommendations do the matching — you just teach well.",
  },
] as const;

export function TeachPage() {
  // The version subscription flips this page between wizard and status the
  // instant an application is submitted, approved or rejected — anywhere.
  useCommunityVersion();
  const app = myApplication();
  const [resubmitDraft, setResubmitDraft] = useState<TeachDraft | null>(null);

  const startResubmit = () => setResubmitDraft(app ? { ...app.payload } : null);

  // A resubmission replaces the rejected application — the moment a
  // non-rejected one exists, drop the prefill and show the status screen.
  useEffect(() => {
    if (app && app.status !== "rejected") setResubmitDraft(null);
  }, [app]);

  if (app && !resubmitDraft) {
    return (
      <div className="teach-page">
        <TeacherStatus app={app} onResubmit={startResubmit} />
      </div>
    );
  }

  return (
    <div className="teach-page">
      <section className="teach-hero" aria-label="Teach on Tutorly">
        <span className="teach-eyebrow">
          <GraduationCap size={13} aria-hidden /> become a tutor
        </span>
        <h1 className="teach-h1">
          Teach what you love.
          <br />
          <em>Keep 82% of it.</em>
        </h1>
        <p className="teach-lede">
          {resubmitDraft
            ? "Back for round two — everything from your last application is right where you left it."
            : "Apply once, get reviewed by a human, and your profile joins the same marketplace our hand-picked tutors live in — search, bookings, messages and the live classroom included."}
        </p>
        <div className="teach-props">
          {PROPS.map((p) => {
            const Icon = p.icon;
            return (
              <div className="teach-prop" key={p.title}>
                <span className="teach-prop-ico">
                  <Icon size={17} aria-hidden />
                </span>
                <span className="teach-prop-title">{p.title}</span>
                <span className="teach-prop-copy">{p.copy}</span>
              </div>
            );
          })}
        </div>
      </section>

      <TeachWizard
        key={resubmitDraft ? "resubmit" : "fresh"}
        initial={resubmitDraft}
        onStartedFresh={() => setResubmitDraft(null)}
      />
    </div>
  );
}
