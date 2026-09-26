---
title: Astryx digest (0.6.3)
domain: Brand & Design
type: Reference
status: Draft
page_code: AXD
as_of: 2026-09-26
---

# Astryx digest (0.6.3)

This page is a reference copy of the Astryx docs for this app: each component's Do and Don't list (`usage.bestPractices`), its examples, the page templates, the principles and the agent guidance. It was extracted from the published `@astryxdesign/core` and `@astryxdesign/cli` **0.6.3** packages, which are the files the docs site is generated from, because the build environment could not reach `astryx.atmeta.com`.

The rules for using Astryx here stay in [Astryx](astryx.md). This page is a snapshot: after a version bump, the CLI wins (`pnpm -C web astryx component <Name> --dense`, `astryx docs <topic>`, `astryx template <slug>`).

## Where the app stands (2026-09-26)

- `web/` runs React 19 and `@astryxdesign/core` 0.6.3, with the `watermark` theme in `web/src/themes/watermark.ts` (built with `astryx theme build`).
- The header is the approved "Second row" shell from `design/desk` (`web/src/app/shell.tsx`, `shell.css`).
- Decision on 2026-09-26: page bodies are plain HTML on a small kit (`web/src/ui/plain.tsx`, `plain.css`) that follows the rest of `docs/design`. Astryx stays for the header, the banners, the wallet popover, the dialogs and the toasts. Use this page for those components, and when a page needs a behaviour the kit does not have.
- §6.6 below was written before the build started. The React 19 upgrade, the agent block (`web/AGENTS.md`) and the theme are done. The theme is named `watermark`, not `otc`.

## 0. Sources and provenance (read this first)

- **The live site could not be fetched.** `https://astryx.atmeta.com/*` returned HTTP 403 from the session's egress policy (`connect_rejected`, host `astryx.atmeta.com:443`). WebFetch was blocked for the same reason. The Astryx MCP server (`https://astryx.atmeta.com/mcp`) is on the same host, so it was also out of reach.
- **What was used instead, and why it matches the site.** Every page on the site is generated at build time from `.doc.mjs` files (see `apps/docsite/README.md`: "The docsite never hardcodes package lists, component catalogs, or theme maps"). The production site ("`latest`") renders the **last published npm release**: "for `latest` it downloads the published package tarballs from npm (their `src/` ships the `.doc.mjs` the pipeline needs)".
  - I downloaded `@astryxdesign/core@0.6.3` and `@astryxdesign/cli@0.6.3` from registry.npmjs.org. Both are `latest`, published 2026-09-23. I extracted every component doc, example block, template and doc topic from them. This is the same data the production site renders.
  - I also installed the published CLI (`astryx` 0.6.3) in the scratchpad and ran `astryx docs`, `component`, `build`, `template --skeleton`, `search`, and `init --features agents`.
  - I compared this against the local clone (`facebook/astryx`, `main` @ `0788c49`, which is exactly the `canary` dist-tag `0.6.3-canary.0788c49`). The published docs and the repo are identical for every component below, with these exceptions:
    - `Timer` exists only in the repo (canary), not in 0.6.3.
    - Chat* doc wording differs slightly.
    - `List` has a prop difference.
    - Small wording changes in `/docs/theme` and `/docs/working-with-ai`.
- **How a component page is built** (`apps/docsite/src/components/component-detail/ComponentDetailClient.tsx`), in order:
  1. Showcase.
  2. **Usage**: `usage.description` plus the import line.
  3. **Anatomy**.
  4. **Best practices**: `usage.bestPractices`. `guidance: true` renders as **Do** and `guidance: false` as **Don't**.
  5. **Props**.
  6. **Examples**: blocks with `exampleFor: <Name>`, "Common configurations, variations, and states."
- **Quotes below are verbatim** from those fields.
- **Citation format:**
  - **Site URL.** `https://astryx.atmeta.com/components/<Name>`, `/docs/<topic>`, `/templates/<slug>`. These are the URL patterns in `apps/docsite/src`. The content was confirmed from the npm package, not fetched live.
  - **Source path.** `packages/core/src/...` (same path under `src/` in the npm tarball), and `packages/cli/assets/docs/<topic>.doc.mjs` / `packages/cli/assets/templates/{blocks,pages}/...`.
- **Rules that came from the repo only, not from the site:**
  - Everything in §6 from the repo's `AGENTS.md` / `CLAUDE.md`.
  - Template source comments, marked "(template source comment)".
  - Table internals, such as `emptyState` in `types.ts` and "no first-class row activation plugin".
  - `Timer` (canary only).
  - Lab components (`Drawer`, `Stat`, `InfoTip`), which are unpublished.

---

## 1. Setup facts

### 1.1 Packages and versions (npm, 2026-09-26)

| Package | Status | Notes |
|---|---|---|
| `@astryxdesign/core` | `latest` 0.6.3 | Components, theme system, hooks. **peerDependencies: `react >=19.0.0`, `react-dom >=19.0.0`, `@stylexjs/stylex ^0.19.0`** |
| `@astryxdesign/cli` | `latest` 0.6.3 | `astryx` CLI: docs, component docs, templates, `theme build`, codemods, agent docs |
| `@astryxdesign/theme-{neutral,butter,chocolate,gothic,matcha,stone,y2k}` | 0.6.3 | Preset themes. **We do not use these.** |
| `@astryxdesign/build` | 0.6.3 | StyleX source-build plugins (only needed to compile StyleX / swizzled source) |
| `@astryxdesign/lab` | **private, not on npm** | Holds `Drawer`, `Stat`, `InfoTip`, `CircularProgress`, `CodeEditor`, `Tour`, and others. **Cannot be imported.** |
| `@astryxdesign/charts`, `@astryxdesign/vega`, `@astryxdesign/richtext` | `private: true` in the repo; README says charts/vega are "published to npm only under the `@canary` dist-tag — there is no stable release yet" | Treat as unavailable for production |

- **React 19 is a hard requirement.** Quotes:
  - "Astryx requires React 19 or later: `react` and `react-dom` >= 19.0.0 are peer dependencies of `@astryxdesign/core`." (`/docs/getting-started`, `packages/cli/assets/docs/getting-started.doc.mjs`)
  - "Currently in Beta · Built on React 19+ and StyleX" (README).
  - Our app is on React 18.3.1, so **upgrading React to 19 is step 0**.
- **Install** (`/docs/getting-started`):
  ```bash
  npm install @astryxdesign/core @stylexjs/stylex @astryxdesign/theme-neutral @astryxdesign/cli
  npx astryx init
  ```
  - Getting-started installs `theme-neutral` because "Every app gets a theme whether or not anyone picks one". We will build our own theme instead (1.3), so theme-neutral is optional.
  - The generated agent block says: "Theme is optional (a default ships in astryx.css)" (`packages/cli/foundation/agent-docs/agent-docs.mjs`).
- **CLI alias.** README and `/docs/working-with-ai`: add `"astryx": "node node_modules/@astryxdesign/cli/clients/cli/bin/astryx.mjs"` to `package.json` scripts, then run `npm run astryx -- component --list`. The docs explain why: "AI agents frequently invoke the CLI with incorrect paths … leading to silent failures."
- **Global CSS.** Order matters: "The import order maps to the layer cascade: `reset.css` (`@layer reset`) → `astryx.css` component styles (`@layer astryx-base`) → `theme.css` token overrides (`@layer astryx-theme`)." (core README, Quick Start)
  ```css
  @import '@astryxdesign/core/reset.css';
  @import '@astryxdesign/core/astryx.css';
  @import './themes/otc.css';   /* our built theme instead of theme-neutral/theme.css */
  ```
  - The agent block adds: "without these, components render unstyled".
- **Cascade-layer safety** (`/docs/getting-started`, `/docs/migration` → "Cascade Layer Safety"):
  - "These stylesheets are cascade-layered … If your project has existing global CSS, a legacy reset, or Tailwind, declare the layer order explicitly and assign every stylesheet to a layer deliberately: unlayered styles and later layers both override astryx-base regardless of specificity."
  - Checklist items that matter for us:
    - "Declare the canonical @layer order once, before any @import. With webpack-based bundlers (including Next.js) the order declaration must live in its own CSS file imported first."
    - "Remove or demote the app legacy reset … any app reset belongs in that same reset layer and never in a layer above astryx-base."
    - "Set moduleResolution to bundler or node16 and newer so subpath imports like @astryxdesign/core/reset.css resolve."
    - "Theme with defineTheme and the accent family API instead of hand-writing individual color tokens."
- **Providers.** Vite uses the "Same CSS imports and providers as above. No build plugins needed; Astryx ships pre-built." (core README)
  - `<Theme theme={...} mode=...>` from `@astryxdesign/core/theme`. `mode` is `'system' | 'light' | 'dark'`, default `'system'`.
  - `<LinkProvider component={RouterLink}>` from `@astryxdesign/core/Link`, so every Astryx link uses our router. Principles rule: "Use useLinkComponent() for navigation so consumers can plug in their framework router via LinkProvider".
  - `<LayerProvider toast={{position: 'bottomEnd', maxVisible: 3}}>` from `@astryxdesign/core/Layer`, once at the root ("Use LayerProvider once near the app root … nested providers are ignored"). `useToast` "must be called from a child component inside the provider."
- **Imports are per-subpath.** "Components are imported from per-category subpath entrypoints. This keeps bundles small and makes intent clear." For example `import {Button} from '@astryxdesign/core/Button'` and `import {VStack} from '@astryxdesign/core/Layout'`.

### 1.2 How theming and tokens work

- "Themes provide all design tokens (colors, spacing, radius, typography) as CSS custom properties." (`/docs/getting-started`)
- "A theme is a set of CSS custom property overrides, so a designer can make Astryx unmistakably theirs without forking or wrapping component source." (README)
- Colors are semantic. "tokens describe purpose, not appearance. Every color adapts automatically between light and dark modes via CSS light-dark(). Themes override the resolved values, so your code never references raw hex colors." (`/docs/color`)
- Surface hierarchy: "Layered surface hierarchy: body → surface → card → popover." (`/docs/color`)
- Token families (`astryx theme template`, `packages/cli/assets/theme.template.ts`):
  - `--color-*`: accent, on-accent · background-{body,surface,card,popover,muted,inverted} · text-* · icon-* · border, border-emphasized · overlay{,-hover,-pressed} · success/warning/error (+ -muted, on-*) · skeleton, track, shadow, tint-hover · categorical {blue…yellow} × {background,border,icon,text}
  - `--spacing-*` 0 … 12
  - `--size-element-{sm,md,lg}` (28/32/36px)
  - `--focus-outline-*`, `--border-width`
  - `--radius-*`, `--shadow-*`, `--duration-*`, `--ease-standard`
  - `--font-family-*`, `--font-size-*`, `--font-weight-*`, `--text-*`
  - `--color-syntax-*`, `--color-data-*`
- Default color values (light / dark) from `/docs/tokens`:

  | Token | Light | Dark |
  |---|---|---|
  | `--color-background-body` | #F1F4F7 | #111112 |
  | `--color-background-surface` | #FFFFFF | #1F1F22 |
  | `--color-background-card` | #FFFFFF | — |
  | `--color-background-popover` | #FFFFFF | — |
  | `--color-text-primary` | #0A1317 | — |
  | `--color-text-secondary` | #4E606F | — |
  | `--color-accent` | #0064E0 | #2694FE |
  | `--color-on-accent` | #FFFFFF | — |
  | `--color-border` | #05365919 | — |
  | `--color-success` | #0D8626 | — |
  | `--color-warning` | #E9AF08 | — |
  | `--color-error` | #E3193B | — |

### 1.3 Our own color tokens without a preset theme (documented path)

**What the docs require:**
- "Brand/accent belongs in the theme (`astryx theme list` / `theme add <slug>`, or `astryx theme template` for a custom one) — never override --color-* in :root." (generated agent rules, `astryx init`)
- "Start from a bundled theme … or write one from scratch with defineTheme … Only override tokens that differ from defaults; omitted tokens use the design system defaults." (`/docs/theme` → Creating a Custom Theme)
- The `extends` field is optional ("Start from another theme instead of the defaults"). Omitting it means our theme starts from Astryx defaults, not from a preset.
- **Accent caveat:** "overriding --color-accent in tokens re-points the reference tokens (--color-accent-muted, --color-text-accent, --color-icon-accent) but NOT --color-on-accent, which stays baked from the color.accent seed." (`/docs/theme` → defineTheme)
- The theme template adds: "Changing an accent means owning its on-colour."
- **Contrast guarantee has limits** (theme template, `color` section):
  - "Whatever seed you pass, generated text holds >= 4.5:1 against its surface … Write one side of a pair by hand in `tokens` below … and you own the contrast for that pair."
  - "Status colours (success, warning, error) … keep their defaults … check them against yours."
