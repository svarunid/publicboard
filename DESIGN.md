---
name: PublicBoard
description: Neutral civic incident record system for citizens
colors:
  primary: "#111111"
  bg-light: "#FFFFFF"
  surface-light: "#F7F7F7"
  surface-raised-light: "#EFEFEF"
  border-light: "#D4D4D4"
  text-light: "#111111"
  text-muted-light: "#525252"
  bg-dark: "#0A0A0A"
  surface-dark: "#141414"
  surface-raised-dark: "#1F1F1F"
  border-dark: "#3A3A3A"
  text-dark: "#F5F5F5"
  text-muted-dark: "#B8B8B8"
  primary-light: "#111111"
  primary-dark: "#F5F5F5"
  focus: "#2563EB"
  info: "#1D4ED8"
  success: "#166534"
  warning: "#A16207"
  error: "#B91C1C"
  pending: "#6B7280"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "2rem"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "0px"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "1.5rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "0px"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0px"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0px"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 550
    lineHeight: 1.25
    letterSpacing: "0px"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, \"SF Mono\", Consolas, \"Liberation Mono\", Menlo, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "0px"
rounded:
  xs: "2px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  pill: "999px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  "2xl": "32px"
  "3xl": "40px"
  "4xl": "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.bg-light}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.text-light}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "36px"
  button-ghost:
    backgroundColor: "{colors.bg-light}"
    textColor: "{colors.text-muted-light}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 10px"
    height: "32px"
  input-default:
    backgroundColor: "{colors.bg-light}"
    textColor: "{colors.text-light}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
    height: "38px"
  chip-neutral:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.text-muted-light}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 10px"
    height: "26px"
  panel-default:
    backgroundColor: "{colors.bg-light}"
    textColor: "{colors.text-light}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: PublicBoard

## 1. Overview

**Creative North Star: "The Civic Ledger"**

PublicBoard is a civic record product. The interface should feel almost undesigned in the best sense: quiet, exact, structured, and built to protect the incident record from social-media noise. The visual system starts from black, white, and neutral gray, then adds state colors only when users need to understand risk, status, category, confidence, or focus.

The curated tokens above are the starting system, even before screens exist. They should be implemented as OKLCH CSS custom properties in the app so light and dark themes can preserve perceptual contrast, but the frontmatter uses hex values for DESIGN.md tooling compatibility. Do not treat these as placeholders; treat them as the initial source of truth until real component code proves a token needs adjustment.

Physical scene: a citizen opens PublicBoard in daylight on a phone to check nearby incidents, then later reviews the same record on a laptop at night. The product must remain legible and strict in both situations, without changing tone between light and dark themes.

**Key Characteristics:**

- Neutral black/white foundation with grays used for structure, not decoration.
- State color is scarce and semantic: focus, info, success, warning, error, pending.
- Dense product layout, suitable for maps, incident lists, source metadata, and duplicate review.
- Familiar controls with strict focus states and no invented affordances.
- Motion is limited to state feedback, disclosure, and map interaction response.

## 2. Colors

The palette is restrained. Neutral surfaces carry the product. Color appears only when it changes the user’s understanding of state.

### Primary

- **Ink Primary** (`primary-light`, `primary-dark`): The action and selection color. In light mode it is near-black; in dark mode it is near-white. Use it for primary buttons, active navigation, selected incident outlines, and confirmed selections.

### Secondary

- **Focus Blue** (`focus`): The keyboard focus and active-control ring. It is intentionally the most visible non-neutral because focus cannot be subtle.
- **Info Blue** (`info`): System information, linked references, and source-detail affordances.
- **Success Green** (`success`): Confirmed actions, verified source state, resolved duplicate review.
- **Warning Ochre** (`warning`): Ambiguous duplicate, uncertain location, needs confirmation.
- **Error Red** (`error`): Invalid submission, failed moderation check, destructive action.
- **Pending Gray** (`pending`): Awaiting review, unresolved cluster, unclassified state.

### Neutral

- **Light Canvas** (`bg-light`): Main light theme background.
- **Light Surface** (`surface-light`, `surface-raised-light`): Panels, lists, toolbars, and raised overlays in light theme.
- **Light Border** (`border-light`): Input borders, dividers, map panel edges.
- **Light Text** (`text-light`, `text-muted-light`): Primary and secondary text in light theme.
- **Dark Canvas** (`bg-dark`): Main dark theme background.
- **Dark Surface** (`surface-dark`, `surface-raised-dark`): Panels, lists, toolbars, and raised overlays in dark theme.
- **Dark Border** (`border-dark`): Input borders, dividers, map panel edges.
- **Dark Text** (`text-dark`, `text-muted-dark`): Primary and secondary text in dark theme.

### Named Rules

**The No Personality Color Rule.** Black, white, and neutral grays are the identity. Accent color is prohibited unless it communicates state, selection, risk, category, or focus.

**The State Must Survive Rule.** If color is removed, every status must still be understandable through text, icon, label, grouping, position, or control state.

**The Theme Parity Rule.** Light and dark themes must use the same hierarchy. Dark mode is not a separate aesthetic; it is the same civic ledger under lower ambient light.

## 3. Typography

**Display Font:** Inter with system sans fallback
**Body Font:** Inter with system sans fallback
**Label/Mono Font:** optional UI mono for coordinates, IDs, timestamps, and source hashes only

