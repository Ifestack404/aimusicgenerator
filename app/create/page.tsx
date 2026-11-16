import type { Metadata } from "next";
import { MusicUpload } from "../../components/music-platform";

export const metadata: Metadata = {
  title: "Upload Music — Soundforge",
  description: "Share your original music with independent listeners on Soundforge.",
};

export default function CreatePage() {
  return <MusicUpload />;
}
