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
4. **Look at a scene** live in both engines (Scenes, Explorer), at any
   content in one engine at a time (Viewer), or at images that changed
   (Images).
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
|           | Viewer          | `/viewer`                   | Any content in one engine at a time, to debug        |
|           | Images          | `/images`                   | Image checks to review                               |
| Workbench | Analysis        | `/analysis`                 | Sweeps and machines (tabs)                           |
|           | Lab             | `/lab`, `/lab/$id`          | Parity checks, microbenchmarks, spikes               |
| Footer    | Getting started | `/start`                    | Setup checks and a first run; also shortcuts, theme  |

Compare (`/compare`) is reached from Runs (select two runs), from an
alert, or a link; it is not in the rail. `/` opens the Overview.

Words that mean one thing each: **run** (one invocation of the suite),
**scene** (catalog content with a camera path), **engine** (1.x, any
CesiumJS 1 build, or 2.0), **setup** (an engine's settings without a
build, e.g. `2.0+stepwise`), **check** (one image check), **Lab page**.
Engines are always named through `engineLabel` (engines.mjs), never by
raw id: a release by its version ("1.146.0"), a build by engine and
branch or ref ("2.0 · main", "2.0 · cesium-2.0-webgpu-poc · stepwise
selection"). Never "lap", "tab" (for a view), "experiment",
"workspace", "1.x@1.146.0".

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

## Live engines (Explorer, Viewer)

- **Inspector**: every engine view carries the inspector
  (`widgets/inspector.ts`) over it, collapsed to one line; 1.x and 2.0
  show the same panel through `Inspectable`.
- **Credits**: each engine's credits sit in its own view, bottom left,
  as 1.x shows them (required notices on screen, the rest behind Data
  attribution).
- **Timings**: the Explorer says up front that its timings don't compare
  (both engines share the machine) and links measured results; the
  Viewer runs one engine at a time.
- **The Viewer follows StrataKit's app layout** (its sandbox) instead of
  the page anatomy above: a docked panel on the left headed by what is
  loaded (with Open content and the engine), then a Settings subheader
  and accordion groups; the canvas an elevated card (16 px radius,
  `shadow-surface-xl`) with a solid `unstable_Toolbar` of ghost bricks
  `IconButton`s top left (toggles use `active`), the inspector top
  right, full screen alone bottom right. A panel's controls live in its
  own header (Hide panel); folded, a rail at the same edge brings it
  back. Settings an engine can't do stay visible, disabled, with why.
- **Icons on the canvas** must not look alike: re-center frames content,
  map is the overview inset, window-expand and window-collapse are full
  screen.

## Charts

Charts are the SVG strings `charts.mjs` builds (the CLI's reports share
them), hosted by `Chart`. Their surfaces and ink map to StrataKit tokens
(dyno.css); data colors stay on the validated categorical palette
(1.x blue, 2.0 orange, …), the same in every view.
