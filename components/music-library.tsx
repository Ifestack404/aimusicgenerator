"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
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

  const loadLibrary = useCallback(async (ownerId: string) => {
    const supabase = getSupabaseClient();
    const requestSignal = AbortSignal.timeout(15000);
    const [projectResult, albumResult, trackResult] = await Promise.all([
      supabase
        .from("music_projects")
        .select("id, title, mode, prompt, lyrics, genre, mood, vocal, duration_seconds, status, created_at")
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

    setProjects((projectResult.data ?? []) as MusicProject[]);
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
      setProjects((current) => current.filter((project) => project.id !== projectId));
      setAlbumTracks((current) => current.filter((track) => track.project_id !== projectId));
      setFeedback("Song project deleted.");
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
        <p>Keep song ideas and lyrics together, then organize projects into albums. Audio generation is not connected yet.</p>
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
              <div><p className="eyebrow">IDEAS IN PROGRESS</p><h2 id="projects-title">Song projects</h2></div>
              <span className="library-count">{projects.length}</span>
            </div>
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
