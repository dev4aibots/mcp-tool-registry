# DESIGN.md: mcp-tool-registry-demo

> Metadata: This file defines the Logic and Rules for this demo's design system. It mirrors the structure of `primer/primitives`' `DESIGN_TOKENS_GUIDE.md` (repo root, fetched 2026-10-12). For individual token definitions and raw values, refer to `@primer/primitives@11.10.0` `dist/css/functional/themes/{light,dark}.css` and the base/functional token CSS. Research basis: `design-primer.md` in this directory.

**Scope:** 5 views: (1) tool registry browser, (2) incident dashboard, (3) incident detail + acknowledge, (4) live JSON-RPC console, (5) error-path showcase: plus global GitHub chrome (Header, repo breadcrumb, UnderlineNav tabs, footer). Stack: Next.js 14 App Router, `@primer/react@38.40.1`, `@primer/primitives@11.10.0`, `@primer/octicons-react@19.40.0`. Light + dark via `data-color-mode` on `<html>`.

---

## Core Rule

**You are a Primer implementer. Never use raw values (hex, px, font names). Only use semantic tokens via `var(--*)` or `@primer/react` component props.**

If a value cannot be expressed as a Primer token, the design is wrong: change the design, not the rule. Platform-exactness is measured by token fidelity, not by taste.

---

## Logic Matrix: Color Pairings

| Background Token | Foreground Token | Applies to (our views) |
|---|---|---|
| `--bgColor-default` | `--fgColor-default` | Page canvas, incident detail body, console panes |
| `--bgColor-muted` | `--fgColor-default` | Tool cards, schema code blocks, response panel (`--bgColor-inset` also allowed for the response panel) |
| `--bgColor-accent-muted` | `--fgColor-accent` | Selected tool row, active filter chip |
| `--bgColor-danger-muted` | `--fgColor-danger` | Critical incident row highlight, error banner body |
| `--bgColor-success-muted` | `--fgColor-success` | Acknowledged-state confirmation |
| `--bgColor-*-emphasis` | `--fgColor-onEmphasis` | **MUST** pair: `StateLabel` fills, primary `Button` |

**View-specific pairings:**
- **Registry browser:** tool name `Link` = `--fgColor-accent` on `--bgColor-default`; method badges = `Label` tokens, never custom pills.
- **Dashboard:** `StateLabel` (`issueOpened` green / `issueClosed` purple) handles its own pairing: do not override.
- **Console:** request editor text = `--fgColor-default` on `--bgColor-default`; JSON keys `--fgColor-accent`, strings `--fgColor-success`, numbers `--fgColor-attention`, all on `--bgColor-inset`.
- **Error showcase:** `Banner` variants own their pairings: do not restyle.

**Contrast Requirements (WCAG AA, enforced by token choice):**

| Context | Ratio | Notes |
|---|---|---|
| Body text on canvas | 4.5:1 | `--fgColor-default` on `--bgColor-default` meets it in both modes |
| Muted meta text | 4.5:1 | `--fgColor-muted` is the floor: never a lighter gray |
| Large text / UI chrome | 3:1 | `CounterLabel`, tab counts |

---

## Pattern Compression

### Control Tokens

```
--control-[size]-[property]
  ├── size: xsmall | small | medium | large | xlarge
  └── property: size | paddingInline-[density] | paddingBlock
                 └── density: condensed | normal | spacious
```

- **MUST** use control tokens (via `@primer/react` props, which already do) for: Send button, Acknowledge button, filter `ActionMenu` trigger, search `TextInput`, pagination controls.
- Default control size across all 5 views: **medium**. `small` only inside `DataTable` dense rows and dialog footers.

### Stack Tokens

```
--stack-[property]-[size]
  ├── property: gap | padding
  └── size: condensed | normal | spacious
```

- **MUST** use stack tokens for layout: dashboard table → filter bar gap (`--stack-gap-normal`), registry card grid gap (`--stack-gap-spacious`), PageLayout regions handle their own padding: do not add extra.
- Concrete scale: `--space-xxs: 2px`, `--space-xs: 4px`, `--space-sm: 8px`, `--space-md: 12px`, `--space-lg: 16px`, `--space-xl: 24px`.

