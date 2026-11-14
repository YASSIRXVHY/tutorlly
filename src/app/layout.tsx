import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tutorly — 1-on-1 online tutoring for languages, math & more",
  description:
    "Book trial lessons with verified tutors in 10 languages, math, science, programming, music and test prep. Half-price first lesson, live classroom with video and a shared whiteboard.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F7F4ED",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/*
          Exactly two Google Fonts, deliberately paired:
          Plus Jakarta Sans — the friendly marketplace voice (identity + body)
          DM Mono — the marketplace stamp (prices, schedules, room codes, stats)
        */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router head link, equivalent to _document in Pages Router */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
