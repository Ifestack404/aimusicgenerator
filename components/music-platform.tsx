"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { genres } from "../lib/music-options";
import { getSupabaseClient } from "../lib/supabase/client";

type MusicTrack = {
  id: string;
  user_id: string;
  title: string;
  artist_name: string;
  genre: string;
  description: string;
  audio_path: string;
  duration_seconds: number;
  created_at: string;
  audio_url: string;
};

type Playlist = { id: string; title: string };
type MusicContextValue = {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  queue: MusicTrack[];
  index: number;
  playTrack: (track: MusicTrack, tracks: MusicTrack[]) => void;
  setIsPlaying: (playing: boolean) => void;
};

const MusicContext = createContext<MusicContextValue | null>(null);
const MAX_TRACK_BYTES = 20 * 1024 * 1024;
const CATALOG_MIGRATION =
  "Run supabase/migrations/20261116000000_music_catalog.sql in the Supabase SQL Editor, then reload this page.";
const TRACK_COLUMNS =
  "id, user_id, title, artist_name, genre, description, audio_path, duration_seconds, created_at";

function isMissingCatalog(error: { code?: string; message?: string }) {
  return error.code === "42P01" || error.code === "PGRST205" || error.message?.includes("Could not find the table");
}

function getPublicAudioUrl(path: string) {
  const { data } = getSupabaseClient().storage.from("music-catalog").getPublicUrl(path);
  return data.publicUrl;
}

function mapTrack(track: Omit<MusicTrack, "audio_url">): MusicTrack {
  return { ...track, audio_url: getPublicAudioUrl(track.audio_path) };
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function MusicPlayer() {
  const { currentTrack, isPlaying, queue, index, playTrack, setIsPlaying } = useMusic();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playbackError, setPlaybackError] = useState("");

  const skip = useCallback((direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= queue.length) return;
    playTrack(queue[nextIndex], queue);
    setPlaybackError("");
  }, [index, playTrack, queue]);

  const handleEnded = () => {
    if (index + 1 < queue.length) skip(1);
    else setIsPlaying(false);
  };

  useEffect(() => {
    if (!currentTrack || !isPlaying) return;
    const audio = audioRef.current;
    if (!audio) return;
    void audio.play().catch((error: unknown) => {
      console.error("Music playback could not start.", error);
      setPlaybackError("Playback could not start. Try pressing play again.");
    });
  }, [currentTrack, isPlaying]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setPlaybackError("");
    try {
      if (audio.paused) await audio.play();
      else audio.pause();
    } catch (error: unknown) {
      console.error("Music playback could not start.", error);
      setPlaybackError("Playback could not start. Try again.");
    }
  };

  return (
    <MusicPlayerControls
      track={currentTrack}
      isPlaying={isPlaying}
      audioRef={audioRef}
      error={playbackError}
      onToggle={() => void togglePlayback()}
      onPrevious={() => skip(-1)}
      onNext={() => skip(1)}
      onEnded={handleEnded}
      onError={() => setPlaybackError("This track could not be played. Try another track.")}
      onPlay={() => setIsPlaying(true)}
      onPause={() => setIsPlaying(false)}
    />
  );
}