- **Build it:** "`astryx theme build` compiles a defineTheme file into production-ready artifacts" (`.css`, `.js` with `__built: true`, `.d.ts`).
  - Do: "Use the /built subpath + theme.css for production SSR apps." "Run `astryx theme build` for custom themes to get the built artifacts."
  - Don't: "Import /built without the CSS file; component overrides won't apply."
- **Private vars are off-limits.** "Set private CSS vars (prefixed --_) directly … `astryx theme build` will error."

**Our sketch.** This mapping of our palette onto semantic roles is *our* choice, not something the docs prescribe. Verify every hand-written pair for contrast in the rendered DOM.
```ts
// src/themes/otc.ts
import {defineTheme} from '@astryxdesign/core/theme';
export const otcTheme = defineTheme({
  name: 'otc',
  // no `extends` → start from Astryx defaults, not a preset
  // no `radius` → keep Astryx default radius scale (see 1.4)
  color: {accent: '#111111', neutralStyle: 'neutral'},      // ink as accent seed; generator owns on-accent
  tokens: {
    '--color-background-body': '#B7E4F8',                 // sky ground
    '--color-background-surface': '#F3F3F3',              // paper
    '--color-background-card': '#FFFFFF',                 // chip white
    '--color-background-popover': '#FFFFFF',
    '--color-text-primary': '#111111',                    // ink
    '--color-icon-primary': '#111111',
  },
});
// <Theme theme={otcTheme} mode="light">  — the palette is light-only, so pin the mode
// instead of mode="system"; a string token applies to both modes.
```
- **Mode.** The docs' default is `mode='system'` ("system follows OS preference"). A single string value "applies to both colour modes; a [light, dark] tuple compiles to CSS light-dark()" (theme template). With a light-only identity, pass `mode="light"`, or supply tuples.

### 1.4 Radius, density, spacing, layout primitives

