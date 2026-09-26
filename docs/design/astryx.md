---
title: Astryx pages
domain: Brand & Design
type: Rules
status: Draft
page_code: AX
as_of: 2026-09-27
---

# Astryx pages

A screen is assembled from the component pages on [Astryx](https://astryx.atmeta.com/components/AlertDialog). Each page already has the Do list, the Don't list, and the example code. An agent copies that. An agent does not design a second version of the component.

The library source is [facebook/astryx](https://github.com/facebook/astryx). This app depends on the published packages `@astryxdesign/core` 0.6.3 and `@astryxdesign/theme-neutral` 0.6.3. The library repository is for reading a component. It is not where this product's current behavior lives.

Current product behavior is the latest pull request on [sdh2222/eth-tokyo](https://github.com/sdh2222/eth-tokyo/pulls).

## Rules

| ID | Rule | Why | Applies to | Checked by | If broken |
| --- | --- | --- | --- | --- | --- |
| AX-01 | Open the component page. Follow its Do list. Refuse its Don't list. Use its example code. | The page is the spec. [Alert Dialog](https://astryx.atmeta.com/components/AlertDialog) is the shape of every other page. | Every `@astryxdesign/core` component on a screen | The screen matches a documented example | A prop, layout, or color was invented for that component |
| AX-02 | Read the page for the component you are about to place. The catalog below is an index, not a substitute. | The Do and Don't text changes in the library. A copied paragraph in this repo goes stale. | Screen work | The component page was opened in that change | The screen was built from type declarations or from memory |
| AX-03 | Before a screen change, read the latest pull request on this repository and update the snapshot below. | Numbers, routes, and fields move on our pull requests. Astryx pull requests do not. | Desk screens | Snapshot names the pull request that was current | A screen shows a figure or a route the latest pull request has already replaced |
| AX-04 | Leave an approved header alone. Page work does not restyle it. | The header was accepted on its own. Astryx on the page does not repaint it. | `/dev/shell`, `/dev/shell/row`, `/dev/shell/astryx` | Header matches the last accepted pass | Header buttons, wordmark, or wallet changed while a page was edited |

Do and Don't in the library are `usage.bestPractices` in `packages/core/src/<Component>/<Component>.doc.mjs`. `guidance: true` is a Do. `guidance: false` is a Don't. The example on the docs page is the Storybook story in `apps/storybook/stories/`, shown inside the docs site's `ExampleBlock`. That block wraps the example in `Card`. The card frame is the docs page. It is not a style painted onto the component.

[Alert Dialog](https://astryx.atmeta.com/components/AlertDialog), from `packages/core/src/AlertDialog/AlertDialog.doc.mjs`:

- Do: label the action with the verb ("Delete project", not "OK"). Say the consequence in the description. Keep Cancel as the first focus.
- Don't: use it for a non-destructive action (use Dialog). Don't signal danger by color alone. Don't close from `onAction` before the work finishes.

The same two lists and an example exist for the other components. Open the page.

## Snapshot

Checked 27 Sep 2026.

Latest pull request by update time: [#29 Move the quote with the book and step the mock price](https://github.com/sdh2222/eth-tokyo/pull/29). Open. Updated 26 Sep 2026. Its body says: do not merge it, do not merge [#18](https://github.com/sdh2222/eth-tokyo/pull/18), do not run the walker.

What #29 says a screen has to match:

- The live router is `1.0.2-desk.4` at `0x82b5303b41E0963C10c2fdA2fe5AF3732877204C`. It still scales the two `desk.terms` widths by the distance from a 70% ETH share. It does not read `desk.spread`.
- `desk.terms` on `mm-a.clients.dao-treasury-a.eth` and `mm-b.clients.dao-treasury-a.eth`: version 1, sell 3 bp, buy 10 bp, cap 50 ETH. `desk.spread`, `desk.stats`, and `desk.policy` sit only on `dao-treasury-a.eth`. The 40 bp record on `mm-a` is not read.
- The book is `GET /v1/desks/dao-treasury-a`. There is no write endpoint.
- The frontend agent edits only `web/` on `origin/frontend` and renders the fields in `docs/agent-design.md`. That file is not on this branch.

This checkout is [#25 Pass 1: token sheet, Die Grotesk C, and Lisa](https://github.com/sdh2222/eth-tokyo/pull/25), which is older than #29. Pass 1 stops at `/dev/kit`. Die Grotesk C is the page face. LisaTerminal Paper is only the 16px lines inside a window.

## Catalog

Page URL is `https://astryx.atmeta.com/components/<Name>`. Subcomponents and hooks are on the parent page.

App Shell, Aspect Ratio, Avatar, Badge, Banner, Blockquote, Bottom Sheet, Breadcrumbs, Button, Calendar, Card, Carousel, Chat, Checkbox, Citation, Code, Code Block, Collapsible, Command Palette, Context Menu, Date Input, Dialog, Alert Dialog, Divider, Dropdown Menu, Empty State, Field, File Input, Heading, Hover Card, Icon, Indicator, Item, Kbd, Layout, Lightbox, Link, List, Markdown, Metadata List, More Menu, Navigation, Number Input, Outline, Overflow List, Overlay, Pagination, Popover, Power Search, Progress Bar, Radio, Resizable, Scrollable Area, Segmented Control, Selector, Skeleton, Slider, Spinner, Status Dot, Stepper, Switch, Table, Tabs, Text, Text Area, Text Input, Thumbnail, Time Input, Timestamp, Toast, Token, Tokenizer, Toolbar, Tooltip, Tree List, Typeahead, Visually Hidden.

Reference docs, not component pages: [Getting started](https://astryx.atmeta.com/docs/getting-started), [Styling](https://astryx.atmeta.com/docs/styling). Styling says to use tokens, and not to hardcode a color or a spacing value onto a component.

<details>
<summary>Change log</summary>

- 2026-09-27: Component pages are the spec. Product state is the latest pull request on sdh2222/eth-tokyo. Snapshot is #29.

</details>
