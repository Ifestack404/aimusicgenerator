"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { genres } from "../lib/music-options";
import { getSupabaseClient } from "../lib/supabase/client";

const AVATAR_BUCKET = "artist-avatars";
const MAX_AVATAR_BYTES = 1024 * 1024;
const PROFILE_MIGRATION = "Apply the artist profile migration in supabase/migrations, then reload this page.";

type ArtistProfileData = {
  artistName: string;
  handle: string;
  bio: string;
  location: string;
  genres: string[];
  website: string;
  socialHandle: string;
  avatarPath: string | null;
  avatarUrl: string | null;
};

type ProfileRow = Omit<ArtistProfileData, "artistName" | "socialHandle" | "avatarPath" | "avatarUrl"> & {
  id: string;
  artist_name: string;
  social_handle: string;
  avatar_path: string | null;
};

const emptyProfile: ArtistProfileData = {
  artistName: "",
  handle: "",
  bio: "",
  location: "",
  genres: [],
  website: "",
  socialHandle: "",
  avatarPath: null,
  avatarUrl: null,
};

function getInitials(name: string) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("");
  return initials.toUpperCase() || "♪";
}

function mapProfile(row: ProfileRow, avatarUrl: string | null): ArtistProfileData {
  return {
    artistName: row.artist_name,
    handle: row.handle ?? "",
    bio: row.bio ?? "",
    location: row.location ?? "",
    genres: Array.isArray(row.genres) ? row.genres : [],
    website: row.website ?? "",
    socialHandle: row.social_handle ?? "",
    avatarPath: row.avatar_path,
    avatarUrl,
  };
}