**Radius** (`/docs/shape`, `/docs/tokens`)
- Defaults: `--radius-none` 0 · `--radius-inner` 4px · `--radius-element` 8px · `--radius-container` 12px · `--radius-page` 28px · `--radius-chat` 28px · `--radius-full` 9999px.
- "Numeric scale based on a 4dp base unit. Tokens scale with the theme's radius multiplier."
- To keep the default, omit `radius` in `defineTheme` (the template's default is `{base: 4, multiplier: 1}`).
- Do:
  - "Use --radius-element for interactive controls (buttons, inputs, selectors)."
  - "Use --radius-container for content containers (cards, panels, dialogs)."
  - "Use --radius-full for pill shapes (badges, tags, avatar status dots)."
- Don't:
  - "Use --radius-page for small elements"
  - "Hardcode radius values; they won't scale with theme radius multipliers."
- Concentric radius: "Components like Card handle this automatically; the inner radius is computed as max(0, outerRadius - padding)."

**Spacing** (`/docs/spacing`)
- 4px base. Tokens: `--spacing-0` 0, `-0-5` 2, `-1` 4, `-1-5` 6, `-2` 8, `-3` 12, `-4` 16, `-5` 20, `-6` 24, `-7` 28, `-8` 32, … `-12` 48.
- "Most components accept a `gap` prop using step values."
- Do:
  - "Use component gap props when available; they handle automatic spacing compensation."
  - "Stick to the scale … If a value isn't on the scale, reconsider the design."
  - "Use smaller steps (0.5–2) for tight internal spacing and larger steps (4–8) for section gaps."
- Don't:
  - "Use arbitrary pixel values outside the scale."
  - "Mix spacing tokens with raw px/rem values in the same component."
- Stack's `gap` must be a number: "Pass as a JSX number expression e.g. gap={4}, NOT a string like gap="4"."

**Density** (`/docs/layout` → Spacing → Density and size)
- "Match density to how often a region is used, and give every control in a row the same size so heights share a baseline."
  - "Compact: high-volume regions scanned fast, like logs, monitors, and large datasets"
  - "Balanced: most Table and List surfaces"
  - "Spacious: low-frequency or high-stakes rows"
- "Pair density with one control size: compact with sm, balanced with sm or md, spacious with md or lg."
- Where density props exist:
  - `Table density` = `'compact'|'balanced'|'spacious'`, default balanced.
  - `List density`, `Stepper density`, `CollapsibleGroup density`, `Item density`.
- Control heights: `--size-element-sm/md/lg` = 28/32/36px.

**Layout primitives** (`/components/Layout` etc.)
- `AppShell`: the page frame.
- `Layout`: five slots, `header / start / content / end / footer`, with `LayoutHeader`, `LayoutContent`, `LayoutPanel`, `LayoutFooter`.
- `Section`: the default page-region unit.
- `Card`: widgets only.
- `Grid` + `GridSpan`.
- `Stack` / `HStack` / `VStack` / `StackItem`: `StackItem size="fill"` pushes siblings apart.
- `FormLayout`, `Divider`, `Center`, `ScrollableArea`, `Resizable` (`useResizable` + `ResizeHandle`), `AspectRatio`.
- Structural widths are the one place raw px is allowed: "Structural widths are the one place raw px belongs; everything inside them uses the spacing scale." (`/docs/layout`)

**Styling escape hatches** (`/docs/styling`)
- `xstyle` accepts only `stylex.create()` values and **needs a StyleX compiler** in our build.
- Without StyleX, the generated agent rule for a plain-CSS project is: "Custom styling: component props first; else style/className with tokens — var(--color-*|--spacing-*|--radius-*). No raw hex/px. (No StyleX/Tailwind compiler here — don't use xstyle/utility classes.)"
- "All :hover styles MUST use @media (hover: hover) guard".
- Preferred external selector: `.astryx-button[data-variant="primary"]`.
- Elevation: "Hand-write a `box-shadow` in app code" is a Don't. Use the `elevation` prop (`none|low|med|high`) or `shadowVars` (`/docs/elevation`).

---

## 2. Component inventory (as exported, grouped like `/components`)

The docsite category order is `Action, Chat, Container, Content, Data Visualization, Feedback & Status, Form Controls, Layout, Navigation, Overlay, Table & List, Utility` (`apps/docsite/src/app/(docs)/components/page.tsx`). Names below come from `@astryxdesign/core@0.6.3`, 164 components per `astryx component --list`. "(hidden)" means the docs page exists but the component is hidden from the overview gallery.

| Category | Components (sub-components in parentheses) |
|---|---|
| **Action** | Button, ButtonGroup, ContextMenu (hidden; ContextMenuItem), DropdownMenu (DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuDivider, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSubMenu), IconButton, Link, MoreMenu, SegmentedControl (SegmentedControlItem), ToggleButton (ToggleButtonGroup), Toolbar |
| **Chat** | Chat (ChatComposer, ChatComposerDrawer, ChatComposerInput, ChatComposerTokenElement, ChatLayout, ChatLayoutScrollButton, ChatMessage, ChatMessageBubble, ChatMessageList, ChatMessageMetadata, ChatSendButton, ChatSystemMessage, ChatTokenizedText), ChatDictationButton (hidden), ChatToolCalls |
| **Container** | Card, Carousel, ClickableCard, Collapsible (CollapsibleGroup), SelectableCard |
| **Content** | Avatar (AvatarStatusDot), AvatarGroup (AvatarGroupOverflow), Blockquote, Citation, CodeBlock (Code), EmptyState, Icon, Kbd, Markdown, Text (Heading), Thumbnail, Timestamp, Token. *Canary only, not in 0.6.3:* Timer |
| **Data Visualization** | none in core; charts are in lab/charts, which are unpublished or canary-only |
| **Feedback & Status** | Badge, Banner, ProgressBar, Skeleton, Spinner, StatusDot |
| **Form Controls** | Calendar, CheckboxInput, CheckboxList (hidden; CheckboxListItem), ComplexSelector, DateInput, DateRangeInput, DateTimeInput, Field (FieldLabel), FieldStatus (hidden), FileInput, Indicator (hidden), InputGroup (hidden; InputGroupText), MultiSelector, NumberInput, PowerSearch, RadioList (RadioListItem), Selector (SelectorOption), Slider, Switch, TextArea, TextInput, TimeInput, Tokenizer, Typeahead (BaseTypeahead, TypeaheadItem) |
| **Layout** | AppShell, AspectRatio, Center (hidden), Divider, FormLayout, Grid (GridSpan), Layout (LayoutHeader, LayoutContent, LayoutFooter, LayoutPanel), Resizable, ScrollableArea, Section, Stack (HStack, VStack, StackItem) |
| **Navigation** | Breadcrumbs (BreadcrumbItem), MobileNav (hidden), NavHeadingMenu (hidden), NavIcon (hidden), Outline, Pagination, SideNav (SideNavHeading, SideNavItem, SideNavSection, SideNavCollapseButton), Stepper (Step), TabList (Tab, TabMenu), TopNav (TopNavHeading, TopNavItem, TopNavMenu, TopNavMegaMenu, TopNavMegaMenuItem, TopNavMegaMenuFeaturedCard) |
| **Overlay** | AlertDialog (hidden in gallery, full page exists), BottomSheet, BottomSheetSwitcher, CommandPalette (+6 parts), Dialog (DialogHeader), HoverCard, Lightbox, Overlay, Popover, Toast (ToastViewport internal), Tooltip |
| **Table & List** | Item (hidden), List (ListItem), MetadataList (MetadataListItem), OverflowList, Table (TableHeader, TableBody, TableFooter, TableRow, TableCell, TableHeaderCell), TreeList |
| **Utility** | InternationalizationProvider, Layer (LayerProvider), LinkProvider, MediaTheme, SyntaxTheme, Theme, VisuallyHidden (most are hidden from the gallery) |

**Hooks** (have docs pages too):
- Components and patterns: useAnnounce, useAppShellMobile, useClickableContainer, **useClipboard**, useCollapsible, useCollator, useContainerReveal, useDevWarning, useEntryAnimation, useFocusTrap, useGridFocus, useHotkeys, useHoverCard, useImageMode, **useImperativeAlertDialog**, **useImperativeDialog**, useIndicatorFocusRing, useInputContainer, useInputStatusIcon, useInteractiveRole, useKeyboardHint, useLayer, useListFocus, useLocale, useLongPress, **useMediaQuery**, useMergedRefs, useOverflow, usePopover, **useResizable**, useScrollLock, useScrollOverflow, useScrollableArea, useStreamingText, useTheme, **useToast**, useTooltip, useTranslator, useTreeFocus, useTypeahead.
- Table plugins: **useTableColumnResize, useTableColumnSettings, useTableFilterState, useTableFiltering, useTableGroupedRows, useTablePagination, useTableRowExpansion, useTableRowIndex, useTableRowStatus, useTableSelection, useTableSelectionState, useTableSortable, useTableStickyColumns, useTableTreeData, useTableTreeState**.

**Lab (documented in the repo, not importable):** Drawer, Stat, InfoTip, CircularProgress, CodeEditor, ListInput, LogStream, Schedule, Tour, TransferListSelector, plus charts.

---

## 3. Components relevant to our patterns

The format per entry is: purpose (Usage, quoted) · key props · **Do / Don't** (quoted) · examples (block name: what it shows). URL and source are given on the heading line.

### AppShell
Site: /components/AppShell · src `packages/core/src/AppShell/AppShell.doc.mjs`

- **Usage:** "AppShell is the page shell for an application. It provides slots for top navigation, side navigation, banners, and main content. Use it as the root wrapper for every page. It handles responsive mobile navigation and skip-to-content automatically."
- **Props:**
  - `topNav`, `sideNav`, `mobileNav`.
  - **`banner`**: "Banner slot for system-wide announcements, placed above the topNav."
  - `contentPadding`: 0 by default. "4 (16px) for forms/settings/text, 0 for dashboards/maps/tables".
  - `height`: `'fill'|'auto'`.
  - `variant`: `'wash'|'surface'|'section'|'elevated'`, default `elevated`.
- **Do:**
  - "Choose the right height: use "fill" for dashboards with internal scrolling and "auto" for pages that grow with content."
  - "Set `contentPadding` based on content type: 4 for forms and settings, 0 for tables and dashboards."
  - "Give every nav slot an accessible name … pass `label` to each one."
  - "Start the page heading inside `children` … the first heading in the content area is the page h1."
- **Don't:**
  - "Nest one AppShell inside another; it's the outermost layout frame."
  - "Use for sub-page layouts; use Layout for content areas within AppShell."
  - "Add your own skip link or <main> element. AppShell already renders both."
- **Examples:**
  - *AppShell — Top Nav Only*: "Simple layout with TopNav and no side navigation". This is our shell.
  - *AppShell — With Banner*: "dismissable info banner between the nav and content".
  - *Content Only*, *Side Nav Only*, *Top Nav with Side Nav*.

### TopNav (+ TopNavHeading, TopNavItem, TopNavMenu)
Site: /components/TopNav · src `packages/core/src/TopNav/TopNav.doc.mjs`, `TopNavItem.doc.mjs`, `TopNavHeading.doc.mjs`

- **Usage:** "TopNav is a horizontal navigation bar for product-level navigation in application headers. Use TopNav for 5 or fewer always-visible navigation items, or minimal navigation paired with search and controls. For complex navigation hierarchies, use a sidebar; to filter content, use tabs or filter buttons instead."
- **Slots:**
  - `heading` (logo, brand).
  - `startContent` / `children`: "navigation items or breadcrumbs".
  - `centerContent`: "tabs, search bar, primary navigation". Switches to a 3-column grid for true centering.
  - `endContent`: "search, icons, or user profile". This is where the wallet chip, status pill and "2 to sign" go.
  - `label`, default 'Top navigation'.
- **TopNavItem:**
  - `label`, `href`, `isSelected` ("Sets aria-current="page"").
  - `icon`, `isIconOnly`.
  - `as`: router link.
- **TopNavHeading:**
  - `logo`, `heading`, `headingHref`, `superheading`, `subheading`.
  - `headerEndContent`: "e.g. a badge or status indicator".
  - `menu`: popover.
- **Do:**
  - "Include a product logo and name in the heading slot to clearly identify the application."
  - "Limit primary navigation items to 5 or fewer for quick scanning and minimal cognitive load."
- **Don't:**
  - "Avoid using TopNav to filter page content; use Tabs or filter controls instead."
  - "Avoid deeply nested navigation hierarchies; keep menus to one level of depth."
- **Examples:**
  - *TopNav — Enterprise Dashboard*: "Full-featured navigation bar with icon-labeled nav items, search, notifications, and a primary CTA".
  - *TopNav — With Logo*: "branded logo icon, heading link, nav items, and a profile action".
  - *TopNav — Centered Navigation*.
  - *TopNavItem — Basic*: "Navigation links inside a TopNav with one item marked as selected. Use for top-level pages of an application."
- **Layout guide on the choice** (`/docs/layout` → Navigation): "TopNav: a shallow nav you expect to stay shallow, context that must stay visible, or a control- and filter-heavy page; add a TabList for a second level."

### TabList (+ Tab, TabMenu)
Site: /components/TabList · src `packages/core/src/TabList/TabList.doc.mjs`, `Tab.doc.mjs`

- **Usage:** "TabList provides tab-style navigation for organizing content into categorized sections. Use it to let users switch between related views without leaving the page, with overflow items handled by a built-in "more" menu."
- **Props:**
  - `value*`, `onChange*`.
  - `size` sm/md/lg.
  - `layout` hug/fill.
  - `hasDivider`, `isFullBleed`.
  - `role` ("'tablist' asks for the WAI-ARIA tabs pattern").
  - `overflow`.
- **Tab:**
  - `value*`, `label*`.
  - `href`: renders an anchor, i.e. page navigation.
  - `panelId`, `icon`, `selectedIcon`.
  - **`endContent`**: "such as a badge count or status dot".
- **Do:**
  - "Keep tab labels short and descriptive so users can quickly scan available sections."
  - "Leave overflow handling on …"
  - "When using hasDivider with action buttons alongside tabs, match the Button size to the TabList size (both md, both sm) …"
  - "Reach for role="tablist" when the strip switches panels in place, and give each tab a panelId … Leave it off for navigation between views."
  - "Set isFullBleed to stretch a tab bar inside a padded LayoutHeader, Card, or Section to the container's inline content edges, instead of reaching for negative-margin CSS."
- **Don't:**
  - "Use tabs for sequential steps or workflows; use a stepper or wizard pattern instead."
  - "Place more than 6–8 visible tabs before the overflow menu; prioritize the most important categories."
  - "Confuse TabList with SegmentedControl or ToggleButton. TabList is for navigation between views. SegmentedControl and ToggleButton are input controls: SegmentedControl always has exactly one selected option, while ToggleButton can be toggled on or off."
- **Examples:**
  - *TabList — With Badge*: "Tabs with notification badge counts rendered via endContent. Uses error variant for urgent counts and neutral for informational ones." A model for "2 to sign" if it lives on a tab.
  - *TabList — With Status Dot*.
  - *TabList — With Actions*: "Page header pattern with tabs on the left and action buttons pushed to the right."
  - *Fill Layout*, *With Icons*, *With Overflow Menu*.
  - *Toolbar — Tab Navigation*.

### SegmentedControl (+ SegmentedControlItem)
Site: /components/SegmentedControl · src `packages/core/src/SegmentedControl/SegmentedControl.doc.mjs`

- **Usage:** "A segmented button group that allows users to make a single selection from a small set of mutually exclusive options. Use SegmentedControl when all options should be visible at once and the selection controls a value or mode, not page navigation."
- **Props:**
  - `value*`, `onChange*`.
  - `label*`: aria-label, never visible.
  - `size`, `layout` hug/fill.
  - `isDisabled`, `disabledMessage`.
- **Item:** `value*`, `label*`, `icon`, `isLabelHidden`, `isDisabled`.
- **Do:**
  - "Use for switching between 2–5 mutually exclusive views or modes where all options should be visible."
  - "Provide a descriptive label for the control to ensure the group is accessible to screen readers."
- **Don't:**
  - "Use for page-level navigation; use TabList instead."
  - "Use for simple on/off states; use ToggleButton instead."
  - "Wrap a disabled SegmentedControl in Tooltip to explain why it is disabled … Use the disabledMessage prop instead."
- **Examples:**
  - *With Icons*: "view mode switcher".
  - *Fill Layout*: "stretches segments equally … useful for fixed-width containers". Good for Buy/Sell in the order form.
  - *Disabled Item*, *Icon Only*.
- **Related:** the Selector docs say "Use when there are only two options" is a Don't: "use a SegmentedControl or radio buttons instead".

### Button · IconButton · ButtonGroup
Site: /components/Button, /components/IconButton, /components/ButtonGroup · src `packages/core/src/Button/Button.doc.mjs` etc.

**Button**
- **Usage:** "Button triggers an action when clicked."
- **Props:**
  - `label*`: visible text and the accessible name.
  - `variant`: `primary|secondary|ghost|destructive`, default secondary.
  - `size` sm/md/lg.
  - `isLoading`: "Announces "Loading" via a live region".
  - **`clickAction`**: "Async click handler. Shows loading state while the returned promise is pending."
  - `isDisabled`: "When a tooltip is present, uses aria-disabled".
  - `icon`.
  - **`endContent`**: Icon or **Badge**.
  - `tooltip`, `href`/`as`, `width`, `elevation`.
- **Do:**
  - "Reserve primary for the single most important action in the view. Use secondary or ghost for everything else based on emphasis."
  - "Write labels that describe the action ("Save changes", "Delete account", "Send invite"), not vague labels like "OK" or "Click here"."
  - "Show a loading state for actions that take time, like saving or submitting, so the user knows it is working."
  - "Always provide a label for icon-only buttons … Add a tooltip for sighted users."
  - "For a dedicated icon-only button, use IconButton from '@astryxdesign/core/IconButton'."
- **Don't:**
  - "Place more than one primary button in the same view; this dilutes the visual hierarchy."
  - "Use the destructive variant without a confirmation step for irreversible actions like deleting data."
  - "Use a button for navigation. If it only takes the user to another page, use a link instead."
- **Examples:**
  - *Button — End Slot*: "Buttons with a trailing badge showing a count or status. Use for notification counts, unread messages". This is **"2 to sign"**.
  - *Variants* (default/disabled/loading), *Sizes*, *Icon*, *Floating*.

**IconButton**
- **Do:**
  - "Make the aria-label specific …"
  - "Add a tooltip …"
  - "Use ghost in toolbars and dense areas".
- **Don't:**
  - "Use IconButton if the action isn't obvious from the icon alone"
  - "Skip the tooltip".
- **Examples:** *Action Bar*, *With Tooltips*, *Loading State*.

**ButtonGroup**
- Do: "Keep groups small (2–4 buttons)".
- Don't: "use ButtonGroup for navigation. Use SegmentedControl or TabList for switching between views."

### Badge
Site: /components/Badge · src `packages/core/src/Badge/Badge.doc.mjs`

- **Usage:** "Badge highlights a status or category at a glance. Use it sparingly: only when a value represents a distinct state (Active, Failed) or a grouping tag (Engineering, Design). Most metadata (dates, durations, counts, descriptions) should be plain description text, not badges."
- **Props:**
  - `variant`: `neutral|info|success|warning|error` (semantic, solid) plus `blue|cyan|green|orange|pink|purple|red|teal|yellow` (tinted categories).
  - `label`, `icon`.
- **Do:**
  - "Every status badge steals attention. Only badge states where the user needs to notice or act: errors, warnings, items requiring follow-up. If no action is needed, plain text is fine."
  - "Use success, warning, and error variants only for system status that demands attention: "Failed", "Degraded", "Action Required"."
  - "Use color variants (blue, purple, teal, etc.) for category tags …"
  - "Keep labels to one or two words."
  - "Add an icon when it helps identify the badge type quickly, but always include a text label alongside it."
- **Don't:**
  - "Apply a "success" badge to every healthy/active/normal item. If all rows show green "Active" badges, none stand out."
  - "Use badges for metadata. Durations ("6h window"), counts ("12 trigger types"), dates, and descriptions are not statuses or categories; use description text (Text with type="supporting") instead."
  - "Use semantic status variants … for categories or informational content."
  - "Repeat the same badge in every row of a table or list."
  - "Make badges clickable; they are read-only indicators."
- **Examples:** *Badge — Status*: "Show the state of an item like Active, Pending, or Failed. Use in table rows, list items, or detail pages". Also *Counts*, *Colors*, *Variants*.
- **Conflict to be aware of.** The library-wide rule (`/docs/principles` Anti-Patterns and the generated agent rules) is stricter:
  - "Badge as decoration. Reserve Badge for counts and enumerated states; use StatusDot or Token for status"
  - "Status = StatusDot/Token; Badge = counts only."

### StatusDot
Site: /components/StatusDot · src `packages/core/src/StatusDot/StatusDot.doc.mjs`

- **Usage:** "A small colored dot that communicates status like online/offline presence or severity levels. Supports five semantic variants and an optional pulse animation. Always pair with a visible text label, as color alone should not carry meaning."
- **Props:**
  - `variant*`: `success|warning|error|accent|neutral`.
  - `label*`: aria-label.
  - `isPulsing`, `tooltip`, `icon`.
- **Do:**
  - "Use StatusDot as a binary present/absent signal; avoid encoding many distinct states in a single dot …"
  - "Always pair with a visible text label …"
  - "Provide a descriptive `label` prop …"
  - "Pair the dot with an icon that carries the status as a distinct shape when it must stand on its own …"
- **Don't:**
  - "Rely on color alone to communicate status …"
  - "Use the pulse animation for purely decorative purposes; reserve it for states that require immediate attention."
- **Examples:** *Pulsing*: "live, processing, and error states". Also *Status Indicators*, *Variants*.

### Token
Site: /components/Token · src `packages/core/src/Token/Token.doc.mjs`

- **Usage:** "Token is a small, inline element for representing discrete pieces of associated data, like tags, categories, or selections."
- **Props:**
  - `label*`, `size`.
  - `color`: `default|red|orange|yellow|green|teal|cyan|blue|purple|pink|gray`.
  - `icon`, `onClick`, `href`, `onRemove`.
  - `endContent`: "e.g. a count badge or status indicator".
- **Do:**
  - "Use color to distinguish categories (for example, green for "Active", red for "Blocked", blue for "In Review") so users can scan status at a glance."
  - "Add a leading icon when it helps identify the token type faster …"
  - "Keep labels short: one to three words."
- **Don't:**
  - "Don't use tokens for primary actions or navigation; use Button or Link instead."
  - "Don't hide the label unless the icon alone is universally understood."
  - "Don't mix too many colors in one token group. Stick to two or three meaningful colors …"
- **Examples:** *Token — End Content*, *Icon*, *Colors*, *Clickable*, *Removable*.
- The incident-console template uses a `Token size="sm" color=…` for row status beside a relative `Timestamp` (template source).

### Timestamp · Timer
Site: /components/Timestamp · src `packages/core/src/Timestamp/Timestamp.doc.mjs`

**Timestamp**
- **Usage:** "Timestamp formats a date or time value into human-readable text."
- **Props:**
  - `value*`: unix seconds or ISO.
  - `format`: `relative|relative_short|auto|date|date_time|time|system_*|unix_seconds`.
  - `isLive`, `hasTooltip`.
  - `tooltipEntries`: "configuring entries turns the hover into copy-to-clipboard rows".
  - `isTimezoneShown`.
- **Do:**
  - "Use the auto format in feeds and lists …"
  - "Keep formatting consistent within the same list or table …"
  - "Use isLive for active dashboards or real-time feeds so the relative time stays accurate without a page refresh."
  - "Reach for tooltipEntries when readers need to grab an exact value …"
- **Don't:**
  - "Don't display raw Unix timestamps or ISO strings to users"
  - "Avoid system_date or system_time formats in user-facing UI"
  - "Don't disable the hover card on relative timestamps"
  - "Don't pass a fixed-offset abbreviation like "EST" as timezoneID".

**Timer** (repo/canary only, `packages/core/src/Timer/Timer.doc.mjs`; not in 0.6.3)
- Elapsed-time display.
- Do: "Do not use Timer for dates … use Timestamp instead."
- Its spec states "**Countdown is deferred to a later contract**" (`Timer.spec.md`). So there is **no countdown component** in either version.

### Banner
Site: /components/Banner · src `packages/core/src/Banner/Banner.doc.mjs`

- **Usage:** "Banner shows a persistent message at the top of a page or section. Use it for form errors, system updates, maintenance notices, or success confirmations that the user needs to see until they act on it."
- **Props:**
  - `status*`: `info|warning|error|success`.
  - `title*`, `description`.
  - **`endContent`**: action, "Wraps to its own row below the text when the header is too narrow".
  - `isDismissable`, `onDismiss`, `dismissLabel`.
  - **`container`**: `'card'|'section'`. "section is full-width with no border-radius for page-level use".
  - `elevation`, `collapsible`, `children`.
- **Do:**
  - "Pick a status that matches the message …"
  - "Use the card container inside page content and the section container for full-width messages that span the entire page."
  - "Make info and success banners dismissable. Keep error banners visible until the user fixes the issue."
  - "Keep titles short and scannable: "Payment failed" not "There was a problem processing …""
  - "Set collapsible={false} when the user needs the content to act on the message …"
  - "Error and warning banners render as role="alert" … Mount an alert banner in response to an event rather than on first paint".
- **Don't:**
  - "Use Banner for short-lived messages that disappear on their own; use Toast instead."
  - "Stack multiple banners with the same status; combine related messages into one banner."
  - "Rely on the status color or icon alone to carry meaning; say which status it is in the title text".
- **Examples:**
  - *Banner — Action*: "Add a button to a banner so the user can act on the message … trial expirations, payment failures". The source uses `endContent={<Button label="Upgrade" variant="secondary" size="sm" />}`.
  - *Full Width* (`container="section"`, "site-wide announcements").
  - *Dismiss*, *Collapsible*, *Floating*, *Statuses*.

### Card · ClickableCard · Grid (stat tiles, price board)
Site: /components/Card, /components/ClickableCard, /components/Grid

**Card** (`packages/core/src/Card/Card.doc.mjs`)
- **Usage:** "Card is a bordered, elevated container for discrete, self-contained items … Cards are NOT the default layout tool."
- **Props:**
  - `padding`: defaults to the theme's card padding. "passing a step is a decision to override the theme".
  - `variant`: `default|transparent|muted|<colors>`.
  - `elevation`, `width`, `height`, `maxWidth`, `minHeight`.
- **Do:**
  - "Use cards for discrete items: a single user profile, a single notification, **a single metric**, a product in a grid."
  - "Keep padding consistent across sibling cards …"
  - "Pair a card with Layout when you need a structured header, scrollable content, and footer with actions."
- **Don't:**
  - "Default to cards for visual grouping."
  - "Wrap page sections in cards."
  - "Create identical card grids (icon + heading + text, repeated)."
  - "Nest cards inside other cards"
  - "Use color variants for status; use Banner or Badge for that."
- **Examples:** *Card — Layout* (header/content/footer), *Callout* (muted), *Elevations*, *Variants*, *Simple*.

**ClickableCard**
- Do: "Use for cards that navigate to a detail page or trigger a single action."
- Don't: "Use for toggling selection; use SelectableCard".

**Grid** (`packages/core/src/Grid/Grid.doc.mjs`)
- **Usage:** "Use Grid for card galleries, dashboards, and any multi-column layout."
- **Props:** `columns`: a number, or `{minWidth, max?, repeat?: 'fill'|'fit'}`. Also `gap`, `rowGap`, `columnGap`.
- **Do:**
  - "Use responsive columns … `columns={{minWidth: 280}}`."
  - "Cap the column count with `max`".
- **Don't:**
  - "Write manual CSS grid"
  - "Use `HStack` with wrapping for grids; use Grid instead."
- **Examples:** *Grid — Dashboard Layout* ("mixed-size widgets and a full-width summary row"), *Column Spanning*.

**Stat tiles, as the templates build them** (template source, `packages/cli/assets/templates/pages/dashboard/page.tsx`)
- A `MetricCard` is `<Card><VStack gap={2}><Heading level={4}>{label}</Heading><HStack><Heading level={2}>{value}</Heading>…delta Icon + Text color="secondary"…</HStack><Text type="supporting" color="secondary">…</Text></VStack></Card>`.
- Tiles are laid out in `Grid columns={{minWidth: 240, repeat: 'fit'}} gap={4}`.
- The lab `Stat` docs (unpublished) say:
  - "Wrap Stat in a Card and lay out KPI rows with Grid columns={{minWidth: 240, max: 4}}"
  - "Pass pre-formatted strings for value and delta"
  - "Don't … Rely on delta color alone to convey meaning".

### Text · Heading
Site: /components/Text · src `packages/core/src/Text/Text.doc.mjs`, `Heading.doc.mjs`

- **Text props:**
  - `type`: `body|large|label|supporting|code|display-1..3|inherit`.
  - `color`: `primary|secondary|disabled|placeholder|accent|inherit`.
  - `weight`, `maxLines`.
  - **`hasTabularNumbers`**.
  - `as`: span/p/div/label.
- **Heading props:** `level*` 1–6, `type` display-*, `maxLines`.
- **Do:**
  - "Pick a semantic type (body, label, supporting, large, code) instead of manually setting size and weight"
  - "Use maxLines with a number to truncate long content; a tooltip appears automatically on hover"
  - "**Enable hasTabularNumbers for columns of numeric data** so digits align vertically across rows."
- **Don't:**
  - "Override size and weight when a semantic type already matches"
  - "Skip heading levels"
  - "Use raw HTML tags like <p>, <h1>–<h6>, or <span> for text"
  - "Pass a `variant` prop; Text does not have a `variant` prop"
  - "Use Text for headings".
- **Layout guide:** "Body, the default: plain Text with no type, color, or size prop … Support: step to the secondary color, not to a smaller size". The disabled color is a Don't: "The disabled color for content; it fails contrast".

### ProgressBar (share bar with 70% target line)
Site: /components/ProgressBar · src `packages/core/src/ProgressBar/ProgressBar.doc.mjs`

- **Usage:** "A horizontal bar showing the completion progress of a task … Supports semantic color variants, value labels, and custom formatting."
- **Props:**
  - `label*`, `value`, `max`.
  - `isLabelHidden`, `hasValueLabel`, `formatValueLabel`.
  - `variant`: `accent|success|warning|error|neutral`.
  - `isIndeterminate`, `isDisabled`.
  - **`marks`**: "Fixed target marks drawn on the track at values in the same 0..max scale as value (e.g. a goal line). They stay visible whether progress is below or past them … Each mark requires a label: it is the mark's accessible name and the text revealed via a tooltip on hover/focus."
  - So the 70% target is `marks={[{value: 70, label: 'Target 70%'}]}`.
- **Do:**
  - "Use a determinate bar when the total amount of work is known …"
  - "Choose a color variant that matches the context …"
  - "Always provide a label, even if hidden".
- **Don't:**
  - "Place icons or labels inside the bar; compose them alongside it using layout components."
  - "Use a progress bar for instant actions"
  - "Use multiple progress bars stacked together for the same operation".
- **Examples:** *Custom Format* ("disk usage in GB"), *With Value Label*, *Semantic Variants*, *Indeterminate*.
- **Caveat.** The docs frame ProgressBar as task progress. A share-of-target bar is a data use, and the docs neither endorse nor forbid it. `marks` is the documented goal-line feature.

### Table (+ plugins), Pagination, EmptyState, Toolbar
Site: /components/Table · src `packages/core/src/Table/Table.doc.mjs`, `useTable*.doc.mjs`, `types.ts`

**Table**
- **Usage:** "Table displays structured data in rows and columns … It supports rich cell content, sorting, selection, pagination, and column management through a composable plugin system."
- **Props:**
  - `data`.
  - `columns`: `{key, header, width?, align?, renderCell?, sortable?, filter?}`. Width must use `proportional(n)` or `pixel(n)` from `@astryxdesign/core/Table`.
  - `idKey`.
  - `density`.
  - `dividers`: `rows|columns|grid|none`.
  - `isStriped`, `hasHover`.
  - `textOverflow`: `wrap|truncate`.
  - `plugins`: named plugins.
  - `rowCount`.
  - **`emptyState`**: from `types.ts`, not in the doc prop table. "Omit … renders a default compact "No data" empty state · ReactNode renders your custom content (e.g. `<EmptyState>`) · false disables".
- **Do:**
  - "Use density and divider variants to match the information density …"
  - "Compose rich cell content with Astryx components like Badge, StatusDot, and Avatar via renderCell."
  - "In children mode, put every row inside TableHeader, TableBody, or TableFooter."
  - "Set explicit width on every column using proportional() or pixel()."
  - "Columns using renderCell … need the table wrapped in a "use client" component".
- **Don't:**
  - "Use a table for data without consistent columns."
  - "Enable every plugin at once. Add only the features your use case requires".
  - "Omit width on text-heavy columns".
- **Examples:**
  - *Paginated Data*, *Popover Filters* ("filter controls triggered by icons in column headers"), *Inline Filters*.
  - *Rich Cell Content* ("Link for emails and Badge for role labels").
  - *Sortable*, *Row Selection*, *Striped*, *Grid Dividers* ("suited for dense numeric data"), *In Card*, *Column Settings*, *Resizable*.
  - *useTableRowStatus — Semantic and Custom Markers*.
  - *useTableRowExpansion — Tree Table*.

**Table plugins**
- **`useTableRowExpansion`:** "expands a full-width detail panel below a row, rendered by the consumer via renderExpanded(item). Adds a leading chevron column and a right-click "Expand/Collapse row" action; the consumer owns the expandedKeys set. Use it for master-detail rows (order details, **forms**, charts, nested tables)."
  - Props: `expandedKeys*`, `onToggle*`, `getRowKey*`, `renderExpanded*`, `getIsItemExpandable`.
  - This is where the inline edit fields go.
- **`useTableFiltering` + `useTableFilterState`:** "inline column filters with popover or inline controls … text, select, multi-select, date, and number filter types via PowerSearch field definitions". `variant: 'popover'|'inline'|'inline-compact'`.
- **`useTablePagination`:**
  - `{page, onPageChange, totalItems|totalPages|hasMore, pageSize=10, pageSizeOptions, onPageSizeChange}`.
  - `variant`: `pages|count|compact|dots|none`.
  - `position`: `below|above|both|none`.
- **`useTableSortable`**, **`useTableRowStatus`** ("prepends a narrow column signaling per-row status"), **`useTableSelection`**.

**Row click to a detail page: gap.** There is no `onRowClick` prop. The `table-filter` template does it with a custom plugin. Its source comment reads: "**There is no first-class row activation plugin, so this reaches the `<tr>` through transformBodyRow.**" The plugin:
- sets `tabIndex: 0` and `aria-current`;
- adds `onClick` that ignores clicks from `input, button, a, select, textarea`;
- adds `onKeyDown` for Enter/Space.

The documented alternatives are a `Link` in the identifying cell (*Rich Cell Content*) or rows as `ListItem` with `href`/`onClick`. Note that the `Button` Don't ("Use a button for navigation") applies here, so use links for navigation.

**Pagination** (/components/Pagination)
- **Usage:** "Place it below a table, list, or card grid …"
- **Do:**
  - "Place pagination below the content it controls …"
  - "Use the pages variant for data tables where users need to jump to a specific page."
  - "Use the count variant with a page size selector when users need to control how many items they see at once."
  - "Pass totalItems when the total is known".
- **Don't:**
  - "Show pagination when all items fit on a single page"
  - "Place pagination above the content".
- **Examples:** *With Table* ("Use the count variant with small size for dense data views"), *Page Size Selector*.

**EmptyState** (/components/EmptyState)
- **Usage:** "EmptyState shows a placeholder when a content area has no data … Always include a title and a next step so the user is not stuck."
- **Props:** `title*` (renders h3), `description`, `icon`, `actions`, `headingLevel`, `isCompact`.
- **Do:**
  - "Include a clear title and a call-to-action button"
  - "Use an illustration or icon that reinforces the context"
  - "Use the compact variant inside cards or sidebars".
- **Don't:**
  - "Leave an empty state without guidance"
  - "**Use a generic message like "No data"**; be specific about what is empty and why."
  - "Use an EmptyState for error messages that require immediate action; use a Banner instead."
  - Consequence: always pass `emptyState={<EmptyState …/>}` instead of relying on Table's default "No data".
- **Examples:** *Actions* ("a search returns no results, a filter clears all items"), *Compact*, *Container*.

**Toolbar** (/components/Toolbar): the filter row above a table.
- **Usage:** "Use it for contextual actions within a content area (above a table, inside a card, or in a panel), not as a page-level header. Set the size once on the toolbar and all buttons, inputs, and tabs inside it match automatically."
- **Do:**
  - "Put secondary actions like "Back" on the left, and primary actions like "Save" on the right."
  - "Visually separate the toolbar from the content below it …"
  - "Use Toolbar as a card header when the header has interactive actions".
- **Don't:**
  - "Put too many actions in one toolbar; move less common items into a MoreMenu."
  - "Set size on individual child buttons"
  - "Use Toolbar for app-wide navigation".
- **Examples:**
  - *Toolbar — Table Filter*: "Filter bar above a table: a search box leads the row, each field beside it is a closed trigger that doubles as its own filter chip … followed by a live result count, a clear all, and a column picker."
  - *Bulk Actions*, *Card Header*, *Tab Navigation*.
- The `astryx build` kit for our table idea recommends the blocks `ToolbarTableFilter`, `PaginationWithTable`, `TableFilterableTable`, and the page templates `table-filter`, `table-grouped`, `table-page`.

### Stepper (+ Step): 6-step wizard
Site: /components/Stepper · src `packages/core/src/Stepper/Stepper.doc.mjs`, `Step.doc.mjs`

- **Usage:** "Steppers display progress through a sequence of logical and numbered steps. Use them for multi-step workflows like forms, onboarding flows, or checkout processes … Rendered as an ordered list (not a navigation landmark)."
- **Stepper props:**
  - `activeStep*`: 0-based.
  - `orientation`: `horizontal|vertical`.
  - `onStepClick`.
  - `label`, default "Progress".
  - `density`.
  - `indicatorPosition`: `separated|on-track`.
  - `horizontalOptions`.
- **Step props:**
  - `step*`, `label*`, `description`.
  - `children`: content slot.
  - `status`: `accent|success|warning|error`.
  - `indicator`: `auto|number|none|node`.
  - `isDisabled`, `isOptional`, `endContent`.
- **Do:**
  - "Keep step labels short and descriptive: "Payment" not "Enter your payment information"."
  - "Use the vertical orientation when steps carry longer descriptions."
  - "Set horizontalOptions.collapsedVariant to 'withLabel' when the page already supplies Back/Continue …"
  - "Provide onStepClick for non-linear workflows where users may need to revisit earlier steps."
  - "Use status only to apply a semantic color … pass a custom icon for richer indicators."
- **Don't:**
  - "Use a stepper for fewer than 3 steps"
  - "Use more than 7 steps; consider grouping related steps". Our 6 steps are within this limit.
- **Examples:**
  - *On-Track Vertical*.
  - *Custom Content*: "A vertical stepper where each step owns a slice of the page … Rendering the slot only for the active step is what makes the flow expand one step at a time".
  - *Validation Status*.
  - *Indicator Modes*.
  - *Horizontal Narrow Collapsed*.
- **Page template `form-wizard-vertical`** (`/templates/form-wizard-vertical`). `astryx build` names it the closest match for "multi-step wizard with vertical stepper". Its source comments say:
  - The rail "lives in the Layout's `start` slot, so it scrolls independently of the form". "Actions sit in the Layout `footer`, which spans the full width beneath both columns: they are the flow's controls rather than the form's, and pinning them means Continue is reachable without scrolling."
  - Footer: `<LayoutFooter hasDivider>` with `<Button label="Back" variant="secondary" isDisabled={step === 0}/>`, `<StackItem size="fill"/>`, `<Button label={isLastStep ? 'Submit for review' : 'Continue'} variant="primary"/>`. "No step counter here."
  - "The rail is a summary, not a menu … Resist adding per-step badges or counts."
  - "**Five steps with descriptions is about the ceiling** for a rail that stays readable without scrolling on a laptop. Past seven, the pattern to reach for is grouped sections." At 6 steps, keep descriptions to one sentence.
  - "Do not shrink the rail in place … below its breakpoint the same steps render horizontally in the header." The template uses `useMediaQuery('(min-width: 1000px)')`.
  - "Completed steps keep their status … `status="error"` while still reading as completed".
  - Uses `indicator="number"`, `PANEL_WIDTH = 300`, and `MEASURE = 640` (content column).

### Dialog (+ DialogHeader, useImperativeDialog): 640px signing modal
Site: /components/Dialog · src `packages/core/src/Dialog/Dialog.doc.mjs`, `DialogHeader.doc.mjs`

- **Usage:** "Dialog displays a modal overlay that blocks interaction with the page until the user responds."
- **Props:**
  - `isOpen*`, `onOpenChange*`.
  - **`width`**: default 400. "Standard dialogs clamp to their container and the dynamic viewport". Pass `width={640}`.
  - `maxHeight`: default `'75dvh'`.
  - `position`: `{top, bottom, start|end}`.
  - `variant`: `standard|fullscreen`.
  - **`purpose`**: `'required'|'form'|'info'`. "required disables Escape and backdrop click; form disables backdrop click after interaction; info allows both".
  - `padding`.
- **DialogHeader:**
  - `title`: "receives focus on open and labels the dialog".
  - `subtitle`.
  - `onOpenChange`: renders the close button.
  - `startContent` (e.g. a back button), `endContent`, `hasDivider`.
- **Do:**
  - "Choose the right purpose: info for dismissable content, form to prevent accidental backdrop dismissal, required when the user must respond."
  - "Include a clear title in the header"
  - "Use purpose="form" for dialogs with inputs"
  - "Keep dialogs focused on a single task".
- **Don't:**
  - "Use a dialog for simple messages that could be shown inline or as a toast"
  - "**Nest dialogs inside other dialogs; restructure the flow into steps within a single dialog instead.**"
  - "Use the fullscreen variant for simple confirmations".
- **Examples:**
  - *Dialog — Required*: "Cannot be dismissed by Escape or backdrop click … Uses purpose="required"."
  - *Form*, *Confirmation*, *Scrollable*, *Fullscreen*, *Adaptive presentation*.
- **Compound pattern** (`/docs/styling` → Compound Components):
  ```tsx
  <Dialog isOpen onOpenChange={close}>
    <Layout
      header={<LayoutHeader hasDivider>…</LayoutHeader>}
      content={<LayoutContent>…</LayoutContent>}
      footer={<LayoutFooter hasDivider>…buttons…</LayoutFooter>}
    />
  </Dialog>
  ```
- **Page template `form-wizard-dialog`** ("Dialog Wizard"). The source uses `Dialog width={620}`, `DialogHeader`, `Stepper density="compact"` in the `LayoutHeader`, and a pinned footer. Its comments say:
  - "**Fixed height, no page scroll.** … Three short steps is the budget."
  - "`density="compact"` on the stepper, and no step descriptions"
  - "`purpose="form"` so a stray backdrop click cannot discard a half-finished flow"
  - "**Never open a dialog from this dialog.** Nested focus traps and two overlapping dismiss paths are not progressive disclosure."
  - "**Reset state on close, deliberately.**"
  - "**Stepper stays non-interactive here.** `onStepClick` is deliberately absent … the two footer buttons are the whole navigation model."
  - "Never mount that page with the dialog already open".

### AlertDialog (+ useImperativeAlertDialog): one-sentence destructive confirm
Site: /components/AlertDialog · src `packages/core/src/AlertDialog/AlertDialog.doc.mjs`

- **Usage:** "AlertDialog asks the user to confirm a destructive or irreversible action before it happens … `role="alertdialog"` … no dismissal by clicking outside. Escape cancels."
- "above 640px, actions render horizontally …; at 640px and below, the destructive action appears above Cancel and both buttons fill the footer width."
- **Props:**
  - `title*`.
  - `description*`: "Consequence description", our one sentence.
  - `actionLabel*`.
  - `onAction*`: "Does NOT auto-close".
  - `cancelLabel`.
  - `actionVariant`: default `'destructive'`.
  - `isActionLoading`, `width`.
- **Do:**
  - "Make the action button label specific: "Delete project" is better than "OK" or "Confirm"."
  - "Describe what will happen in the description so the user knows the consequences before confirming."
  - "Keep the cancel button as the least-destructive focus target."
- **Don't:**
  - "Use AlertDialog for non-destructive actions; use a standard Dialog instead."
  - "Rely on color alone to signal danger; the action label itself should say what will happen."
  - "Close the dialog from onAction before the work finishes; hold it open with isActionLoading and call onOpenChange(false) when the action settles."
- **Examples:** *AlertDialog — Delete*, *AlertDialog — Loading*.
- `/docs/migration`: "Use AlertDialog for destructive confirmation and Dialog for task flows."
- The inline alternative is the *Popover — Confirm Action* example: "Inline confirmation popover for destructive actions with delete and cancel buttons".

### Drawer (400px, right side): gap
- **Core has no Drawer.** The lab `Drawer` (`packages/lab/src/Drawer/Drawer.doc.mjs`, **unpublished**) is exactly this pattern:
  - `side: 'end'`, default `width` 400, `hasScrim`, `hasCloseButton`, `label*`.
  - Its guidance:
    - "Keep the caller as the source of truth"
    - "Use hasScrim={false} for master-detail flows"
    - "Don't … Use a Drawer for short confirmations or small forms; use Dialog or AlertDialog instead."
    - "Don't … Nest a Drawer inside another Drawer".
  - It cannot be installed.
- **Published options:**
  - (a) A docked `LayoutPanel` in the `end` slot of `Layout`, `width={400}`. The layout guide says "Recommended panel width: 340–420", with `hasDivider` and `isScrollable`. This reflows the content.
  - (b) A `Dialog` with `position={{end: 0, top: 0, bottom: 0}}` and `width={400}`. This is an unofficial use of the position prop; no example shows it.
  - (c) Custom UI built on `useLayer`/`useFocusTrap`.

### Toast · useToast · LayerProvider: bottom right, 5 s
Site: /components/Toast, /components/useToast (hook page), /components/Layer · src `packages/core/src/Toast/*`

- **Usage:** "Toast shows a brief, non-blocking notification … For production use, prefer the `useToast()` hook; it handles positioning, stacking, auto-dismiss, and deduplication via `ToastViewport`."
- **Options:**
  - `body*`.
  - `type`: `'info'|'error'`. "Error toasts persist until dismissed".
  - `isAutoHide`: "Defaults to true for info, false for error".
  - **`autoHideDuration` default 5000**.
  - `endContent`, `uniqueID`, `collisionBehavior`.
- The viewport defaults to **`position='bottomEnd'`** and `maxVisible=5` (`ToastViewport.tsx`). The positions are `topEnd|topStart|bottomEnd|bottomStart`. Configure via `LayerProvider toast={{position, maxVisible}}`.
- **Do:**
  - "Keep messages short …"
  - "Add a short undo action in the endContent slot …"
  - "Use uniqueID to deduplicate toasts that fire from repeated actions"
  - "Use error type for failures that need attention but not immediate action; it persists until dismissed".
- **Don't:**
  - "use a toast for critical errors that block the user. Use Banner …"
  - "put long or multi-line content in a toast; it disappears after 5 seconds"
  - "show form validation errors as toasts".
- **useToast:**
  - Do: "Use for transient success/error feedback that does not require user action."
  - Don't: "Use for critical errors that require acknowledgment; use AlertDialog instead." and "Call useToast in the same component that renders LayerProvider".
- **Examples:** *Types* ("Info toasts auto-dismiss after 5 seconds, error toasts persist"), *Action*, *Deduplication*, *Dismiss*, *Stacking*.

### Order form: SegmentedControl, NumberInput, InputGroup, FormLayout, MetadataList, Collapsible, Button

**NumberInput** (/components/NumberInput)
- **Usage:** "A form input for numeric values with built-in validation, min/max constraints, and step controls."
- **Props:**
  - `label*`, `value*`, `onChange*` (commits on blur/Enter).
  - **`units`**: "Units text to display at the end of the input (e.g., "%" or "GB")". Use this for the token suffix.
  - `min`, `max`, `step`, `formatValue`, `isIntegerOnly`.
  - `status`, `description`, `hasClear`.
  - `isWheelEnabled`.
- **Do:**
  - "Let people paste formatted numbers …"
  - "Set min, max, and step …"
  - "**Show units** (e.g. "%" or "GB") so users know what the number represents."
  - "Set isWheelEnabled={false} when the input appears in a scrolling surface".
- **Don't:**
  - "Use NumberInput for free-form text that happens to contain numbers"
  - "Wrap a disabled NumberInput in Tooltip … Use the disabledMessage prop".
- **Examples:** *With Units*, *Clearable* ("clear button, unit suffix, and min/max"), *Range Constrained*, *Status Variants*.

**InputGroup** (/components/InputGroup)
- The alternative suffix: `InputGroupText`. "Use text addons to show units, prefixes, or suffixes …"
- Don't: "put multiple text inputs in one group".
- Example: *InputGroup — Basic* ("A currency field with static prefix and suffix addons").

**FormLayout** (/components/FormLayout)
- Do:
  - "Stack fields vertically for most forms."
  - "Nest a horizontal FormLayout inside a vertical one when fields naturally pair up".
- Don't: "Use FormLayout for form state or submission. It's just layout. Wrap it in a <form> for that."
- From the layout guide: "Form fields are the exception: FormLayout owns their spacing."
- Principles: "Form inputs are controlled (value + onChange)".

**MetadataList** (/components/MetadataList): the "You pay / You receive" read-outs.
- **Usage:** "MetadataList displays key-value pairs … Use it for detail panels, settings summaries, and record information."
- Do: "Choose label position based on content: "start" for short values, "top" for long or complex values."
- Don't: "Use for extensive form input".
- Examples: *Basic*, *Horizontal*, *Multi-Column*, *Collapsible*.
- Use `Text hasTabularNumbers` for the values.

**Collapsible** (/components/Collapsible): the slippage disclosure.
- **Usage:** "Collapsible hides and reveals content behind a trigger button."
- **Props:** `trigger*`, `defaultIsOpen` (default **true**, so set `false` for slippage), `isOpen`, `onOpenChange`, `chevronPosition`.
- **Do:** "Start sections open (defaultIsOpen) when the content is likely needed on first view".
- **Don't:**
  - "**Hide critical or required content behind a collapsible**; users may not discover it."
  - "Nest collapsibles more than two levels deep"
  - "Use a collapsible for a single short paragraph".
- **Examples:** *With Dividers* ("for detail panels and sidebars where cards would add too much weight … triggers step down to body-semibold").

**Primary button Approve → Fill**
- Button rules: "Reserve primary for the single most important action in the view". Use one primary and swap its `label`.
- "Write labels that describe the action". Use "Approve USDC" / "Fill order" rather than "OK".
- "Show a loading state for actions that take time". Use `clickAction` (auto loading) or `isLoading`.
- The `astryx build "order form buy sell amount"` kit returned blocks `CardWithInnerLayout` ("Card - Layout: header, content area, and footer with action buttons … Use for forms") and `CollapsibleControlledAccordion`, plus components `FormLayout` and `Field`.

### TextArea: plain-English policy editor
Site: /components/TextArea · src `packages/core/src/TextArea/TextArea.doc.mjs`

- **Usage:** "TextArea is a multi-line text input for collecting longer-form content like comments, descriptions, or messages."
- **Props:**
  - `label*`, `value*`, `onChange`.
  - `rows` (default 3).
  - `maxLength`: adds a character counter.
  - `status`, `statusVariant`, `description`, `placeholder`.
  - `isReadOnly`, `hasSpellCheck`, `width`.
- **Do:**
  - "Provide a visible label …"
  - "Set maxLength with a character counter when there is a defined limit"
  - "Use the status prop to surface validation feedback inline"
  - "Add a description or placeholder to clarify expected content … never rely on placeholder alone".
- **Don't:**
  - "Avoid using TextArea for short, single-line values"
  - "Don't show a status message without also setting the status type"
  - "Don't wrap a disabled TextArea in Tooltip …".
- **Examples:** *Character Count*, *Validation*, *States*, *Icon*.
- `RichTextEditor` is canary/private, so use TextArea.

### Detail page: Layout + LayoutHeader, Heading, Badge/Token, MetadataList, Section, Breadcrumbs/Link
- **Page template `detail-page`** ("Order Detail", `/templates/detail-page`): "Single-record detail in two columns: a summary header with status and actions, a repeating line-item list, a totals block that sums it, and a chronological activity timeline in the rail. The shape for any record holding children plus a history: a customer order …, a transaction, or a job."
  - `astryx build "detail page with status header and timeline"` picks it first; `work-item-detail` is second.
  - Source (`PageHeader`): `<LayoutHeader hasDivider padding={4} paddingBlockEnd={0}>` holds a back `Link color="secondary"` ("All orders"), then `<Heading level={1} maxLines={1}>#1001</Heading>`, then a wrapping `HStack` of metadata that includes `<Badge variant="warning" label="Unfulfilled" />`. The body is `LayoutContent` with a `VStack gap={4}` of `Section`s.
- **Section** (/components/Section):
  - **Usage:** "Section is the correct way to create page regions … If you are tempted to use a Card for a page section, use Section instead."
  - Do: "Use Section for page-level grouping". "Add dividers between same-background sections that need separation." "Combine with a heading + Stack".
  - Don't: "Use Card when you mean Section."
  - Props: `variant` `section|transparent|muted`, `dividers`, `padding` (default 4).
- **Breadcrumbs** (/components/Breadcrumbs):
  - Do: "Place breadcrumbs above the page heading". "Make the last item plain text".
  - Don't: "Use breadcrumbs as the primary navigation." "Show breadcrumbs on top-level pages that have no parent".

### Raw values surface (hex bytes, hashes, formulas): CodeBlock / Code, plus custom work
- **CodeBlock** (/components/CodeBlock):
  - **Usage:** "CodeBlock renders syntax-highlighted code with line numbers, a copy button, and optional collapsible sections."
  - **Props:**
    - `code*`, `language` (`'plaintext'`), `title`.
    - `hasLineNumbers`.
    - `highlightLines` (1-indexed, **whole lines only**).
    - `hasCopyButton` (default true), `onCopy`.
    - `isWrapped`, `maxHeight`, `size`, `width`, `container` `card|section`.
    - `tokenizer`: a custom tokenizer returning `{type,start,end}` spans.
    - `highlightMode`.
  - **Do:**
    - "Set the language prop … Use "plaintext" when the language is unknown."
    - "Add a title when the code represents a file."
    - "Use Code for short inline references …"
  - **Don't:**
    - "Enable line numbers on short snippets (under 5 lines)"
    - "Nest a code block inside a scrollable container. Use the maxHeight prop instead".
  - **Examples:** *Code — Terminal* ("Reach for a dark syntax preset instead of hand-rolling a dark box with custom CSS"), *Highlighted*, *Scrollable*.
- **Code:** the inline `<code>` element.
- **Gap:** hover-linking between table rows and byte segments has no component. Build it from `Text type="code"` spans, tokens (`--color-accent-muted`, `--font-family-code`), `Tooltip`/`HoverCard`, and a shared hover state.

### Timeline / history list: gap, composed
- **No Timeline component.** The `detail-page` template builds its "Timeline" `Section` from `Heading level={2}`, `Avatar`, a muted `Card padding={3}` per event, `Text` and `Icon` (template source).
- `astryx search "timeline"` returns only `Divider`, `TimeInput`, `Timestamp` and templates.
- Recommended composition from the docs:
  - `List`/`ListItem` (or `Item`) rows with `startContent` = `StatusDot`/`Icon`, `description`, and `endContent` = `Timestamp`.
  - The incident-console template does exactly this with `List density="compact" hasDividers`.
  - List rules:
    - Do: "Provide a header to label the list". "Use start and end content slots to add icons, avatars, or badges".
    - Don't: "Mix clickable and non-clickable items in the same list without clear visual distinction."
- A vertical connector line is custom.

### Tooltip · HoverCard
Site: /components/Tooltip, /components/HoverCard

- **Tooltip usage:** "A short text hint that appears on hover or focus … Use it to describe icon-only buttons, show the full text of truncated labels, or provide supplementary context."
- **Tooltip props:** `content`, `placement` above/below/start/end, `alignment`, `delay` 200, `touchTrigger` `auto|tap|none`, `hasHoverIndication`.
- **Tooltip Do:**
  - "Keep tooltip content concise: aim for under 140 characters"
  - "Add a tooltip to icon-only buttons …"
  - "Set touchTrigger to tap when the trigger is a button whose only job is revealing the tooltip".
- **Tooltip Don't:**
  - "Place interactive elements like links or buttons inside a tooltip; use HoverCard or Popover instead."
  - "Use tooltips for essential information users must see to complete a task."
- Many components have their own `tooltip` prop (Button, IconButton, StatusDot) or `disabledMessage` (the inputs).
- **HoverCard Don't:** "Use a hover card when a simple Tooltip or Popover would suffice." "Use a HoverCard for content the user must interact with".

### useClipboard: copy addresses and hashes
Site: /components/useClipboard (hook page) · src `packages/core/src/hooks/useClipboard.doc.mjs`

- **Usage:** "Copy-to-clipboard behavior: the clipboard write, a transient isCopied flag with its own reset timer, and an optional polite screen-reader announcement … CodeBlock and Timestamp build their built-in copy buttons on it; reach for it directly when building a copy affordance that is not a plain icon button (a menu item, a labeled text button, a copy-on-click value chip)."
- **Returns:** `copy(text) => Promise<boolean>`, `isCopied`.
- **Options:** `announce`, `resetAfterMs`.
- **Do:**
  - "Drive the copied confirmation (copy → check icon, label swap) off the returned isCopied flag"
  - "Pass a localized announce message so the copy is spoken by screen readers"
  - "**For the common compact icon copy button, render a ghost IconButton with a "Copy" tooltip and wire onClick to copy(); the tooltip stays "Copy" and the icon flip is the confirmation.**"
- **Don't:** "Track a separate copied useState alongside the hook".

### Skeleton · Spinner
Site: /components/Skeleton, /components/Spinner

- **Skeleton usage:** "An animated shimmer placeholder that previews the shape of content while it loads … For content with unknown dimensions, use Spinner instead."
- **Skeleton props:** `width`, `height`, `radius` (`none|0-4|rounded`), `index` (stagger).
- **Skeleton Do:** "Match the size and shape of the content being loaded". "Stagger multiple skeletons with the `index` prop".
- **Skeleton Don't:** "Combine with a Spinner on the same content area". "Show skeletons indefinitely; if loading takes too long, show an error or empty state instead."
- **Skeleton examples:** *Table Rows* ("Table skeleton with staggered column widths"), *Card Loading*, *Staggered List*.
- **Spinner:**
  - Do: "Provide a meaningful label". "Use the "onMedia" shade … on dark or accent-colored backgrounds".
  - Don't: "Stack multiple spinners in the same view".

### Other components you will touch
- **DropdownMenu / MoreMenu** (/components/DropdownMenu, /components/MoreMenu):
  - MoreMenu: "Use for overflow or secondary actions; keep primary actions visible outside the menu".
  - DropdownMenu Don't: "Use a DropdownMenu for navigation". "Place more than 10–12 items in a single menu without grouping".
  - A good fit for the wallet chip if it opens actions (disconnect, copy address).
- **Link** (/components/Link):
  - Do: "Set `isStandalone` when the link appears outside of inline text".
  - Don't: "Use Link for actions that do not navigate; use a Button instead". "Set `label` on text links".
- **Selector** (filters) (/components/Selector):
  - Do: "Use variant="ghost" when a selector sits in a toolbar with ghost buttons".
  - Don't: "Use when there are only two options; use a SegmentedControl". "Use for yes/no or on/off choices; use Switch".
- **Switch:** "Use for settings that apply immediately". Useful for the demo tools.
- **Divider:** "Overuse dividers; rely on spacing and layout" is a Don't.
- **Icon:**
  - Do: "Use semantic icon names when available". "Pair icons with text labels".
  - Don't: "Render raw SVG elements; always wrap in Icon". "Pass a `name` prop; Icon uses `icon`".
- **Avatar Don't:** "Use Avatar for logos, product images, or anything that isn't a person or team." So do not use it for the wallet chip or token logos.

---

## 4. Library-wide guidelines, patterns and templates

### 4.1 Principles
Site /docs/principles · src `packages/cli/assets/docs/principles.doc.mjs`

- **Philosophy:**
  - "Components over primitives: use components for everything they cover before reaching for raw HTML"
  - "Semantic tokens over hardcoded values"
  - "Theme-agnostic code: your app code never references specific colors or measurements, so themes and dark mode work automatically"
  - "Open internals".
- **Rules:**
  1. "Use components for everything they cover"
  2. "Page layout is frame-first: pick the shell and budget regions before writing content"
  3. "Dense data renders as rows (Table, List/Item), edge-to-edge with dividers; Card is for widgets, galleries, and settings groups"
  4. "StyleX or Tailwind for custom styling; both are first-class"
  5. "Semantic tokens, not hardcoded values"
  6. "CSS custom properties for colors, not hex values"
  7. "Form inputs are controlled (value + onChange)"
  8. "Use useLinkComponent() for navigation so consumers can plug in their framework router via LinkProvider"
- **Anti-patterns (Don't):**
  - "Inline styles on raw elements. Use xstyle on components"
  - "Hardcoded colors (#fff) …"
  - "Hardcoded spacing (16px) …"
  - "Hardcoded <a> elements …"
  - "Wrapping every list item or page section in a Card …"
  - "Badge as decoration. Reserve Badge for counts and enumerated states; use StatusDot or Token for status"
  - "Inventing props. Read component docs first"
- README principle: "**Guidance over enforcement.** Components give you capability rather than guardrails that fight you. Design opinions live in docs and examples — if you pass a value, the component renders it." In other words, the rules are not enforced by the library, so the team has to apply them.

### 4.2 Layout guide
Site /docs/layout · src `packages/cli/assets/docs/layout.doc.mjs`

- **Process:** "Build a layout outside-in … Content-first layouts drift into a padded column of cards."
  1. Scaffold
  2. Structure
  3. Spacing
  4. Breakpoints
- **Scaffold:**
  - "Pick the frame: AppShell for nav apps, Layout with LayoutPanel in a start or end slot for multi-pane tools, or a plain content column for documents and forms."
  - "tables, charts, and boards fill their region; prose, forms, and lists cap with Layout contentWidth". "640 suits text and forms, 960 mixed content."
  - Do:
    - "Decide the frame, region width budgets, and fill or capped before any content exists"
    - "State the reason for the navigation choice, or inherit the template pairing"
    - "Reserve raw px for structural widths".
  - Don't:
    - "Build content-first and wrap each section in a Card"
    - "Stretch prose, forms, or lists across a wide region instead of capping with contentWidth"
    - "TopNav when top-slot ownership is unclear, or the hierarchy is deep or still growing"
    - "Deviate from the template navigation pairing without a stated reason".
- **Structure:**
  - Containers from weakest to strongest: "spacing and gap … Divider … Section: the default page-structure unit … Card: a self-contained widget (KPI tile, chart, gallery entry), or a hard boundary around critical content".
  - Decision test: "records render as rows, Table for columnar and List for single-line; a self-contained widget or hard boundary is a Card; everything else is a Section."
  - Headers and footers:
    - "LayoutHeader in the header slot: the region title and its primary action"
    - "Toolbar instead of LayoutHeader when the header carries interactive controls"
    - "LayoutFooter in the footer slot: actions that commit the work and must stay reachable".
  - Side panels: "Master-detail: selecting a row opens a fixed-width side panel instead of navigating away … Recommended panel width: 340–420 … Render an EmptyState when nothing is selected."
  - Do:
    - "One lead per region; rank with weight and color; one primary action"
    - "Default to Section"
    - "Render collections as rows (Table or List), edge-to-edge with dividers".
  - Don't:
    - "Card soup"
    - "Cards inside Cards"
    - "A header or footer rebuilt inside the body, where it scrolls away with the rows"
    - "Flexbox soup: nested ad-hoc flexboxes instead of Grid, Layout, Section, or FormLayout"
    - "Two competing primary actions in one region"
    - "Badge as decoration".
- **Spacing:**
  - "The container owns padding and child gaps; children zero their margins".
  - "Grouping comes from contrast between tight and generous gaps". "Tight binds at gap={1}–{2}, generous separates at gap={4}–{6}".
  - Don't: "Double padding". "One repeated gap everywhere". "Mixed control sizes in a single row".
- **Breakpoints:**
  - "Recommended thresholds: 3 regions above 1024, 2 from 768, 1 below".
  - "the side panel becomes a Dialog or BottomSheet, driven by useMediaQuery".
  - Don't: "Shrink every region uniformly instead of swapping or dropping one."

### 4.3 Foundations Do/Don't
- **Color** (/docs/color):
  - Do: "Use semantic tokens … Rely on the surface hierarchy (body → surface → card → popover) … Use status colors (success, error, warning) only for their semantic meaning."
  - Don't: "Hardcode hex values … Mix accent colors with status colors in the same context. Use --color-on-accent on non-accent backgrounds."
- **Shape:** see 1.4.
- **Spacing:** see 1.4.
- **Elevation** (/docs/elevation):
  - "Pick the level by how far the surface sits from the page … `none` when flat/embedded, `low` when in-flow but distinct, `med` when over page content, `high` when over the whole UI".
  - Don't: "Hand-write a `box-shadow` in app code". "Use elevation shadows for decorative borders."
- **Motion** (/docs/motion): "Where Motion Hurts: Table row hovers. List item highlights. Anything the user does dozens of times per minute." Honor reduced motion.
- **Typography** (/docs/typography): "Astryx never loads font files … loading the font is always the app's job". Display types are "for hero banners, marketing headlines, and data callouts, not for document headings." Big prices could use display types.
- **Theme** (/docs/theme): see 1.3. Component overrides:
  - Do: "Write standard CSS properties (borderRadius, padding); the pipeline expands them into internal vars."
  - Don't: "Set private CSS vars (prefixed --_)".

### 4.4 Migration guide (applies because we are replacing plain components)
Site /docs/migration

- **Order:**
  1. Install and init.
  2. Theme at the root.
  3. Layer order.
  4. Smoke test.
  5. "Move the persistent frame first: AppShell, TopNav …"
  6. "Replace shared primitives: Button, IconButton, TextInput, NumberInput, Switch, CheckboxInput, RadioList, Selector, Tabs, Dialog, AlertDialog, Banner, Toast, Badge, Card, Table, and ListItem"
  7. Replace global workflows, including "destructive confirmation dialogs".
  8. "Verify both light and dark modes, keyboard navigation, responsive layout, and empty/error/loading states before moving to the next route."
- "Do not wrap old shadcn components in design system styles. Replace the primitive with the component that owns the behavior, accessibility, state classes, and token usage."
- **Map:**
  - "tabs used as page nav → TabList"
  - "alert / callout → Banner or Toast … Use Banner for page or section messages and Toast for transient feedback"
  - "dialog → Dialog or AlertDialog"
  - "card-like list row → ListItem. Prefer ListItem for selectable rows instead of styling Button as a row"
  - "Header → TopNav: Use for product identity, global actions, account entry".

### 4.5 Page templates relevant to us (`/templates/<slug>`, `astryx template <slug>`)

| Template | What it is (doc description, abridged) | Use for |
|---|---|---|
| `shell-top-nav` "Top Nav" | "Application frame with horizontal navigation only … content that keeps the entire width". Skeleton: `<AppShell contentPadding={6} variant="surface">` + `TopNav` / `TopNavHeading` / `TopNavItem` / ghost `IconButton` + primary `Button` | App shell |
| `dashboard` "Analytics Dashboard" | "a row of headline tiles, then charts, then supporting tables, all re-reading from one global filter bar" | Stat tile row (`MetricCard` in `Grid minWidth 240`) |
| `dashboard-composition` "Portfolio Dashboard" | "balance and change tiles … closing on a ranked table … Portfolio, holdings, positions" | Treasury overview |
| `dashboard-alert-rail` "Service Monitoring Dashboard" | "status-colored tiles with sparklines … an independently scrolling alert column" | Status tiles plus alerts |
| `table-filter` "Filterable Table" | "token bar … saved views … resizable detail pane". Contains the row-activation plugin | Tables with filter row and row click |
| `table-page` "Searchable Table" | "narrowed three ways at once — a full-text search box, a scope toggle, and per-column popovers". Comments: "The failure mode is shipping all of them by reflex"; "`variant="popover"` unless the table owns the page"; "Narrow once, into one array"; "One reset that clears all of them"; "Sort after filtering, not before" | Filter-row rules |
| `incident-console` | "Dense row queue with an inspector … a segmented status control … Rows, not cards" | Quote/RFQ queues, status tokens |
| `form-wizard-vertical` | See Stepper above | 6-step wizard |
| `form-wizard-dialog` | See Dialog above | Signing modal |
| `detail-page` "Order Detail" | See Detail page above | Detail page and timeline |
| `work-item-detail` | "title with a status selector … comment and activity feed … property rail" | Alternative detail layout |

**`astryx build "<idea>"` results** (published CLI):
- "treasury OTC desk dashboard with status tiles and data tables" returned "No page template fits - frame with AppShell". Blocks: `ToolbarTableFilter`, `PaginationWithTable`, `PowerSearchSearchWithTable`, `StickyColumnsHookUsage`, `TableGridDividersTable`. Components: `Banner`, `StatusDot`, `Toast`.
- "multi-step wizard with vertical stepper" returned `form-wizard-vertical`.
- "detail page with status header and timeline" returned `detail-page`.
- "table with filters row expansion pagination" returned `table-filter`.
- "signing dialog multi-step" returned blocks `DialogFullscreenDialog`, `DialogFormDialog`, `DialogConfirmationDialog`, `DialogHeaderBasic`.

---

## 5. Mapping: our pattern → Astryx → rules → gaps

| Our pattern | Astryx component(s) / documented pattern | Rules that apply (see §3/§4 for quotes) | Gap / custom work |
|---|---|---|---|
| App shell, top header, no sidebar | `AppShell topNav={<TopNav label=…/>}` (`shell-top-nav`, *AppShell — Top Nav Only*); `contentPadding={0}` for table/dashboard pages, 4 for forms; `height="fill"` | "Use it as the root wrapper for every page"; don't add your own `<main>`/skip link; page `<Heading level={1}>` in children | None |
| Horizontal page navigation tabs | `TopNavItem` (with `href`, `isSelected`, `as`=router) in TopNav `startContent`/`centerContent`; or `TabList` with `href` Tabs (no `role="tablist"`) as a second level | TopNav "5 or fewer" items; "Avoid using TopNav to filter page content"; TabList "Don't … more than 6–8 visible tabs"; not for sequential steps | None |
| Two-way view switch (Treasury / Counterparty) | `SegmentedControl label="View" layout="hug"` + 2 `SegmentedControlItem` | "2–5 mutually exclusive views or modes"; "Don't use for page-level navigation; use TabList". If the switch changes which pages exist, it is navigation → use TabList/TopNavItems | Decide mode vs navigation |
| Wallet chip | `DropdownMenu` (button props: wallet icon plus truncated address) if it has actions; else `Token size="sm" icon=… label=…`; copy via `useClipboard` + ghost `IconButton` | Token: "Don't use tokens for primary actions or navigation"; Avatar is not for non-people; truncate with `Text maxLines` | Address truncation logic (middle-ellipsis) is custom |
| Status pill + live countdown | `Token` (color) or `StatusDot` + `Text`; countdown text `Text hasTabularNumbers` | Status = StatusDot/Token (principles); StatusDot needs a visible label; pulse only for "states that require immediate attention"; Timer is elapsed-only (canary) and "Countdown is deferred" | **Countdown ticking logic is custom** (interval plus formatter); no countdown component |
| Count badge "2 to sign" | `Button endContent={<Badge label="2"/>}` (*Button — End Slot*) or `Tab endContent` Badge (*TabList — With Badge*, "error variant for urgent counts") | Badge = counts; label 1–2 words; not clickable (the Button is the click target) | None |
| Global banners (max 2), one action each | `AppShell banner={…}`; `Banner container="section" status=… title=… endContent={<Button size="sm" variant="secondary"/>}` (*Banner — Action*, *Full Width*) | Don't stack same-status banners, combine them; info/success dismissable, errors persistent; title states the status; mount alert banners on events | "Max two" queue and priority logic is ours (docs give no limit) |
| Row of status stat tiles | `Grid columns={{minWidth: 240, repeat:'fit'}} gap={4}` of `Card` → `VStack` (`Heading level={4}` label, `Heading level={2}`/display value, `Text type="supporting"`) (dashboard `MetricCard`) | Card is for "a single metric"; keep padding consistent; don't nest cards; don't use Card color variants for status; don't use delta color alone | No published `Stat` (lab only), so compose |
| Two-number price board (ask/bid) + source badge | `Card` with `HStack` of two value blocks (`Text type="display-3"`/`Heading` with `hasTabularNumbers`, label `Text color="secondary"`), `Divider orientation="vertical"` between; source as `Token size="sm"` | Principles: Badge only for counts/states, so the source tag is a Token; tabular numbers for numeric data; display types OK "for data callouts" | Price-flash animation (if any) is custom; keep it subtle (motion guide) |
| Share bar with 70% target line | `ProgressBar label=… value=… hasValueLabel marks={[{value:70,label:'Target 70%'}]}` | Label required; don't put icons/labels inside the bar; one bar per measure; mark needs a label (tooltip) | None; `marks` is the documented goal line |
| Tables: filter row above | `Toolbar` (*Toolbar — Table Filter*) with `TextInput` search (`hasClear`, hidden label) + ghost `Selector`s; or `useTableFiltering` + `useTableFilterState` (`variant="popover"`) | table-page: don't ship every filter surface; one reset; filter then sort; Toolbar sets size once | None |
| Table row click → detail page | Link in the ID cell via `renderCell` (*Rich Cell Content*) or custom `transformBodyRow` plugin (table-filter template) | Buttons are not for navigation, so use links; child controls keep their own clicks | **No first-class row-click API** (quoted from template source) |
| Row expansion with inline edit fields | `useTableRowExpansion({expandedKeys, onToggle, getRowKey, renderExpanded})` → `FormLayout` of `NumberInput`/`TextInput size="sm"` | "Use it for master-detail rows (order details, forms …)"; one control size per row; inputs controlled | Interaction between row click and expansion needs design (chevron column vs row click) |
| Pagination | `useTablePagination({page,onPageChange,totalItems,pageSize})` or `Pagination` below the table (*Pagination — With Table*: `count` variant, `size="sm"`) | Below content; hide when one page; pass `totalItems` | None |
| Empty state | `Table emptyState={<EmptyState title=… description=… actions=…/>}` | Never "No data"; say what is empty and why, plus a next step; compact inside cards | None |
| Loading tables/tiles | `Skeleton` (*Skeleton — Table Rows*, `index` stagger) | Don't mix with Spinner; don't show indefinitely | None |
| 6-step wizard, vertical stepper left, fixed Back/Continue | `form-wizard-vertical`: `Layout` with `start={<LayoutPanel width={300}><Stepper orientation="vertical" activeStep onStepClick label/></LayoutPanel>}`, `content`, `footer={<LayoutFooter hasDivider>Back (secondary) … Continue (primary)</LayoutFooter>}` | 3–7 steps OK; short labels; one-sentence descriptions; "Five steps with descriptions is about the ceiling"; rotate to horizontal below ~1000px, don't shrink; error status on a completed step | None |
| 640px signing modal (review → sig 1 → switch account → sig 2 → confirming → done/failed) | `Dialog width={640} purpose="required"` during signing (else `"form"`) + `Layout` (`DialogHeader` + optional `Stepper density="compact"`, `LayoutContent`, `LayoutFooter` buttons); `Spinner`/indeterminate `ProgressBar` for confirming; `Banner status="error"` or result block for failed | Don't nest dialogs, "restructure the flow into steps within a single dialog"; reset state on close; don't auto-open on mount; Stepper non-interactive in dialogs; one primary per step | Result "done/failed" illustration is custom; Dialog default width is 400, so set 640 explicitly |
| One-sentence confirm before destructive action (stop, cut off) | `AlertDialog title description actionLabel="Cut off counterparty" onAction isActionLoading` (or `useImperativeAlertDialog`) | Specific action label; description states consequences; don't close before work finishes; Cancel keeps initial focus; destructive Button needs confirmation | None |
| Right-side 400px drawer (demo tools) | Published: docked `LayoutPanel width={400} hasDivider isScrollable` in `Layout end`; or `Dialog position={{end:0,top:0,bottom:0}} width={400}` | Layout: panel 340–420, EmptyState when nothing is selected; lab Drawer rules (not installable) | **No overlay Drawer in core**; custom or unofficial Dialog positioning |
| Toasts bottom-right, 5 s | `LayerProvider toast={{position:'bottomEnd'}}` + `useToast()` (`autoHideDuration` default 5000) | Short messages; `uniqueID` dedupe; not for critical or validation errors; **error toasts persist by default** | None (keep the docs' error persistence) |
| Order form | `SegmentedControl` Buy/Sell (`layout="fill"`, `label`); `NumberInput units="USDC"` (or `InputGroup`+`InputGroupText`); `MetadataList` "You pay / You receive" with `Text hasTabularNumbers`; `Collapsible defaultIsOpen={false} trigger="Slippage"`; single `Button variant="primary"` label "Approve USDC" → "Fill order" with `clickAction`; wrapped in `<form>` + `FormLayout`, optionally inside `Card` + `Layout` (*Card — Layout*) | One primary; descriptive labels; loading state; show units; don't hide critical info in Collapsible (slippage is advanced, OK); controlled inputs | None |
| Plain-English policy editor | `TextArea label rows={8} maxLength description status` | Visible label; counter if limited; status type with message | Syntax/linting of policy is custom |
| Detail page: identity header + status + sections | `detail-page` template: `Layout header={<LayoutHeader>}` with back `Link`/`Breadcrumbs`, `Heading level={1}`, status `Badge`/`Token`, then `Section`s (`MetadataList` for key-values) | Section, not Card, for regions; one h1; breadcrumbs above heading | None |
| Raw values surface (hex, hashes, formulas) + hover-linking with table rows | `CodeBlock language="plaintext" hasCopyButton` / `Code` inline / `Text type="code"` | Plaintext when no language; `maxHeight` not scroll wrappers; tokens only | **Hover-linking byte segments ↔ rows is custom** (CodeBlock highlights whole lines only; a custom `tokenizer` gives spans but no hover API) |
| Timeline / history | `List hasDividers density="compact"` of `ListItem` (`startContent` StatusDot/Icon, `endContent` `Timestamp`) or `Section` + Avatar/Card per event (detail-page) | Timestamp: consistent format per list, never raw ISO; List: header, don't mix clickable/non-clickable | **No Timeline component**; connector rail is custom |
| Status badges Live / Expiring / Expired / Cut off | Per docs: `StatusDot` + label or `Token` color for status (principles); if Badge, only attention states: Expiring → `warning`, Cut off → `error`, Expired → `neutral`; Live → plain text or `StatusDot variant="success"` | "Don't apply success badge to every healthy/active item"; "don't repeat the same badge in every row"; label states the status (not color alone) | Pick one representation app-wide (docs conflict: Badge doc vs principles) |
| Tooltips | `Tooltip content=…` or the component `tooltip` prop; `disabledMessage` for disabled inputs | <140 chars, no interactive content, not essential info | Info-icon helper (`InfoTip`) is lab-only; use `IconButton ghost` + tooltip |
| Copy-to-clipboard (addresses, hashes) | `useClipboard({announce:'Copied'})` + ghost `IconButton` with tooltip "Copy"; `CodeBlock hasCopyButton`; `Timestamp tooltipEntries` | Drive the icon from `isCopied`; no extra state | None |
| Skeleton loading | `Skeleton width height radius index` | Match shapes; stagger; not with Spinner | None |

---

## 6. Guidance for AI agents (quote these to the team and agents)

### 6.1 Generated agent block
From `npx astryx init --features agents`, published CLI 0.6.3. This is what `astryx init` writes into the project's `AGENTS.md`/`CLAUDE.md`. It is the **CSS variant**, because our project has no StyleX or Tailwind compiler. Verbatim:
```
Astryx v0.6.3 · 164 components
CLI: run every command as `npx astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in your app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — discover, don't guess. Before writing UI:
1. `astryx build "<idea>"` — START HERE: returns a kit (closest [page] + [block]s + [component]s). No args = full playbook.
2. `astryx template <name> [--skeleton]` — scaffold the [page]/[block]s it named, or study their layout. Templates are reference code.
3. `astryx component <Name>` — props + examples for every component you use.

RULES:
- No <div> — components do all layout/spacing, page frame included.
- Frame first: read `astryx docs layout` before writing any page or screen — page frame, region widths, breakpoint behavior.
- Dense data = rows (Table, List/Item), never Card-wrapped list items; Card is for standalone widgets. Status = StatusDot/Token; Badge = counts only.
- Custom styling: component props first; else style/className with tokens — var(--color-*|--spacing-*|--radius-*). No raw hex/px. (No StyleX/Tailwind compiler here — don't use xstyle/utility classes.)
- Tokens for every value (`astryx docs tokens`). Brand/accent belongs in the theme (`astryx theme list` / `theme add <slug>`, or `astryx theme template` for a custom one) — never override --color-* in :root.
- SELF-CHECK before you finish: re-read the file and replace any raw <div>/<span> layout, imported .css/@apply, or hardcoded value (#hex, 16px) with the component or a token (var(--color-*|--spacing-*|…)). If unsure a component/prop exists, run `astryx component <Name>` / `astryx search "<thing>"`; don't hand-roll CSS.
```
With StyleX configured, the styling rule becomes "component props first; else the xstyle prop / StyleX tokens (@astryxdesign/core/theme/tokens.stylex). No raw hex/px." (`packages/cli/foundation/agent-docs/agent-docs.mjs`). The source notes the self-check cut raw-CSS leakage "~4x".

### 6.2 `astryx build` playbook
Output of `astryx build` with no arguments:

> "4. Rules (keep it on-system):
> - No <div>/raw HTML for layout - use VStack/HStack/Grid/Stack/Card etc.
> - No style={{}} - use component props; design tokens via `npx astryx docs tokens`.
> - Wrap the app in <Theme theme={...}> and import core reset.css + astryx.css."

### 6.3 Working with AI
Site /docs/working-with-ai · src `packages/cli/assets/docs/working-with-ai.doc.mjs`

- "models still need the right context to avoid falling back to generic React patterns or inventing props."
- The generated context "teaches your AI a 3-step workflow before writing any UI code: `astryx template --list` … `astryx template <name> --skeleton` … `astryx component <Name>`".
- It also teaches "rules that prevent common mistakes (no raw divs, no style={{}}, use tokens not magic values)".
- "Checking Your Setup":
  > "Before writing any Astryx code, check your knowledge: 1. What is the correct import path for Button? 2. How do you make an Dialog non-dismissible? 3. What prop does Selector use for its items?"
  - The docs say: "These three questions have a 0% pass rate without docs".
  - The answers: `@astryxdesign/core/Button`; `purpose="required"`; `options`.
- "Every CLI command supports --dense, which outputs a token-efficient format designed for AI context windows."
- MCP server: `{"mcpServers": {"astryx": {"type": "url", "url": "https://astryx.atmeta.com/mcp"}}}`, with tools `search(query)` and `get(name)`. This is blocked from this sandbox, like the site.

### 6.4 Getting started prompt for AI
Site /docs/getting-started

- "Install @astryxdesign/core, @stylexjs/stylex, @astryxdesign/theme-neutral, and @astryxdesign/cli in this project, then run `npx @astryxdesign/cli init` to set up agent docs. Read the generated files to learn the conventions."
- Theme prompt: "Ask me what look and feel this app should have … If none fit, run `npx @astryxdesign/cli theme template` and fill in the annotated template it writes." This is our path.

### 6.5 Repo `AGENTS.md` / `CLAUDE.md`
These are for contributors to Astryx itself; the relevant parts for builders:

- `CLAUDE.md`: "Read and follow `AGENTS.md`. It is the canonical repository instruction surface."
- `AGENTS.md`:
  - "Product builders: use `astryx docs`, component `{Name}.doc.mjs` files, and `packages/cli/assets/docs/`."
  - "Only `current` records govern implementation and review."
- The CLI block in `AGENTS.md`:
  > "Load agent docs before any component work … BOOTSTRAP (run every branch, <500ms): astryx help · astryx docs · astryx docs principles --dense · astryx docs tokens --dense · astryx docs theme --dense · astryx component --list · astryx template --list … RULE: always run bootstrap on each branch — docs reflect the branch's actual API · RULE: always run astryx component <Name> --dense before modifying a component · RULE: after @astryxdesign/core bump, always run astryx upgrade --apply"
- The StyleX patterns in `AGENTS.md` matter only if we author StyleX:
  - "hover on touch -> @media (hover: hover) guard"
  - "zebra striping -> :nth-child(even)"
  - "link elements -> useLinkComponent() (not hardcoded <a>). Consumers swap via LinkProvider for framework routers"
  - "dynamic/runtime values -> stylex.create({ s: (val) => ({ prop: val }) }) (not inline styles)".

### 6.6 Practical consequences for our team
1. Upgrade React 18.3.1 to 19 first; Astryx's peer dependency is `>=19.0.0`.
2. Run `npx astryx init --features agents` so every agent session gets the block in 6.1. Add the `astryx` npm script.
3. Build the `otc` theme with `defineTheme` and `astryx theme build`. Never set `--color-*` on `:root`.
4. For every screen, run `astryx build "<idea>"`, then `astryx template <closest> --skeleton`, then `astryx component <Name>` before writing JSX.
5. Custom pieces must still be built from Astryx primitives and tokens, with no raw divs or hex. The custom pieces are: countdown, overlay drawer, timeline rail, byte-segment hover-linking, row activation, and address truncation.
