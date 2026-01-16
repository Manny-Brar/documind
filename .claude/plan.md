# DocuMind Dashboard - Top-Tier Neobrutalism Design System

## Design Philosophy

**DocuMind's aesthetic is:**
- **Confident, not aggressive** - Bold without being harsh
- **Playful, not childish** - Colored surfaces add personality without sacrificing professionalism
- **Fast, not chaotic** - Quick mechanical transitions create responsiveness
- **Clear, not cluttered** - Hard edges create definition, generous spacing prevents overwhelm

---

## Color System (Refined)

### Primary Palette
```css
/* Brand Colors */
--neo-primary: #2563EB;        /* Strong blue - primary actions */
--neo-primary-dark: #1D4ED8;   /* Hover state */
--neo-secondary: #EC4899;      /* Hot pink - adds personality */
--neo-secondary-dark: #DB2777; /* Hover state */

/* Semantic Colors */
--neo-success: #65A30D;        /* Darkened lime - passes contrast */
--neo-warning: #D97706;        /* Amber-600 */
--neo-error: #DC2626;          /* Red-600 */
--neo-info: #0891B2;           /* Cyan-600 */

/* Neutrals */
--neo-black: #000000;
--neo-white: #FFFFFF;
--neo-gray-50: #FAFAFA;
--neo-gray-100: #F5F5F5;
--neo-gray-200: #E5E5E5;
--neo-gray-500: #737373;
--neo-gray-900: #171717;
```

### Surface Colors (Pastel Accents)
```css
/* Light mode surfaces */
--neo-surface-main: #FFFFFF;
--neo-surface-yellow: #FEF9C3;   /* Yellow-100 */
--neo-surface-blue: #DBEAFE;     /* Blue-100 */
--neo-surface-pink: #FCE7F3;     /* Pink-100 */
--neo-surface-mint: #D1FAE5;     /* Emerald-100 */
--neo-surface-lavender: #EDE9FE; /* Violet-100 */

/* Sidebar */
--neo-sidebar-bg: #FEF3C7;       /* Warm amber-100 */
--neo-sidebar-hover: #FDE68A;    /* Amber-200 */
```

### Dark Mode
```css
--neo-bg-dark: #0A0A0A;
--neo-surface-dark: #171717;
--neo-surface-dark-elevated: #262626;
--neo-border-dark: #404040;
--neo-shadow-dark: rgba(255, 255, 255, 0.1);
```

---

## Typography System

### Font Stack
```css
/* Headlines - Archivo Black for maximum impact */
--font-heading: 'Archivo Black', 'Inter', system-ui, sans-serif;

/* Body - Inter for clean readability */
--font-body: 'Inter', system-ui, sans-serif;

/* Monospace - JetBrains Mono for stats/code */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Type Scale
```css
--text-xs: 0.75rem;     /* 12px */
--text-sm: 0.875rem;    /* 14px */
--text-base: 1rem;      /* 16px */
--text-lg: 1.125rem;    /* 18px */
--text-xl: 1.25rem;     /* 20px */
--text-2xl: 1.5rem;     /* 24px */
--text-3xl: 1.875rem;   /* 30px */
--text-4xl: 2.25rem;    /* 36px */
--text-5xl: 3rem;       /* 48px - stats display */
```

### Typography Rules
- **Headlines**: Uppercase for buttons/labels, -0.02em letter-spacing
- **Body**: 1.6 line-height, max-width 65ch
- **Stats**: Tabular numbers, font-weight 700

---

## Shadow System

### Hard Shadows (No Blur, No Gradients)
```css
/* Standard - 4px offset */
--shadow-neo: 4px 4px 0px 0px var(--neo-black);

/* Small - 2px offset */
--shadow-neo-sm: 2px 2px 0px 0px var(--neo-black);

/* Large - 6px offset (hover state) */
--shadow-neo-lg: 6px 6px 0px 0px var(--neo-black);

/* Pressed - 1px offset */
--shadow-neo-pressed: 1px 1px 0px 0px var(--neo-black);