### Typography Tokens

```
--text-[role]-shorthand-[size]
  ├── role: display | title | body | subtitle | caption | codeBlock | codeInline
  └── size: small | medium | large
```

- View titles: `PageHeader` (owns its type). Section heads: `Heading` as prop, never a raw `<h2>` with a size.
- Incident titles in tables: `--text-body-shorthand-medium` (14px) semibold via `Text` weight prop.
- Meta rows ("opened 2h ago", "200 OK · 41ms"): `--text-caption-shorthand-medium` (12px), `--fgColor-muted`.
- Console I/O: `--text-codeBlock-shorthand-medium`, `--fontStack-monospace`.
- **MUST** use shorthand tokens: they synchronize weight/size/line-height.

### Type Scale (this demo)

| Role | Token | Size | Used for |
|---|---|---|---|
| Page title | `PageHeader` default | 24–32px | One per view |
| Section | `--text-title-shorthand-medium` | 20px | Pane headings, dialog titles |
| Body | `--text-body-shorthand-medium` | 14px | **Default UI text everywhere** |
| Meta | `--text-caption-shorthand-medium` | 12px | Timestamps, counts, latencies |
| Code | `--text-codeBlock-shorthand-medium` | 12px mono | Console editor, schema blocks |

---

## Keyword Enforcement (RFC 2119)

### Motion

```
--motion-[property]-[semantic]
  ├── property: duration | easing | transition
  └── semantic: micro (100ms) | short (200ms) | medium (300ms) | long (500ms)
```

| Keyword | Rule |
|---|---|
| MUST | Use `motion.transition.hover` for button/input state changes only |
| MUST | Respect `prefers-reduced-motion: reduce` → `transition: none` |
| MUST | Provide instant alternatives when motion is reduced |
| NEVER | Animate the dashboard stat counters by default (see design-primer.md §7: skipped with reason) |
| NEVER | Exceed `motion.duration.short` (200ms) anywhere in this demo |
| NEVER | Use motion purely for decoration: GitHub's surface is static; restraint is the platform look |
| NEVER | Create indefinitely looping motion without user control (`Spinner` during RPC round-trip is the sole exception) |

### Typography

| Keyword | Rule |
|---|---|
| **MUST** | Use shorthand tokens (`font: var(--text-*-shorthand-*)`): never bare `font-size` |
| **MUST** | Use `text-codeBlock` for the console editor/response, `text-codeInline` for inline method names |
| **SHOULD** | Match token to semantic role (`title` for headings, `caption` for meta) |
| **SHOULD** | Downgrade one size level below 768px (`title-medium` → `title-small`) |
| **NEVER** | Use `text-caption-shorthand` for multi-line body text |
| **NEVER** | Set a custom `font-family`: `--fontStack-sansSerif` and `--fontStack-monospace` are the only stacks |

### Spacing

| Keyword | Rule |
|---|---|
| MUST | Use control tokens for interactive elements (Send, Acknowledge, filters, pagination) |
| MUST | Use stack tokens for layout gaps; never magic-number margins |
| MUST | Default density: `normal`; `condensed` inside `DataTable`; `spacious` between PageLayout regions |
| SHOULD | Use `--space-md` (12px) as the default component-internal padding |

### Z-Index

```
--zIndex-[layer]
  └── layer: behind | default | sticky | dropdown | overlay | modal | popover | skipLink
```

| Keyword | Rule |
|---|---|
| MUST | Filter `ActionMenu` → `zIndex.dropdown`; Acknowledge `Dialog` → `zIndex.modal`; tooltips → `zIndex.popover` |
| MUST | Pair with shadow level: dropdown→`shadow.floating.small`, dialog→`shadow.floating.large` |
| MUST | Sticky dashboard filter bar → `zIndex.sticky` + `shadow.resting.small` |
| NEVER | Raw numeric z-index values |

**Shadow ↔ Z-Index Alignment (our views):**

| Element | Shadow | Z-Index |
|---|---|---|
| Tool cards, sticky filter bar | `shadow.resting.small` | `default` / `sticky` |
| ActionMenu filters, SelectPanel | `shadow.floating.small` | `dropdown` / `overlay` |
| Acknowledge Dialog, Blankslate visual | `shadow.floating.large` | `modal` |

