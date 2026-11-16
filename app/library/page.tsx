import type { Metadata } from "next";
import { MusicLibraryPage } from "../../components/music-platform";

export const metadata: Metadata = {
  title: "Your Library — Soundforge",
  description: "Your liked tracks and playlists on Soundforge.",
};

export default function LibraryPage() {
  return <MusicLibraryPage />;
}