/* Colored shadows */
--shadow-neo-primary: 4px 4px 0px 0px var(--neo-primary);
--shadow-neo-error: 4px 4px 0px 0px var(--neo-error);
```

---

## Border System

```css
--border-width: 2px;
--border-width-thick: 3px;
--border-color: var(--neo-black);
--border-radius-none: 0px;      /* True brutalism */
--border-radius-sm: 4px;        /* Slight softening */
--border-radius-md: 8px;        /* Cards */
```

---

## Animation System

### Timing (Mechanical, Not Organic)
```css
/* Fast mechanical feel */
--transition-fast: 100ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-normal: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 200ms cubic-bezier(0.4, 0, 0.2, 1);

/* NEVER use: ease-in-out, spring, bounce */
```

### Interaction States
```css
/* Hover - lift up and left */
.neo-hover:hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-neo-lg);
}

/* Active/Pressed - push down */
.neo-hover:active {
  transform: translate(1px, 1px);
  box-shadow: var(--shadow-neo-pressed);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .neo-hover:hover {
    transform: none;
  }
}
```

---

## Component Specifications

### Button
```
┌─────────────────────────────┐
│    UPLOAD DOCUMENT          │  ← Bold uppercase, tracking-wide
└─────────────────────────────┘
  ████████████████████████████   ← 4px hard shadow
```

**Variants:**
- `primary`: Blue bg, white text
- `secondary`: White bg, black text, black border
- `destructive`: Red bg, white text
- `ghost`: Transparent, black border only
- `accent`: Pink bg, white text

**States:**
- Default: shadow-neo
- Hover: translate(-2px, -2px), shadow-neo-lg
- Active: translate(1px, 1px), shadow-neo-pressed
- Disabled: opacity-40, grayscale, cursor-not-allowed
- Loading: Spinning border segment (rectangular, not circular)

### Card
```
┌────────────────────────────────────────┐
│                                        │
│  CARD TITLE                            │  ← Archivo Black
│  Description text in Inter             │  ← text-muted
│                                        │
│  Content here...                       │
│                                        │
└────────────────────────────────────────┘
  ████████████████████████████████████████  ← shadow-neo
```

**Variants:**
- `default`: White bg
- `yellow`: Yellow-100 bg
- `blue`: Blue-100 bg
- `pink`: Pink-100 bg
- `mint`: Mint-100 bg

### Input
```
Label Text
┌────────────────────────────────────────┐
│ Placeholder text                       │
└────────────────────────────────────────┘
  ████████████████████████████████████████
```

**States:**
- Default: border-2, shadow-neo-sm
- Focus: border-3, shadow-neo, translate(-1px, -1px)
- Error: border-error, shadow-neo-error, bg-red-50
- Disabled: diagonal stripe pattern bg

### Stats Card
```
┌─────────────────────────────┐
│  DOCUMENTS                  │  ← Label (uppercase, small, muted)
│  1,234                      │  ← JetBrains Mono, text-5xl, tabular
│  ↑ 12% from last month     │  ← Trend (small, success color)
└─────────────────────────────┘
  █████████████████████████████
```

### Navigation Item
```
Default:    │  📄 Documents           │
Hover:      │  →📄 Documents          │  ← 2px translate-x
Active:     ┃██ 📄 Documents          ┃  ← Left accent bar + filled bg
```

---

## Dashboard Layout

### Desktop (>1024px)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ███ DOCUMIND          [🔍 Search documents... Cmd+K]        [@] John ▼    │
├──────────────────┬──────────────────────────────────────────────────────────┤
│                  │                                                          │
│  ◉ Dashboard     │  ┌─Quick Actions────────────────────────────────────┐   │
│                  │  │ [+ UPLOAD]  [📁 NEW FOLDER]  [🔍 SEARCH]         │   │
│  📄 Documents    │  └──────────────────────────────────────────────────┘   │
│                  │                                                          │
│  🔍 Search       │  ┌─Recent Documents─────────────────────────────────┐   │
│                  │  │ ┌──────────────────────────────────────────────┐ │   │
│  👥 Team         │  │ │ 📄 quarterly-report.pdf    │ 2d │ [•••] │ │   │
│                  │  │ │ 📊 analytics-2024.xlsx     │ 5d │ [•••] │ │   │
│  ⚙️ Settings     │  │ │ 📝 meeting-notes.docx      │ 1w │ [•••] │ │   │
│                  │  │ └──────────────────────────────────────────────┘ │   │
│ ─────────────────│  └──────────────────────────────────────────────────┘   │
│                  │                                                          │
│  Acme Corp  ▼    │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│                  │  │DOCUMENTS │  │ STORAGE  │  │ SEARCHES │              │
│  Free Plan       │  │  1,234   │  │  2.4 GB  │  │    456   │              │
│  [UPGRADE]       │  │ ↑12%     │  │ ↑8%      │  │ ↑24%     │              │
│                  │  └──────────┘  └──────────┘  └──────────┘              │
└──────────────────┴──────────────────────────────────────────────────────────┘
```

