import type { Metadata } from "next";
import ArtistProfile from "../../components/artist-profile";

export const metadata: Metadata = {
  title: "Artist Profile — Soundforge AI",
  description: "Set up your artist identity and profile details in Soundforge AI.",
};

export default function ProfilePage() {
  return <ArtistProfile />;
}
