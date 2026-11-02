"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type SVGProps,
} from "react";
import Link from "next/link";
import { genres } from "../lib/music-options";

const modes = [
  { id: "text", label: "Text to music" },
  { id: "lyrics", label: "Lyrics to music" },
  { id: "instrumental", label: "Instrumental" },
  { id: "custom", label: "Custom mode" },
] as const;

type Mode = (typeof modes)[number]["id"];
type Feedback = { type: "error" | "demo"; message: string };
type Track = {
  title: string;
  artist: string;
  duration: string;
  art: string;
  number: string;
  audioSrc: string | null;
};

const moods = ["Dreamy", "Euphoric", "Reflective", "Confident", "Peaceful", "Dramatic"] as const;
const vocals = ["Auto", "Female", "Male", "No vocals"] as const;
const durations = ["30 sec", "60 sec", "120 sec"] as const;

const promptCopy: Record<Mode, { label: string; placeholder: string }> = {
  text: {
    label: "Describe the music you hear",
    placeholder: "A warm Afrobeats groove for a rooftop at golden hour...",
  },
  lyrics: {
    label: "Add your lyrics or a starting verse",
    placeholder: "Paste a verse, a chorus, or just a few lines to get started...",
  },
  instrumental: {
    label: "Describe your instrumental",
    placeholder: "A cinematic piano theme that slowly opens into strings...",
  },
  custom: {
    label: "Write your creative brief",
    placeholder: "Tell us about the feeling, the instruments, and the story...",
  },
};

const tracks: Track[] = [
  {
    title: "Golden Hour",
    artist: "Studio sketch · Afrobeats",
    duration: "2:34",
    art: "art-sunset",
    number: "01",
    audioSrc: null,
  },
  {
    title: "Soft Focus",
    artist: "Studio sketch · Lo-fi",
    duration: "3:08",
    art: "art-focus",
    number: "02",
    audioSrc: null,
  },
  {
    title: "After the Rain",
    artist: "Studio sketch · Cinematic",
    duration: "2:51",
    art: "art-rain",
    number: "03",
    audioSrc: null,
  },
];

type IconName = "arrow" | "play" | "pause" | "note" | "spark";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common: SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (name === "arrow") {
    return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
  }
  if (name === "play") {
    return <svg {...common}><path d="m9 6 10 6-10 6V6Z" fill="currentColor" stroke="none" /></svg>;
  }
  if (name === "pause") {
    return <svg {...common}><path d="M8 6v12M16 6v12" strokeWidth="2.5" /></svg>;
  }
  if (name === "spark") {
    return <svg {...common}><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></svg>;
  }
  return null;
}

