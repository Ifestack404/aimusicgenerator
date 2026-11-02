"use client";

import { useState } from "react";

type ConnectionResult = {
  status: string;
  message: string;
};

function isConnectionResult(value: unknown): value is ConnectionResult {
  if (typeof value !== "object" || value === null) return false;
  return (
    "status" in value &&
    typeof value.status === "string" &&
    "message" in value &&
    typeof value.message === "string"
  );
}

export default function SupabaseConnection() {
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  async function checkConnection() {
    setIsChecking(true);
    setResult(null);

    try {
      const response = await fetch("/api/supabase/status", {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const body: unknown = await response.json();

      if (!isConnectionResult(body)) {
        throw new Error("The connection check returned an unexpected response.");
      }

      setResult(body);
    } catch (error: unknown) {
      console.error("Supabase connection check failed.", error);
      setResult({
        status: "request_failed",
        message: "We couldn’t complete the connection check. Make sure the development server is running and try again.",
      });
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <main>
      <section className="section-wrap route-intro supabase-route-intro" aria-labelledby="supabase-title">
        <p className="eyebrow"><span className="eyebrow-dot" /> PROJECT CONNECTION</p>
        <h1 id="supabase-title">Connect <span>Supabase.</span></h1>
        <p>
          First, confirm that Soundforge can reach your Supabase project. Authentication,
          secure artist profiles, and private avatar storage are implemented and ready for the project migration.
        </p>
      </section>

      <section className="section-wrap supabase-setup-section" aria-label="Supabase connection setup">
        <div className="supabase-setup-card">
          <div className="supabase-setup-header">
            <span className="supabase-mark" aria-hidden="true">S</span>
            <div>
              <p className="eyebrow">SUPABASE × SOUNDFORGE</p>
              <h2>Project connection</h2>
            </div>
          </div>

          <ol className="supabase-steps">
            <li>
              <span>01</span>
              <div>
                <strong>Open your project settings</strong>
                <p>In Supabase, open your project and go to Project Settings → API Keys (or the Connect panel).</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Add the matching project URL and publishable key locally</strong>
                <p>Copy <code>.env.example</code> to <code>.env.local</code>, then replace the example values with your project URL and publishable key.</p>
                <pre><code>NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co{"\n"}NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key</code></pre>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Restart the development server and test</strong>
                <p>Environment values are loaded when Next.js starts. Restart <code>npm.cmd run dev</code>, then check the connection below.</p>
              </div>
            </li>
          </ol>

          <div className="supabase-security-note">
            <span aria-hidden="true">!</span>
            <p>
              Never put a Supabase <strong>secret</strong> or <strong>service-role key</strong> in a
              <code> NEXT_PUBLIC_</code> variable or share it in chat. This starter uses only the
              project URL and publishable key.
            </p>
          </div>

          <div className="supabase-check-row">
            <button className="generate-button" type="button" disabled={isChecking} onClick={checkConnection}>
              {isChecking ? (
                <><span className="loading-spinner" aria-hidden="true" /> Checking connection…</>
              ) : (
                <>Check Supabase connection <span aria-hidden="true">↗</span></>
              )}
            </button>
            <p>This verifies the URL and public key pair. Database objects are created by the migration below.</p>
          </div>

          {result && (
            <div
              className={`supabase-result${result.status === "connected" ? " is-connected" : " is-error"}`}
              role="status"
              aria-live="polite"
            >
              <span className="supabase-result-dot" aria-hidden="true" />
              <div>
                <strong>
                  {result.status === "connected"
                    ? "Project connected"
                    : result.status === "not_configured"
                      ? "Connection details needed"
                      : "Connection not verified"}
                </strong>
                <p>{result.message}</p>
              </div>
            </div>
          )}
        </div>

        <aside className="supabase-next-card">
          <p className="eyebrow">ENABLE USER PROFILES</p>
          <h2>Apply the artist data migration.</h2>
          <p>In the Supabase SQL Editor, run <code>supabase/migrations/20260601000000_artist_profiles_and_avatars.sql</code>. It creates the artist profile table, per-user RLS policies, signup profile trigger, and private avatar bucket.</p>
          <p>Then configure Authentication → URL Configuration to allow <code>http://localhost:3000/auth/callback</code> during local development and your production callback URL when deployed.</p>
          <span className="supabase-next-status"><span /> MIGRATION REQUIRED</span>
        </aside>
      </section>
    </main>
  );
}
