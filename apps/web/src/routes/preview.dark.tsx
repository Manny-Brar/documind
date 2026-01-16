import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@documind/ui";

export const Route = createFileRoute("/preview/dark")({
  component: DarkThemePreview,
});

// Dark Mode Color Palette - Refined & Sophisticated
const colors = {
  bg: "#0f0f12",
  bgCard: "#18181c",
  bgCardAlt: "#222228",
  border: "#2d2d35",
  borderBright: "#4f8cff",
  text: "#ffffff",
  textMuted: "#9898a8",
  primary: "#4f8cff", // Royal Blue
  accent: "#a855f7", // Rich Purple
  accent2: "#f59e0b", // Warm Amber
  accent3: "#ef4444", // Warm Red
};

function DarkThemePreview() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bg }}>
      {/* Header */}
      <header className="border-b-[3px]" style={{ borderColor: colors.border, backgroundColor: colors.bgCard }}>
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-2 shadow-[4px_4px_0px_0px]"
              style={{ borderColor: colors.borderBright, backgroundColor: colors.primary, boxShadow: `4px 4px 0px 0px ${colors.accent}` }}>
              <span className="font-heading text-lg font-bold" style={{ color: colors.bg }}>D</span>
            </div>
            <span className="font-heading text-xl font-bold uppercase tracking-tight" style={{ color: colors.text }}>
              DocuMind
            </span>
          </div>
          <div className="flex gap-3">
            <Link to="/login">
              <Button variant="ghost" className="border-2" style={{ borderColor: colors.border, color: colors.text }}>
                Sign In
              </Button>
            </Link>
            <Button className="border-2" style={{ backgroundColor: colors.primary, borderColor: colors.text, color: colors.bg }}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-4 py-2 mb-6 font-heading text-sm uppercase tracking-wider border-2"
            style={{ backgroundColor: colors.accent, borderColor: colors.text, color: colors.text }}>
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
            <Button size="xl" className="border-2 shadow-[4px_4px_0px_0px]"
              style={{ backgroundColor: colors.primary, borderColor: colors.text, color: colors.bg, boxShadow: `4px 4px 0px 0px ${colors.accent}` }}>
              Start Free Trial
              <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
            <Button size="xl" variant="secondary" className="border-2"
              style={{ backgroundColor: "transparent", borderColor: colors.border, color: colors.text }}>
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-20">
          <div className="p-8 border-2 shadow-[4px_4px_0px_0px]"
            style={{ backgroundColor: colors.bgCard, borderColor: colors.borderBright, boxShadow: `4px 4px 0px 0px ${colors.primary}` }}>
            <div className="w-14 h-14 flex items-center justify-center border-2 shadow-[4px_4px_0px_0px] mb-4"
              style={{ borderColor: colors.border, backgroundColor: colors.bgCardAlt, boxShadow: `4px 4px 0px 0px ${colors.primary}` }}>
              <svg className="w-7 h-7" style={{ color: colors.primary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="font-heading text-xl uppercase tracking-tight mb-2" style={{ color: colors.text }}>
              Natural Language Search
            </h3>
            <p style={{ color: colors.textMuted }}>
              Ask questions like you're talking to a colleague. No complex query syntax required.
            </p>
          </div>

          <div className="p-8 border-2 shadow-[4px_4px_0px_0px]"
            style={{ backgroundColor: colors.bgCard, borderColor: colors.accent, boxShadow: `4px 4px 0px 0px ${colors.accent}` }}>
            <div className="w-14 h-14 flex items-center justify-center border-2 shadow-[4px_4px_0px_0px] mb-4"
              style={{ borderColor: colors.border, backgroundColor: colors.bgCardAlt, boxShadow: `4px 4px 0px 0px ${colors.accent}` }}>
              <svg className="w-7 h-7" style={{ color: colors.accent }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="font-heading text-xl uppercase tracking-tight mb-2" style={{ color: colors.text }}>
              AI-Powered Answers
            </h3>
            <p style={{ color: colors.textMuted }}>
              Get accurate, grounded answers synthesized from your own documents.
            </p>
          </div>

          <div className="p-8 border-2 shadow-[4px_4px_0px_0px]"
            style={{ backgroundColor: colors.bgCard, borderColor: colors.accent2, boxShadow: `4px 4px 0px 0px ${colors.accent2}` }}>
            <div className="w-14 h-14 flex items-center justify-center border-2 shadow-[4px_4px_0px_0px] mb-4"
              style={{ borderColor: colors.border, backgroundColor: colors.bgCardAlt, boxShadow: `4px 4px 0px 0px ${colors.accent2}` }}>
              <svg className="w-7 h-7" style={{ color: colors.accent2 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="font-heading text-xl uppercase tracking-tight mb-2" style={{ color: colors.text }}>
              Enterprise Secure
            </h3>
            <p style={{ color: colors.textMuted }}>
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
          <div className="mt-4 flex gap-4 justify-center">
            <Link to="/" className="text-sm underline" style={{ color: colors.primary }}>Original</Link>
            <Link to="/preview/warm" className="text-sm underline" style={{ color: colors.accent3 }}>Warm Theme</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
