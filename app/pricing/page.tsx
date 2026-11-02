import type { Metadata } from "next";
import { StudioPricing } from "../../components/studio-home";

export const metadata: Metadata = {
  title: "Pricing Preview — Soundforge AI",
  description: "Preview the plans being shaped for the Soundforge creative studio.",
};

export default function PricingPage() {
  return <StudioPricing />;
}
