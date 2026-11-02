import type { Metadata } from "next";
import SupabaseConnection from "../../../components/supabase-connection";

export const metadata: Metadata = {
  title: "Supabase Connection — Soundforge AI",
  description: "Configure and verify the Soundforge AI Supabase project connection.",
};

export default function SupabaseSettingsPage() {
  return <SupabaseConnection />;
}