function SoundArtwork() {
  return (
    <div
      className="hero-art"
      aria-label="Abstract layered sound waves flowing through a softly lit studio atmosphere"
      role="img"
    >
      <svg className="soundscape" viewBox="0 0 520 360" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="soundscape-line" x1="20" y1="180" x2="500" y2="180" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--soundscape-muted)" stopOpacity="0" />
            <stop offset=".22" stopColor="var(--soundscape-muted)" stopOpacity=".58" />
            <stop offset=".52" stopColor="var(--soundscape-bright)" />
            <stop offset=".82" stopColor="var(--soundscape-muted)" stopOpacity=".58" />
            <stop offset="1" stopColor="var(--soundscape-muted)" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="soundscape-glow" cx="0" cy="0" r="1" gradientTransform="matrix(0 136 -205 0 279 177)" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--soundscape-bright)" stopOpacity=".23" />
            <stop offset="1" stopColor="var(--soundscape-bright)" stopOpacity="0" />
          </radialGradient>
          <filter id="soundscape-blur" x="80" y="12" width="360" height="336" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="30" />
          </filter>
        </defs>
        <ellipse cx="279" cy="177" rx="205" ry="136" fill="url(#soundscape-glow)" />
        <ellipse cx="279" cy="177" rx="112" ry="78" fill="var(--soundscape-bright)" fillOpacity=".08" filter="url(#soundscape-blur)" />
        <g className="soundscape-trails" stroke="url(#soundscape-line)" strokeLinecap="round">
          <path d="M0 181c50 0 57-42 102-42s55 76 101 76 54-119 104-119 54 144 105 144 56-75 108-75" strokeWidth="1.1" strokeOpacity=".3" />
          <path d="M0 181c49 0 57-29 102-29s56 56 101 56 55-89 104-89 55 108 105 108 57-56 108-56" strokeWidth="1.2" strokeOpacity=".48" />
          <path d="M0 181c49 0 58-16 102-16s56 31 101 31 56-57 104-57 55 72 105 72 57-31 108-31" strokeWidth="1.35" strokeOpacity=".65" />
          <path className="soundscape-main-line" d="M0 181c49 0 58-8 102-8s56 16 101 16 56-31 104-31 55 39 105 39 57-16 108-16" strokeWidth="2.1" />
          <path d="M0 181c49 0 58 16 102 16s56-31 101-31 56 57 104 57 55-72 105-72 57 31 108 31" strokeWidth="1.35" strokeOpacity=".65" />
          <path d="M0 181c49 0 57 29 102 29s56-56 101-56 55 89 104 89 55-108 105-108 57 56 108 56" strokeWidth="1.2" strokeOpacity=".48" />
          <path d="M0 181c50 0 57 42 102 42s55-76 101-76 54 119 104 119 54-144 105-144 56 75 108 75" strokeWidth="1.1" strokeOpacity=".3" />
        </g>
        <path className="soundscape-guide" d="M22 181h476" stroke="var(--soundscape-muted)" strokeOpacity=".18" strokeDasharray="1 9" strokeLinecap="round" />
        <circle className="soundscape-point" cx="307" cy="158" r="3" fill="var(--soundscape-bright)" />
        <circle className="soundscape-point soundscape-point-secondary" cx="407" cy="202" r="2" fill="var(--soundscape-bright)" fillOpacity=".7" />
      </svg>
    </div>
  );
}

