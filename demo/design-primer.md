# Primer Research — mcp-tool-registry demo (GitHub-exact UI)

**Researched:** 2026-10-12 · **Researcher:** platform-design researcher (subagent, max effort)
**Canonical stack:** `primer/react` + `primer/css` + `primer/primitives` (official GitHub repos, all MIT — verified from LICENSE texts via API today)
**Target:** Next.js 14 (App Router) on Vercel, light + dark mode, GitHub-exact

Every version below was verified live today (GitHub releases API + npm registry + primer/react `main` source). No number is from memory.

---

## 1. Verified versions (2026-10-12)

| Package | Version (verified today) | Source |
|---|---|---|
| `@primer/react` | **38.40.1** | GitHub release `@primer/react@38.40.1`, published 2026-10-01 |
| `@primer/css` | **22.3.2** | npm registry `latest` tag |
| `@primer/primitives` | **11.10.0** | npm registry `latest` tag |
| `@primer/octicons-react` | **19.40.0** | GitHub release `@primer/octicons-react@19.40.0`, published 2026-10-07 |
| `react` / `react-dom` peer range for @primer/react 38.40.1 | **18.x \|\| 19.x** | `packages/react/package.json` on `main` |

Repo health (verified via API today): `primer/react` 3,917★ / pushed 2026-10-09 · `primer/css` 13,033★ / pushed 2026-10-11 · `primer/primitives` 415★ / pushed 2026-09-09. All MIT.

### Install command (exact, pinned)

```bash
npm install -S @primer/react@38.40.1 @primer/primitives@11.10.0 @primer/css@22.3.2 @primer/octicons-react@19.40.0
```

The official README (`primer/react` `main`) prescribes `npm install -S @primer/react @primer/primitives` — those two are the mandatory pair. `@primer/css` is the canonical GitHub stylesheet (utilities/components); `@primer/octicons-react` is the official icon set (do not use emoji or third-party icons anywhere).

---

## 2. Next.js 14 compatibility — verified findings

**Bottom line: @primer/react 38.40.1 is fully Next.js 14 App Router compatible.** Evidence from `packages/react/package.json` on `main`:
- **Zero CSS-in-JS runtime deps.** `dependencies` (18 packages) contains no styled-components / emotion. Components are CSS Modules + functional CSS → **no SSR registry, no `styled-components` compiler flag, no flash-of-unstyled-content workaround needed.** (The old styled-components SSR pain is gone; do not copy old "Primer + Next.js SSR" blog setups.)
- Peer deps `react: 18.x || 19.x` — Next.js 14 ships React 18.3.1, inside the supported range. (Primer's own `examples/nextjs` pins Next 16 + React 19, but that is the example's choice, not a requirement.)

### Caveats that DO apply (honest list)

1. **Client components are required at interaction boundaries.** `ThemeProvider`, `BaseStyles`, `useTheme`, `ActionMenu`, `Dialog`, `DataTable` are client components. Importing them into a Server Component file is allowed (they become client boundaries) — but any file calling `useTheme()` / `useState` / event handlers needs `'use client'`. Server Components stay the default elsewhere; keep data-fetching there.
2. **`suppressHydrationWarning` on `<html>` is required.** The color-mode attributes on `<html>` can differ between SSR and client (cookie-based preference). This is the official pattern in `examples/nextjs` and `examples/theming` — not optional.
3. **`cookies()` in RootLayout opts the whole app into dynamic rendering.** The official theming example reads a `color-preference` cookie in `layout.tsx` to set `data-color-mode` server-side (avoids theme flash). Consequence: pages under that layout are not statically optimized. Acceptable for this demo; if static export is ever needed, drop the cookie read and default to `data-color-mode="auto"`.
4. **`@primer/react/experimental` subpath.** `DataTable`, `Table`, `Blankslate`, `PageHeader`, `IssueLabel` are NOT in the root export — they live under `@primer/react/experimental` (verified in `packages/react/src/experimental/index.ts` on `main` today). API-stable in practice, but flag them in code review and pin the version.
5. **`@primer/css` is large — import selectively.** The official `examples/nextjs` does **not** import `@primer/css` at all; theming comes from the `@primer/primitives` CSS files. If you import all of `@primer/css`, you get GitHub's utility classes but also a heavy stylesheet and possible conflicts with App Router's CSS ordering. Recommendation: install it (canonical stack), but only `@import` specific primer/css bundles you actually use (e.g. utilities), or skip the import and rely on @primer/react + @primer/primitives.
6. **CSS `@import` order in `app/global.css`.** The primitives `@import`s must come first, before any Tailwind directives or custom CSS. (We should not use Tailwind at all here — Primer tokens replace it; see "Do NOT do".)
7. **Mona Sans VF is referenced but not shipped.** The font stack lists `"Mona Sans VF"` first, but the npm packages don't bundle the font file. GitHub loads it from their CDN. Without it, the stack falls back to system fonts — visually near-identical on macOS/Windows. Optional: self-host Mona Sans (OFL license, from github/mona-sans) via `next/font/local` for pixel-exactness. Not required for the demo.