function MusicPlayerControls({
  track,
  isPlaying,
  audioRef,
  error,
  onToggle,
  onPrevious,
  onNext,
  onEnded,
  onError,
  onPlay,
  onPause,
}: {
  track: MusicTrack | null;
  isPlaying: boolean;
  audioRef: RefObject<HTMLAudioElement | null>;
  error: string;
  onToggle: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onEnded: () => void;
  onError: () => void;
  onPlay: () => void;
  onPause: () => void;
}) {
  if (!track) return null;

  return (
    <aside className="music-player" aria-label="Music player">
      <div className="music-player-track">
        <div className="music-player-art" aria-hidden="true">♫</div>
        <div className="music-player-copy">
          <strong>{track.title}</strong>
          <span>{track.artist_name}</span>
        </div>
      </div>
      <div className="music-player-controls">
        <div className="music-player-buttons">
          <button type="button" aria-label="Previous track" onClick={onPrevious}>⏮</button>
          <button className="music-player-toggle" type="button" aria-label={isPlaying ? "Pause" : "Play"} onClick={onToggle}>
            {isPlaying ? "Ⅱ" : "▶"}
          </button>
          <button type="button" aria-label="Next track" onClick={onNext}>⏭</button>
        </div>
        <audio
          ref={audioRef}
          src={track.audio_url}
          controls
          preload="metadata"
          onEnded={onEnded}
          onError={onError}
          onPlay={onPlay}
          onPause={onPause}
          aria-label={`Play ${track.title} by ${track.artist_name}`}
        />
      </div>
      <div className="music-player-duration">{formatDuration(track.duration_seconds)}</div>
      {error && <span className="music-player-error" role="status">{error}</span>}
    </aside>
  );
}

function useMusic() {
  const context = useContext(MusicContext);
  if (!context) throw new Error("Music components must be rendered inside MusicContext.");
  return context;
}

export function MusicExperience({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<MusicTrack[]>([]);
  const [index, setIndex] = useState(-1);

  const playTrack = useCallback((track: MusicTrack, tracks: MusicTrack[]) => {
    const list = tracks.length ? tracks : [track];
    const trackIndex = list.findIndex((item) => item.id === track.id);
    setQueue(list);
    setIndex(trackIndex < 0 ? 0 : trackIndex);
    setCurrentTrack(track);
    setIsPlaying(true);
  }, []);

  const value = useMemo(
    () => ({ currentTrack, isPlaying, queue, index, playTrack, setIsPlaying }),
    [currentTrack, isPlaying, queue, index, playTrack],
  );

  return (
    <MusicContext.Provider value={value}>
      {children}
      <MusicPlayer />
    </MusicContext.Provider>
  );
}

function TrackRow({
  track,
  tracks,
  liked,
  onToggleLike,
  playlistOptions,
  onAddToPlaylist,
}: {
  track: MusicTrack;
  tracks: MusicTrack[];
  liked: boolean;
  onToggleLike: () => void;
  playlistOptions?: Playlist[];
  onAddToPlaylist?: (playlistId: string) => void;
}) {
  const { playTrack } = useMusic();

  return (
    <article className="catalog-track">
      <button className="catalog-track-play" type="button" onClick={() => playTrack(track, tracks)} aria-label={`Play ${track.title}`}>
        ▶
      </button>
      <div className="catalog-track-copy">
        <strong>{track.title}</strong>
        <span>{track.artist_name} · {track.genre}</span>
      </div>
      <span className="catalog-track-duration">{formatDuration(track.duration_seconds)}</span>
      <button className={`catalog-like${liked ? " is-liked" : ""}`} type="button" onClick={onToggleLike} aria-label={liked ? "Unlike track" : "Like track"} title={liked ? "Unlike" : "Like"}>
        {liked ? "♥" : "♡"}
      </button>
      {playlistOptions && onAddToPlaylist && playlistOptions.length > 0 && (
        <select
          className="catalog-add-playlist"
          aria-label={`Add ${track.title} to playlist`}
          value=""
          onChange={(event) => {
            if (event.target.value) onAddToPlaylist(event.target.value);
          }}
        >
          <option value="">+ Playlist</option>
          {playlistOptions.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.title}</option>)}
        </select>
      )}
    </article>
  );
}

