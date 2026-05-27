## Landing page redesign

Scope: `src/routes/index.tsx` only.

### Button styling
- Replace light grey (`#d1d5db`) with a darker grey (`#6b7280`), hover `#4b5563`, white text.
- Apply to: "Sign in", "GET STARTED" (renamed), "SEE FEATURES" (uppercased).

### CTA copy
- "Get started free" → **GET STARTED** (all caps).
- "See features" → **SEE FEATURES** (all caps).

### Feature cards → app-icon tiles
Convert the 3-column rectangular feature cards into a grid of square tiles that look like phone home-screen apps:
- Square aspect (`aspect-square`), rounded-2xl, dark grey background (`#4b5563` / `#374151`), white icon centered, subtle hover lift/scale.
- Icon is the interactive surface (button/link).
- Feature **name shown underneath the tile** (always visible, centered, dark text).
- **Description hidden by default**, revealed on hover/focus of the tile (tooltip-style overlay or fade-in caption below the name).

### Rename features
- "Smart Email Generator" → **Smart Emails**
- "Meeting Notes Summarizer" → **Smart Meeting Notes**
- "AI Task Planner" → **Task Planner**
- (Keep "Research Assistant" and "Chat with Mothusi" unchanged.)

### Text color fix
- Feature descriptions (currently `text-muted-foreground` / grey) → black (`text-foreground` / `text-black`) so the revealed description is legible.

### Out of scope
- Sidebar, dashboard, other routes, backend, button component variants.

### Technical notes
- Edit only `src/routes/index.tsx`.
- Use Tailwind utilities; hover reveal via `group` + `group-hover:opacity-100` on an absolutely-positioned caption, or a tooltip below the name.
- Keep existing translucent lilac/mint blob background.
