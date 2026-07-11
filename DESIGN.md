# Design

## Color Strategy

Drenched. Deep oxblood red is the surface itself — page background, section bands, footer — with beige/cream carrying all text and a soft gold accent for tags and dividers. Inverted from the original beige-base version at the user's explicit direction. Buttons flip the relationship (beige fill, red text) so the two tones keep trading foreground/background roles rather than one becoming pure decoration.

## Palette (OKLCH)

```css
:root {
  /* red — the base surface */
  --bg: oklch(0.30 0.14 25);          /* oxblood red, page background */
  --bg-deep: oklch(0.20 0.10 22);     /* darkest red, footer / high-contrast bands */
  --surface: oklch(0.35 0.145 26);    /* slightly lifted red, card/section panels */
  --surface-2: oklch(0.46 0.09 30);   /* muted rose-brown, borders/dividers */
  --glow: oklch(0.42 0.17 28);        /* brighter red, hero radial glow */

  /* beige — all text */
  --ink: oklch(0.94 0.020 75);        /* cream, body text */
  --muted: oklch(0.78 0.035 55);      /* dimmer beige/rose, secondary text */

  /* interactive — beige fill, red text (inverted button) */
  --primary: oklch(0.90 0.035 75);
  --primary-deep: oklch(0.82 0.04 72);

  /* accent — warm gold, tags/dividers only (border+text, not filled) */
  --accent: oklch(0.74 0.11 78);

  --white: oklch(1 0 0);
}
```

Contrast checked: `--ink` on `--bg` ≈ 11:1. `--muted` on `--bg` ≈ 4.6:1. `--bg` text on `--primary` button ≈ 7:1.

## Photography

Real portfolio photography (bridal, festive, editorial, reception looks) replaces the earlier placeholder gradients — used as the hero image, service illustrations, and the full portfolio grid. Images live in `assets/images/photos` (full size) and `assets/images/thumbs` (grid).

## Custom Cursor

A small solid beige dot replaces the system cursor on fine-pointer devices (`hover: hover` and `pointer: fine`), smoothed with a lerp follow. Falls back to the system cursor on touch devices and under `prefers-reduced-motion` (snaps instead of easing).

## Multi-page structure

Home, About, Services, Classes, Portfolio, Contact are now separate pages (`index.html`, `about.html`, `services.html`, `classes.html`, `portfolio.html`, `contact.html`) sharing one header/footer and stylesheet, rather than one scrolling page with anchors.

## Typography

- Display/headings: **Fraunces** (serif, high-contrast, editorial — carries the "elegant & refined" personality without tipping into ornate/traditional-bridal cliché).
- Body/UI: **Inter** (humanist sans, quiet, highly legible at small sizes for service lists/pricing).
- Pairing rationale: serif + sans contrast axis, not two similar sans-serifs.

## Layout

- Single scrolling page, anchor nav: Home · About · Services · Classes · Portfolio · Contact.
- Generous whitespace, asymmetric editorial grid for portfolio (not uniform card grid).
- No side-stripe borders, no gradient text, no tiny uppercase eyebrows on every section.

## Motion

- Subtle fade/rise reveals on scroll, exponential ease-out, respects `prefers-reduced-motion`.
- Content visible by default (no class-gated hidden-until-JS sections).