export function MusicCatalog({ welcome = false }: { welcome?: boolean }) {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("All styles");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCatalog = useCallback(async () => {
    const supabase = getSupabaseClient();
    const { data, error: trackError } = await supabase
      .from("music_tracks")
      .select(TRACK_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(100)
      .abortSignal(AbortSignal.timeout(15000));
    if (trackError) {
      if (isMissingCatalog(trackError)) throw new Error(CATALOG_MIGRATION);
      throw trackError;
    }
    setTracks((data ?? []).map((track) => mapTrack(track as Omit<MusicTrack, "audio_url">)));

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError && userError.name !== "AuthSessionMissingError") throw userError;
    const user = userData.user;
    setUserId(user?.id ?? null);
    if (!user) {
      setLikes(new Set());
      setPlaylists([]);
      return;
    }

    const [likeResult, playlistResult] = await Promise.all([
      supabase.from("music_track_likes").select("track_id").eq("user_id", user.id),
      supabase.from("music_playlists").select("id, title").eq("user_id", user.id).order("created_at"),
    ]);
    if (likeResult.error || playlistResult.error) throw likeResult.error ?? playlistResult.error;
    setLikes(new Set((likeResult.data ?? []).map((item) => item.track_id)));
    setPlaylists((playlistResult.data ?? []) as Playlist[]);
  }, []);

  useEffect(() => {
    let active = true;
    void loadCatalog().catch((cause: unknown) => {
      console.error("Unable to load the public music catalog.", cause);
      if (active) setError(cause instanceof Error ? cause.message : "Could not load music right now.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [loadCatalog]);

  const visibleTracks = tracks.filter((track) => {
    const matchesGenre = genre === "All styles" || track.genre === genre;
    const text = `${track.title} ${track.artist_name} ${track.genre} ${track.description}`.toLowerCase();
    return matchesGenre && text.includes(search.trim().toLowerCase());
  });

  async function toggleLike(track: MusicTrack) {
    if (!userId) {
      setNotice("Sign in to save tracks to your library.");
      return;
    }
    const supabase = getSupabaseClient();
    const wasLiked = likes.has(track.id);
    setNotice("");
    setLikes((current) => {
      const next = new Set(current);
      if (wasLiked) next.delete(track.id);
      else next.add(track.id);
      return next;
    });
    const result = wasLiked
      ? await supabase.from("music_track_likes").delete().eq("user_id", userId).eq("track_id", track.id)
      : await supabase.from("music_track_likes").insert({ user_id: userId, track_id: track.id });
    if (result.error) {
      setLikes((current) => {
        const next = new Set(current);
        if (wasLiked) next.add(track.id);
        else next.delete(track.id);
        return next;
      });
      console.error("Unable to update a track like.", result.error);
      setNotice("Could not update your likes. Please try again.");
    }
  }

  async function addToPlaylist(track: MusicTrack, playlistId: string) {
    const { error: addError } = await getSupabaseClient()
      .from("music_playlist_tracks")
      .upsert({ playlist_id: playlistId, track_id: track.id }, { onConflict: "playlist_id,track_id", ignoreDuplicates: true });
    if (addError) {
      console.error("Unable to add a track to the playlist.", addError);
      setNotice("Could not add that track to the playlist.");
      return;
    }
    setNotice(`Added “${track.title}” to your playlist.`);
  }

  return (
    <main className={`music-page section-wrap${welcome ? " is-home" : ""}`}>
      {welcome ? (
        <section className="welcome-hero" aria-labelledby="welcome-title">
          <div className="welcome-copy">
            <p className="eyebrow">WELCOME TO SOUNDFORGE</p>
            <h1 id="welcome-title">Independent music.<br /><span>Yours to discover.</span></h1>
            <p className="welcome-description">
              Find a sound that stays with you. Explore music shared by independent artists, save the tracks you love, and share your own.
            </p>
            <div className="welcome-actions">
              <a className="music-primary-link" href="#catalog">Explore the music <span aria-hidden="true">↓</span></a>
              <Link className="welcome-secondary-link" href="/create">Share a track <span aria-hidden="true">↗</span></Link>
            </div>
            <div className="welcome-points">
              <span><i aria-hidden="true">01</i> Discover independent artists</span>
              <span><i aria-hidden="true">02</i> Listen and save favorites</span>
              <span><i aria-hidden="true">03</i> Share music you own</span>
            </div>
          </div>
          <div className="welcome-art" aria-hidden="true">
            <div className="welcome-art-glow" />
            <div className="welcome-record">
              <div className="welcome-record-label"><span>SF</span></div>
            </div>
            <div className="welcome-art-wave">
              {[18, 30, 45, 28, 54, 72, 39, 61, 82, 48, 69, 34, 57, 25, 43, 62, 31, 49].map((height, index) => (
                <i key={index} style={{ height: `${height}%` }} />
              ))}
            </div>
            <div className="welcome-art-caption">
              <span className="welcome-live-dot" />
              <span>MADE BY ARTISTS</span>
              <span>SHARED WITH YOU</span>
            </div>
            <span className="welcome-art-note note-one">♪</span>
            <span className="welcome-art-note note-two">♫</span>
          </div>
        </section>
      ) : (
        <div className="music-page-heading">
          <p className="eyebrow">THE SOUND FORGE CATALOG</p>
          <h1>Find your <span>next favorite.</span></h1>
          <p>Discover independent music shared by artists. Press play and let the next track find you.</p>
        </div>
      )}
      <section className="catalog-section" id="catalog" aria-labelledby="catalog-title">
        <div className="catalog-section-heading">
          <div>
            <p className="eyebrow">{welcome ? "FRESH FROM THE COMMUNITY" : "THE SOUND FORGE CATALOG"}</p>
            <h2 id="catalog-title">{welcome ? "Start listening." : "Explore the catalog."}</h2>
          </div>
          {welcome && <Link href="/explore">Browse all music <span aria-hidden="true">↗</span></Link>}
        </div>
        <div className="catalog-tools">
          <label className="catalog-search">
            <span className="visually-hidden">Search tracks and artists</span>
            <span aria-hidden="true">⌕</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search songs, artists, or styles" />
          </label>
          <label className="catalog-genre">
            <span className="visually-hidden">Filter by genre</span>
            <select value={genre} onChange={(event) => setGenre(event.target.value)}>
              <option>All styles</option>
              {genres.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <Link className="music-primary-link" href="/create">Upload a track</Link>
        </div>
        {notice && <p className="music-notice" role="status">{notice}</p>}
        {error ? <div className="music-message is-error" role="alert">{error}</div> : loading ? (
          <div className="music-message">Loading the catalog…</div>
        ) : visibleTracks.length ? (
          <div className="catalog-list" aria-label="Music tracks">
            {visibleTracks.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                tracks={visibleTracks}
                liked={likes.has(track.id)}
                onToggleLike={() => void toggleLike(track)}
                playlistOptions={playlists}
                onAddToPlaylist={(playlistId) => void addToPlaylist(track, playlistId)}
              />
            ))}
          </div>
        ) : (
          <div className="catalog-empty">
            <span aria-hidden="true">♫</span>
            <h2>{tracks.length ? "No tracks match that search." : "The catalog is waiting for its first track."}</h2>
            <p>{tracks.length ? "Try another title, artist, or style." : "Be the first artist to share a track with the community."}</p>
            {!tracks.length && <Link className="music-primary-link" href="/create">Upload the first track</Link>}
          </div>
        )}
        {!userId && !loading && <p className="music-subtle"><Link href="/auth">Sign in</Link> to like music and create playlists.</p>}
      </section>
    </main>
  );
}

function readTrackDuration(file: File): Promise<number> {
  const source = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const clean = () => {
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.removeAttribute("src");
      URL.revokeObjectURL(source);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const seconds = audio.duration;
      clean();
      if (!Number.isFinite(seconds) || seconds < 1 || seconds > 3600) {
        reject(new Error("Tracks must be between 1 second and 60 minutes long."));
      } else {
        resolve(Math.ceil(seconds));
      }
    };
    audio.onerror = () => {
      clean();
      reject(new Error("This file could not be read as audio. Please choose a valid MP3."));
    };
    audio.src = source;
  });
}

export function MusicUpload() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [artistName, setArtistName] = useState("");
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    void getSupabaseClient().auth.getUser().then(async ({ data, error: authError }) => {
      if (authError && authError.name !== "AuthSessionMissingError") throw authError;
      if (!data.user) return;
      if (active) {
        setUserId(data.user.id);
        setArtistName(data.user.user_metadata?.display_name || data.user.email?.split("@")[0] || "");
      }
      const { data: profile, error: profileError } = await getSupabaseClient()
        .from("artist_profiles").select("artist_name").eq("id", data.user.id).maybeSingle();
      if (profileError) throw profileError;
      if (active && profile?.artist_name) setArtistName(profile.artist_name);
    }).catch((cause: unknown) => {
      console.error("Unable to prepare the music upload form.", cause);
      if (active) setError("Could not load your account. Reload the page and try again.");
    });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) {
      setError("Sign in before uploading a track.");
      return;
    }
    if (!title.trim() || !artistName.trim()) {
      setError("Add a track title and artist name.");
      return;
    }
    if (!file) {
      setError("Choose an MP3 file to upload.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".mp3") || file.type && file.type !== "audio/mpeg") {
      setError("Please choose an MP3 audio file.");
      return;
    }
    if (file.size > MAX_TRACK_BYTES) {
      setError("MP3 files must be 20 MB or smaller.");
      return;
    }
    if (!rightsConfirmed) {
      setError("Confirm that you have the rights to publish this track.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");
    const supabase = getSupabaseClient();
    let audioPath = "";
    try {
      const durationSeconds = await readTrackDuration(file);
      const trackId = crypto.randomUUID();
      audioPath = `${userId}/${trackId}.mp3`;
      const { error: uploadError } = await supabase.storage
        .from("music-catalog")
        .upload(audioPath, file, { contentType: "audio/mpeg", upsert: false });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("music_tracks").insert({
        id: trackId,
        user_id: userId,
        title: title.trim(),
        artist_name: artistName.trim(),
        genre,
        description: description.trim(),
        audio_path: audioPath,
        duration_seconds: durationSeconds,
        rights_confirmed_at: new Date().toISOString(),
      });
      if (insertError) {
        const { error: cleanupError } = await supabase.storage.from("music-catalog").remove([audioPath]);
        if (cleanupError) console.error("Unable to clean up an audio upload after its catalog record failed.", cleanupError);
        if (isMissingCatalog(insertError)) throw new Error(CATALOG_MIGRATION);
        throw insertError;
      }

      setSuccess("Your track is published. It is now available in the catalog.");
      setTitle("");
      setGenre("");
      setDescription("");
      setFile(null);
      setRightsConfirmed(false);
      formRef.current?.reset();
      router.refresh();
    } catch (cause: unknown) {
      console.error("Unable to publish a music track.", cause);
      setError(cause instanceof Error ? cause.message : "The track could not be published. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="music-page section-wrap">
      <div className="music-page-heading">
        <p className="eyebrow">FOR INDEPENDENT ARTISTS</p>
        <h1>Put your music <span>out there.</span></h1>
        <p>Share an original track with listeners in the Soundforge community.</p>
      </div>
      {!userId ? (
        <div className="music-signin-card">
          <h2>Sign in to publish music</h2>
          <p>Your account keeps track uploads and artist identity connected.</p>
          <Link className="music-primary-link" href="/auth">Sign in or create an account</Link>
        </div>
      ) : (
        <form ref={formRef} className="music-upload-form" onSubmit={(event) => void submit(event)}>
          <label>
            <span>Track title</span>
            <input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Give your track a name" />
          </label>
          <label>
            <span>Artist name</span>
            <input required maxLength={80} value={artistName} onChange={(event) => setArtistName(event.target.value)} />
          </label>
          <label>
            <span>Genre</span>
            <select required value={genre} onChange={(event) => setGenre(event.target.value)}>
              <option value="">Choose a style</option>
              {genres.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>About this track <small>Optional</small></span>
            <textarea maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A little context for listeners…" rows={4} />
          </label>
          <label className="music-file-field">
            <span>Audio file <small>MP3, up to 20 MB</small></span>
            <input required type="file" accept="audio/mpeg,.mp3" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            {file && <small>{file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB</small>}
          </label>
          <label className="music-rights-check">
            <input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} />
            <span>I own or have permission to publish this recording and any included music, performance, and artwork.</span>
          </label>
          {error && <p className="music-form-feedback is-error" role="alert">{error}</p>}
          {success && <p className="music-form-feedback is-success" role="status">{success}</p>}
          <button className="music-primary-link" type="submit" disabled={busy}>
            {busy ? "Publishing track…" : "Publish track"}
          </button>
          <p className="music-subtle">Published audio is publicly streamable. Only upload content you have permission to share.</p>
        </form>
      )}
    </main>
  );
}

export function MusicLibraryPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistTrackIds, setPlaylistTrackIds] = useState<Record<string, string[]>>({});
  const [playlistTitle, setPlaylistTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const { playTrack } = useMusic();

  const loadLibrary = useCallback(async (ownerId: string) => {
    const supabase = getSupabaseClient();
    const [trackResult, likeResult, playlistResult, playlistTrackResult] = await Promise.all([
      supabase.from("music_tracks").select(TRACK_COLUMNS).order("created_at", { ascending: false }).limit(200),
      supabase.from("music_track_likes").select("track_id").eq("user_id", ownerId),
      supabase.from("music_playlists").select("id, title").eq("user_id", ownerId).order("created_at", { ascending: false }),
      supabase.from("music_playlist_tracks").select("playlist_id, track_id"),
    ]);
    const firstError = trackResult.error ?? likeResult.error ?? playlistResult.error ?? playlistTrackResult.error;
    if (firstError) {
      if (isMissingCatalog(firstError)) throw new Error(CATALOG_MIGRATION);
      throw firstError;
    }
    const libraryTracks = (trackResult.data ?? []).map((track) => mapTrack(track as Omit<MusicTrack, "audio_url">));
    setTracks(libraryTracks);
    setLikes(new Set((likeResult.data ?? []).map((like) => like.track_id)));
    setPlaylists((playlistResult.data ?? []) as Playlist[]);
    const grouped: Record<string, string[]> = {};
    for (const item of playlistTrackResult.data ?? []) {
      grouped[item.playlist_id] ??= [];
      grouped[item.playlist_id].push(item.track_id);
    }
    setPlaylistTrackIds(grouped);
  }, []);

  useEffect(() => {
    let active = true;
    void getSupabaseClient().auth.getUser().then(async ({ data, error: authError }) => {
      if (authError && authError.name !== "AuthSessionMissingError") throw authError;
      if (!data.user) return;
      if (active) setUserId(data.user.id);
      await loadLibrary(data.user.id);
    }).catch((cause: unknown) => {
      console.error("Unable to load your music library.", cause);
      if (active) setError(cause instanceof Error ? cause.message : "Could not load your music library.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [loadLibrary]);

  const likedTracks = tracks.filter((track) => likes.has(track.id));

  async function createPlaylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || !playlistTitle.trim() || busy) return;
    setBusy(true);
    setNotice("");
    const { data, error: createError } = await getSupabaseClient()
      .from("music_playlists")
      .insert({ user_id: userId, title: playlistTitle.trim() })
      .select("id, title")
      .single();
    setBusy(false);
    if (createError) {
      console.error("Unable to create a playlist.", createError);
      setNotice("Could not create your playlist. Please try again.");
      return;
    }
    setPlaylists((current) => [data as Playlist, ...current]);
    setPlaylistTitle("");
  }

  async function addToPlaylist(trackId: string, playlistId: string) {
    const { error: addError } = await getSupabaseClient().from("music_playlist_tracks")
      .upsert({ playlist_id: playlistId, track_id: trackId }, { onConflict: "playlist_id,track_id", ignoreDuplicates: true });
    if (addError) {
      console.error("Unable to add a track to the playlist.", addError);
      setNotice("Could not add that track to your playlist.");
      return;
    }
    setPlaylistTrackIds((current) => ({
      ...current,
      [playlistId]: [...new Set([...(current[playlistId] ?? []), trackId])],
    }));
    setNotice("Track added to your playlist.");
  }

  async function unlike(trackId: string) {
    if (!userId) return;
    const { error: unlikeError } = await getSupabaseClient()
      .from("music_track_likes").delete().eq("user_id", userId).eq("track_id", trackId);
    if (unlikeError) {
      console.error("Unable to remove a liked track.", unlikeError);
      setNotice("Could not update your likes. Please try again.");
      return;
    }
    setLikes((current) => {
      const next = new Set(current);
      next.delete(trackId);
      return next;
    });
  }

  return (
    <main className="music-page section-wrap">
      <div className="music-page-heading">
        <p className="eyebrow">YOUR MUSIC</p>
        <h1>Your library, <span>your sound.</span></h1>
        <p>Your saved favorites and playlists, all in one place.</p>
      </div>
      {!userId && !loading ? (
        <div className="music-signin-card">
          <h2>Sign in to open your library</h2>
          <p>Save favorites and build playlists from music shared by artists.</p>
          <Link className="music-primary-link" href="/auth">Sign in</Link>
        </div>
      ) : error ? <div className="music-message is-error" role="alert">{error}</div> : loading ? (
        <div className="music-message">Loading your library…</div>
      ) : (
        <>
          {notice && <p className="music-notice" role="status">{notice}</p>}
          <section className="music-library-block">
            <div className="music-library-heading"><h2>Liked tracks</h2><span>{likedTracks.length}</span></div>
            {likedTracks.length ? (
              <div className="catalog-list">
                {likedTracks.map((track) => (
                  <div className="library-track-row" key={track.id}>
                    <TrackRow track={track} tracks={likedTracks} liked onToggleLike={() => void unlike(track.id)} />
                    {playlists.length > 0 && (
                      <select aria-label={`Add ${track.title} to a playlist`} value="" onChange={(event) => {
                        if (event.target.value) void addToPlaylist(track.id, event.target.value);
                      }}>
                        <option value="">Add to playlist…</option>
                        {playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.title}</option>)}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            ) : <p className="music-subtle">Like tracks in <Link href="/explore">Explore</Link> and they’ll show up here.</p>}
          </section>
          <section className="music-library-block">
            <div className="music-library-heading"><h2>Playlists</h2><span>{playlists.length}</span></div>
            <form className="playlist-create-form" onSubmit={(event) => void createPlaylist(event)}>
              <input aria-label="New playlist name" required maxLength={100} value={playlistTitle} onChange={(event) => setPlaylistTitle(event.target.value)} placeholder="Name a new playlist" />
              <button type="submit" disabled={busy}>{busy ? "Creating…" : "Create playlist"}</button>
            </form>
            {playlists.length ? (
              <div className="playlist-grid">
                {playlists.map((playlist) => {
                  const playlistTracks = (playlistTrackIds[playlist.id] ?? [])
                    .map((id) => tracks.find((track) => track.id === id))
                    .filter((track): track is MusicTrack => Boolean(track));
                  return (
                    <article className="playlist-card" key={playlist.id}>
                      <div className="playlist-card-art" aria-hidden="true">♫</div>
                      <h3>{playlist.title}</h3>
                      <p>{playlistTracks.length} {playlistTracks.length === 1 ? "track" : "tracks"}</p>
                      {playlistTracks.length > 0 && (
                        <button className="playlist-play-button" type="button" onClick={() => playTrack(playlistTracks[0], playlistTracks)}>
                          Play playlist
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : <p className="music-subtle">Create your first playlist and add tracks from your liked list.</p>}
          </section>
        </>
      )}
    </main>
  );
}
