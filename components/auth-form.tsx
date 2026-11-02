"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { getSupabaseClient } from "../lib/supabase/client";

type AuthMode = "sign_in" | "sign_up";
type AuthAction = "email" | "google";

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
            ? "Google sign-in could not finish. Check that Google is enabled in Supabase and try again."
            : error === "callback"
              ? "We couldn’t complete the account callback. Please try signing in again."
              : "That confirmation link is invalid or has expired. Request a new sign-up email.",
      });
    }
  }, []);

  async function signInWithGoogle() {
    setFeedback(null);
    setBusyAction("google");

    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await getSupabaseClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (error: unknown) {
      console.error("Soundforge Google sign-in failed.", error);
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "We couldn’t start Google sign-in. Please try again.",
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
      <button className="google-auth-button" type="button" onClick={signInWithGoogle} disabled={busyAction !== null}>
        <span className="google-auth-mark" aria-hidden="true">G</span>
        {busyAction === "google" ? "Connecting to Google…" : mode === "sign_up" ? "Sign up with Google" : "Continue with Google"}
      </button>
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
      <p className="auth-privacy-note">Your account is secured by Supabase. <Link href="/settings/supabase">Connection setup</Link></p>
    </div>
  );
}
