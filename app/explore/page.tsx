import type { Metadata } from "next";
import { StudioExplore } from "../../components/studio-home";

export const metadata: Metadata = {
  title: "Explore Music — Soundforge AI",
  description: "Explore musical styles and illustrative studio sketches with Soundforge AI.",
};

export default function ExplorePage() {
  return <StudioExplore />;
}
