import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Plans — Soundforge",
  description: "Soundforge is currently free to explore and listen.",
};

export default function PricingPage() {
  return (
    <main className="music-page section-wrap">
      <div className="music-page-heading">
        <p className="eyebrow">SIMPLE AND OPEN</p>
        <h1>Music discovery, <span>without a paywall.</span></h1>
        <p>Browsing and listening are free during the early community launch. Upload availability depends on the platform’s storage limits.</p>
      </div>
      <Link className="music-primary-link" href="/explore">Explore the catalog</Link>
    </main>
  );
}
