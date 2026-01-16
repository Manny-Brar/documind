import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@documind/ui";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">DocuMind</h1>
          <div className="flex gap-2">
            <Button variant="ghost">Sign In</Button>
            <Button>Get Started</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl font-bold tracking-tight mb-6">
            AI-Powered Document Search
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Search, query, and extract insights from your document repositories
            using natural language. Find answers instantly with AI-powered
            search grounded in your own documents.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg">Start Free Trial</Button>
            <Button size="lg" variant="outline">
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Status */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            API Status: Pending setup
          </p>
        </div>
      </main>
    </div>
  );
}