**Character:** Typography is compact, functional, and consistent. One sans family carries the interface. Mono is a utility face, not a stylistic voice.

### Hierarchy

- **Display** (650, 2rem, 1.15): Rare app-level headings, onboarding, or empty states. Do not use inside dense panels.
- **Headline** (650, 1.5rem, 1.2): Major surfaces: map view, board page, incident detail, submission flow.
- **Title** (600, 1.125rem, 1.3): Incident titles, section titles, opinion-cluster titles, form step titles.
- **Body** (400, 1rem, 1.5): Incident descriptions, source summaries, guidance text, and cluster explanations. Long prose should target 65-75ch.
- **Label** (550, 0.8125rem, 1.25): Metadata, form labels, filter labels, chips, button text, confidence labels.
- **Mono** (500, 0.8125rem, 1.35): Coordinates, IDs, timestamps, source hashes, and technical audit details.

### Named Rules

**The Evidence Type Rule.** Typography should make records easier to compare. Weight, size, and spacing are allowed; theatrical type treatments are not.

**The Fixed Scale Rule.** Product UI uses fixed rem sizes. Do not use fluid display clamps inside tool surfaces.

**The Same Voice Rule.** Buttons, labels, incident copy, moderation states, and map controls should sound like the same civic record system.

## 4. Elevation

PublicBoard is flat by default. Depth comes from tonal layers, borders, sticky positioning, and focus rings. Shadows are reserved for true overlays above the map canvas, such as command menus, popovers, confirmation dialogs, temporary inspectors, and active drag states.

### Shadow Vocabulary

- **Overlay Shadow** (`0 8px 24px rgb(0 0 0 / 0.18)`): Use only for menus, popovers, dialogs, and floating inspectors.
- **Drag Shadow** (`0 4px 12px rgb(0 0 0 / 0.16)`): Use only while an item or map control is actively moving.

### Named Rules

**The Flat Record Rule.** Resting incident records, toolbars, panels, and form sections must not rely on decorative shadows.

**The Overlay Exception Rule.** Elevation is allowed only when a surface must clearly sit above the infinite map canvas.

## 5. Components

These component tokens initialize the design system before implementation. When real shadcn components are added, align their variants to these decisions rather than starting from generic defaults.

### Buttons

- **Shape:** compact rectangle with modest radius (`4px`).
- **Primary:** near-black fill on light theme, near-white fill on dark theme, fixed height (`36px`), label typography.
- **Hover / Focus:** hover may shift surface tone; focus must use the Focus Blue ring and remain visible in both themes.
- **Secondary / Ghost / Tertiary:** secondary uses surface fill and border; ghost is text-first and only for low-risk actions.

### Chips

- **Style:** pill radius for compact metadata (`999px`), 26px height, neutral background by default.
- **State:** selected chips use primary text and clear border or fill change. Status chips include text and icon, not color alone.

### Cards / Containers

- **Corner Style:** maximum standard panel radius is `8px`.
- **Background:** neutral canvas or surface tokens only.
- **Shadow Strategy:** flat at rest; overlay shadow only when floating above the map.
- **Border:** use `border-light` / `border-dark` for structure.
- **Internal Padding:** default `16px`, increase only for reading-heavy detail panels.

### Inputs / Fields

- **Style:** 38px height, `4px` radius, clear border, neutral background.
- **Focus:** Focus Blue ring plus border change. Focus must be more explicit than hover.
- **Error / Disabled:** error uses text and icon alongside red; disabled dims through opacity and muted text, not color alone.

### Navigation

Navigation is map-first: search, region movement, board/category switching, active filters, current selection, and incident submission. Mobile navigation should keep the map usable while exposing filters and selected incident details without trapping the user in modal stacks.

### Map Canvas

The map canvas is the signature surface. It must support pointer and keyboard workflows, including Ctrl/Cmd plus plus/minus for zooming and arrow/WASD-style panning where appropriate. Every map-only operation needs a structured non-map alternative for accessibility, search, and comparison.

## 6. Do's and Don'ts

### Do:

- **Do** implement the frontmatter values as OKLCH CSS custom properties, with hex retained here for tooling compatibility.
- **Do** make incident facts, location, responsibility category, source state, and duplicate confidence easier to compare.
- **Do** support light and dark themes with identical hierarchy and neutral civic character.
- **Do** expose uncertainty clearly when duplicate detection, location, or categorization is ambiguous.
- **Do** provide keyboard navigation, visible focus, and non-pointer alternatives for map workflows.
- **Do** use semantic labels and icons alongside color for status, category, risk, and moderation states.
- **Do** keep cards and panels at `8px` radius or less.

### Don't:

- **Don't** make PublicBoard feel like "a social-media feed where expression, virality, identity, and raw comment threads dominate."
- **Don't** make it feel like "a sensational news site that rewards outrage, urgency, or dramatic framing."
- **Don't** make it feel like "a decorative civic campaign with slogans and personality-led branding."
- **Don't** make it feel like "a loose discussion forum where duplicate posts and off-topic opinions accumulate."
- **Don't** make it feel like "a sterile GIS tool that only specialists can understand."
- **Don't** display raw public comment streams as the primary public output; show moderated opinion clusters.
- **Don't** use decorative brand color, gradient text, glass cards, oversized rounded cards, or social engagement metrics.
- **Don't** use soft wide shadows on bordered cards; pick tonal layering, border, or a real overlay shadow.