export default function ArtistProfile() {
  const [profile, setProfile] = useState<ArtistProfileData>(emptyProfile);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const savedAvatarPath = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      try {
        const supabase = getSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) {
          if (active) {
            setUserId(null);
            setIsLoaded(true);
          }
          return;
        }

        const { data, error } = await supabase
          .from("artist_profiles")
          .select("id, artist_name, handle, bio, location, genres, website, social_handle, avatar_path")
          .eq("id", user.id)
          .maybeSingle();
        if (error) {
          if (error.code === "42P01" || error.code === "PGRST205") {
            throw new Error(PROFILE_MIGRATION);
          }
          throw error;
        }

        let avatarUrl: string | null = null;
        if (data?.avatar_path) {
          const { data: signedAvatar, error: avatarUrlError } = await supabase.storage
            .from(AVATAR_BUCKET)
            .createSignedUrl(data.avatar_path, 3600);
          if (avatarUrlError) throw avatarUrlError;
          avatarUrl = signedAvatar.signedUrl;
        }

        if (active) {
          setUserId(user.id);
          if (data) {
            const row = data as ProfileRow;
            setProfile(mapProfile(row, avatarUrl));
            savedAvatarPath.current = row.avatar_path;
          }
        }
      } catch (error: unknown) {
        console.error("Unable to load the artist profile from Supabase.", error);
        if (active) setLoadError(error instanceof Error ? error.message : "We couldn’t load your profile. Please try again.");
      } finally {
        if (active) setIsLoaded(true);
      }
    }

    void loadProfile();
    return () => {
      active = false;
    };
  }, []);

  function updateField<K extends keyof ArtistProfileData>(field: K, value: ArtistProfileData[K]) {
    setProfile((current) => ({ ...current, [field]: value }));
    setFeedback(null);
  }

  function toggleGenre(genre: string) {
    setProfile((current) => ({
      ...current,
      genres: current.genres.includes(genre)
        ? current.genres.filter((item) => item !== genre)
        : [...current.genres, genre],
    }));
    setFeedback(null);
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFeedback({ type: "error", message: "Choose a JPEG, PNG, or WebP image." });
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setFeedback({ type: "error", message: "Choose an image smaller than 1 MB." });
      return;
    }
    if (!userId) {
      setFeedback({ type: "error", message: "Sign in before uploading an avatar." });
      return;
    }

    try {
      const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const path = `${userId}/${crypto.randomUUID()}.${extension}`;
      const supabase = getSupabaseClient();
      const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      const { data: signedAvatar, error: signedUrlError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .createSignedUrl(path, 3600);
      if (signedUrlError) throw signedUrlError;
      updateField("avatarPath", path);
      updateField("avatarUrl", signedAvatar.signedUrl);
      setAvatarError("");
    } catch (error: unknown) {
      console.error("Unable to upload the artist avatar.", error);
      setFeedback({
        type: "error",
        message: "Avatar upload failed. Verify the Supabase storage migration and try again.",
      });
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    if (!userId) return;

    const artistName = profile.artistName.trim();
    const handle = profile.handle.trim().replace(/^@/, "").toLowerCase();
    if (artistName.length < 2 || artistName.length > 60) {
      setFeedback({ type: "error", message: "Artist name must be between 2 and 60 characters." });
      document.getElementById("artist-name")?.focus();
      return;
    }
    if (!/^[a-zA-Z0-9._]{2,30}$/.test(handle)) {
      setFeedback({ type: "error", message: "Handle must be 2–30 characters using letters, numbers, periods, or underscores." });
      document.getElementById("artist-handle")?.focus();
      return;
    }
    const bio = profile.bio.trim();
    if (bio.length > 280) {
      setFeedback({ type: "error", message: "Bio must be 280 characters or fewer." });
      document.getElementById("artist-bio")?.focus();
      return;
    }
    const website = profile.website.trim();
    if (website) {
      try {
        const parsedWebsite = new URL(website);
        if (!["http:", "https:"].includes(parsedWebsite.protocol)) throw new Error("Unsupported protocol");
      } catch {
        setFeedback({ type: "error", message: "Enter a complete website address, such as https://example.com." });
        document.getElementById("artist-website")?.focus();
        return;
      }
    }

    setIsSaving(true);
    const nextProfile = {
      id: userId,
      artist_name: artistName,
      handle,
      bio,
      location: profile.location.trim(),
      genres: profile.genres,
      website,
      social_handle: profile.socialHandle.trim().replace(/^@/, ""),
      avatar_path: profile.avatarPath,
    };

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from("artist_profiles").upsert(nextProfile, { onConflict: "id" });
      if (error?.code === "23505") {
        setFeedback({ type: "error", message: "That artist handle is already in use. Choose another." });
        document.getElementById("artist-handle")?.focus();
        return;
      }
      if (error) {
        if (error.code === "42P01" || error.code === "PGRST205") throw new Error(PROFILE_MIGRATION);
        throw error;
      }

      const previousAvatarPath = savedAvatarPath.current;
      if (previousAvatarPath && previousAvatarPath !== profile.avatarPath) {
        const { error: removeError } = await supabase.storage.from(AVATAR_BUCKET).remove([previousAvatarPath]);
        if (removeError) {
          console.error("Profile saved, but the previous avatar could not be removed.", removeError);
          setAvatarError("Profile saved. The previous avatar could not be removed from storage.");
        } else {
          setAvatarError("");
        }
      }
      savedAvatarPath.current = profile.avatarPath;
      setProfile({ ...profile, artistName, handle, bio, website });
      setFeedback({ type: "success", message: "Your artist profile is saved to your Soundforge account." });
    } catch (error: unknown) {
      console.error("Unable to save the artist profile to Supabase.", error);
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "We couldn’t save your profile. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (!isLoaded) {
    return <main className="section-wrap profile-section"><p className="profile-feedback" role="status">Loading your artist profile…</p></main>;
  }

  if (!userId) {
    return (
      <main>
        <section className="section-wrap route-intro profile-route-intro" aria-labelledby="profile-page-title">
          <p className="eyebrow"><span className="eyebrow-dot" /> YOUR ARTIST IDENTITY</p>
          <h1 id="profile-page-title">Make yourself <span>known.</span></h1>
          <p>Sign in to create and manage your artist profile.</p>
        </section>
        <section className="section-wrap auth-section">
          <div className="auth-card">
            {loadError && <p className="profile-feedback is-error" role="status">{loadError}</p>}
            <p className="auth-privacy-note">Artist profiles are private to the signed-in account. Sign in to continue.</p>
            <Link className="generate-button auth-link-button" href="/auth">Sign in or create an account <span aria-hidden="true">↗</span></Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="section-wrap route-intro profile-route-intro" aria-labelledby="profile-page-title">
        <p className="eyebrow"><span className="eyebrow-dot" /> YOUR ARTIST IDENTITY</p>
        <h1 id="profile-page-title">Make yourself <span>known.</span></h1>
        <p>Give your music a name and a story. Your profile is securely linked to your account.</p>
      </section>
      <section className="section-wrap profile-section" aria-label="Artist profile settings">
        <div className="profile-local-notice">
          <span className="profile-notice-mark" aria-hidden="true">i</span>
          <p><strong>Cloud profile</strong><span>Your details are saved to your signed-in account. Profile records are protected by row-level security.</span></p>
        </div>
        {loadError && <p className="profile-feedback is-error" role="status">{loadError}</p>}
        <div className="profile-layout">
          <form className="profile-form" onSubmit={handleSave} noValidate>
            <div className="profile-form-heading">
              <div><p className="eyebrow">THE DETAILS</p><h2>Artist information</h2></div>
              <span className="profile-required-note">* REQUIRED</span>
            </div>

            <div className="avatar-editor">
              <div className="artist-avatar" aria-label="Artist avatar preview">
                {profile.avatarUrl ? <img src={profile.avatarUrl} alt="Artist avatar preview" /> : <span>{getInitials(profile.artistName)}</span>}
              </div>
              <div className="avatar-actions">
                <strong>Your artist avatar</strong>
                <span>JPEG, PNG, or WebP · up to 1 MB · stored privately</span>
                <div>
                  <button className="secondary-button" type="button" onClick={() => fileInputRef.current?.click()} disabled={isSaving}>Upload image</button>
                  {profile.avatarPath && (
                    <button className="text-button" type="button" onClick={() => { updateField("avatarPath", null); updateField("avatarUrl", null); }} disabled={isSaving}>Remove</button>
                  )}
                  <input ref={fileInputRef} className="visually-hidden" id="artist-avatar-upload" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload artist avatar" onChange={handleAvatarChange} />
                </div>
              </div>
            </div>

            <div className="profile-fields">
              <label className="profile-field" htmlFor="artist-name">
                <span>Artist name <b>*</b></span>
                <input id="artist-name" name="artistName" type="text" autoComplete="nickname" maxLength={60} value={profile.artistName} onChange={(event) => updateField("artistName", event.target.value)} placeholder="What should listeners call you?" required />
              </label>
              <label className="profile-field" htmlFor="artist-handle">
                <span>Artist handle <b>*</b></span>
                <div className="handle-input"><span aria-hidden="true">@</span><input id="artist-handle" name="handle" type="text" autoComplete="username" maxLength={31} value={profile.handle} onChange={(event) => updateField("handle", event.target.value.replace(/^@/, ""))} placeholder="yourartistname" aria-describedby="handle-help" required /></div>
                <small id="handle-help">2–30 letters, numbers, periods, or underscores.</small>
              </label>
              <label className="profile-field profile-field-full" htmlFor="artist-bio">
                <span>Bio</span>
                <textarea id="artist-bio" name="bio" rows={4} maxLength={280} value={profile.bio} onChange={(event) => updateField("bio", event.target.value)} placeholder="Tell people what inspires you and what they might hear in your music." aria-describedby="bio-count" />
                <small id="bio-count">{profile.bio.length} / 280 characters</small>
              </label>
              <label className="profile-field" htmlFor="artist-location">
                <span>Based in</span>
                <input id="artist-location" name="location" type="text" autoComplete="address-level2" maxLength={60} value={profile.location} onChange={(event) => updateField("location", event.target.value)} placeholder="City or region" />
              </label>
              <label className="profile-field" htmlFor="artist-website">
                <span>Website</span>
                <input id="artist-website" name="website" type="url" autoComplete="url" maxLength={200} value={profile.website} onChange={(event) => updateField("website", event.target.value)} placeholder="https://yourwebsite.com" />
              </label>
              <label className="profile-field" htmlFor="artist-social">
                <span>Social handle</span>
                <div className="handle-input"><span aria-hidden="true">@</span><input id="artist-social" name="socialHandle" type="text" maxLength={60} value={profile.socialHandle} onChange={(event) => updateField("socialHandle", event.target.value.replace(/^@/, ""))} placeholder="yourhandle" /></div>
              </label>
              <fieldset className="profile-field profile-field-full profile-genres">
                <legend>Your sounds</legend>
                <p>Choose the styles that feel closest to your music.</p>
                <div className="profile-genre-options">
                  {genres.map((genre) => <button className={`profile-genre${profile.genres.includes(genre) ? " is-selected" : ""}`} type="button" key={genre} aria-pressed={profile.genres.includes(genre)} onClick={() => toggleGenre(genre)}>{genre}</button>)}
                </div>
              </fieldset>
            </div>

            {avatarError && <p className="profile-feedback is-error" role="status">{avatarError}</p>}
            {feedback && <p className={`profile-feedback is-${feedback.type}`} role="status">{feedback.message}</p>}
            <div className="profile-save-row">
              <span>Changes are private to your account.</span>
              <button className="generate-button" type="submit" disabled={isSaving || Boolean(loadError)}>
                {isSaving ? "Saving profile…" : "Save artist profile"} <span aria-hidden="true">↗</span>
              </button>
            </div>
          </form>

          <aside className="profile-preview" aria-labelledby="profile-preview-title">
            <div className="profile-preview-topline"><span>PROFILE PREVIEW</span><span>SF / ARTIST</span></div>
            <div className="profile-preview-body">
              <div className="artist-avatar profile-preview-avatar">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : <span>{getInitials(profile.artistName)}</span>}</div>
              <p className="eyebrow">INDEPENDENT ARTIST</p>
              <h2 id="profile-preview-title">{profile.artistName.trim() || "Your artist name"}</h2>
              <p className="profile-preview-handle">@{profile.handle.trim().replace(/^@/, "") || "yourhandle"}</p>
              <p className="profile-preview-bio">{profile.bio.trim() || "Your story, your inspiration, and the feeling behind your sound will live here."}</p>
              {profile.location.trim() && <p className="profile-preview-detail">⌖ &nbsp;{profile.location.trim()}</p>}
              {profile.genres.length > 0 && <div className="profile-preview-genres">{profile.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>}
              <div className="profile-preview-links">{profile.website.trim() && <span>↗ &nbsp;Website</span>}{profile.socialHandle.trim() && <span>@{profile.socialHandle.trim().replace(/^@/, "")}</span>}</div>
            </div>
            <div className="profile-preview-bottom"><span>YOUR NEXT IDEA STARTS HERE</span><span>♪</span></div>
          </aside>
        </div>
      </section>
    </main>
  );
}