### Information Hierarchy
1. **Top Priority**: Quick actions (Upload, Search) - immediate access
2. **Primary Content**: Recent documents - most common task
3. **Secondary**: Stats overview - contextual information
4. **Persistent**: Navigation + Org context in sidebar

### Mobile (<768px)
- Hamburger menu → Full-screen drawer
- Search bar sticky below header
- Single column layout
- Stats as horizontal scroll carousel
- Full-width action buttons

### Tablet (768-1024px)
- Icon-only sidebar (64px) with tooltips
- Two-column grid for cards
- Condensed spacing

---

## File Structure

```
apps/web/src/
├── components/
│   ├── layout/
│   │   ├── dashboard-layout.tsx
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── user-menu.tsx
│   └── dashboard/
│       ├── quick-actions.tsx
│       ├── recent-documents.tsx
│       └── stats-overview.tsx
├── routes/
│   ├── _authenticated.tsx
│   └── _authenticated/
│       ├── index.tsx (redirects to dashboard)
│       ├── dashboard.tsx
│       ├── documents.tsx
│       ├── search.tsx
│       └── settings.tsx

packages/ui/src/
├── globals.css              # Neo-brutalism design tokens
├── components/
│   ├── button.tsx           # Updated
│   ├── card.tsx             # Updated
│   ├── input.tsx            # Updated
│   ├── label.tsx            # Updated
│   ├── badge.tsx            # New
│   ├── avatar.tsx           # New
│   └── stats-card.tsx       # New
```

---

## Implementation Order

### Phase 1: Design Tokens & CSS Foundation
1. Add Google Fonts (Archivo Black, Inter, JetBrains Mono)
2. Update globals.css with neo-brutalism tokens
3. Update tailwind.config.ts with custom utilities
4. Create neo-brutalism utility classes

### Phase 2: Core Components
5. Update Button with neo variants
6. Update Card with colored variants
7. Update Input with neo states
8. Create Badge component
9. Create Avatar component
10. Create StatsCard component

### Phase 3: Layout Components
11. Create Sidebar navigation
12. Create Header with search
13. Create DashboardLayout wrapper
14. Create UserMenu dropdown

### Phase 4: Dashboard Pages
15. Create _authenticated layout with auth guard
16. Create Dashboard home page
17. Create Documents page (placeholder)
18. Create Search page (placeholder)
19. Create Settings page (placeholder)

### Phase 5: Polish & Integration
20. Add micro-interactions
21. Connect tRPC queries
22. Add loading states
23. Add empty states
24. Test responsive breakpoints
25. Accessibility audit

---

## Accessibility Requirements

- **WCAG AAA contrast** (7:1) for body text
- **Focus indicators**: 3px solid outline with offset
- **Keyboard shortcuts**: Cmd+K (search), U (upload)
- **Screen reader**: Proper ARIA labels, live regions
- **Reduced motion**: Respect prefers-reduced-motion
- **Touch targets**: Minimum 44x44px

---

## Sources

- [NN/g Neobrutalism](https://www.nngroup.com/articles/neobrutalism/)
- [neobrutalism.dev](https://www.neobrutalism.dev/)
- [HyperUI Components](https://www.hyperui.dev/components/neobrutalism)
- [Dribbble Inspiration](https://dribbble.com/tags/neobrutalism)
