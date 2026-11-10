import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const allowedModes = new Set(["text", "lyrics", "instrumental", "custom"]);
const allowedDurations = new Set([30, 60, 120]);
const allowedVocals = new Set(["Auto", "Female", "Male", "No vocals"]);
const allowedInstruments = new Set(["Let the song decide", "Piano", "Guitar", "Synth", "Strings", "Drums"]);
const allowedCreativeDirections = new Set(["Balanced", "Familiar", "Unexpected"]);
const MAX_LYRICS_CHARACTERS = 5000;
const MAX_PROMPT_CHARACTERS = 1000;

type GenerationRequest = {
  mode?: unknown;
  prompt?: unknown;
  lyrics?: unknown;
  genre?: unknown;
  mood?: unknown;
  vocal?: unknown;
  durationSeconds?: unknown;
  instrument?: unknown;
  creativity?: unknown;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getStyles(input: GenerationRequest) {
  const isInstrumental = input.mode === "instrumental" || input.vocal === "No vocals";
  const instrument = isNonEmptyString(input.instrument) ? input.instrument.trim() : "Let the song decide";
  const creativity = isNonEmptyString(input.creativity) ? input.creativity.trim() : "Balanced";
  const styles = [
    isNonEmptyString(input.genre) ? input.genre.trim() : "Pop",
    isNonEmptyString(input.mood) ? input.mood.trim() : "uplifting",
    isInstrumental
      ? "instrumental, no vocals"
      : input.vocal === "Auto" ? "expressive lead vocals" : `${String(input.vocal).toLowerCase()} lead vocals`,
    ...(instrument === "Let the song decide" ? [] : [`${instrument} lead instrument`]),
    `${creativity.toLowerCase()} creative direction`,
    "full song arrangement",
    "clear vocal melody",
    "polished studio production",
  ].filter((style) => !(isInstrumental && ["full song arrangement", "clear vocal melody"].includes(style)));

  return styles.map((style) => style.slice(0, 100));
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    return errorResponse(
      "Music generation is not configured. Add ELEVENLABS_API_KEY as a server-only Vercel environment variable and redeploy.",
      503,
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return errorResponse("Sign in before generating a song.", 401);
  } catch (error: unknown) {
    console.error("Unable to authenticate a music-generation request.", error);
    return errorResponse("Unable to verify your sign-in. Please refresh and try again.", 401);
  }

  let input: GenerationRequest;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return errorResponse("The song request must be a JSON object.", 400);
    }
    input = body as GenerationRequest;
  } catch {
    return errorResponse("The song request must be valid JSON.", 400);
  }

  if (typeof input.mode !== "string" || !allowedModes.has(input.mode)) {
    return errorResponse("Choose a supported song-generation mode.", 400);
  }
  if (!allowedDurations.has(Number(input.durationSeconds))) {
    return errorResponse("Choose a song length of 30, 60, or 120 seconds.", 400);
  }
  if (!allowedVocals.has(String(input.vocal))) {
    return errorResponse("Choose a supported vocal setting.", 400);
  }
  if (input.instrument !== undefined && !allowedInstruments.has(String(input.instrument))) {
    return errorResponse("Choose a supported lead instrument.", 400);
  }
  if (input.creativity !== undefined && !allowedCreativeDirections.has(String(input.creativity))) {
    return errorResponse("Choose a supported creative direction.", 400);
  }
  if (input.mode === "lyrics") {
    if (!isNonEmptyString(input.lyrics)) {
      return errorResponse("Add lyrics before generating a song.", 400);
    }
    if (input.lyrics.length > MAX_LYRICS_CHARACTERS) {
      return errorResponse("Lyrics must be 5,000 characters or fewer.", 400);
    }
    const lines = input.lyrics.split(/\r?\n/);
    if (lines.length > 30 || lines.some((line) => line.length > 200)) {
      return errorResponse("Lyrics support up to 30 lines, with at most 200 characters per line.", 400);
    }
  } else {
    if (!isNonEmptyString(input.prompt)) {
      return errorResponse("Describe the song before generating it.", 400);
    }
    if (input.prompt.length > MAX_PROMPT_CHARACTERS) {
      return errorResponse("The song description must be 1,000 characters or fewer.", 400);
    }
  }

  const durationMs = Number(input.durationSeconds) * 1000;
  const styles = getStyles(input);
  const isLyricsMode = input.mode === "lyrics";
  const lyrics = isLyricsMode ? (input.lyrics as string).trim() : "";
  const prompt = isLyricsMode
    ? undefined
    : [
        isNonEmptyString(input.prompt) ? input.prompt.trim() : "",
        `Genre: ${styles[0]}.`,
        `Mood: ${styles[1]}.`,
        input.mode === "instrumental" || input.vocal === "No vocals"
          ? "Create an instrumental track with no vocals."
          : `Create a full song with ${styles[2]}, a memorable vocal melody, and complete instrumentation.`,
        input.instrument && input.instrument !== "Let the song decide" ? `Lead instrument: ${String(input.instrument)}.` : "",
        `Creative direction: ${isNonEmptyString(input.creativity) ? input.creativity : "Balanced"}.`,
      ].filter(Boolean).join(" ");

  const payload = {
    model_id: "music_v2_5",
    ...(isLyricsMode
      ? {
          composition_plan: {
            chunks: [{
              text: lyrics,
              duration_ms: durationMs,
              positive_styles: styles,
              negative_styles: [],
              context_adherence: "high",
            }],
          },
        }
      : {
          prompt,
          music_length_ms: durationMs,
          force_instrumental: input.mode === "instrumental" || input.vocal === "No vocals",
        }),
  };

  let providerResponse: Response;
  try {
    providerResponse = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(240000),
    });
  } catch (error: unknown) {
    console.error("The ElevenLabs music request could not be completed.", error);
    return errorResponse("The music service could not be reached. Please try again.", 502);
  }

  if (!providerResponse.ok) {
    const providerBody = await providerResponse.text().catch(() => "");
    console.error("ElevenLabs music generation failed.", {
      status: providerResponse.status,
      response: providerBody.slice(0, 1000),
    });

    if (providerResponse.status === 401 || providerResponse.status === 403) {
      return errorResponse("The music provider rejected its API key. Check ELEVENLABS_API_KEY in Vercel.", 502);
    }
    if (providerResponse.status === 429) {
      return errorResponse("The music provider quota or rate limit was reached. Check the ElevenLabs account and try again later.", 429);
    }
    if (providerResponse.status === 422) {
      return errorResponse("The music provider could not use this request. Check the lyrics and song settings, then try again.", 422);
    }
    return errorResponse("The music provider could not generate this song right now. Please try again.", 502);
  }

  const audio = await providerResponse.arrayBuffer();
  if (audio.byteLength === 0) {
    console.error("ElevenLabs returned an empty music file.");
    return errorResponse("The music provider returned an empty audio file. Please try again.", 502);
  }

  return new NextResponse(audio, {
    headers: {
      "Content-Type": providerResponse.headers.get("content-type") || "audio/mpeg",
      "Content-Length": String(audio.byteLength),
      "Cache-Control": "no-store",
      "Content-Disposition": "inline; filename=\"soundforge-song.mp3\"",
    },
  });
}
