# Dyno design guide

How Dyno's views look, read and behave. Dyno is built on
[StrataKit](https://stratakit.bentley.com/) (Bentley's design system:
MUI themed by `@stratakit/mui`, plus `@stratakit/structures` and
`@stratakit/icons`). Follow StrataKit's own rules first
([usage skill](https://github.com/iTwin/stratakit/blob/main/skills/stratakit-usage/SKILL.md));
this guide adds Dyno's conventions. Record anything about StrataKit that
gets in the way in [STRATAKIT_FEEDBACK.md](STRATAKIT_FEEDBACK.md).

## Who it is for, and what they come to do

Engineers working on CesiumJS 2.0. They come to:

1. **See where 2.0 stands** against 1.x now (Overview).
2. **Follow metrics over time** and catch regressions (Trends, Alerts).
3. **Understand one run** or compare two (Runs, a run's report, Compare).
4. **Look at a scene** live in both engines (Scenes, Explorer), or at
   images that changed (Images).
5. **Try a variation** (Analysis: sweeps and machines) or run a focused
   check (Lab).

## Information architecture

The navigation rail (`NavigationRail` from `@stratakit/structures`) has
three groups separated by dividers, then a footer:

| Group     | Item            | Route                       | What it is                                           |
| --------- | --------------- | --------------------------- | ---------------------------------------------------- |
| Results   | Overview        | `/overview`                 | The latest run's verdict, budgets, alerts and to-dos |
|           | Trends          | `/trends`                   | Metrics run to run (the former Workspace)            |
|           | Runs            | `/runs`, `/runs/$run`       | Every run; a run's report; pick two to compare       |
|           | Alerts          | `/alerts`                   | Change points to triage                              |
| Scenes    | Scenes          | `/scenes`, `/scenes/$scene` | The catalog; a scene's page                          |
|           | Explorer        | `/explorer`                 | A scene live in one or two engines                   |
|           | Images          | `/images`                   | Image checks to review                               |
| Workbench | Analysis        | `/analysis`                 | Sweeps and machines (tabs)                           |
|           | Lab             | `/lab`, `/lab/$id`          | Parity checks, microbenchmarks, spikes               |
| Footer    | Getting started | `/start`                    | Setup checks and a first run; also shortcuts, theme  |

Compare (`/compare`) is reached from Runs (select two runs), from an
alert, or a link; it is not in the rail. `/` opens the Overview. Old
routes redirect (`/workspace` → `/trends`, `/report?run=` →
`/runs/$run`, `/sweeps` and `/hardware` → `/analysis`).

Words that mean one thing each: **run** (one invocation of the suite),
**scene** (catalog content with a camera path), **engine** (1.x or 2.0),
**configuration** (an engine with settings, e.g. `2.0-legacy1x`),
**check** (one image check), **Lab page**. Never "lap", "tab" (for a
view), "experiment", "workspace".

## Page anatomy

Every view renders through `Page` (views/common.tsx):

1. **Header**: title (`headline-sm`, an `<h1>`), one sentence on what
   the page answers (`body-md`, secondary text), primary actions on the
   right. No more than one sentence; details go in a `Help` popover.
2. **Toolbar** (optional): filters and pickers in one row, left to
   right in the order people choose them; the main choice first.
3. **Content**: sections with a `subtitle-md` heading (`<h2>`),
   `--stratakit-space-600` apart. Cards (`Card` with `variant="outlined"`)
   only for repeated items (scenes, Lab pages, alerts).

Density: StrataKit's compact sizes; 24 px page padding; tables with
`size="small"`. Long explanations never sit above content people came
to see.

## Copy

- Sentence case everywhere (titles, buttons, columns, menu items).
- Buttons say what they do: "Run", "Compare runs", "Approve image",
  not "OK", "Go", "Submit".
- Ratios read as words: "1.5× faster", "12% less memory", "no
  change", via `formatChange()` (lower-is-better aware), with the raw
  ratio in a tooltip. Not "▼ ×0.67".
- Numbers: units always, tabular figures, no more precision than the
  noise (2 significant digits for ratios, ms to 0.1 below 10 ms).
- Dates: "Oct 31, 18:49" in lists; ISO in tooltips.
- Empty states say what is missing and the one thing to do next, with
  the command or button: "No alerts yet. Alerts need about six runs of a
  scene."
- Errors say what failed and what to try.
- No exclamation marks, no "simply", no "please".

## Components (StrataKit)

- Pickers: MUI `Select` in a `FormControl` with a visible label
  (`Choice` in common.tsx). Two to four exclusive options: MUI
  `ToggleButtonGroup` (exclusive). On/off: `Switch` for settings that
  apply at once, `Checkbox` in lists.
- Multi-select of a few options (metrics, statuses): a non-exclusive
  `ToggleButtonGroup` (`Chips`); StrataKit's `Chip` has no selected state.
- Status: MUI `Badge` with `variant="inline"` and color `success`,
  `warning`, `error`, `info` or `secondary`, always with a word (never
  color alone). `Chip` takes no color in StrataKit.
- Messages: MUI `Alert` (inline), `Snackbar` (after an action: "Saved").
- Icons: `Icon` from `@stratakit/mui` with `@stratakit/icons`; nothing
  else.
- Styling: props first; then a class with StrataKit tokens
  (`--stratakit-space-*` (50 to 1000: 2 to 40 px), `--stratakit-color-*`, `--stratakit-font-size-*` (semantic: `body-md`, `caption-lg`, …));
  never `sx`, never hard-coded colors except the validated chart palette
  and the 3D viewport's HUD.

## Charts

Charts are the SVG strings `charts.mjs` builds (the CLI's reports share
them), hosted by `Chart`. Their surfaces and ink map to StrataKit tokens
(dyno.css); data colors stay on the validated categorical palette
(1.x blue, 2.0 orange, …), the same in every view.
