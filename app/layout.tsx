import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";
import SiteShell from "../components/site-shell";

export const metadata: Metadata = {
  title: "Soundforge — Independent music, made to be heard",
  description:
    "Discover, stream, and share independent music with Soundforge.",
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
