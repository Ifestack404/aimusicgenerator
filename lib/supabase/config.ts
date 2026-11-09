export type SupabaseConfig = {
  url: string;
  publishableKey: string;
};

function assertPublicKey(publishableKey: string) {
  if (publishableKey.startsWith("sb_secret_")) {
    throw new Error("A Supabase secret key cannot be used as a public key.");
  }

  const segments = publishableKey.split(".");
  if (segments.length !== 3) return;

  let claims: { role?: unknown };
  try {
    const payload = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    claims = JSON.parse(atob(payload)) as { role?: unknown };
  } catch {
    throw new Error("The Supabase JWT key is malformed.");
  }

  if (claims.role === "service_role") {
    throw new Error("A Supabase service-role key cannot be used as a public key.");
  }
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) return null;
  assertPublicKey(publishableKey);

  const parsedUrl = new URL(url);
  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS project URL.");
  }

  return { url: parsedUrl.origin, publishableKey };
}

export function getSupabaseConfigErrorMessage() {
  return "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local for local development, or in your hosting provider's environment settings for a deployed site. Rebuild or redeploy after changing them. Never use a secret or service-role key in a NEXT_PUBLIC_ variable.";
}
