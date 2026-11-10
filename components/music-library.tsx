"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { getSupabaseClient } from "../lib/supabase/client";

type MusicProject = {
  id: string;
  title: string;
  mode: string;
  prompt: string;
  lyrics: string;
  genre: string;
  mood: string;
  vocal: string;
  duration_seconds: number;
  status: string;
  audio_path: string | null;
  audio_url: string | null;
  created_at: string;
};

type MusicAlbum = {
  id: string;
  title: string;
  description: string;
  created_at: string;
};

type AlbumTrack = {
  album_id: string;
  project_id: string;
  track_number: number;
};

const LIBRARY_MIGRATION =
  "Run supabase/migrations/20261110000000_music_library_and_albums.sql in the Supabase SQL Editor, then reload this page.";
const AUDIO_STORAGE_MIGRATION =
  "Run supabase/migrations/20261110000001_generated_audio_storage.sql in the Supabase SQL Editor, then reload this page.";
const MAX_AUDIO_FILE_BYTES = 10 * 1024 * 1024;

function isMissingLibrary(error: { code?: string; message?: string }) {
  return error.code === "42P01" || error.code === "PGRST205" || error.message?.includes("Could not find the table");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

async function waitForAuth<T>(request: Promise<T>) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("Checking your sign-in took too long. Reload the page and try again.")),
      15000,
    );
  });

  try {
    return await Promise.race([request, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function readAudioDuration(file: File): Promise<number> {
  const objectUrl = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const cleanup = () => {
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.removeAttribute("src");
      URL.revokeObjectURL(objectUrl);
    };

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      cleanup();
      if (!Number.isFinite(duration) || duration < 1 || duration > 3600) {
        reject(new Error("Audio must be between 1 second and 60 minutes long."));
        return;
      }
      resolve(Math.ceil(duration));
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error("Could not read this MP3 file. Please try another download."));
    };
    audio.src = objectUrl;
  });
}

