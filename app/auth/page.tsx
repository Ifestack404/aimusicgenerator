import type { Metadata } from "next";
import AuthForm from "../../components/auth-form";

export const metadata: Metadata = {
  title: "Sign in — Soundforge AI",
  description: "Sign in or create your Soundforge AI artist account.",
};

export default function AuthPage() {
  return (
    <main>
      <section className="section-wrap route-intro auth-route-intro" aria-labelledby="auth-title">
        <p className="eyebrow"><span className="eyebrow-dot" /> YOUR SOUNDFORGE ACCOUNT</p>
        <h1 id="auth-title">Your sound, <span>your space.</span></h1>
        <p>Sign in to save your artist profile securely and access it across your devices.</p>
      </section>
      <section className="section-wrap auth-section" aria-label="Account access">
        <AuthForm />
      </section>
    </main>
  );
}