function ModeTabs({ activeMode, onChange }: { activeMode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div className="mode-tabs" role="tablist" aria-label="Music creation mode">
      {modes.map((mode) => (
        <button
          key={mode.id}
          type="button"
          className={`mode-tab${activeMode === mode.id ? " is-active" : ""}`}
          role="tab"
          aria-selected={activeMode === mode.id}
          onClick={() => onChange(mode.id)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="field-control" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

export function StudioForm({
  selectedGenre,
  setSelectedGenre,
}: {
  selectedGenre: string;
  setSelectedGenre: (genre: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("text");
  const [mood, setMood] = useState("Dreamy");
  const [vocal, setVocal] = useState("Auto");
  const [duration, setDuration] = useState("60 sec");
  const [prompt, setPrompt] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [instrument, setInstrument] = useState("Let the song decide");
  const [creativity, setCreativity] = useState("Balanced");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copy = promptCopy[mode];

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    if (nextMode === "instrumental") setVocal("No vocals");
    else if (mode === "instrumental" && vocal === "No vocals") setVocal("Auto");
    setFeedback(null);
  }

  function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isGenerating) return;

    if (!prompt.trim()) {
      setFeedback({ type: "error", message: "Add a few words about your idea to continue." });
      document.getElementById("music-prompt")?.focus();
      return;
    }

    setFeedback(null);
    setIsGenerating(true);
    timer.current = setTimeout(() => {
      setIsGenerating(false);
      setFeedback({
        type: "demo",
        message: "Demo flow complete. No audio was generated or saved because the music engine is not connected.",
      });
    }, 1100);
  }

  return (
    <section className="studio-section section-wrap" id="create" aria-labelledby="studio-title">
      <div className="studio-heading">
        <div>
          <p className="eyebrow"><span className="eyebrow-dot" /> YOUR CREATIVE STUDIO</p>
          <h2 id="studio-title">Start with a feeling.</h2>
        </div>
        <div className="demo-badge"><span /> DEMO MODE <span className="demo-separator">/</span> NO MUSIC ENGINE</div>
      </div>

      <form className="studio-panel" onSubmit={handleGenerate} noValidate>
        <ModeTabs activeMode={mode} onChange={changeMode} />
        <div className="prompt-area">
          <label htmlFor="music-prompt">{copy.label}</label>
          <textarea
            id="music-prompt"
            value={prompt}
            maxLength={500}
            onChange={(event) => {
              setPrompt(event.target.value);
              if (feedback?.type === "error") setFeedback(null);
            }}
            placeholder={copy.placeholder}
            rows={3}
            aria-describedby="prompt-meta"
            aria-invalid={feedback?.type === "error" && !prompt.trim()}
          />
          <div className="prompt-meta" id="prompt-meta">
            <span>Specific details help shape your direction.</span>
            <span>{prompt.length} / 500</span>
          </div>
        </div>

        <div className="form-controls">
          <SelectField id="genre" label="GENRE" value={selectedGenre} options={genres} onChange={setSelectedGenre} />
          <SelectField id="mood" label="MOOD" value={mood} options={moods} onChange={setMood} />
          <fieldset className="vocal-control">
            <legend>VOCALS</legend>
            <div className="choice-group">
              {vocals.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`choice-button${vocal === option ? " is-selected" : ""}`}
                  aria-pressed={vocal === option}
                  disabled={mode === "instrumental" && option !== "No vocals"}
                  onClick={() => setVocal(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="duration-row">
          <span className="control-label">LENGTH</span>
          <div className="duration-options" role="group" aria-label="Music duration">
            {durations.map((option) => (
              <button
                type="button"
                key={option}
                className={`duration-button${duration === option ? " is-selected" : ""}`}
                aria-pressed={duration === option}
                onClick={() => setDuration(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <button
            className="advanced-toggle"
            type="button"
            aria-expanded={advancedOpen}
            aria-controls="advanced-settings"
            onClick={() => setAdvancedOpen(!advancedOpen)}
          >
            <span className={`toggle-plus${advancedOpen ? " is-open" : ""}`} aria-hidden="true" />
            {advancedOpen ? "Hide advanced" : "Advanced settings"}
          </button>
        </div>

        {advancedOpen && (
          <div className="advanced-settings" id="advanced-settings">
            <SelectField
              id="instrument"
              label="LEAD INSTRUMENT"
              value={instrument}
              options={["Let the song decide", "Piano", "Guitar", "Synth", "Strings", "Drums"]}
              onChange={setInstrument}
            />
            <SelectField
              id="creativity"
              label="CREATIVE DIRECTION"
              value={creativity}
              options={["Balanced", "Familiar", "Unexpected"]}
              onChange={setCreativity}
            />
          </div>
        )}

        <div className="form-submit-row">
          <p>Made for exploring. Your idea stays yours.</p>
          <button className="generate-button" type="submit" disabled={isGenerating}>
            {isGenerating ? (
              <><span className="loading-spinner" aria-hidden="true" /> Running demo…</>
            ) : (
              <>Preview demo flow <Icon name="arrow" size={17} /></>
            )}
          </button>
        </div>
        <p className={`form-feedback${feedback ? ` is-${feedback.type}` : ""}`} aria-live="polite" role="status">
          {feedback?.message || "This is a demo interface. It does not create, play, or save music."}
        </p>
      </form>
    </section>
  );
}

function GenreSection({
  selectedGenre,
  onSelect,
}: {
  selectedGenre: string;
  onSelect: (genre: string) => void;
}) {
  return (
    <section className="section-wrap genre-section" id="explore" aria-labelledby="genres-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">A FEW PLACES TO BEGIN</p>
          <h2 id="genres-title">Find your starting point.</h2>
        </div>
        <Link
          className="text-link"
          href={`/create?genre=${encodeURIComponent(selectedGenre)}`}
        >
          Explore the studio <Icon name="arrow" size={16} />
        </Link>
      </div>
      <div className="genre-list">
        {genres.map((genre, index) => (
          <button
            className={`genre-chip${selectedGenre === genre ? " is-selected" : ""}`}
            type="button"
            key={genre}
            aria-pressed={selectedGenre === genre}
            onClick={() => {
              onSelect(genre);
            }}
          >
            <span className="genre-index">0{index + 1}</span>
            <span>{genre}</span>
            <span className="genre-arrow" aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function TrackArtwork({ art, number }: { art: string; number: string }) {
  return (
    <div className={`track-art ${art}`} aria-hidden="true">
      <span className="track-art-orb" />
      <span className="track-art-number">{number}</span>
      <span className="track-art-lines"><i /><i /><i /><i /><i /></span>
    </div>
  );
}

function TrackRow({ track }: { track: Track }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackMessage, setPlaybackMessage] = useState("");

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!track.audioSrc || !audio) return;

    setPlaybackMessage("");
    try {
      if (isPlaying) audio.pause();
      else await audio.play();
    } catch (error: unknown) {
      console.error(`Unable to play the preview for "${track.title}".`, error);
      setPlaybackMessage("This audio preview could not be played. Please try again.");
    }
  }

  return (
    <>
      <article className="track-row">
        <TrackArtwork art={track.art} number={track.number} />
        <div className="track-details">
          <h3>{track.title}</h3>
          <p>{track.artist}</p>
        </div>
        <span className="track-duration">{track.duration}</span>
        <button
          className="track-play"
          type="button"
          disabled={!track.audioSrc}
          aria-label={`${isPlaying ? "Pause" : "Play"} ${track.title} preview`}
          title={track.audioSrc ? `${isPlaying ? "Pause" : "Play"} audio preview` : "Audio preview is not available"}
          onClick={togglePlayback}
        >
          <Icon name={isPlaying ? "pause" : "play"} size={16} />
        </button>
        {track.audioSrc && (
          <audio
            ref={audioRef}
            src={track.audioSrc}
            preload="none"
            hidden
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onError={() => {
              setIsPlaying(false);
              setPlaybackMessage("This audio preview could not be loaded.");
            }}
          />
        )}
      </article>
      {playbackMessage && <p className="audio-note is-error" role="status">{playbackMessage}</p>}
    </>
  );
}

export function RecentCreations() {
  return (
    <section className="recent-section section-wrap" aria-labelledby="recent-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">A LITTLE INSPIRATION</p>
          <h2 id="recent-title">Recent creations.</h2>
        </div>
        <span className="preview-label">ILLUSTRATIVE DEMO TRACKS</span>
      </div>
      <div className="track-list">
        {tracks.map((track) => (
          <TrackRow key={track.title} track={track} />
        ))}
      </div>
      <p className="audio-note">Artwork and track details are examples only. Audio samples are not available yet.</p>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { number: "01", title: "Bring the seed.", text: "A lyric, a late-night thought, a mood. Start anywhere." },
    { number: "02", title: "Shape the sound.", text: "Choose a style, a feeling, and the details that make it yours." },
    { number: "03", title: "Make it yours.", text: "Explore a musical direction and keep building on what you find." },
  ];

  return (
    <section className="how-section" aria-labelledby="how-title">
      <div className="section-wrap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FROM THOUGHT TO SOUND</p>
            <h2 id="how-title">Simple by design.</h2>
          </div>
          <p className="section-aside">A good song can start with one small idea.</p>
        </div>
        <div className="steps-grid">
          {steps.map((step) => (
            <article className="step" key={step.number}>
              <span className="step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Pricing() {
  return (
    <section className="section-wrap pricing-section" id="pricing" aria-labelledby="pricing-title">
      <div className="section-heading pricing-heading">
        <div>
          <p className="eyebrow">ROOM TO MAKE MORE</p>
          <h2 id="pricing-title">A plan for your practice.</h2>
        </div>
        <span className="preview-label">PREVIEW ONLY · PLANS NOT ACTIVE</span>
      </div>
      <div className="pricing-grid">
        <article className="price-card">
          <span className="plan-name">THE LISTENER</span>
          <p className="plan-price">$0 <span>/ forever</span></p>
          <p className="plan-description">A place to explore the studio and find your direction.</p>
          <ul>
            <li>Explore creative modes</li>
            <li>Shape a musical prompt</li>
            <li>Try the demo interface</li>
          </ul>
          <Link className="price-link" href="/create">Start with an idea <Icon name="arrow" size={16} /></Link>
        </article>
        <article className="price-card price-card-featured">
          <span className="plan-name">THE MAKER <span className="plan-tag">PLANNED</span></span>
          <p className="plan-price">$12 <span>/ month · preview</span></p>
          <p className="plan-description">For the ideas you want to keep building on.</p>
          <ul>
            <li>More room for new directions</li>
            <li>Expanded creative controls</li>
            <li>Downloadable creations</li>
          </ul>
          <Link className="price-link" href="/create">Explore the studio <Icon name="arrow" size={16} /></Link>
        </article>
      </div>
      <p className="pricing-disclaimer">Preview pricing is illustrative. No plan, checkout, or music-generation service is currently available.</p>
    </section>
  );
}

export default function StudioHome() {
  return (
    <main>
      <section className="hero-section section-wrap" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> YOUR NEXT IDEA STARTS HERE</p>
          <h1 id="hero-title">Make something <span>unforgettable.</span></h1>
          <p className="hero-description">
            Start with a lyric, a feeling, or a melody you can’t quite shake.
            Find the sound that makes it yours.
          </p>
          <Link className="hero-cta" href="/create">Make your first idea <Icon name="arrow" size={17} /></Link>
          <p className="hero-footnote"><span /> A creative studio in demo mode</p>
        </div>
        <SoundArtwork />
      </section>
      <section className="section-wrap home-start-section" aria-labelledby="home-start-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A PLACE TO BEGIN</p>
            <h2 id="home-start-title">Your next idea has a home.</h2>
          </div>
          <Link className="text-link" href="/create">Open the studio <Icon name="arrow" size={16} /></Link>
        </div>
        <div className="home-feature-grid">
          <Link className="home-feature" href="/create">
            <span className="home-feature-number">01 / CREATE</span>
            <h3>Make room for a new sound.</h3>
            <p>Start from a prompt, lyrics, or an instrumental idea.</p>
            <span className="home-feature-arrow" aria-hidden="true">↗</span>
          </Link>
          <Link className="home-feature" href="/explore">
            <span className="home-feature-number">02 / EXPLORE</span>
            <h3>Find a style that feels like you.</h3>
            <p>Browse genres and discover the direction you want to take.</p>
            <span className="home-feature-arrow" aria-hidden="true">↗</span>
          </Link>
          <Link className="home-feature" href="/pricing">
            <span className="home-feature-number">03 / PLANS</span>
            <h3>See what’s on the horizon.</h3>
            <p>Preview the plans we’re shaping for the creative process.</p>
            <span className="home-feature-arrow" aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
      <HowItWorks />
    </main>
  );
}

export function StudioCreate({ initialGenre = "Afrobeats" }: { initialGenre?: string }) {
  const [selectedGenre, setSelectedGenre] = useState(initialGenre);

  return (
    <main>
      <section className="section-wrap route-intro" aria-labelledby="create-title">
        <p className="eyebrow"><span className="eyebrow-dot" /> THE CREATIVE STUDIO</p>
        <h1 id="create-title">Your idea, <span>your sound.</span></h1>
        <p>Choose a starting point, describe the feeling, and shape the details. This studio is a demo; it does not generate or save audio.</p>
      </section>
      <StudioForm selectedGenre={selectedGenre} setSelectedGenre={setSelectedGenre} />
    </main>
  );
}

export function StudioExplore() {
  const [selectedGenre, setSelectedGenre] = useState("Afrobeats");

  return (
    <main>
      <section className="section-wrap route-intro" aria-labelledby="explore-title">
        <p className="eyebrow">A LITTLE INSPIRATION</p>
        <h1 id="explore-title">Find your <span>starting point.</span></h1>
        <p>Browse a few musical directions and illustrative studio sketches. Select a style to explore it further in the studio.</p>
      </section>
      <GenreSection selectedGenre={selectedGenre} onSelect={setSelectedGenre} />
      <RecentCreations />
    </main>
  );
}

export function StudioPricing() {
  return (
    <main>
      <section className="section-wrap route-intro" aria-labelledby="plans-title">
        <p className="eyebrow">ROOM TO MAKE MORE</p>
        <h1 id="plans-title">A plan for your <span>practice.</span></h1>
        <p>Get a preview of the ways Soundforge could support your creative process. Plans are illustrative and are not available for purchase.</p>
      </section>
      <Pricing />
      <section className="section-wrap pricing-next-step">
        <div>
          <p className="eyebrow">KEEP FOLLOWING THE IDEA</p>
          <h2>There’s always another sound to find.</h2>
        </div>
        <Link className="hero-cta" href="/create">Visit the studio <Icon name="arrow" size={17} /></Link>
      </section>
    </main>
  );
}
