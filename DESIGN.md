# EchoFocus Design System

This file is the single source of truth for every visual and interaction decision in EchoFocus. Read it in full before implementing any UI. If a task spec conflicts with this file, this file wins; stop and ask.

## Product context

EchoFocus is a focus-tracking tool: a Chrome extension (MV3) that tracks browsing behavior and runs a pomodoro timer, plus a Next.js dashboard for analysis. Users are people in long deep-focus stretches (exam prep, job hunting).

The two surfaces have different jobs:

- **Popup**: a real-time status panel glanced at between focus sessions. Target: fully readable in 3 seconds. Real-time info only; nothing that requires "reading".
- **Dashboard**: end-of-day review and settings. This is where polish lives; charts are the visual hero.

Design positioning: a quiet workbench (Linear-style spacing and type discipline). The only ambient moment in the whole product is the active focus timer.

## 1. Core principles

1. The interface recedes; data is the hero. Each screen has exactly one visual hero; everything else yields.
2. Hierarchy comes from type size, weight, spacing, and 1px borders. Never from stacked shadows, gradients, or glassmorphism.
3. All motion shares one duration/easing system. Smoothness comes from a consistent rhythm across the whole product.
4. Color appears only when it carries meaning. No decorative color.
5. When in doubt, choose the quieter option.

## 2. Color tokens

Dual themes are mandatory. All colors go through CSS variables; hardcoded hex values are forbidden.

### Light (default)

```css
--bg:            #F6F7F8;  /* page background */
--surface:       #FFFFFF;  /* cards */
--surface-hover: #F1F3F4;
--border:        #E4E7EA;
--border-strong: #D3D8DC;  /* stronger separation when needed */
--text:          #1A1D21;
--text-secondary:#5C6570;
--text-tertiary: #8A939D;  /* axis labels, timestamps */
```

### Dark

```css
--bg:            #101418;  /* cool blue-gray base, never pure black */
--surface:       #171C22;
--surface-hover: #1D242B;
--border:        #262E36;
--border-strong: #333D47;
--text:          #E7EAED;
--text-secondary:#9AA4AE;
--text-tertiary: #6B7580;
```

### Accent and semantic colors (light / dark pairs; dark variants slightly brighter)

```css
--accent:        #0D9488 / #2DD4BF;  /* brand teal: primary buttons, selected states, focus rings, timer glow */
--accent-subtle: rgba(13,148,136,.10) / rgba(45,212,191,.12);  /* selected background */
--productive:    #16A34A / #4ADE80;  /* productive category, high scores */
--rest:          #D97706 / #FBBF24;  /* rest & browsing category, break state */
--neutral:       #6B7280 / #9CA3AF;  /* neutral category */
--danger:        #DC2626 / #F87171;
```

Color rules:

- Accent appears only on interactive or in-progress elements: primary buttons, selected items, progress, the timer. Headings, icons, and decoration use the text color scale.
- Semantic colors appear only in their semantic role (categories, scores, timer states); never as background washes. The score ring color follows the score via the productive scale.
- The current green-everywhere styling is retired; green narrows to the semantic uses above.
- Contrast: body text ≥ 4.5:1 against its background, secondary text ≥ 4.5:1; tertiary may relax to 3:1 for non-essential info only.

## 3. Typography and hierarchy

```css
--font-sans: "Inter", "Noto Sans TC", "PingFang TC", system-ui, sans-serif;
```

Apply `font-variant-numeric: tabular-nums` to all numbers so countdowns and stats don't jitter.

Only these six type sizes exist:

| Token | Size / Weight | Use |
|---|---|---|
| --text-hero | 40px / 700 | the single hero number per screen (popup countdown or score; Dashboard focus score) |
| --text-title | 20px / 600 | Dashboard page titles |
| --text-stat | 24px / 600 | secondary stat numbers |
| --text-body | 14px / 400 | body text, lists |
| --text-label | 13px / 500 | section labels, buttons |
| --text-caption | 12px / 400 | axis labels, timestamps, helper text |

Hierarchy rules:

- --text-hero appears exactly once per screen.
- Big number, small label: every stat renders as "small label + large number". Never bury numbers inside sentences.
- Section labels use --text-label + --text-secondary, sentence case. No all-caps, no letter-spacing.
- Line height: 1.6 for Chinese text, 1.2 for numbers and Latin text.

## 4. Spacing, radius, layering

- Spacing uses the 4px scale only: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48. Related elements get small gaps, sections get large gaps; whitespace does half the hierarchy work.
- Radius: 8px cards, 6px buttons and inputs, full for pills and the score ring. These three values are the entire radius system.
- Layering: surface color + 1px border. Exactly one shadow exists, reserved for floating elements (dropdowns, tooltips): `0 4px 12px rgba(0,0,0,.08)` (dark theme: .3). Cards have no shadow.
- Dashboard content column: 1200px max width (header and main share it); the settings form stays on its narrower 48rem measure.
- Alignment: left-align everything. Centering is allowed only in the popup's top status module and its three-category row beneath — they share one axis; everything below (distribution bar labels, site list) is left-aligned.

## 5. Motion (the engineering definition of "smooth")

```css
--dur-fast: 100ms;   /* hover, press, focus ring */
--dur-base: 150ms;   /* expand, toggle, tooltip */
--dur-slow: 400ms;   /* top status module crossfade, theme switch */
--ease: cubic-bezier(0.2, 0, 0, 1);  /* the only easing in the product */
```

