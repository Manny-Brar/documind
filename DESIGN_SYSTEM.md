# DocuMind Design System

## Overview

DocuMind uses a **Neobrutalism** design language—a modern aesthetic characterized by bold colors, hard shadows, thick borders, and intentionally raw, unpolished elements that create visual impact and personality.

## Design Philosophy

- **Bold & Unapologetic**: High contrast, vibrant accent colors, no subtle gradients
- **Structured Chaos**: Hard-edged shadows and thick borders create depth without softness
- **Functional First**: Every design element serves a purpose while maintaining visual interest
- **Accessible**: High contrast ratios ensure readability across all modes

---

## Color System

### Dark Mode (Default)

The primary theme uses a washed charcoal base with vibrant accent colors.

| Token | Hex | Usage |
|-------|-----|-------|
| `bg` | `#363639` | Page background (washed charcoal) |
| `bgCard` | `#434347` | Card/header backgrounds |
| `border` | `#2a2a2d` | Borders and dividers |
| `text` | `#ffffff` | Primary text |
| `textMuted` | `#b8b8bc` | Secondary/muted text |
| `textLight` | `#ffffff` | Text on colored backgrounds |
| `primary` | `#ff6c51` | Primary actions (Coral) |
| `accent` | `#0074a4` | Secondary accent (Deep Blue) |
| `accent2` | `#9cd03b` | Tertiary accent (Lime Green) |
| `shadow` | `#2a2a2d` | Shadow color for depth |

### Light Mode

A washed grey aesthetic (not pure white) that maintains the neobrutalist feel.

| Token | Hex | Usage |
|-------|-----|-------|
| `bg` | `#e5e5e8` | Page background (washed grey) |
| `bgCard` | `#f2f2f4` | Card/header backgrounds |
| `border` | `#c8c8cc` | Borders and dividers |
| `text` | `#1a1a1c` | Primary text (near black) |
| `textMuted` | `#5a5a60` | Secondary/muted text |
| `textLight` | `#ffffff` | Text on colored backgrounds |
| `primary` | `#ff6c51` | Primary actions (Coral) |
| `accent` | `#0074a4` | Secondary accent (Deep Blue) |
| `accent2` | `#9cd03b` | Tertiary accent (Lime Green) |
| `shadow` | `#b0b0b5` | Shadow color for depth |

### Accent Color Usage

- **Coral (`#ff6c51`)**: Primary CTAs, important actions, headline accents
- **Deep Blue (`#0074a4`)**: Secondary actions, feature cards, informational elements
- **Lime Green (`#9cd03b`)**: Success states, badges, highlights

---

## Typography

### Font Stack

- **Headings**: `font-heading` (bold, uppercase, tight tracking)
- **Body**: System font stack for optimal readability

### Text Styles

```css
/* Headings */
.font-heading {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: -0.02em;
}

/* Hero Title */
h1 {
  font-size: 3rem;      /* 5xl on mobile */
  font-size: 4.5rem;    /* 7xl on desktop */
}

/* Section Title */
h3 {
  font-size: 1.25rem;   /* xl */
}
```

---

## Components

### Shadows

The signature neobrutalist hard shadow effect:

```css
/* Standard shadow */
shadow-[4px_4px_0px_0px_${colors.shadow}]

/* Small shadow */
shadow-[3px_3px_0px_0px_${colors.shadow}]

/* Hover effect - shadow grows */
hover:shadow-[6px_6px_0px_0px_${colors.shadow}]
hover:-translate-x-0.5
hover:-translate-y-0.5
```

### Borders

Thick, intentional borders create structure:

```css
/* Standard border */
border-2

/* Section dividers */
border-[3px]
```

### Buttons

#### Primary Button
```jsx
<Button
  className="border-2 shadow-[4px_4px_0px_0px]"
  style={{
    backgroundColor: colors.primary,
    borderColor: colors.shadow,
    color: colors.textLight,
    boxShadow: `4px 4px 0px 0px ${colors.shadow}`
  }}
>
  Get Started
</Button>
```

