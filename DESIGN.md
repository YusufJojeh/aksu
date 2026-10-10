---
name: Dental Operations & Treatment Plan Generator
description: A warm proofing desk where clinic PDFs are filled, checked, and archived.
colors:
  ink: "#2f2b2c"
  proof-gold: "#c99b2e"
  parchment: "#f5f2ed"
  sheet-white: "#ffffff"
  graphite: "#44403c"
  pencil-grey: "#78716c"
  rule-line: "#d6d3d1"
  hairline: "#e7e5e4"
  correction-red: "#b91c1c"
  admin-canvas: "oklch(1 0 0)"
  admin-ink: "oklch(0.145 0 0)"
  admin-border: "oklch(0.922 0 0)"
typography:
  headline:
    fontFamily: "Geist Variable, Noto Sans Arabic, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.33
  title:
    fontFamily: "Geist Variable, Noto Sans Arabic, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist Variable, Noto Sans Arabic, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Geist Variable, Noto Sans Arabic, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.43
  caption:
    fontFamily: "Geist Variable, Noto Sans Arabic, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "20px"
  xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet-white}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.graphite}"
  button-outline:
    backgroundColor: "{colors.sheet-white}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-danger:
    backgroundColor: "{colors.correction-red}"
    textColor: "{colors.sheet-white}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-icon:
    backgroundColor: "{colors.sheet-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    size: "44px"
  input:
    backgroundColor: "{colors.sheet-white}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
  tabs-list:
    backgroundColor: "{colors.hairline}"
    rounded: "{rounded.lg}"
    padding: "4px"
  tab-active:
    backgroundColor: "{colors.sheet-white}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.sheet-white}"
    rounded: "{rounded.xl}"
    padding: "16px"
---

# Design System: Dental Operations & Treatment Plan Generator

## Overview

**Creative North Star: "The Proofing Desk"**

The app is the workbench of a print shop, and the clinic PDF is the proof lying on it. The desk is warm parchment. Sheets of white paper hold the forms. Ink-dark controls do the work, and a single gold mark points to whatever needs attention: focus, the active field, a section's start. The PDF preview is always the hero. The interface around it is tactile and warm, with paper-like surfaces, soft depth, and a firm press under every button, but it never competes with the clinic's own artwork.

Density is calm rather than packed. Sales staff work on laptops and phones, so controls stay large (40–44px), labels are always visible, and the editor and preview sit side by side on desktop and swap with a tab on mobile. The admin side is the back office of the same shop: the standard neutral component theme in Geist, plainer and denser, with colour reserved for data.

Confirmed rejections:
- **Flashy SaaS marketing:** no gradients, glow or glassmorphism.
- **Medical/clinical blue:** no cold hospital-blue sterility.

**Key Characteristics:**
- Warm parchment desk, white paper sheets, ink controls, one gold accent.
- The PDF preview dominates; the UI chrome stays quieter than the clinic artwork.
- Tactile feedback: soft paper shadows and a `scale(0.97)` press.
- One typeface (Geist, with Noto Sans Arabic as fallback) across sales and admin. RTL is first-class.

## Colors

A warm, low-saturation paper palette with a single precious-metal accent.

### Primary
- **Ink** (`{colors.ink}`): primary buttons, body text, the active nav item, checked checkboxes, caret and form accent colour. The working colour of the desk.

### Secondary
- **Proof Gold** (`{colors.proof-gold}`): focus rings, the input focus border, the short underline under each section heading, and card hover borders. It marks attention and is never a fill for large areas.

### Neutral
- **Parchment** (`{colors.parchment}`): the page/desk background behind every sales screen.
- **Sheet White** (`{colors.sheet-white}`): form panels, cards, inputs and the nav bar.
- **Graphite** (`{colors.graphite}`): primary button hover and field labels.
- **Pencil Grey** (`{colors.pencil-grey}`): placeholders, metadata and timestamps.
- **Rule Line** (`{colors.rule-line}`): input and outline-button borders, unchecked checkboxes.
- **Hairline** (`{colors.hairline}`): section dividers, card borders and the tab track.
- **Correction Red** (`{colors.correction-red}`): destructive buttons, field errors and alerts.
- **Admin Canvas / Admin Ink / Admin Border:** the neutral component theme for the admin dashboard. Admin charts use the categorical `--dash-1…8` palette from `src/styles.css`.

### Named Rules
**The One Gold Mark Rule.** Gold indicates attention: focus, the active field, the start of a section. Never use it as a button fill or a background wash. If two gold things compete on one screen, one of them is wrong.

**The Clinic Owns Colour Rule.** Brand colour belongs to the clinic artwork inside the PDF. The surrounding UI stays parchment, ink and gold, so the two clinics' identities never bleed into each other or into the chrome.

## Typography

**Body Font:** Geist Variable (with Noto Sans Arabic, ui-sans-serif, system-ui)

**Character:** One clean, contemporary sans for everything. Hierarchy comes from weight and size, not from a second family, so Arabic fallback text sits evenly beside Latin text.