---

## Border & Radius Rules

- **MUST** use `--borderRadius-medium` (6px) for cards, inputs, buttons, code blocks. `--borderRadius-small` (3px) for `Label`/`Token`. `--borderRadius-large` (12px) only for the console's large response panel if needed. `--borderRadius-full` for pills/`Avatar`.
- **MUST** use `--borderColor-default` (light `#d1d9e0` / dark `#3d444d`) for card/table borders; `--borderColor-muted` for hairline dividers inside cards.
- **NEVER** borderless cards with shadow-only separation: GitHub separates with 1px borders, not elevation.

---

## Decision Tree: Easing Selection

1. Button/input hover or focus change? → `motion.easing.hover` + `motion.transition.hover`
2. Dialog open/close, ActionMenu open? → `motion.easing.enter` / `motion.easing.exit` (keep ≤200ms)
3. Spinner during JSON-RPC round-trip? → `motion.easing.linear` (sole looping exception)
4. Anything else? → No motion. When in doubt, static.

---

## Golden Example: Reference Component

Incident table row: every token rule applied. Build teams: match this density and token discipline on all 5 views.

```css
.incident-row {
  /* Layout: stack tokens only */
  display: flex;
  gap: var(--stack-gap-normal);
  padding-block: var(--space-sm);
  padding-inline: var(--space-md);

  /* Surface: default canvas, hairline divider */
  background-color: var(--bgColor-default);
  border-bottom: 1px solid var(--borderColor-muted);

  /* Type: shorthand only */
  font: var(--text-body-shorthand-medium);
  color: var(--fgColor-default);

  /* Radius: rows are square; interactive children carry radius */
  border-radius: 0;
}

.incident-row:hover {
  background-color: var(--bgColor-muted);
  transition: background-color var(--motion-transition-hover);
}

.incident-row:focus-visible {
  outline: var(--focus-outline);
  outline-offset: var(--outline-focus-offset);
}

.incident-row[data-severity="critical"] {
  box-shadow: inset 2px 0 0 var(--borderColor-danger-emphasis); /* severity rail, no custom hex */
}

.incident-row .meta {
  font: var(--text-caption-shorthand-medium);
  color: var(--fgColor-muted); /* NEVER fgColor-muted on bgColor-muted */
}

@media (prefers-reduced-motion: reduce) {
  .incident-row:hover { transition: none; }
}
```

---

## Interactive States Checklist

All interactive elements MUST define (Primer components do this by default: the checklist is for anything hand-built, e.g. the console editor):

| State | Selector | Required |
|---|---|---|
| Rest | `.element` | ✓ |
| Hover | `:hover` | ✓ |
| Focus | `:focus-visible` | ✓ (NEVER `:focus` alone) |
| Active | `:active` | ✓ |
| Disabled | `:disabled` / `[aria-disabled="true"]` | ✓: use `--bgColor-disabled`/`--fgColor-disabled`, NEVER `opacity` |

---

## Hallucination Guard

> **If you suggest a token name not found in `@primer/primitives` `dist/css` or a component not exported by `@primer/react` (root) / `@primer/react/experimental`, suffix it with `/* check-token */` and verify before shipping.**

---

## Appendix A: Token application per view

### View 1 · Tool registry browser
- Card: `Box`: `bgColor-muted`, `borderColor-default`, `borderRadius-medium`, padding `--space-md`, gap `--stack-gap-spacious` in grid.
- Tool name: `Link` (`--fgColor-accent`); method badge: `Label variant="accent"`.
- Schema block: `--bgColor-inset`, `--borderColor-default`, `--text-codeBlock-shorthand-small`, copy `IconButton`.

### View 2 · Incident dashboard
- Table: `DataTable` (experimental): row hover `--bgColor-muted`, dividers `--borderColor-muted`.
- Status: `StateLabel` (`issueOpened`/`issueClosed`): do not recolor.
- Severity: `Label` variants (verified in `Label.tsx` on `main`): `danger` (critical), `severe` (high), `attention` (medium), `default` (low).
- Age: `RelativeTime` + `--text-caption-shorthand-medium` `--fgColor-muted`.
- Filters: `TextInput` (SearchIcon leading) + `ActionMenu` checkbox items + removable `Token`s in `LabelGroup`.

