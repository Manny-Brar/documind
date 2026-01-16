import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@documind/ui";
import { useState } from "react";

export const Route = createFileRoute("/preview/warm")({
  component: WarmThemePreview,
});

// Dark Mode - Washed Charcoal with Vibrant Accents
const darkColors = {
  bg: "#363639", // Washed charcoal
  bgCard: "#434347", // Lighter charcoal
  border: "#2a2a2d", // Dark border
  text: "#ffffff",
  textMuted: "#b8b8bc",
  textLight: "#ffffff",
  primary: "#ff6c51", // Coral/Orange-red
  accent: "#0074a4", // Deep blue
  accent2: "#9cd03b", // Lime green
  shadow: "#2a2a2d", // Dark shadow
};

// Light Mode - Washed Grey Look
const lightColors = {
  bg: "#e5e5e8", // Light washed grey
  bgCard: "#f2f2f4", // Lighter grey card
  border: "#c8c8cc", // Medium grey border
  text: "#1a1a1c", // Near black text
  textMuted: "#5a5a60", // Muted dark grey
  textLight: "#ffffff",
  primary: "#ff6c51", // Coral/Orange-red
  accent: "#0074a4", // Deep blue
  accent2: "#9cd03b", // Lime green
  shadow: "#b0b0b5", // Light grey shadow
};

