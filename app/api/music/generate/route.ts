import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "../../../../lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const GOOGLE_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const GENERATION_TIMEOUT_MS = 240000;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return errorResponse(
      "Music generation is not configured. Add GEMINI_API_KEY as a server-only environment variable and restart or redeploy the app.",
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

  const durationSeconds = Number(input.durationSeconds);
  const styles = getStyles(input);
  const isLyricsMode = input.mode === "lyrics";
  const lyrics = isLyricsMode ? (input.lyrics as string).trim() : "";
  const isInstrumental = input.mode === "instrumental" || input.vocal === "No vocals";
  const durationDescription = durationSeconds === 120 ? "about 2 minutes" : `about ${durationSeconds} seconds`;
  const prompt = [
    isLyricsMode
      ? `Create a complete song using the following user-provided lyrics verbatim. Do not rewrite, omit, or add words to the lyrics:\n${lyrics}`
      : isNonEmptyString(input.prompt) ? input.prompt.trim() : "",
    `Target duration: ${durationDescription}.`,
    `Genre: ${styles[0]}.`,
    `Mood: ${styles[1]}.`,
    isInstrumental
      ? "Make this a fully instrumental track with no vocals or sung words."
      : `Include ${styles[2]} and a memorable vocal melody.`,
    input.instrument && input.instrument !== "Let the song decide" ? `Lead instrument: ${String(input.instrument)}.` : "",
    `Creative direction: ${isNonEmptyString(input.creativity) ? input.creativity : "Balanced"}.`,
    "Create a polished, original, coherent song arrangement.",
  ].filter(Boolean).join("\n");
  const model = durationSeconds === 30 ? "lyria-3-clip-preview" : "lyria-3.5";

  let providerResponse: Response;
  try {
    providerResponse = await fetch(GOOGLE_INTERACTIONS_URL, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Api-Revision": "2026-05-20",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ model, input: prompt }),
      cache: "no-store",
      signal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "TimeoutError") {
      console.error("The Lyria music request timed out.");
      return errorResponse("Music generation took too long. Please try again with a shorter prompt.", 504);
    }
    console.error("The Lyria music request could not be completed.", error);
    return errorResponse("The music service could not be reached. Please try again.", 502);
  }

  if (!providerResponse.ok) {
    console.error("Lyria music generation failed.", { status: providerResponse.status, model });

    if (providerResponse.status === 401 || providerResponse.status === 403) {
      return errorResponse("Google rejected the API key or the key does not have access to Lyria. Check GEMINI_API_KEY and the model's availability for your account.", 502);
    }
    if (providerResponse.status === 402) {
      return errorResponse("Google requires billing or an eligible plan for this Lyria request. Check the billing status and model access for the API key.", 402);
    }
    if (providerResponse.status === 429) {
      return errorResponse("The Google API quota or rate limit was reached. Check the Gemini API project limits and try again later.", 429);
    }
    if (providerResponse.status === 400 || providerResponse.status === 422) {
      return errorResponse("Lyria could not use this request. Check the song description and settings, then try again.", 422);
    }
    return errorResponse("Lyria could not generate this song right now. Please try again.", 502);
  }

  let interaction: unknown;
  try {
    interaction = await providerResponse.json();
  } catch (error: unknown) {
    console.error("Lyria returned an invalid response.", error);
    return errorResponse("Lyria returned an invalid response. Please try again.", 502);
  }

  const outputAudio = isRecord(interaction) && isRecord(interaction.output_audio)
    ? interaction.output_audio
    : null;
  const encodedAudio = outputAudio && typeof outputAudio.data === "string"
    ? outputAudio.data
    : "";
  if (!encodedAudio) {
    const status = isRecord(interaction) && typeof interaction.status === "string"
      ? interaction.status
      : "unknown";
    console.error("Lyria completed without returning audio.", { status, model });
    return errorResponse("Lyria did not return an audio file. Please try again.", 502);
  }

  const audio = Buffer.from(encodedAudio, "base64");
  if (audio.byteLength === 0) {
    console.error("Lyria returned an empty audio file.");
    return errorResponse("Lyria returned an empty audio file. Please try again.", 502);
  }

  return new NextResponse(audio, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(audio.byteLength),
      "Cache-Control": "no-store",
      "Content-Disposition": "inline; filename=\"soundforge-song.mp3\"",
    },
  });
}
