import { NextResponse } from "next/server";
import { getSupabaseConfig, getSupabaseConfigErrorMessage } from "../../../../lib/supabase/config";

export const dynamic = "force-dynamic";

export async function GET() {
  let config;
  try {
    config = getSupabaseConfig();
  } catch (error: unknown) {
    console.error("Invalid Supabase connection settings.", error);
    return NextResponse.json(
      {
        status: "invalid_config",
        message: "The Supabase settings are invalid or unsafe. Use a project URL and publishable/anon key; never put a secret or service-role key in a NEXT_PUBLIC_ variable.",
      },
      { status: 500 },
    );
  }

  if (!config) {
    return NextResponse.json(
      { status: "not_configured", message: getSupabaseConfigErrorMessage() },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(`${config.url}/auth/v1/health`, {
      headers: {
        apikey: config.publishableKey,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (response.ok) {
      return NextResponse.json({
        status: "connected",
        message: "Supabase Auth is reachable with this project URL and publishable key. Apply the database migration to enable artist profiles and avatar storage.",
      });
    }

    if (response.status === 401 || response.status === 403) {
      return NextResponse.json(
        {
          status: "invalid_key",
          message: "Supabase is reachable, but the publishable key was rejected. Check the key in .env.local.",
        },
        { status: 502 },
      );
    }

    console.error("Supabase connection check returned HTTP", response.status);
    return NextResponse.json(
      {
        status: "connection_failed",
        message: "Supabase responded with an error. Verify the project URL and project API settings.",
      },
      { status: 502 },
    );
  } catch (error: unknown) {
    console.error("Unable to reach the configured Supabase project.", error);
    return NextResponse.json(
      {
        status: "unreachable",
        message: "Could not reach Supabase. Check the project URL and network connection.",
      },
      { status: 502 },
    );
  }
}
