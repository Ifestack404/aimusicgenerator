import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

export async function GET(request: NextRequest) {
  const providerError = request.nextUrl.searchParams.get("error");
  if (providerError) {
    console.error("Supabase social authentication provider returned an error.", providerError);
    return NextResponse.redirect(new URL("/auth?error=oauth", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error("Supabase authentication callback failed.", error);
        return NextResponse.redirect(new URL("/auth?error=callback", request.url));
      }
      return NextResponse.redirect(new URL("/profile", request.url));
    } catch (error: unknown) {
      console.error("Unable to complete the Supabase authentication callback.", error);
      return NextResponse.redirect(new URL("/auth?error=configuration", request.url));
    }
  }

  return NextResponse.redirect(new URL("/auth?error=confirmation", request.url));
}
