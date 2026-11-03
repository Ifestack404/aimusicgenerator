"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getSupabaseClient } from "../lib/supabase/client";

type AuthMode = "sign_in" | "sign_up";
type SocialProvider = "google" | "github" | "twitter";
type AuthAction = "email" | SocialProvider;

const socialProviders: { id: SocialProvider; label: string }[] = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
  { id: "twitter", label: "Twitter" },
];

export default function AuthForm() {
  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busyAction, setBusyAction] = useState<AuthAction | null>(null);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    if (error) {
      setFeedback({
        type: "error",
        text: error === "configuration"
          ? "Account setup could not finish. Check the Supabase project settings and try again."
          : error === "oauth"
            ? "Social sign-in could not finish. Check that the provider is enabled and configured in Supabase, then try again."
            : error === "callback"
              ? "We couldn’t complete the account callback. Please try signing in again."
              : "That confirmation link is invalid or has expired. Request a new sign-up email.",
      });
    }
  }, []);

  async function signInWithProvider(provider: SocialProvider) {
    setFeedback(null);
    setBusyAction(provider);

    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await getSupabaseClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (error: unknown) {
      console.error(`Soundforge ${provider} sign-in failed.`, error);
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : `We couldn’t start ${provider} sign-in. Please try again.`,
      });
      setBusyAction(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setBusyAction("email");

    try {
      const supabase = getSupabaseClient();
      const redirectTo = `${window.location.origin}/auth/callback`;
      if (mode === "sign_up") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;
        if (data.session) {
          window.location.assign("/profile");
          return;
        }
        setFeedback({
          type: "success",
          text: "Check your email for a confirmation link. Your profile will be ready after you confirm.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        window.location.assign("/profile");
        return;
      }
    } catch (error: unknown) {
      console.error("Soundforge account request failed.", error);
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "We couldn’t complete that account request. Please try again.",
      });
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-mode-tabs" role="tablist" aria-label="Account action">
        <button type="button" role="tab" aria-selected={mode === "sign_in"} disabled={busyAction !== null} onClick={() => { setMode("sign_in"); setFeedback(null); }}>
          Sign in
        </button>
        <button type="button" role="tab" aria-selected={mode === "sign_up"} disabled={busyAction !== null} onClick={() => { setMode("sign_up"); setFeedback(null); }}>
          Create account
        </button>
      </div>
      <div className="social-auth-buttons">
        {socialProviders.map(({ id, label }) => (
          <button
            className="social-auth-button"
            key={id}
            type="button"
            onClick={() => signInWithProvider(id)}
            disabled={busyAction !== null}
          >
            <span className={`social-auth-mark social-auth-mark-${id}`} aria-hidden="true">
              {id === "google" ? (
                "G"
              ) : id === "github" ? (
                <svg viewBox="0 0 24 24"><path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.1c-3.1.67-3.75-1.32-3.75-1.32-.5-1.29-1.25-1.63-1.25-1.63-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.23 3.27.94.1-.73.39-1.23.71-1.51-2.48-.28-5.09-1.24-5.09-5.52 0-1.22.44-2.22 1.16-3-.12-.29-.5-1.43.11-2.97 0 0 .95-.3 3.06 1.15a10.7 10.7 0 0 1 5.58 0c2.12-1.45 3.06-1.15 3.06-1.15.61 1.54.23 2.68.11 2.97.72.78 1.16 1.78 1.16 3 0 4.29-2.61 5.23-5.1 5.51.4.35.75 1.03.75 2.08v3.08c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" /></svg>
              ) : (
                "𝕏"
              )}
            </span>
            {busyAction === id ? `Connecting to ${label}…` : mode === "sign_up" ? `Sign up with ${label}` : `Continue with ${label}`}
          </button>
        ))}
      </div>
      <div className="auth-divider"><span>or continue with email</span></div>
      <form className="auth-form" onSubmit={submit}>
        <label className="profile-field" htmlFor="account-email">
          <span>Email address</span>
          <input id="account-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} disabled={busyAction !== null} />
        </label>
        <label className="profile-field" htmlFor="account-password">
          <span>Password</span>
          <input id="account-password" type="password" autoComplete={mode === "sign_up" ? "new-password" : "current-password"} required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} disabled={busyAction !== null} />
          {mode === "sign_up" && <small>Use at least 8 characters.</small>}
        </label>
        {feedback && <p className={`profile-feedback is-${feedback.type}`} role="status">{feedback.text}</p>}
        <button className="generate-button" type="submit" disabled={busyAction !== null}>
          {busyAction === "email" ? "Please wait…" : mode === "sign_up" ? "Create your account" : "Sign in"} <span aria-hidden="true">↗</span>
        </button>
      </form>
    </div>
  );
}