---

## 3. Theme setup — exact code (adapted from `primer/react` `examples/theming` on `main`)

### `app/global.css`
```css
@import '@primer/primitives/dist/css/primitives.css';
@import '@primer/primitives/dist/css/functional/themes/light.css';
@import '@primer/primitives/dist/css/functional/themes/dark.css';

body {
  color: var(--fgColor-default);
  background-color: var(--bgColor-default);
}
```

### `app/layout.tsx` (server component)
```tsx
import './global.css'
import {cookies} from 'next/headers'
import {BaseStyles, ThemeProvider} from '@primer/react'

export default async function RootLayout({children}: {children: React.ReactNode}) {
  const cookieStore = await cookies()
  const colorMode = getColorMode(cookieStore.get('color-preference')?.value)

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-color-mode={colorMode}
      data-light-theme="light"
      data-dark-theme="dark"
    >
      <body>
        {/* Theme attributes live on <html>; contextOnly avoids an extra DOM wrapper */}
        <ThemeProvider colorMode={colorMode} contextOnly>
          <BaseStyles>{children}</BaseStyles>
        </ThemeProvider>
      </body>
    </html>
  )
}

function getColorMode(preference?: string): 'light' | 'dark' | 'auto' {
  if (preference === 'light' || preference === 'dark') return preference
  return 'auto' // follows OS preference via media query
}
```

Why this works: the primitives theme files define variables under `[data-color-mode="light"][data-light-theme="light"]` and `[data-color-mode="dark"][data-dark-theme="dark"]` selectors (verified in the shipped `light.css`/`dark.css` on unpkg today). Setting the attributes on `<html>` flips the entire token set; every `@primer/react` component reads `var(--bgColor-*)` / `var(--fgColor-*)`, so light/dark comes free.

### Theme toggle (client component, `'use client'`)
```tsx
import {SunIcon, MoonIcon} from '@primer/octicons-react'
import {IconButton, useTheme} from '@primer/react'

export function ThemeToggle() {
  const {colorMode, setColorMode} = useTheme()
  return (
    <IconButton
      aria-label="Toggle color mode"
      icon={colorMode === 'dark' ? SunIcon : MoonIcon}
      variant="invisible"
      onClick={() => {
        const next = colorMode === 'dark' ? 'light' : 'dark'
        document.documentElement.setAttribute('data-color-mode', next)
        setColorMode(next)
        // POST to /api/color-preference to persist the cookie (see official example)
        fetch('/api/color-preference', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({colorMode: next}),
        })
      }}
    />
  )
}
```
The official example persists via `app/api/color-preference/route.ts` writing a `color-preference` cookie — wire that route so the preference survives reloads and SSR matches on first paint.

---

## 4. Component map — per view (all names verified in `packages/react/src` today)

**Global chrome** (every page):
- `Header` — the dark github.com top bar (logo, nav, search slot, avatar). Pair with `TextInput` (invisible variant) for the command-palette-style search, `IconButton` for the theme toggle, `Avatar` for the user.
- Repo-context breadcrumb (like `github.com/dev4aibots/mcp-tool-registry`): `Breadcrumbs` + `Link` + `BranchName` (for the `main` branch pill). GitHub's repo header = Breadcrumbs(repo path) → Tabs (`UnderlineNav`: Code · Issues · Pull requests · Actions …) → right side: `ButtonGroup` (Watch/Fork/Star with `CounterLabel` counts).
- `PageHeader` (`@primer/react/experimental`) for per-view titles, description, and leading/trailing actions.
- Footer: minimal — `Text` (caption, `fgColor-muted`) + `Link`s. GitHub's footer is a thin muted row, not a marketing footer.
- `BaseStyles` wraps everything (from layout).

### View 1 — Tool registry browser (tool cards + schemas)
- Layout: `PageLayout` (stable) with `Content` region; cards in a responsive grid via `Stack` — or `DataTable` (`experimental`) for a dense github-style listing. **Choose: `DataTable` for the tool list** (columns: name, description, method, params) — it is the GitHub-native pattern for tabular data and supports sorting; tool detail opens in a side panel / `Dialog`.
- Tool name: `Link` (accent color) + `Label` (e.g. `json-rpc`, `stdio` as muted labels).
- Schema display: code block in `Box` with `borderColor-default`, monospace `Text` (`--fontStack-monospace`), `bgColor-muted`. Copy button: `IconButton` + `ClipboardIcon`.
- Method badges: `Label` with `variant="accent"` / `"success"`.