Required:

- Every click shows visual feedback within 100ms (pressed state). Data mutations use optimistic updates; never wait for the API to reflect the action.
- Async content uses skeletons matching final dimensions. Zero layout shift after load.
- State changes are bridged with transitions: the popup's top module switches via a 400ms crossfade (old fades out, new fades in, height transitioned). Hard cuts are forbidden.
- Animate only opacity and transform. Never animate width/height/top directly (transition height via grid-template-rows or measured transforms).
- Under `prefers-reduced-motion: reduce`: all transitions drop to 0ms; the breathing glow becomes a static faint glow.

One sanctioned data reveal: the Today score tally. On page view (and on date
navigation) the score numeral counts up to its value and the ring arc sweeps
with it, ~700ms, ease-out — the feeling of the score being settled. It is the
dashboard's single choreographed moment, the counterpart of the popup timer's
breathing glow, and the pair are the only such moments in the product. Under
reduced motion it renders the final value directly.

Forbidden:

- Per-section fade + slide-up entrance animations.
- Infinite decorative animations (single exception: the timer breathing in section 6).
- Bounce / spring easing.
- Scaling or glowing cards on hover. Hover may only shift the background to `--surface-hover` or deepen the border.

## 6. Timer states (the product's only ambient moment)

The pomodoro timer has four states, distinguishable by color and motion without reading any text:

| State | Visual |
|---|---|
| idle | No glow. Top module shows score ring + today's total + a "Start focus" button |
| focusing | Countdown is the hero. Ring uses --accent; a breathing glow outside the ring (`box-shadow` or a blurred pseudo-element), opacity 0.12 ↔ 0.24, 4s ease-in-out cycle. That is the ceiling; brighter turns cheap |
| break | Same layout; ring and glow switch to --rest, glow opacity capped at 0.16, lighter than focusing |
| paused | Keeps the focusing layout; ring turns --text-tertiary, glow and breathing stop, countdown digits drop to 0.6 opacity |

The breathing glow is the only ambient animation allowed anywhere; the sanction covers the Guide's interactive demo of this same timer component. Anything similar elsewhere is a violation.

## 7. Popup spec

Width 380px, top to bottom:

1. Header: logo + tracking toggle
2. Current site row (domain + category color dot for the current session)
3. **Top status module** (the only centered area; switches by timer state, see section 6)
   - idle: score ring (--text-hero) + "Today total" hours + Start focus button
   - focusing / break / paused: countdown (--text-hero) + pause/resume + skip; the score shrinks to one --text-caption line at the module's bottom
4. Three category numbers: Productive / Rest & browsing / Neutral, label + number, one row, three centered columns on the status module's axis
5. 24-hour mini distribution bar (max height 40px; communicates only "which hours I focused today")
6. Today's top 5 sites (domain + category dot + duration, single-line rows)
7. Footer: date, "View full analysis" link to Dashboard, settings icon linking to Dashboard settings

Rules:

- Nothing on the popup takes more than a few seconds to read. The daily insight never appears on the popup; its entry point is the footer link.
- Pomodoro durations are not configured in the popup; a small link goes to Dashboard settings. The popup only has start, pause/resume, skip.
- Extension icon badge shows remaining minutes (accent background while focusing, rest background during break); cleared when idle.

## 8. Dashboard spec

Dashboard polish comes from chart quality, never from effects.

- One hero chart per page; remaining stats render as quiet number groups.
- Line charts: 2px stroke, round caps; area fill is a flat --accent at 6% opacity, no gradients.
- Gridlines: 1px, --border color, horizontal only; axis labels use --text-caption + --text-tertiary.
- Tooltip: --surface background + 1px border + the one floating shadow, 150ms fade-in, follows the cursor without bouncing.
- Hover highlight: active data point grows to 4px radius, other series drop to 0.3 opacity, 150ms transition.
- Empty states are designed: one sentence on what will appear here + the next action. No illustrations.
- "Daily snapshot" and "Daily insight" merge into a single "Today's review" block: data on top (total time, score, category split), AI insight text below.
- The settings page holds the theme selector (Light / Dark / Follow system, next to language) and the pomodoro settings (focus duration, break duration, reminder toggle; defaults 25 / 5). Saved values reach the popup by the next time it opens — the popup pulls the cloud copy on open.

## 9. Copy and tone

The UI is bilingual (EN / zh-TW) via the existing i18n setup; these rules apply to both languages.

- Interface copy starts with a verb and says exactly what happens: "Start focus", not "Go".
- AI insight text: steady tone, state the data and observations plainly, close with one concrete suggestion. At most one exclamation mark per insight; default is zero. Openers like "Amazing!" or cheering are forbidden.
- Error messages say what happened and how to fix it. No apologies, no cuteness.
- zh-TW copy keeps a half-width space between CJK and Latin/numeric characters.

## 10. Forbidden list (AI-slop red lines)

- Purple / blue-purple gradients; gradient buttons of any kind
- Site-wide glassmorphism or glowing borders
- Centered card-stack layouts
- One radius + one shadow applied to everything
- ALL-CAPS letter-spaced eyebrow labels
- "→" appended to link or button text
- Emoji as functional icons (icons are lucide line icons, 1.5px stroke)
- Meaningless entrance animations and hover glows
- Pure black #000 / #0B0B0B backgrounds
