import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Parla — The Language Press | One-to-one language tutoring",
  description:
    "Book one-to-one lessons with serious language tutors across 11 languages. Trial discounts, a live classroom with a shared whiteboard, and a money-back guarantee on your first lesson.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F6F1E5",
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
          Fraunces — the editorial display + reading face (wonky old-style serif)
          IBM Plex Mono — the timetable voice (labels, prices, schedules, tickets)
        */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router head link, equivalent to _document in Pages Router */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&display=swap"
        />
      </head>
      <body className="parla-body">{children}</body>
    </html>
  );
}