export default function MusicLibrary() {
  const [userId, setUserId] = useState<string | null>(null);
  const [projects, setProjects] = useState<MusicProject[]>([]);
  const [albums, setAlbums] = useState<MusicAlbum[]>([]);
  const [albumTracks, setAlbumTracks] = useState<AlbumTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingAlbum, setIsSavingAlbum] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [albumTitle, setAlbumTitle] = useState("");
  const [albumDescription, setAlbumDescription] = useState("");
  const [busyProjectId, setBusyProjectId] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const uploadFormRef = useRef<HTMLFormElement>(null);

  const loadLibrary = useCallback(async (ownerId: string) => {
    const supabase = getSupabaseClient();
    const requestSignal = AbortSignal.timeout(15000);
    const [projectResult, albumResult, trackResult] = await Promise.all([
      supabase
        .from("music_projects")
        .select("id, title, mode, prompt, lyrics, genre, mood, vocal, duration_seconds, status, audio_path, created_at")
        .eq("user_id", ownerId)
        .order("created_at", { ascending: false })
        .abortSignal(requestSignal),
      supabase
        .from("music_albums")
        .select("id, title, description, created_at")
        .eq("user_id", ownerId)
        .order("created_at", { ascending: false })
        .abortSignal(requestSignal),
      supabase
        .from("music_album_tracks")
        .select("album_id, project_id, track_number")
        .eq("user_id", ownerId)
        .order("track_number", { ascending: true })
        .abortSignal(requestSignal),
    ]);

    const firstError = projectResult.error ?? albumResult.error ?? trackResult.error;
    if (firstError) {
      if (isMissingLibrary(firstError)) throw new Error(LIBRARY_MIGRATION);
      throw firstError;
    }

    const savedProjects = (projectResult.data ?? []) as Omit<MusicProject, "audio_url">[];
    const projectsWithAudio = savedProjects.filter((project) => project.audio_path);
    const audioUrlByPath = new Map<string, string>();
    if (projectsWithAudio.length) {
      const { data: signedAudio, error: signedAudioError } = await supabase.storage
        .from("music-audio")
        .createSignedUrls(projectsWithAudio.map((project) => project.audio_path as string), 3600);
      if (signedAudioError) throw signedAudioError;
      for (const item of signedAudio ?? []) {
        if (item.path && item.signedUrl) audioUrlByPath.set(item.path, item.signedUrl);
      }
    }

    setProjects(savedProjects.map((project) => ({
      ...project,
      audio_url: project.audio_path ? audioUrlByPath.get(project.audio_path) ?? null : null,
    })));
    setAlbums((albumResult.data ?? []) as MusicAlbum[]);
    setAlbumTracks((trackResult.data ?? []) as AlbumTrack[]);
  }, []);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const supabase = getSupabaseClient();
        const { data: { user }, error } = await waitForAuth(supabase.auth.getUser());
        if (error) {
          if (error.name === "AuthSessionMissingError") {
            if (active) {
              setUserId(null);
              setProjects([]);
              setAlbums([]);
              setAlbumTracks([]);
            }
            return;
          }
          throw error;
        }
        if (!user) {
          if (active) {
            setUserId(null);
            setProjects([]);
            setAlbums([]);
            setAlbumTracks([]);
          }
          return;
        }

        if (active) setUserId(user.id);
        await loadLibrary(user.id);
      } catch (error: unknown) {
        console.error("Unable to load the Soundforge music library.", error);
        if (active) setLoadError(error instanceof Error ? error.message : "Could not load your music library.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void initialize();
    return () => {
      active = false;
    };
  }, [loadLibrary]);

  async function createAlbum(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || isSavingAlbum) return;

    const title = albumTitle.trim();
    if (!title) return;

    setIsSavingAlbum(true);
    setFeedback("");
    try {
      const { data, error } = await getSupabaseClient()
        .from("music_albums")
        .insert({ user_id: userId, title, description: albumDescription.trim() })
        .select("id, title, description, created_at")
        .single();
      if (error) {
        if (isMissingLibrary(error)) throw new Error(LIBRARY_MIGRATION);
        throw error;
      }

      setAlbums((current) => [data as MusicAlbum, ...current]);
      setAlbumTitle("");
      setAlbumDescription("");
      setFeedback("Album created. Save song ideas from the studio, then add them to this album.");
    } catch (error: unknown) {
      console.error("Unable to create a music album.", error);
      setFeedback(error instanceof Error ? error.message : "Could not create the album. Please try again.");
    } finally {
      setIsSavingAlbum(false);
    }
  }

  async function importAudio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || isUploadingAudio) return;

    const title = uploadTitle.trim();
    if (!title) {
      setFeedback("Add a title for this song.");
      return;
    }
    if (!audioFile) {
      setFeedback("Choose an MP3 file to import.");
      return;
    }
    if (!audioFile.name.toLowerCase().endsWith(".mp3") || (audioFile.type && audioFile.type !== "audio/mpeg")) {
      setFeedback("Choose an MP3 audio file.");
      return;
    }
    if (audioFile.size > MAX_AUDIO_FILE_BYTES) {
      setFeedback("This MP3 is larger than 10 MB. Choose a smaller file.");
      return;
    }

    setIsUploadingAudio(true);
    setFeedback("");
    let audioPath: string | null = null;
    let savedToLibrary = false;

    try {
      const durationSeconds = await readAudioDuration(audioFile);
      const projectId = crypto.randomUUID();
      audioPath = `${userId}/${projectId}.mp3`;
      const supabase = getSupabaseClient();
      const { error: uploadError } = await supabase.storage
        .from("music-audio")
        .upload(audioPath, audioFile, { contentType: "audio/mpeg", upsert: false });

      if (uploadError) {
        if (uploadError.message.toLowerCase().includes("bucket")) {
          throw new Error(AUDIO_STORAGE_MIGRATION);
        }
        throw uploadError;
      }

      const { error: projectError } = await supabase.from("music_projects").insert({
        id: projectId,
        user_id: userId,
        title,
        mode: "text",
        prompt: "",
        lyrics: "",
        genre: "Imported",
        mood: "",
        vocal: "Uploaded audio",
        duration_seconds: durationSeconds,
        status: "generated",
        audio_path: audioPath,
      });

      if (projectError) {
        const { error: cleanupError } = await supabase.storage.from("music-audio").remove([audioPath]);
        if (cleanupError) {
          console.error("Imported audio could not be removed after the library save failed.", cleanupError);
        }
        audioPath = null;
        if (isMissingLibrary(projectError)) throw new Error(LIBRARY_MIGRATION);
        throw projectError;
      }

      savedToLibrary = true;
      uploadFormRef.current?.reset();
      setUploadTitle("");
      setAudioFile(null);

      try {
        await loadLibrary(userId);
        setFeedback("MP3 imported and saved to your private library.");
      } catch (error: unknown) {
        console.error("The imported song was saved, but the library could not refresh.", error);
        setFeedback("The MP3 was saved, but the library could not refresh. Reload this page to see it.");
      }
    } catch (error: unknown) {
      if (audioPath && !savedToLibrary) {
        const { error: cleanupError } = await getSupabaseClient().storage.from("music-audio").remove([audioPath]);
        if (cleanupError) {
          console.error("Imported audio could not be removed after an import failure.", cleanupError);
        }
      }
      console.error("Unable to import an audio file into the music library.", error);
      setFeedback(error instanceof Error ? error.message : "Could not import this song. Please try again.");
    } finally {
      setIsUploadingAudio(false);
    }
  }

  async function deleteAlbum(albumId: string) {
    if (!userId) return;
    const album = albums.find((item) => item.id === albumId);
    if (!album || !window.confirm(`Delete "${album.title}"? Saved song projects will remain in your library.`)) return;
    setFeedback("");
    try {
      const { error } = await getSupabaseClient()
        .from("music_albums")
        .delete()
        .eq("id", albumId)
        .eq("user_id", userId);
      if (error) throw error;
      setAlbums((current) => current.filter((album) => album.id !== albumId));
      setAlbumTracks((current) => current.filter((track) => track.album_id !== albumId));
      setFeedback("Album deleted. Its saved song projects remain in your library.");
    } catch (error: unknown) {
      console.error("Unable to delete a music album.", error);
      setFeedback(error instanceof Error ? error.message : "Could not delete the album.");
    }
  }

  async function assignProject(projectId: string, albumId: string) {
    if (!userId) return;
    setBusyProjectId(projectId);
    setFeedback("");
    const supabase = getSupabaseClient();

    try {
      const currentAlbumTrack = albumTracks.find((track) => track.project_id === projectId);
      if (currentAlbumTrack?.album_id === albumId) return;

      if (albumId) {
        const existingTrackNumbers = albumTracks
          .filter((track) => track.album_id === albumId)
          .map((track) => track.track_number);
        const nextTrackNumber = Math.max(0, ...existingTrackNumbers) + 1;
        const { error } = await supabase.from("music_album_tracks").insert({
          album_id: albumId,
          project_id: projectId,
          user_id: userId,
          track_number: nextTrackNumber,
        });
        if (error) throw error;
      }

      if (currentAlbumTrack) {
        const { error } = await supabase
          .from("music_album_tracks")
          .delete()
          .eq("album_id", currentAlbumTrack.album_id)
          .eq("project_id", projectId)
          .eq("user_id", userId);
        if (error) throw error;
      }

      await loadLibrary(userId);
      setFeedback(albumId ? "Song added to the album." : "Song removed from the album.");
    } catch (error: unknown) {
      console.error("Unable to update the album track list.", error);
      setFeedback(error instanceof Error ? error.message : "Could not update the album. Please try again.");
    } finally {
      setBusyProjectId(null);
    }
  }

  async function deleteProject(projectId: string) {
    if (!userId) return;
    const project = projects.find((item) => item.id === projectId);
    if (!project || !window.confirm(`Delete "${project.title}" from your music library?`)) return;
    setFeedback("");
    try {
      const { error } = await getSupabaseClient()
        .from("music_projects")
        .delete()
        .eq("id", projectId)
        .eq("user_id", userId);
      if (error) throw error;

      let audioCleanupFailed = false;
      if (project.audio_path) {
        const { error: audioDeleteError } = await getSupabaseClient()
          .storage
          .from("music-audio")
          .remove([project.audio_path]);
        if (audioDeleteError) {
          audioCleanupFailed = true;
          console.error("The deleted song's audio could not be removed from storage.", audioDeleteError);
        }
      }

      setProjects((current) => current.filter((project) => project.id !== projectId));
      setAlbumTracks((current) => current.filter((track) => track.project_id !== projectId));
      setFeedback(audioCleanupFailed
        ? "Song project deleted, but its audio file could not be removed from storage."
        : "Song project deleted.");
    } catch (error: unknown) {
      console.error("Unable to delete a song project.", error);
      setFeedback(error instanceof Error ? error.message : "Could not delete this song project.");
    }
  }

  if (isLoading) {
    return <main className="section-wrap library-section"><p className="profile-feedback" role="status">Loading your music library…</p></main>;
  }

  if (!userId) {
    return (
      <main>
        <section className="section-wrap route-intro" aria-labelledby="library-title">
          <p className="eyebrow"><span className="eyebrow-dot" /> YOUR MUSIC WORKSPACE</p>
          <h1 id="library-title">Your songs, <span>in one place.</span></h1>
          <p>Sign in to save song ideas, lyrics, and albums to your private library.</p>
        </section>
        <section className="section-wrap auth-section">
          <div className="auth-card">
            {loadError && <p className="profile-feedback is-error" role="status">{loadError}</p>}
            <Link className="generate-button auth-link-button" href="/auth">Sign in to your library <span aria-hidden="true">↗</span></Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="section-wrap route-intro library-intro" aria-labelledby="library-title">
        <p className="eyebrow"><span className="eyebrow-dot" /> YOUR MUSIC WORKSPACE</p>
        <h1 id="library-title">Your songs, <span>in one place.</span></h1>
        <p>Import downloaded songs or generate in the studio, then keep your ideas, audio, and albums together in your private library.</p>
      </section>
      <section className="section-wrap library-section" aria-label="Music library">
        <div className="library-toolbar">
          <div>
            <p className="eyebrow">YOUR COLLECTION</p>
            <h2>{projects.length} {projects.length === 1 ? "song project" : "song projects"} <span>·</span> {albums.length} {albums.length === 1 ? "album" : "albums"}</h2>
          </div>
          <Link className="secondary-button library-create-link" href="/create">Write a song idea ↗</Link>
        </div>

        {loadError && <p className="profile-feedback is-error" role="status">{loadError}</p>}
        {feedback && <p className="profile-feedback" role="status">{feedback}</p>}

        <div className="library-layout">
          <section className="library-albums" aria-labelledby="albums-title">
            <div className="library-section-heading">
              <div><p className="eyebrow">RELEASE PLANNING</p><h2 id="albums-title">Albums</h2></div>
            </div>
            <form className="library-create-card" onSubmit={createAlbum}>
              <label className="profile-field" htmlFor="album-title">
                <span>Album title</span>
                <input id="album-title" value={albumTitle} onChange={(event) => setAlbumTitle(event.target.value)} maxLength={120} placeholder="A collection of songs" required />
              </label>
              <label className="profile-field" htmlFor="album-description">
                <span>Short description <small>OPTIONAL</small></span>
                <textarea id="album-description" rows={3} value={albumDescription} onChange={(event) => setAlbumDescription(event.target.value)} maxLength={1000} placeholder="What ties this collection together?" />
              </label>
              <button className="generate-button" type="submit" disabled={isSavingAlbum || !albumTitle.trim()}>
                {isSavingAlbum ? "Creating album…" : "Create album"} <span aria-hidden="true">↗</span>
              </button>
            </form>

            {albums.length ? (
              <div className="library-album-list">
                {albums.map((album) => {
                  const trackCount = albumTracks.filter((track) => track.album_id === album.id).length;
                  return (
                    <article className="library-album-card" key={album.id}>
                      <div className="library-album-art" aria-hidden="true"><span>♫</span></div>
                      <div className="library-album-details">
                        <h3>{album.title}</h3>
                        <p>{trackCount} {trackCount === 1 ? "track" : "tracks"} · Created {formatDate(album.created_at)}</p>
                        {album.description && <p className="library-album-description">{album.description}</p>}
                      </div>
                      <button className="text-button" type="button" onClick={() => void deleteAlbum(album.id)} aria-label={`Delete ${album.title}`}>Delete</button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="library-empty">Your albums will appear here. Create one, then add song projects to it.</p>
            )}
          </section>

          <section className="library-projects" aria-labelledby="projects-title">
            <div className="library-section-heading">
              <div><p className="eyebrow">YOUR MUSIC</p><h2 id="projects-title">Song projects</h2></div>
              <span className="library-count">{projects.length}</span>
            </div>
            <form ref={uploadFormRef} className="library-create-card" onSubmit={(event) => void importAudio(event)}>
              <label className="profile-field" htmlFor="import-song-title">
                <span>Song title</span>
                <input
                  id="import-song-title"
                  value={uploadTitle}
                  onChange={(event) => setUploadTitle(event.target.value)}
                  maxLength={120}
                  placeholder="Name this song"
                  required
                  disabled={isUploadingAudio}
                />
              </label>
              <label className="profile-field" htmlFor="import-song-file">
                <span>MP3 file</span>
                <input
                  id="import-song-file"
                  type="file"
                  accept=".mp3,audio/mpeg"
                  required
                  disabled={isUploadingAudio}
                  onChange={(event) => {
                    const selectedFile = event.target.files?.[0] ?? null;
                    setAudioFile(selectedFile);
                    if (selectedFile && !uploadTitle.trim()) {
                      setUploadTitle(selectedFile.name.replace(/\.mp3$/i, "").slice(0, 120));
                    }
                  }}
                />
              </label>
              <p className="library-import-note">Create and download a song from ElevenLabs, then import it here. MP3 only, up to 10 MB. Free-plan limits and usage terms are set by ElevenLabs.</p>
              <button className="generate-button" type="submit" disabled={isUploadingAudio || !audioFile || !uploadTitle.trim()}>
                {isUploadingAudio ? "Importing song…" : "Import song to library"} <span aria-hidden="true">↗</span>
              </button>
            </form>
            {projects.length ? (
              <div className="library-project-list">
                {projects.map((project) => {
                  const currentAlbum = albumTracks.find((track) => track.project_id === project.id);
                  return (
                    <article className="library-project-card" key={project.id}>
                      <div className="library-project-topline">
                        <span className="library-project-mode">{project.mode.replaceAll("_", " ")}</span>
                        <span>{formatDate(project.created_at)}</span>
                      </div>
                      <h3>{project.title}</h3>
                      <p className="library-project-meta">{[project.genre, project.mood, `${project.duration_seconds}s`].filter(Boolean).join(" · ")}</p>
                      {project.prompt && <p className="library-project-prompt">{project.prompt}</p>}
                      {project.lyrics && <details className="library-lyrics"><summary>View lyrics</summary><pre>{project.lyrics}</pre></details>}
                      {project.audio_url && <audio className="library-audio-player" controls preload="none" src={project.audio_url}>Your browser does not support audio playback.</audio>}
                      <div className="library-project-actions">
                        <label className="library-album-select">
                          <span>Add to album</span>
                          <select
                            value={currentAlbum?.album_id ?? ""}
                            onChange={(event) => void assignProject(project.id, event.target.value)}
                            disabled={busyProjectId === project.id || albums.length === 0}
                          >
                            <option value="">No album</option>
                            {albums.map((album) => <option value={album.id} key={album.id}>{album.title}</option>)}
                          </select>
                        </label>
                        <button className="text-button" type="button" onClick={() => void deleteProject(project.id)}>Delete</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="library-empty">
                <p>No saved song projects yet.</p>
                <span>Start from a prompt or your own lyrics. You can save the idea from the studio.</span>
                <Link className="text-link" href="/create">Open the studio ↗</Link>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
