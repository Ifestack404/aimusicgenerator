"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { getSupabaseClient } from "../lib/supabase/client";

const navigation = [
  { href: "/create", label: "Create music" },
  { href: "/explore", label: "Explore" },
  { href: "/pricing", label: "Pricing" },
];

function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Soundforge AI home">
      <span className="brand-icon" aria-hidden="true">♪</span>
      <span>sound<span className="brand-accent">forge</span></span>
      <span className="brand-ai">AI</span>
    </Link>
  );
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [signOutError, setSignOutError] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const pathname = usePathname();

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem("soundforge-theme");
      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
        document.documentElement.dataset.theme = savedTheme;
      }
    } catch (error: unknown) {
      console.error("Unable to load the saved Soundforge appearance.", error);
    }
  }, []);

  useEffect(() => {
    let active = true;
    try {
      const supabase = getSupabaseClient();
      void supabase.auth.getUser().then(({ data, error }) => {
        if (error) {
          if (error.name === "AuthSessionMissingError") {
            if (active) setAccountEmail(null);
            return;
          }
          console.error("Unable to read the current Soundforge account.", error);
          return;
        }
        if (active) setAccountEmail(data.user?.email ?? null);
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (active) setAccountEmail(session?.user.email ?? null);
      });
      return () => {
        active = false;
        subscription.unsubscribe();
      };
    } catch (error: unknown) {
      console.error("Supabase account controls are unavailable.", error);
      return () => {
        active = false;
      };
    }
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    try {
      window.localStorage.setItem("soundforge-theme", nextTheme);
    } catch (error: unknown) {
      console.error("Unable to save the Soundforge appearance.", error);
    }
  }

  async function signOut() {
    setSignOutError("");
    try {
      const { error } = await getSupabaseClient().auth.signOut();
      if (error) throw error;
      setAccountEmail(null);
      closeMenu();
    } catch (error: unknown) {
      console.error("Unable to sign out of Soundforge.", error);
      setSignOutError("Sign out failed. Please try again.");
    }
  }

  return (
    <header className="site-header" id="top">
      <div className="header-inner">
        <Brand />
        <button
          className="menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span />
          <span />
        </button>
        <nav
          className={`primary-nav${menuOpen ? " is-open" : ""}`}
          id="primary-navigation"
          aria-label="Main navigation"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              onClick={closeMenu}
            >
              {item.label}
            </Link>
          ))}
          <div className="nav-account">
            {accountEmail ? (
              <>
                <Link
                  className="nav-studio-link"
                  href="/profile"
                  aria-current={pathname === "/profile" ? "page" : undefined}
                  onClick={closeMenu}
                >
                  Artist profile
                </Link>
                <button className="nav-studio-link nav-sign-out" type="button" onClick={signOut}>Sign out</button>
              </>
            ) : (
              <Link className="nav-studio-link" href="/auth" aria-current={pathname === "/auth" ? "page" : undefined} onClick={closeMenu}>
                Sign in
              </Link>
            )}
            <button
              className="theme-toggle"
              type="button"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              onClick={toggleTheme}
            >
              {theme === "dark" ? (
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.1A8.5 8.5 0 0 1 8.9 3.8 8.5 8.5 0 1 0 20.2 15.1Z" /></svg>
              )}
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
          </div>
        </nav>
        {signOutError && <p className="nav-auth-error" role="status">{signOutError}</p>}
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <Brand />
          <p className="footer-tagline">Your next idea starts here.</p>
        </div>
        <nav className="footer-links" aria-label="Footer navigation">
          <Link href="/create">Create music</Link>
          <Link href="/explore">Explore</Link>
          <Link href="/pricing">Pricing preview</Link>
          <Link href="/settings/supabase">Supabase setup</Link>
        </nav>
        <p className="footer-copyright">© 2026 Soundforge AI <span>Made for the love of making.</span></p>
      </div>
    </footer>
  );
}

export default function SiteShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