function WarmThemePreview() {
  const [isDark, setIsDark] = useState(true);
  const colors = isDark ? darkColors : lightColors;
  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <header className="border-b-[3px]" style={{ borderColor: colors.border, backgroundColor: colors.bgCard }}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-2 shadow-[4px_4px_0px_0px]"
              style={{ borderColor: colors.primary, backgroundColor: colors.accent, boxShadow: `4px 4px 0px 0px ${colors.shadow}` }}>
              <span className="font-heading text-lg font-bold" style={{ color: colors.textLight }}>D</span>
            </div>
            <span className="font-heading text-xl font-bold uppercase tracking-tight" style={{ color: colors.text }}>
              DocuMind
            </span>
          </div>
          <div className="flex gap-3 items-center">
            {/* Theme Toggle Button */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="w-10 h-10 flex items-center justify-center border-2 shadow-[3px_3px_0px_0px] hover:shadow-[4px_4px_0px_0px] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
              style={{
                backgroundColor: isDark ? colors.bgCard : colors.bg,
                borderColor: colors.border,
                boxShadow: `3px 3px 0px 0px ${colors.shadow}`
              }}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? (
                <svg className="w-5 h-5" style={{ color: colors.accent2 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" style={{ color: colors.accent }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <Link to="/login">
              <Button variant="ghost" className="border-2 hover:bg-transparent" style={{ borderColor: colors.textMuted, color: colors.text }}>
                Sign In
              </Button>
            </Link>
            <Button className="border-2 shadow-[4px_4px_0px_0px]"
              style={{ backgroundColor: colors.primary, borderColor: colors.shadow, color: isDark ? colors.text : colors.textLight, boxShadow: `4px 4px 0px 0px ${colors.shadow}` }}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-4 py-2 mb-6 font-heading text-sm uppercase tracking-wider border-2 shadow-[4px_4px_0px_0px]"
            style={{ backgroundColor: colors.accent2, borderColor: colors.shadow, color: colors.bg, boxShadow: `4px 4px 0px 0px ${colors.shadow}` }}>
            AI-Powered
          </div>
          <h1 className="font-heading text-5xl md:text-7xl uppercase tracking-tight mb-6" style={{ color: colors.text }}>
            Document Search
            <br />
            <span style={{ color: colors.primary }}>Reimagined</span>
          </h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto leading-relaxed" style={{ color: colors.textMuted }}>
            Search, query, and extract insights from your document repositories using natural
            language. Find answers instantly with AI-powered search grounded in your own documents.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="xl" className="border-2 shadow-[4px_4px_0px_0px] hover:shadow-[6px_6px_0px_0px] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
              style={{ backgroundColor: colors.primary, borderColor: colors.shadow, color: colors.text, boxShadow: `4px 4px 0px 0px ${colors.shadow}` }}>
              Start Free Trial
              <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
            <Button size="xl" variant="secondary" className="border-2 shadow-[4px_4px_0px_0px]"
              style={{ backgroundColor: colors.accent, borderColor: colors.shadow, color: colors.text, boxShadow: `4px 4px 0px 0px ${colors.shadow}` }}>
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-20">
          <div className="p-8 border-2 shadow-[4px_4px_0px_0px]"
            style={{ backgroundColor: colors.accent, borderColor: colors.shadow, boxShadow: `4px 4px 0px 0px ${colors.shadow}` }}>
            <div className="w-14 h-14 flex items-center justify-center border-2 shadow-[4px_4px_0px_0px] mb-4"
              style={{ borderColor: colors.shadow, backgroundColor: colors.bgCard, boxShadow: `4px 4px 0px 0px ${colors.shadow}` }}>
              <svg className="w-7 h-7" style={{ color: colors.accent }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="font-heading text-xl uppercase tracking-tight mb-2" style={{ color: colors.textLight }}>
              Natural Language Search
            </h3>
            <p style={{ color: "rgba(255,255,255,0.85)" }}>
              Ask questions like you're talking to a colleague. No complex query syntax required.
            </p>
          </div>

          <div className="p-8 border-2 shadow-[4px_4px_0px_0px]"
            style={{ backgroundColor: colors.primary, borderColor: colors.shadow, boxShadow: `4px 4px 0px 0px ${colors.shadow}` }}>
            <div className="w-14 h-14 flex items-center justify-center border-2 shadow-[4px_4px_0px_0px] mb-4"
              style={{ borderColor: colors.shadow, backgroundColor: colors.bgCard, boxShadow: `4px 4px 0px 0px ${colors.shadow}` }}>
              <svg className="w-7 h-7" style={{ color: colors.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="font-heading text-xl uppercase tracking-tight mb-2" style={{ color: colors.text }}>
              AI-Powered Answers
            </h3>
            <p style={{ color: "rgba(255,255,255,0.85)" }}>
              Get accurate, grounded answers synthesized from your own documents.
            </p>
          </div>

          <div className="p-8 border-2 shadow-[4px_4px_0px_0px]"
            style={{ backgroundColor: colors.accent2, borderColor: colors.shadow, boxShadow: `4px 4px 0px 0px ${colors.shadow}` }}>
            <div className="w-14 h-14 flex items-center justify-center border-2 shadow-[4px_4px_0px_0px] mb-4"
              style={{ borderColor: colors.shadow, backgroundColor: colors.bgCard, boxShadow: `4px 4px 0px 0px ${colors.shadow}` }}>
              <svg className="w-7 h-7" style={{ color: colors.accent2 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="font-heading text-xl uppercase tracking-tight mb-2" style={{ color: colors.bg }}>
              Enterprise Secure
            </h3>
            <p style={{ color: "rgba(54,54,57,0.9)" }}>
              Your data never leaves your control. SOC 2 compliant with end-to-end encryption.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-[3px] mt-20" style={{ borderColor: colors.border, backgroundColor: colors.bgCard }}>
        <div className="container mx-auto px-4 py-8 text-center">
          <p className="text-sm" style={{ color: colors.textMuted }}>
            Built with Vertex AI Search · Trusted by 1000+ teams
          </p>
          <div className="mt-4 flex gap-4 justify-center items-center">
            <span className="text-xs px-2 py-1 border" style={{ borderColor: colors.border, color: colors.textMuted }}>
              {isDark ? "Dark Mode" : "Light Mode"}
            </span>
            <Link to="/" className="text-sm underline" style={{ color: colors.primary }}>Original</Link>
            <Link to="/preview/dark" className="text-sm underline" style={{ color: colors.accent }}>Dark Theme</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
