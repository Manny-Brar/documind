# DocuMind Development Patterns

This document captures important patterns and conventions to maintain consistency across the codebase.

---

## Theme System

### Architecture

DocuMind uses a centralized theme system via React Context.

```
apps/web/src/context/theme.tsx   <- ThemeProvider
apps/web/src/main.tsx            <- Provider wraps app
```

### How It Works

1. `ThemeProvider` reads theme from `localStorage` on mount
2. Falls back to system preference via `prefers-color-scheme`
3. Defaults to `dark` if no preference
4. Applies `dark` class to `<html>` element
5. Persists choice to `localStorage`

### Usage in Components

```tsx
import { useTheme } from "../context/theme";

function MyComponent() {
  const { isDark, toggleTheme, theme, setTheme } = useTheme();

  return (
    <button onClick={toggleTheme}>
      {isDark ? "Light Mode" : "Dark Mode"}
    </button>
  );
}
```

### Tailwind Dark Mode Classes

Always use dark: variants for theme-aware styling:

```tsx
// CORRECT
<div className="bg-red-50 dark:bg-red-950 text-red-500 dark:text-red-400">
  Error message
</div>

// WRONG (won't work in dark mode)
<div className="bg-red-50 text-red-500">
  Error message
</div>
```

### Custom Colors (Landing Page)

The landing page uses custom inline colors for the neobrutalism design:

```tsx
const darkColors = {
  bg: "#363639",
  bgCard: "#434347",
  primary: "#ff6c51",  // Coral
  accent: "#0074a4",   // Deep blue
  accent2: "#9cd03b",  // Lime green
};

const lightColors = {
  bg: "#e5e5e8",
  bgCard: "#f2f2f4",
  // ... same accent colors
};

// In component
const { isDark } = useTheme();
const colors = isDark ? darkColors : lightColors;
```

---

## Authentication

### Provider: Better Auth

DocuMind uses [Better Auth](https://www.better-auth.com/) for authentication.

### Configuration

```
apps/api/src/auth.ts            <- Server-side auth config
apps/web/src/lib/auth-client.ts <- Client-side auth
```

### Supported Methods

1. **Email/Password**: Native credential authentication
2. **Google OAuth**: Sign in with Google

### OAuth Configuration Checklist

When setting up OAuth:

1. **API .env Variables**
   ```
   GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxx
   BETTER_AUTH_URL=http://localhost:8080
   ```

2. **Google Cloud Console Settings**
   - Authorized JavaScript origins: `http://localhost:5173`, `http://localhost:5174`
   - Authorized redirect URIs: `http://localhost:8080/api/auth/callback/google`

3. **Trusted Origins in auth.ts**
   ```ts
   trustedOrigins: (process.env.CORS_ORIGIN || "").split(",").map(o => o.trim())
   ```

### Common OAuth Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "redirect_uri_mismatch" | Missing callback URI in GCP | Add `http://localhost:8080/api/auth/callback/google` |
| "origin not allowed" | CORS/trusted origins | Add port to `CORS_ORIGIN` and `trustedOrigins` |
| "Failed immediately" | Client ID/Secret wrong | Verify GCP credentials |

### Client-Side Usage

```tsx
import { signIn, signUp, signOut, useSession } from "../lib/auth-client";

// Check session
const { data: session, isPending } = useSession();

// Email sign in
await signIn.email({ email, password });

// Google sign in
await signIn.social({ provider: "google", callbackURL: "/" });

// Sign up
await signUp.email({ name, email, password });

// Sign out
await signOut();
```

---

## CORS Configuration

### Multi-Port Support

Development may run on different ports. Always configure for multiple:

```env
# apps/api/.env
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
```

```ts
// apps/api/src/lib/env.ts
const corsOrigin = corsOriginStr.split(",").map(o => o.trim());
```

---

## Database

### Prisma Schema Location
```
packages/db/prisma/schema.prisma
```

### Environment Files
```
packages/db/.env          <- DATABASE_URL for Prisma CLI
apps/api/.env             <- DATABASE_URL for runtime
```

### Common Commands

```bash
pnpm db:up        # Start PostgreSQL (Docker)
pnpm db:push      # Push schema to DB
pnpm db:migrate   # Create/run migrations
pnpm db:seed      # Seed master user
pnpm db:studio    # Open Prisma Studio
```

### Seed User Credentials

```
Email: mannybrar.py@gmail.com
Password: DocuMind2024!
Organization: DocuMind Dev
Role: admin
```

---

## File Organization

### Frontend Structure

```
apps/web/src/
├── components/       # Reusable UI components
├── context/          # React contexts (theme, etc.)
├── lib/              # Utilities (trpc, auth-client)
├── routes/           # TanStack Router pages
│   ├── _authenticated/  # Protected routes
│   ├── index.tsx        # Landing page
│   ├── login.tsx        # Auth pages
│   └── signup.tsx
└── main.tsx          # App entry point
```

### Backend Structure

```
apps/api/src/
├── lib/              # Utilities (storage, embeddings, etc.)
├── trpc/
│   ├── routers/      # tRPC routers (documents, search, etc.)
│   ├── context.ts    # Request context
│   └── router.ts     # Root router
├── auth.ts           # Better Auth config
└── index.ts          # Server entry point
```

---

## Error Handling Patterns

### Client-Side Errors

```tsx
// Use theme-aware error styling
{error && (
  <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950
                  dark:text-red-400 rounded-md border border-red-200
                  dark:border-red-800">
    {error}
  </div>
)}
```

### API Errors

```ts
// tRPC error handling
throw new TRPCError({
  code: "NOT_FOUND",
  message: "Document not found",
});
```

---

## Testing Checklist

Before committing auth/theme changes:

- [ ] Dark mode toggle works on landing page
- [ ] Login page respects dark mode
- [ ] Signup page respects dark mode
- [ ] Email/password login works
- [ ] Google OAuth redirects correctly
- [ ] Session persists after page reload
- [ ] Logout works

---

*Last updated: January 2025*