### Hierarchy
- **Headline** (700, 1.5rem): page titles such as "My Reports" and "Select a clinic".
- **Title** (700, 1rem, -0.025em): form section headings, each followed by a 32px gold underline.
- **Body** (400, 0.875rem): inputs, list text and descriptions.
- **Label** (600, 0.875rem): buttons and tabs. Field labels use 500 in graphite.
- **Caption** (500, 0.75rem): metadata, timestamps and inline field errors.

### Named Rules
**The Tabular Money Rule.** Tables and totals use tabular figures, so prices line up in their columns.

## Layout

- **Sales shell:** a full-viewport flex column. The nav bar sits on top; it is sticky from `sm` (640px) upward and scrolls away on phones.
- **Workspace (desktop, `lg` 1024px and up):** two panes filling the remaining height. The editor is on the left (`minmax(520px, 45%)`) and the PDF preview on the right. Each pane scrolls independently, and the page itself never scrolls.
- **Workspace (below `lg`):** an Edit/Preview tab switches between the two panes.
- **Content widths:** content is capped at 1800px. List pages (My Reports) cap at 72rem.
- **Spacing:** 4px base. Sections use 20/28px horizontal padding and 24px vertical padding. Groups of controls sit 8px apart.
- **Nav on phones:** controls regroup into a two-column grid (name and phone side by side, with full-width sign-in below) instead of wrapping raggedly.

## Elevation & Depth

Depth is mostly tonal: white sheets on a parchment desk, separated by hairline borders. Shadows are soft and paper-like. Small surfaces get a hint of lift. The PDF page gets one deep shadow, so it reads as a physical proof lying on the desk.

### Shadow Vocabulary
- **Sheet** (`box-shadow: 0 1px 2px rgb(0 0 0 / 0.05)`): cards, icon buttons and the active tab.
- **Lifted Sheet** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): a clinic card on hover.
- **Proof** (`box-shadow: 0 18px 55px rgb(22 18 18 / 20%)`): only for the rendered PDF page in the preview.

### Named Rules
**The One Proof Rule.** The deep Proof shadow belongs to the PDF page alone. No other surface may be lifted that high.

## Shapes

Gently rounded, never pill-shaped:
- 8px on buttons, inputs and tabs.
- 10px on the tab track.
- 14px on cards and list rows.

Borders are 1px hairlines. Checkboxes use a 2px rule-line border that fills with ink when checked. A paper-dot texture (`.paper-texture`, 15px grid) may sit behind the preview.

## Components

### Buttons
Firm, inked and tactile.
- **Shape:** gently rounded (8px). At least 40px tall; icon buttons are 44px square.
- **Primary:** ink fill with white label. Hover darkens to graphite.
- **Outline:** white with a rule-line border. Hover tints to stone-100. Used for secondary and inactive nav items.
- **Danger:** correction-red fill. Only used for destructive confirmations.
- **Press / Focus:** `scale(0.97)` over 140ms `cubic-bezier(0.23, 1, 0.32, 1)`, with explicit transition properties only. Focus shows a 2px gold ring. Disabled buttons drop to 50% opacity.

### Inputs / Fields
- **Style:** white, 1px rule-line border, 8px radius, 40px tall. The label always sits above the input, never as a placeholder.
- **Focus:** the border turns gold, with a soft 2px gold glow at 20%.
- **Error / Disabled:** a field with an error gets a red ring around the whole field and a red caption that is announced as an alert. Disabled fields go to stone-50 with a not-allowed cursor.

### Tabs
- **Style:** a hairline-grey track with 4px padding. The active tab is a white sheet with ink text and the Sheet shadow. Inactive tabs are stone-600 and darken to ink on hover (pointer devices only).

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** sheet white on parchment, with a hairline border.
- **Shadow Strategy:** Sheet at rest. Clinic cards lift 2px with Lifted Sheet and a gold border on hover (pointer devices only), and press to `scale(0.98)`.
- **Internal Padding:** 16–24px.

### Navigation
- **Style:** a white bar with a hairline bottom border. The current view uses the ink primary button with `aria-current="page"`; other views use outline buttons.
- **Mobile treatment:** the bar is not sticky, and the identity fields regroup into a two-column grid.

### Section Heading (signature)
A bold 16px title with a 32px × 2px gold underline at the start edge. It flips correctly in RTL. This is how every form section begins.

## Do's and Don'ts

### Do:
- **Do** keep the PDF preview the largest, most elevated thing on screen.
- **Do** use ink for action and gold only for attention (focus, active, section start).
- **Do** give every pressable element `scale(0.97)` press feedback with the strong ease-out, kept under 300ms.
- **Do** gate hover motion behind `@media (hover: hover)`.
- **Do** keep touch targets at least 40px (44px for icon buttons) and labels visible above fields.
- **Do** mirror layouts for RTL with logical properties (`ms-`, `me-`, `start-`).

### Don't:
- **Don't** use gradients, glow, glassmorphism or other flashy SaaS-marketing styling.
- **Don't** introduce cold clinical/hospital blue into the sales interface.
- **Don't** fill large areas or buttons with gold.
- **Don't** let either clinic's brand colours leak into the shared chrome.
- **Don't** use `transition: all` or hard-coded `100vh` offsets for pane heights.
