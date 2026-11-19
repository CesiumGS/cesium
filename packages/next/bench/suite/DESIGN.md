# Dyno design guide

How Dyno's views look, read and behave. Dyno is built on
[StrataKit](https://stratakit.bentley.com/) (Bentley's design system:
MUI themed by `@stratakit/mui`, plus `@stratakit/structures` and
`@stratakit/icons`). Follow StrataKit's own rules first
([usage skill](https://github.com/iTwin/stratakit/blob/main/skills/stratakit-usage/SKILL.md));
this guide adds Dyno's conventions. Record anything about StrataKit that
gets in the way in [STRATAKIT_FEEDBACK.md](STRATAKIT_FEEDBACK.md).

## Who it is for, and what they come to do

Engineers working on CesiumJS 2.0. Dyno answers questions about two
systems: the engine (2.0 measured against 1.x), and the work (the agent
system building it: the tracker now; agents, the merge queue, quotas
and ledgers as human-in-the-lead records them). They come to:

1. **Steer the work:** decisions waiting on the owner, what is ready, in
   progress and blocked, the roadmap and proposals (Work).
2. **See what needs a look in the engine:** where 2.0 stands against
   1.x and on each machine (Overview), regressions to triage (Alerts),
   images to approve (Images), failing or flaky tests, open studies.
3. **Read results:** one run or two compared (Runs, a run's report,
   Compare), metrics over time (Trends), one scene's history (Scenes).
4. **Look at content live:** a scene in one or two engines (the top of its page),
   any content in one engine (Viewer), an example (Examples).
5. **Find things out:** a sweep (Analysis, until Studies replace it) or
   a focused check (Lab).
6. **Set up:** the first run, the ion token, the theme and shortcuts.

## Information architecture

The navigation rail (`NavigationRail` from `@stratakit/structures`)
follows those jobs: the work's group, then the engine's four, separated
by dividers, then a footer. The work stays first, apart from the
engine's pages, because the owner's decisions are the most pressing;
each side keeps its own landing page and count (Work's decisions,
Alerts' regressions).
The groups have names here, not on screen (the rail has no section
headings; see STRATAKIT_FEEDBACK.md). `rail.ts` holds the rail as data
and `test/dynoRail.test.ts` checks this table against it.

| Group        | Item            | Key | Route                        | What it is                                          |
| ------------ | --------------- | --- | ---------------------------- | --------------------------------------------------- |
| The work     | Work            | w   | `/work`                      | The tracker as a running system; your decisions     |
| Needs a look | Overview        | o   | `/overview`                  | The latest run's verdict, budgets, machines, to-dos |
|              | Alerts          | a   | `/alerts`                    | Change points to triage (a count)                   |
|              | Images          | i   | `/images`                    | Image checks to review (a count)                    |
| Results      | Trends          | t   | `/trends`                    | Metrics run to run                                  |
|              | Runs            | r   | `/runs`, `/runs/$run`        | Every run; a run's report; pick two to compare      |
|              | Scenes          | s   | `/scenes`, `/scenes/$scene`  | The catalog; a scene's results, and the scene live  |
| Look         | Viewer          | v   | `/viewer`                    | Any content in one engine at a time, to debug       |
|              | Examples        | x   | `/examples`, `/examples/$id` | What 2.0 is for, one feature or use case each       |
| Experiment   | Analysis        | n   | `/analysis`                  | Sweeps; Studies replace it (CS-405)                 |
|              | Lab             | l   | `/lab`, `/lab/$id`           | Parity checks, microbenchmarks, spikes              |
| Footer       | Getting started |     | `/start`                     | Setup checks and a first run                        |
|              | ion token       |     | (popover)                    | The Cesium ion token every view uses; what's in use |
|              | Settings        |     | (menu)                       | Theme and keyboard shortcuts                        |

- **Coming:** Tests (`u`) joins "Needs a look", and Studies (`y`)
  replaces Analysis.
- **Off the rail:** Compare (`/compare`) is reached from Runs (select
  two runs), from an alert, or a link, and highlights Runs. A page under
  a rail item (a run's report, a scene, an example, a Lab page)
  highlights its item. `/` opens the Overview.
- **Moved:** Machines is a section of the Overview (`/overview#machines`);
  old `/analysis?tab=machines` links land there. The Explorer is now the top
  of each scene's page (below).
- **On a phone** (600 px and narrower) the rail starts folded, opens
  over the page, and folds after a pick.

Words that mean one thing each: **run** (one invocation of the suite),
**scene** (catalog content with a camera path), **engine** (1.x, any
CesiumJS 1 build, or 2.0), **setup** (an engine's settings without a
build, e.g. `2.0+stepwise`), **check** (one image check), **Lab page**.
Engines are always named through `engineLabel` (engines.mjs), never by
raw id: a release by its version ("1.146.0"), a build by engine and
branch or ref ("2.0 · main", "2.0 · cesium-2.0-webgpu-poc · stepwise
selection"). Never "lap", "tab" (for a view), "experiment" (on
screen; it names a rail group here only), "workspace", "1.x@1.146.0".

The Dyno harness (project CS-389) adds, one meaning each: **study**,
**question**, **hypothesis**, **expectations**, **evidence**;
**verdict**, for studies only (supported, refuted, inconclusive);
**result**, a run's scorecard (pass, marginal, fail); **validity**
(valid, warning, invalid); **purpose**, **baseline run**, **development
run**, **item** (`CS-<n>`, a work item in the tracker); **sweep**,
**axis**, **point**, **reference**, **setting**, **configuration**;
**series**, **machine**, **runner**, **device**, **hub**, **recording**.
Never "baseline" alone: say "baseline run", "baseline and candidate" or
"approved image". Pages that still call a run's result its verdict
change as the harness's pages land.

## A scene's page

One page per scene (`/scenes/$scene`), top to bottom: the scene live in
one or two engines side by side (the former Explorer), its content and
licenses, then its measured results (best results, history, changes,
requests, filmstrip). The live view's engines and place on the camera
path are in the page's search, so a report links to a moment. It loads
with the page; the engines share one GPU and main thread, so its
timings don't compare, and it says so.

## The Work board

The tracker (`packages/next/work`) as a running system, for the owner
first and then anyone choosing what moves next. Its shape comes from the
first principles in human-in-the-lead's systems-thinking notes, not from
a team's lifecycle columns: work is stocks and flows; the owner's
attention is the constraint; a distinction earns its place only if
someone acts on it. It reads, never writes: a change to an item is a
change to its file. The tracker follows human-in-the-lead's format:
milestones named by their outcome, each with an `outcome` sentence,
"Done when" clauses and a check.

- **It reads one API.** `/work-api/query.json` and
  `/work-api/item/CS-<n>.json` on the dev server, built by
  `scripts/workBoard.mjs`, the only adapter between the page and
  human-in-the-lead's read API (`hitld work query --json`, version 3, and
  `hitld work claims`, `check` and `show`). The page checks the version and
  says so when hitld is missing or answers in another. The state history
  behind Flow is the one read from git, since the read API has none yet.
- **No long outcomes, and nothing dropped.** The owner retired long
  outcomes (milestones with no parent) on 2026-11-17
  (`docs/decisions/2026-11-17-release-plan-and-parity.md`): human-in-the-lead's
  next release has plain milestones only, and CS-1 to CS-7, CS-436 and
  CS-525 are dropped. So the page no longer groups by them: the roadmap's
  Long outcomes view, the scope's long-outcome lines and "No long outcome"
  group, and the project pane's long outcome are gone, with the code that
  grouped by them (CS-684). Grouping by work that won't happen made "No
  long outcome" the biggest group and hid the projects' real order. The
  page reads the snapshot without dropped milestones (`withoutDropped` in
  `work.ts`), so none is in a roadmap, a lane, the scope or a count. The
  adapter still passes on what hitld's read API reports about them; the
  page reads none of it.
- **Scope, search and views.** At the top, a labeled Scope button names
  the scope (all work, a project, a milestone) and opens
  the picker; the lines above the scope follow it, to go back up, with a
  button back to all work. A Search field sits beside it; both narrow
  every view. Below them, the views are tabs, whose rule runs into the
  view they choose. An item or a list
  opens in a pane on the right (`?item=CS-<n>`, `?list=…`), beside the
  view when the window is wide enough and over it when not.
- **Kinds (CS-573).** The board shows six kinds of entity, and each has
  one encoding, a glyph and a color, drawn the same way in every view
  (Your move, Roadmap, Proposals, No milestone, Flow, the lists) and in
  the pane:

  | Kind      | Glyph                   | Color (light, dark) |
  | --------- | ----------------------- | ------------------- |
  | Project   | clipboard (its plan)    | indigo              |
  | Milestone | diamond (the roadmap's) | teal                |
  | Work item | ring                    | gray                |
  | Decision  | fork                    | magenta             |
  | External  | arrow leaving a box     | bronze              |
  | Release   | flag                    | olive green         |

  The kinds are one definition in `work.ts` (`ENTITY_KINDS`,
  `ENTITY_KIND_NAMES`, `kindsOf`; a release is a work item with a
  `release` version), drawn by `KindMark` (the glyph), `KindId` (an ID
  with its mark, how every ID on the page is drawn), `KindTag` (the kind
  named, the pane's head) and `KindLegend` in `views/Work.tsx`, with the
  colors as `--kind-*` in `work.css`. Later views reuse these, never their
  own marks. A legend of all six sits beside the views' tabs, on the same
  rule, on every view.
  - **Kind and stage stay apart by channel.** Both use color, so each
    keeps to its own mark: a kind's color is only ever ink, the stroke of
    its glyph and its name in the pane's tag, never a filled area; a
    stage's color is only ever a fill (bars, swatches, Flow's bands),
    never a glyph. A dependency row shows both side by side: the stage's
    filled square, then the kind's outlined glyph.
  - **The glyph carries the kind alone.** The six shapes stay apart at
    12 px and in grayscale, for readers who can't tell the colors apart;
    the color only repeats the shape. Each color is at least 4.5:1 on the
    page and on the roadmap's cards in its mode (5.6:1 or more, checked
    2026-11-18), so the kind's name in its color reads as text.
  - **What holds a milestone up** on the roadmap, the owner's decisions
    and outside waits, are outlined badges with their kind's glyph and
    count, in the kind's color.

- **The pane (CS-573).** Any entity opens in it (`?item=CS-<n>` for an
  item, a milestone or a project; a milestone chosen on the roadmap opens
  as `?list=ms:CS-<n>`, the same pane), and it says first what you are
  looking at, before any body text:
  1. **What it is:** the kind's tag (glyph and name, outlined in its
     color) and the ID, then the title, then the state (the tracker's
     status and what it means now: Ready, Blocked, Owner decides, Check
     due, To shape), then where it sits: its project, its milestones, the
     version it makes (a release) and the releases it gates (directly or
     through its milestones). Each of these opens in the pane; a
     project's pane has the button that scopes the board to it.
  2. Then the same sections in the same order for every kind, each under
     a label set apart from the headings in the file's text, leaving out
     what a kind doesn't have, never showing a field empty:
     **The decision** (a decision's question, options and answer, its
     file's text, first), **Outcome** (a milestone's outcome and its
     done-when clauses), **Progress** (a milestone's constraints, a
     project's items, a release's milestones and items, by stage and in
     words), **Details** (who claims it, the decider, the party waited
     on, the check, what shaping owes, the plan, dates, the reason),
     **Waits on** and **Unblocks** (items as trees; a milestone's order,
     the milestones it waits on and its longest chain), **Constraints**
     (a milestone's items, by clause), and **Full text** (the file's
     text, for every kind but a decision, whose text came first).
  3. The file's path, with Copy path and Open in editor, at the foot.
- **HITLd's names.** Statuses are the tracker's (Proposed, Planned, In
  progress, Done, Dropped); a Planned item with a need not Done is
  Blocked, and one with every need Done is Ready, as HITLd derives them.
  A milestone shows its items' progress, "N in progress, N of M done",
  not a state of its own: HITLd's milestones are Proposed, Planned, Done
  or Dropped.
- **Each figure once.** A number belongs to the view whose question it
  answers; another view links there rather than repeating it.
- **Five views, one question each:**
  - **Your move** (the default): the owner's attention is the
    constraint, so each section leads with its number and lists the
    most waited-on first, counting what waits through other items.
    Your decisions, ready to start, work in progress (who holds each,
    on which branch, claims in other worktrees and local branches
    included until they merge) and waiting outside, as they stand now;
    a decision or an outside wait in progress stays in its own section.
    How they change is Flow's. The rail's count is the owner's, and it
    is the only count outside the view.
  - **Roadmap**: what comes after what, without dates. By milestones (a
    map or a list), or as the projects' waits on each other. The milestone map runs across in steps or in
    tokens left; each milestone starts once everything it waits on is
    done, and a milestone waits on another when one of its items needs
    one of the other's. Two layouts: project lanes, or fewest crossings
    (d3-dag's layered layout), which trades the lanes for fewer crossed
    waits. There, milestones linked by waits are laid out as groups,
    stacked with the most entangled first (the critical path's group,
    then the biggest), with steps lined up across the groups; milestones
    that wait on nothing and that nothing waits on sit apart below, in a
    grid by project. The critical path is drawn in the accent; hovering a
    milestone lights what feeds it and what it unblocks; choosing a wait
    lists the items behind it. Releases are release items (HITLd's
    format: a work item with a `release` version, needing the milestones
    and items the release waits for), each a flag labeled with its
    version along the top of the grid, on the line after the step of the
    last milestone it needs, its pole dashed down the grid. They take no
    step of their own. Pointing at a flag, or focusing it, lights the
    milestones that feed it (those it needs, through the items and
    releases it needs too, and what they wait on) and dims the rest;
    choosing it measures to it, the same focus as "Measure to", which
    keeps the release and what it needs and moves the rest apart. A
    release whose milestones aren't chosen yet (it needs an open
    decision, or a release with no place, or names no milestone) gets no
    guessed place: its flag sits dashed in "Releases not placed yet"
    above the grid, and its tip says what it waits on. The fewest
    crossings layout flies the flags over the gaps between step columns.
    The list puts each flag between the steps it falls between. The
    project waits matrix has no steps:
    it lists the flags above the table, and one in view marks the
    projects whose milestones feed it. A milestone with an
    item done or in progress is filled; a milestone's pane gives its
    longest chain of items that must happen in order. The roadmap is
    committed work only;
    proposals have their own view. A milestone's bar counts its work;
    the owner's decisions and waits on other parties that hold it up are
    badges beside its name, each with its kind's glyph. Decisions and
    outside waits no milestone holds stay in Your move and Waiting
    outside.
  - **Proposals**: what could be taken on next, as bets to commit or
    drop, in one table read top to bottom. Every row has the same
    columns: the idea, what stands between it and committing, and how
    many open items wait on it. What stands in the way is one of three,
    marked as the board marks stages: ready to commit (nothing it needs
    is open), waits on your answer (an open decision of the owner's,
    whose answer commits or drops it), or waits on other items; the
    cell names what it waits on by ID, each title on hover. Projects
    head their rows, whole projects of proposals first, and a proposed
    milestone keeps its ideas under it; a committed milestone that needs
    an idea is named under it. A toggle narrows the table to one of the
    three; narrowed to your answers, the rows group by the decision they
    wait on, the one that frees most first. The whole row opens the
    idea's text, the why, in the pane. Narrow, each row stacks.
  - **No milestone (CS-562)**: the open items that no milestone's
    constraints name (`noMilestoneOf` in `work.ts`), so nothing
    committed falls outside the plan unseen. Planned work here is
    likely a gap in the plan; proposals here are the backlog (CS-686:
    candidate commitments, the later copies of design lists kept for
    review). A count leads, saying what the filters leave out; then two
    filters, by kind and by state, each a set of toggles with a count
    under the other filter, kept in the URL (`?view=no-milestone`,
    `&kind=` from work, release, decision and external, `&state=` from
    proposed, planned and in-progress, each a comma-separated list; all
    of them when absent). A release is its own kind here, not a work
    item: it sits above milestones by design, since it needs them (and
    every milestone it needs holds its items, CS-685), so its row says
    so, and leaving releases out leaves only what should find a
    milestone. The table is the Proposals view's layout, by project,
    with the item, its kind in words and its state (with its stage's
    swatch, and for planned work whether it is ready or what it waits
    on); in progress first, then planned, then proposed. The whole row
    opens the item in the pane. Narrow, each row stacks, kind and state
    on a line under the title.
  - **Flow**: the stages (proposed, blocked, ready, in progress, done)
    as a band per stage, day by day since the history begins (replayed
    from the items' committed status changes); a band that widens is a
    queue growing, and hovering reads a day's counts. Then the measures,
    each with its pair: the measure that must not get worse when this
    one is pushed.
- **Later, from HITLd's records:** tokens per item, verification, the
  merge queue, quotas and the controllers' steps. The page says so in
  one line rather than showing empty sections.
- **Staying current:** the dev server tells open pages when an item file
  changes; pages also read when the window comes to the front and every
  minute (claims elsewhere are scanned at most every 30 s, the history
  once per commit).

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

## Live engines (a scene's live view, the Viewer)

- **Inspector**: every engine view carries the inspector
  (`widgets/inspector.ts`) over it, collapsed to one line; 1.x and 2.0
  show the same panel through `Inspectable`.
- **Credits**: each engine's credits sit in its own view, bottom left,
  as 1.x shows them (required notices on screen, the rest behind Data
  attribution).
- **Timings**: the live view says up front that its timings don't compare
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
