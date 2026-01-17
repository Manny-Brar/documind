import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  cn,
} from "@documind/ui";
import { signIn } from "../lib/auth-client";
import { useTheme } from "../context/theme";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Failed to sign in");
      } else {
        navigate({ to: "/" });
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const result = await signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });

      // Better Auth returns a URL to redirect to
      if (result.data?.url) {
        window.location.href = result.data.url;
      } else if (result.error) {
        setError(result.error.message || "Failed to sign in with Google");
      }
    } catch (err) {
      console.error("Google sign-in error:", err);
      setError("Failed to sign in with Google");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b-[3px] border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-primary bg-primary shadow-neo-sm">
              <span className="font-heading text-lg font-bold text-primary-foreground">
                D
              </span>
            </div>
            <span className="font-heading text-xl font-bold uppercase tracking-tight text-foreground">
              DocuMind
            </span>
          </Link>
          <button
            onClick={toggleTheme}
            className={cn(
              "w-10 h-10 flex items-center justify-center border-2 border-border bg-card shadow-neo-sm",
              "hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all",
              "active:translate-x-px active:translate-y-px active:shadow-neo-pressed"
            )}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? (
              <svg
                className="w-5 h-5 text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-2 border-border bg-card shadow-neo">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-heading uppercase text-foreground">
              Welcome back
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to your DocuMind account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm border-2 border-destructive bg-destructive/10 text-destructive">
                  {error}
                </div>
              )}

              {/* Google OAuth Button */}
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full border-2 border-border bg-background text-foreground shadow-neo-sm",
                  "hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
                )}
                onClick={handleGoogleSignIn}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t-2 border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-2 bg-card text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-2 border-border bg-background text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-2 border-border bg-background text-foreground"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className={cn(
                  "w-full border-2 border-border bg-primary text-primary-foreground shadow-neo-sm",
                  "hover:shadow-neo hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all",
                  "active:translate-x-px active:translate-y-px active:shadow-neo-pressed"
                )}
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link to="/signup" className="hover:underline text-primary">
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