### View 3 · Incident detail + acknowledge
- `PageLayout`: Header (title + `StateLabel` + labels), Content (description, `Timeline`), Pane (`AvatarStack`, `LabelGroup`, primary `Button` "Acknowledge incident").
- `Timeline.Item` badges: octicons, `--bgColor-muted` badges; connector `--borderColor-muted`.
- Confirm: `Dialog` (or `ConfirmationDialog`) → success `Flash variant="success"` inline.

### View 4 · Live JSON-RPC console
- `SplitPageLayout`: editor `Textarea` monospace on `--bgColor-default`; response `Box` on `--bgColor-inset` with `--borderColor-default`.
- JSON token colors: keys `--fgColor-accent`, strings `--fgColor-success`, numbers/booleans `--fgColor-attention`, punctuation `--fgColor-muted`.
- Status line: `--text-caption-shorthand-medium` `--fgColor-muted` ("200 OK · 41ms"); method `Label`.
- Pre-request empty state: `Blankslate` (experimental). Errors on editor: `FormControl validationStatus="error"`.

### View 5 · Error-path showcase
- Page-level: `Banner` `critical`/`warning`/`info`: never `Flash` here.
- Attempt history: `Timeline` (request → parse fail → retry) or `DataTable`.
- Recovery: `Button` "Retry" + `Link` to docs. Destructive reset: `Button variant="danger"`.

## Appendix B: Global chrome tokens
- `Header`: GitHub dark bar: `--bgColor-inset` (dark `#010409`) in both modes; text `--fgColor-onEmphasis`.
- Repo breadcrumb: `Breadcrumbs` + `Link` accent; `BranchName` pill `--bgColor-accent-muted`.
- `UnderlineNav` tabs with `CounterLabel` counts.
- Footer: single muted row, `--text-caption-shorthand-medium`, `--fgColor-muted`, `Link`s.

## Appendix C: QA
- Taste-QC prompt: https://github.com/admud/taste-index/blob/main/prompts/04-critique.md (raw: https://raw.githubusercontent.com/admud/taste-index/main/prompts/04-critique.md)
- Screenshot matrix: 5 views × light/dark = 10 captures; run the critique prompt against each.
- Upheld gate: claims for `npm run build` exit 0, `tsc --noEmit` exit 0, theme CSS resolvable, zero hardcoded hex outside token CSS.

## Appendix D: Design overhaul (2026-10-12)

Per the shared portfolio contract (`~/workspace/demos/design-overhaul/DESIGN-SYSTEM.md`):

- **Type:** Mona Sans Variable (UI) + Hubot Sans Variable (display accents), both self-hosted via `@fontsource-variable/*` (OFL). Only the font-stack tokens are re-mapped (`--fontStack-sansSerif`, `--fontStack-sansSerifDisplay` which is Primer's own display stack, `--fontStack-system`); every size/leading/tracking number stays a Primer token (12/14/16/20/32/40 scale). Primer's stacks name "Mona Sans VF" but the npm packages do not ship the file, hence the fontsource wiring.
- **Color:** unchanged `@primer/primitives` functional tokens. Contrast gated: `scripts/audit-colors.mjs` (culori, 10 pairs) + `ccr --level AA` in `claims.json`.
- **Layout:** table-first index kept; tools page gained a README-style "About this registry" panel with live `CounterLabel` stats; tool schema dialog gained a "Try in the console" deep link (`/console?preset=N`).
- **Motion:** unchanged, minimal (trace-step 150ms reveal, Primer hover transitions, reduced-motion fallbacks).
- **Copy:** all page descriptions rewritten per the UX-writing contract: 10-second story up top, verb-first labels, jargon with plain glosses ("plug-in pack" for MCP server, "write op" kept as the registry's own label).
- **Gates:** `claims.json` v2 keeps all 6 original claims and adds anti-slop-check.sh, stylelint, ccr contrast, culori audit, and the new wiring files.
