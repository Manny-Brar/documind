import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@documind/ui";
import { useSession, signOut } from "../lib/auth-client";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { data: session, isPending } = useSession();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">DocuMind</h1>
          <div className="flex gap-2">
            {isPending ? (
              <Button variant="ghost" disabled>
                Loading...
              </Button>
            ) : session ? (
              <>
                <span className="text-sm text-muted-foreground self-center">
                  {session.user.name}
                </span>
                <Button variant="ghost" onClick={() => signOut()}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/signup">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
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
            Search, query, and extract insights from your document repositories using natural
            language. Find answers instantly with AI-powered search grounded in your own documents.
          </p>
          <div className="flex gap-4 justify-center">
            {session ? (
              <Button size="lg">Go to Dashboard</Button>
            ) : (
              <>
                <Link to="/signup">
                  <Button size="lg">Start Free Trial</Button>
                </Link>
                <Button size="lg" variant="outline">
                  Watch Demo
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            {session ? `Signed in as ${session.user.email}` : "API Status: Ready"}
          </p>
        </div>
      </main>
    </div>
  );
}
