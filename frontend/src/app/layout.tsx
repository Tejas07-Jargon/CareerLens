import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareerLens 🔍 — Know how job-ready you are",
  description:
    "Evidence-based employability analysis. Every skill claim is verified against real proof of work. Get your explainable Job Readiness Score, skill gap report, and personalised roadmap.",
  keywords: ["employability", "career readiness", "GitHub analysis", "skill gap", "placement"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
