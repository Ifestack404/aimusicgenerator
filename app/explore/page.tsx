import type { Metadata } from "next";
import { MusicCatalog } from "../../components/music-platform";

export const metadata: Metadata = {
  title: "Explore Music — Soundforge",
  description: "Discover and stream independent tracks shared by Soundforge artists.",
};

export default function ExplorePage() {
  return <MusicCatalog />;
}
