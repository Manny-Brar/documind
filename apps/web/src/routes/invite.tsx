import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from "@documind/ui";
import { trpc } from "../lib/trpc";
import { useSession } from "../lib/auth-client";
import { useTheme } from "../context/theme";

export const Route = createFileRoute("/invite")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: (search.token as string) || "",
    };
  },
  component: InvitePage,
});

function InvitePage() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const { isDark, toggleTheme } = useTheme();
  const { data: session, isPending: sessionLoading } = useSession();
  const [error, setError] = useState<string | null>(null);

  // Fetch invitation details
  const { data: invitation, isLoading: inviteLoading } = trpc.settings.getInvitation.useQuery(
    { token },
    { enabled: !!token && !!session }
  );

  // Accept invitation mutation
  const acceptMutation = trpc.settings.acceptInvitation.useMutation({
    onSuccess: (data) => {
      // Redirect to dashboard after accepting
      navigate({ to: "/dashboard" });
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleAccept = () => {
    if (!token) return;
    setError(null);
    acceptMutation.mutate({ token });
  };

  // Show loading state
  if (sessionLoading || inviteLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header isDark={isDark} toggleTheme={toggleTheme} />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-8 text-center">
            <div className="inline-block h-8 w-8 animate-spin border-4 border-black border-t-transparent mb-4" />
            <p className="text-muted-foreground">Loading invitation...</p>
          </Card>
        </main>
      </div>
    );
  }

  // Not logged in - redirect to login with return URL
  if (!session) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header isDark={isDark} toggleTheme={toggleTheme} />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center border-2 border-black bg-primary shadow-neo">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <CardTitle className="font-heading text-2xl uppercase">
                You're Invited!
              </CardTitle>
              <CardDescription className="text-base">
                Sign in to accept your team invitation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link to="/login" search={{ redirect: `/invite?token=${token}` }}>
                <Button className="w-full" size="lg">
                  Sign In to Continue
                </Button>
              </Link>
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" search={{ redirect: `/invite?token=${token}` }} className="text-primary font-bold hover:underline">
                  Sign up
                </Link>
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // No token provided
  if (!token) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header isDark={isDark} toggleTheme={toggleTheme} />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center border-2 border-black bg-destructive shadow-neo">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <CardTitle className="font-heading text-2xl uppercase">
                Invalid Link
              </CardTitle>
              <CardDescription className="text-base">
                This invitation link is missing the required token.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/dashboard">
                <Button className="w-full" variant="secondary">
                  Go to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Invitation not found or expired
  if (!invitation?.valid) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header isDark={isDark} toggleTheme={toggleTheme} />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center border-2 border-black bg-amber-400 shadow-neo">
                <svg className="w-8 h-8 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <CardTitle className="font-heading text-2xl uppercase">
                {invitation?.expired ? "Invitation Expired" : "Invitation Not Found"}
              </CardTitle>
              <CardDescription className="text-base">
                {invitation?.expired
                  ? "This invitation has expired. Please ask your team admin to send a new one."
                  : "This invitation link is no longer valid. It may have already been used or revoked."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/dashboard">
                <Button className="w-full" variant="secondary">
                  Go to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Valid invitation - show accept UI
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header isDark={isDark} toggleTheme={toggleTheme} />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md" variant="lavender">
          <CardHeader className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center border-2 border-black bg-primary shadow-neo">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <CardTitle className="font-heading text-2xl uppercase">
              Join {invitation.organization?.name}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              <strong>{invitation.invitedBy}</strong> has invited you to join their team as a{" "}
              <span className="font-bold capitalize">{invitation.role}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 border-2 border-black bg-red-100 text-red-800 text-sm">
                {error}
              </div>
            )}

            <div className="p-4 border-2 border-black bg-white shadow-neo-sm">
              <p className="text-sm text-muted-foreground mb-1">You'll join as</p>
              <p className="font-bold capitalize text-lg">{invitation.role}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {invitation.role === "admin"
                  ? "Full access to manage the team, billing, and settings"
                  : invitation.role === "member"
                  ? "Can upload documents, search, and ask questions"
                  : "Can view and search documents"}
              </p>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleAccept}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin border-2 border-white border-t-transparent rounded-full" />
                  Joining...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Accept Invitation
                </>
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Not the right account?{" "}
              <Link to="/login" className="text-primary font-bold hover:underline">
                Sign in with a different account
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

// Header component (shared with login/signup)
function Header({ isDark, toggleTheme }: { isDark: boolean; toggleTheme: () => void }) {
  return (
    <header className="border-b-[3px] border-border bg-card">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border-2 border-primary bg-primary shadow-neo-sm">
            <span className="font-heading text-lg font-bold text-primary-foreground">D</span>
          </div>
          <span className="font-heading text-xl font-bold uppercase tracking-tight">
            DocuMind
          </span>
        </Link>
        <button
          onClick={toggleTheme}
          className={cn(
            "p-2 border-2 border-border bg-card shadow-neo-sm",
            "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo",
            "active:translate-x-px active:translate-y-px active:shadow-neo-pressed",
            "transition-all duration-100"
          )}
          aria-label="Toggle theme"
        >
          {isDark ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
