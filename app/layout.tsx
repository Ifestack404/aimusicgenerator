import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";
import SiteShell from "../components/site-shell";

export const metadata: Metadata = {
  title: "Soundforge — Independent music, yours to discover",
  description:
    "Discover new independent artists, save tracks you love, and share your music on Soundforge.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" data-scroll-behavior="smooth">
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