### View 2 — Incident dashboard (filterable incident list)
- `DataTable` (`experimental`) with sortable columns: severity, status, title, age (`RelativeTime` for "opened 2h ago").
- Status: `StateLabel` with `status="issueOpened"` (green) / `"issueClosed"` (purple) — the exact GitHub issue-state pill. Alert-flavored alternative exists: `alertOpened` / `alertFixed` / `alertDismissed` (shield icons, verified in `StateLabel.tsx`). Severity: `Label` variants — `danger` (critical), `severe` (high), `attention` (medium), `default` (low).
- Filters: `TextInput` with `SearchIcon` leading visual for free-text; `ActionMenu` (checkbox items) for severity/status filters; `SelectPanel` if multi-select with search is needed. Filter chips: `LabelGroup` with removable `Token`s.
- Bulk acknowledge: `DataTable` row selection + `Button` ("Acknowledge selected").

### View 3 — Incident detail + acknowledge
- `PageLayout` (stable): `Header` region = title + `StateLabel` + `Label`s; `Content` = description/timeline; `Pane` = sidebar (assignees `AvatarStack`, labels `LabelGroup`, "Acknowledge" `Button` primary).
- Activity: `Timeline` (stable) with `Timeline.Item` + `Badge` — mirrors GitHub issue timelines exactly.
- Acknowledge flow: `Button` (primary, "Acknowledge incident") → `Dialog` (stable) with confirm copy → on success, `StateLabel` flips to closed + `Flash` (`variant="success"`) inline confirmation. Use `ConfirmationDialog` (stable) if the copy is a one-line confirm.

### View 4 — Live JSON-RPC console (request editor + response panel)
- Two-pane: `SplitPageLayout` (stable) — left `Textarea` (monospace, `Text` with `--fontStack-monospace`) as the request editor with a `Select` for method presets (`incidents_list`, `incidents_get`, `incidents_ack`); right: response panel (`Box`, `borderColor-default`, `bgColor-inset`) rendering pretty JSON with `Text`.
- Send: `Button` primary ("Send request") + `Spinner` while the stdio round-trip runs.
- Empty state before first request: `Blankslate` (`experimental`) with `Visual` (octicon) + `Heading` + `Description` — the GitHub-native empty state.
- Validation errors: `FormControl` with `validationStatus="error"` + caption on the editor.
- Latency/status line: `Text` caption muted ("200 OK · 41ms") + `Label` for method.

### View 5 — Error-path showcase
- `Banner` (stable) variants: `critical` (connection refused), `warning` (timeout), `info`/`success`. **Prefer `Banner` over `Flash` for page-level callouts** — `Banner` is the current GitHub pattern; `Flash` is for inline/component-level messages.
- Malformed-response diff: `Timeline` (each attempt an item: request sent → parse failed → retry) or a `DataTable` of attempts.
- Recovery action: `Button` ("Retry", "Reset console") + `Link` to docs.

### Code display approach (all views)
No third-party highlighter needed for platform-exactness: GitHub code blocks = `Box`/`Text` with `--fontStack-monospace`, `--text-codeBlock-shorthand-*`, `bgColor-muted`, `borderColor-default`, `borderRadius-medium`. If syntax highlighting is wanted, hand-roll a tiny JSON tokenizer coloring with Primer semantic tokens (`--fgColor-accent` keys, `--fgColor-success` strings, `--fgColor-attention` numbers) — never a theme from another design system.

---

## 5. Design tokens — exact values (verified from shipped `@primer/primitives@11.10.0` CSS today)

**Font stacks:**
```css
--fontStack-sansSerif: "Mona Sans VF", -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans Backtick Fix", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
--fontStack-monospace: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
```
Body text 14px (`--text-body-size-medium`), page titles via `PageHeader` (no hand-set sizes). **Always use the `*-shorthand` tokens** (they sync weight/size/line-height); never set `font-size` alone.

**Radii:** `--borderRadius-small: 3px` · `--borderRadius-medium: 6px` (**default — use for cards, inputs, buttons**) · `--borderRadius-large: 12px` · `--borderRadius-full: pill`. Buttons/inputs on github.com are 6px.

**Spacing (functional):** `--space-xxs: 2px` · `--space-xs: 4px` · `--space-sm: 8px` · `--space-md: 12px` · `--space-lg: 16px` · `--space-xl: 24px`. Base scale runs 2/4/6/8/12/16/24/32… — everything is a multiple of 4 except the 2/6 steps.

