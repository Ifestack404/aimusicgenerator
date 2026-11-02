import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";
import SiteShell from "../components/site-shell";

export const metadata: Metadata = {
  title: "Soundforge AI — Your next idea starts here",
  description:
    "Find your sound with Soundforge AI, a creative studio for your next musical idea.",
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
