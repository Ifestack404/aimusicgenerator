import type { Metadata } from "next";
import { StudioCreate } from "../../components/studio-home";
import { genres } from "../../lib/music-options";

export const metadata: Metadata = {
  title: "Create Music — Soundforge AI",
  description: "Shape your next musical idea in the Soundforge creative studio.",
};

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}) {
  const { genre } = await searchParams;
  const initialGenre = genres.find((option) => option === genre);

  return <StudioCreate initialGenre={initialGenre} />;
}
