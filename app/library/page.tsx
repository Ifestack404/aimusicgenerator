import type { Metadata } from "next";
import MusicLibrary from "../../components/music-library";

export const metadata: Metadata = {
  title: "Your Music Library — Soundforge AI",
  description: "Save song ideas and lyrics, and organize them into albums.",
};

export default function LibraryPage() {
  return <MusicLibrary />;
}