**Key colors — light (`light.css`) / dark (`dark.css`):**
| Token | Light | Dark |
|---|---|---|
| `--bgColor-default` | `#ffffff` | `#0d1117` |
| `--bgColor-muted` | `#f6f8fa` | `#151b23` |
| `--bgColor-inset` | `#f6f8fa` | `#010409` |
| `--borderColor-default` | `#d1d9e0` | `#3d444d` |
| `--fgColor-default` | `#1f2328` | `#f0f6fc` |
| `--fgColor-muted` | `#59636e` | `#9198a1` |
| `--fgColor-accent` (links) | `#0969da` | `#4493f8` |
| success / danger emphasis | `#1f883d` / `#d1242f` | (dark equivalents in theme file) |

Dark values verified from `dark.css` today (bg #0d1117, fg #f0f6fc, muted bg #151b23, border #3d444d, muted fg #9198a1, accent #4493f8). **Builder rule: never hardcode a hex — always `var(--token)`.** The full token set is in `@primer/primitives` `dist/css/functional/themes/{light,dark}.css`.

**Motion (from primitives):** hover/focus transitions `var(--motion-transition-hover)` (≤100ms micro); UI state changes ≤200ms; nothing decorative; always `@media (prefers-reduced-motion: reduce)` → `transition: none`. GitHub's UI is essentially static — restraint IS the platform look.

---

## 6. Do NOT do (breaks the GitHub look)

1. **No Tailwind (or any utility framework) for styling.** Primer tokens + `@primer/react` replace it. Mixing Tailwind's preflight/defaults fights `BaseStyles`.
2. **No custom hex colors, no gradients, no shadows beyond Primer's.** If a color isn't a `--*` token, it doesn't ship.
3. **No border-radius other than 3/6/12/pill.** Especially no `rounded-xl`/`rounded-2xl` habits.
4. **No emoji as icons.** Octicons only (`@primer/octicons-react`).
5. **No marketing-hero patterns.** No bento grids, no marquees, no glow effects, no gradient text — this is a developer tool surface, not a landing page. (See §7.)
6. **No `font-size`/`line-height` one-off declarations.** Use `text-*-shorthand-*` tokens or `Text`/`Heading` props.
7. **Don't import all of `@primer/css`.** The official Next.js example doesn't; heavy global CSS risks ordering conflicts with App Router. Use `@primer/react` + `@primer/primitives` CSS; cherry-pick primer/css bundles only if a specific utility is needed.
8. **Don't put `data-color-mode` handling in JS state alone.** The attributes must be on `<html>` (SSR-first via cookie, toggled via `document.documentElement`) or first paint flashes.
9. **Don't use `:focus` alone — always `:focus-visible`.** Primer's own guide mandates it.
10. **Don't use `Flash` for page-level alerts** (use `Banner`); don't use `opacity` for disabled states (use `--bgColor-disabled`/`--fgColor-disabled` tokens).
11. **Don't invent component names.** `DataTable`, `Blankslate`, `PageHeader` come from `@primer/react/experimental`, not the root. Verified today — wrong import path = build break.
12. **Don't restyle Primer components to "look nicer."** Default props ARE the GitHub look. Customization budget: zero, except layout composition.

---

## 7. Wow layer — decision: SKIP, with written reason

GitHub's aesthetic is utilitarian and near-static; its "wow" is density, precision, and speed — not motion. Adding `react-bits` text animations or Magic UI marquees would actively break platform-exactness (violates §6.5), and `react-bits` carries MIT + Commons Clause licensing friction. **Decision: no animation library. The single permitted flourish is a `CounterLabel`-style animated stat in the dashboard header ONLY if the QA loop (taste-index critique) explicitly asks for more life — default is static.** Restraint is the feature.

---

## 8. QA hook

Taste-QC prompt for the browser-QA loop: [`admud/taste-index` `prompts/04-critique.md`](https://github.com/admud/taste-index/blob/main/prompts/04-critique.md) (raw file verified HTTP 200 today: `https://raw.githubusercontent.com/admud/taste-index/main/prompts/04-critique.md`). Run it against screenshots of all 5 views + both color modes.

## 9. Verification gate note (for the build team)

Every deliverable needs `claims.json` + upheld `--strict` re-execution per the standing delivery gate (AGENTS.md). Suggested claims for this demo: `npm run build` exits 0; `tsc --noEmit` exits 0; theme CSS files resolve (`node -e "require.resolve('@primer/primitives/dist/css/functional/themes/dark.css')"`); no `#[0-9a-f]{6}` hex literals outside `*.css` token files (grep claim); screenshots for 5 views × 2 color modes exist.