#### Secondary Button
```jsx
<Button
  className="border-2 shadow-[4px_4px_0px_0px]"
  style={{
    backgroundColor: colors.accent,
    borderColor: colors.shadow,
    color: colors.textLight,
    boxShadow: `4px 4px 0px 0px ${colors.shadow}`
  }}
>
  Watch Demo
</Button>
```

#### Ghost Button
```jsx
<Button
  variant="ghost"
  className="border-2 hover:bg-transparent"
  style={{
    borderColor: colors.textMuted,
    color: colors.text
  }}
>
  Sign In
</Button>
```

### Cards (Feature Cards)

Feature cards use accent colors as backgrounds with white text:

```jsx
<div
  className="p-8 border-2 shadow-[4px_4px_0px_0px]"
  style={{
    backgroundColor: colors.accent,      // or colors.primary, colors.accent2
    borderColor: colors.shadow,
    boxShadow: `4px 4px 0px 0px ${colors.shadow}`
  }}
>
  {/* Icon container */}
  <div
    className="w-14 h-14 flex items-center justify-center border-2 shadow-[4px_4px_0px_0px] mb-4"
    style={{
      borderColor: colors.shadow,
      backgroundColor: colors.bgCard,
      boxShadow: `4px 4px 0px 0px ${colors.shadow}`
    }}
  >
    <Icon style={{ color: colors.accent }} />
  </div>

  <h3 style={{ color: colors.textLight }}>Title</h3>
  <p style={{ color: "rgba(255,255,255,0.85)" }}>Description</p>
</div>
```

### Theme Toggle

Sun/moon icon button for switching modes:

```jsx
<button
  onClick={() => setIsDark(!isDark)}
  className="w-10 h-10 flex items-center justify-center border-2 shadow-[3px_3px_0px_0px] hover:shadow-[4px_4px_0px_0px] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
  style={{
    backgroundColor: isDark ? colors.bgCard : colors.bg,
    borderColor: colors.border,
    boxShadow: `3px 3px 0px 0px ${colors.shadow}`
  }}
>
  {isDark ? <SunIcon color={colors.accent2} /> : <MoonIcon color={colors.accent} />}
</button>
```

---

## Layout

### Container
```css
.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1rem;
}
```

### Header
- Fixed height with 3px bottom border
- Logo + navigation on opposite ends
- Theme toggle integrated with auth buttons

### Main Content
- Centered hero section (max-width: 4xl / 896px)
- 3-column feature grid on desktop, stacked on mobile
- Generous vertical padding (py-16)

### Footer
- 3px top border
- Centered content
- Muted text color

---

## Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| Default | < 768px | Mobile-first base styles |
| `md:` | >= 768px | Tablet and above |
| `sm:` | >= 640px | Small tablet adjustments |

### Key Responsive Changes

- Hero title: `text-5xl` → `md:text-7xl`
- Feature grid: `grid-cols-1` → `md:grid-cols-3`
- CTA buttons: `flex-col` → `sm:flex-row`

---

## Animation & Interaction

### Hover States

Buttons and interactive elements use a "lift" effect:

```css
hover:shadow-[6px_6px_0px_0px]
hover:-translate-x-0.5
hover:-translate-y-0.5
transition-all
```

### Transitions

All interactive elements use `transition-all` for smooth state changes.

---

## Implementation Notes

### Theme State Management

Currently using React `useState` for theme toggling. For persistence across sessions, consider:

1. LocalStorage persistence
2. System preference detection (`prefers-color-scheme`)
3. React Context for app-wide theme access

### Inline Styles vs CSS Variables

The current implementation uses inline styles for theme-specific values. This allows for:
- Component-level theme isolation
- Easy theme switching without CSS variable updates
- Explicit color mapping per element

For a larger application, consider migrating to CSS custom properties:

```css
:root {
  --color-bg: #363639;
  --color-primary: #ff6c51;
  /* ... */
}

[data-theme="light"] {
  --color-bg: #e5e5e8;
  /* ... */
}
```

---

## File Locations

| File | Purpose |
|------|---------|
| `apps/web/src/routes/index.tsx` | Main landing page with theme system |
| `apps/web/src/routes/preview.warm.tsx` | Theme preview/sandbox page |
| `packages/ui/` | Shared UI component library |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01 | Initial neobrutalism design with dark/light modes |
