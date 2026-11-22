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
  view they choose; the roadmap's own views are a second, quieter row
  under it (below, "The view shell"). An item or a list
  opens in a pane on the right (`?item=CS-<n>`, `?list=…`), beside the
  view when the window is wide enough and over it when not.
- **Kinds (CS-573).** The board shows six kinds of entity, and each has
  one encoding, a glyph and a color, drawn the same way in every view
  (Your move, Roadmap, Proposals, Flow, the lists) and in
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
  own marks. A legend of all six opens from the Key at the end of the
  views' tab row, on every view (CS-744: beside the tabs it wrapped
  under them at some widths, and the row changed height).
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
  - **Proposed is a third channel (CS-563): a dashed gray outline.** On
    the roadmap a dashed outline means proposed (not committed yet) and
    nothing else, apart from a kind's ink and a stage's fill. A proposed
    milestone is hollow, outlined 2 px dashed in `--proposed-outline` (a
    gray at least 3:1 on the page in each mode), and its bar is one gray
    stretch in the Proposed stage's fill whatever its items' stages, so
    it can't be read as committed work; its counts stay in its words,
    its tip and its pane. A proposed release's flag is dashed the same
    way. Its name says "Proposed" to screen readers. So the dashes stay
    unambiguous, nothing else on the roadmap is outlined dashed: a loop
    is a double outline, a project's work in no milestone is a slim
    solid tray, and a release with no place yet is dotted. Lines keep
    their dashes (a flag's pole, a wait the milestone names itself,
    tick marks): a dashed line is not an outline.

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
- **Four views, one question each,** and the roadmap's own views
  under it (below, "The view shell"):
  - **Your move** (the default): what waits on the owner, then what
    moves without them, each section led by its number, the most
    waited-on first. Its layout is CS-753's, below ("Your move").
  - **In progress** (Your move's second level) and **Merges** (its
    first) read the live run, not just the item files: the run and the
    orchestrator holding its lease (`hitld run status`); in progress,
    every dispatch in flight (`hitld ledger in-flight`) and every other
    open claim (`hitld work claims`), each with who holds it, its
    branch, and its age from the dispatch's start or the claim commit,
    never from the stage history's day buckets; and, as Merges, every
    item done on a local branch and not on the main branch (git), with
    its branch and where the merge queue has it: held for the owner's
    yes (hitld's `refs/hitld/merge-held`),
    checked by hand on a `-merge-check` branch, in hitld's queue or
    turned down by it (the ledger's `verified` and `merged` events,
    folded as hitld folds them), or not in the queue. Each figure
    names its source and when it was read (the dev server reads them
    at most every 30 s). A claim on a branch the main branch has moved
    past is stale: it is left out and named in a note. A claim with no
    dispatch in flight (a session set up outside hitld dispatch, as in
    run 2026-11-18-2) shows as a claim, and a note says so. When a
    source can't be read, a warning names it and when it was tried, and
    nothing reads as "Nothing is in progress"; an empty or missing
    ledger counts as unread, since hitld answers a missing store as if
    no run had ever started. Read-only: the board runs only hitld's
    reading commands. No machine's name reaches the page.
    How they change is Flow's. The rail's count is the owner's, and it
    is the only count outside the view.
  - **The roadmap's three views (CS-692; the owner, 2026-11-18).** The
    owner asked to step back and present "what is getting built when and
    what the dependencies are and what milestones are going into what
    releases" from first principles. The roadmap answered three
    questions, one view each: **Plan**, when things get built (the Order
    view since CS-749); **Dependencies**, why something waits and what
    it unblocks (the Path view since CS-746); and **Projects**, how
    ready each project is for each release (Projects as bets since
    CS-748). CS-775 retired the older three ("The retired older views"
    below). Their five principles still hold for every roadmap view:
    - Position carries the question being asked. Across is sequence,
      never dependency depth, because a position always reads as an
      order. Depth, where it is shown, is labeled "earliest possible
      start" and counted in waves, never steps.
    - One view per question: when (Order), why (Path), how ready
      (Projects).
    - Overview by aggregation, not by shrinking: release, then
      milestone, then item, opened rather than zoomed out until
      unreadable.
    - Direct labels on the marks; at most one key line, the rest in a
      "?" popover and tooltips.
    - Dependencies on demand for the thing chosen, not every edge at
      once.

    The views share the encodings the page already has: stage only as a
    fill, kind only as ink on a glyph or a name (CS-573), proposed only
    as a dashed outline (CS-563), and the release bands (CS-685) as the
    grouping. The words "critical path" are gone from the page: a
    release's finish is set by the chain that ends last, or by the
    amount of work, and the page says which.

  - **Plan (CS-692)** became the **Order view (CS-749)**, below. It
    sequenced the work for an executor-slot count the owner set
    (`&slots=`); the owner found that a setting the run's own history
    should answer, since concurrency varies through a project, and the
    legend unlabeled, the intro text unhelpful and the bars' hover and
    tooltip in conflict. Its slot control, zoomable plot, release
    markers and "Releases and the milestones they need" panel went with
    it. `planOf` in `work.ts` stays: the Order view and the hover card
    sequence with it. The route stopped reading `&slots=` (CS-775).
  - **Earliest possible start** (the depth layering): each open
    milestone in the first wave it could start, in project lanes. It
    lived only in the Dependencies view's whole structure (CS-694, as
    its waves grid) and went with that view (CS-775; "The retired older
    views" below). The milestone map and list that showed it before, with
    their legend block, flags, release-band arrangement, zoom and
    long hover cards (CS-683, CS-685), were taken off the page with it
    (the owner, 2026-11-19: the old map's legend and hover must not come
    along), and the fewest crossings layout and its d3-dag layering went
    too (the owner, dropping CS-691 on 2026-11-18). `milestoneMapOf` and
    the other map helpers in `work.ts` stay, tested, until a later item
    removes or reuses them. The roadmap is committed work by default;
    the shared Proposed switch in the roadmap's view row (CS-563, a real
    switch since CS-744, `&proposed=show`, off when absent, the count of
    proposed milestones in its tip) adds the proposed milestones and
    release items to every view that can include them, outlined dashed.
  - **Release bands (CS-685).** The owner's rule: a release needs whole
    milestones, and every open item a milestone it needs pulls in,
    directly or through other items, belongs to a milestone the same
    release needs, or to no milestone. A release needs what the releases
    before it need too. `releaseClosuresOf` in `work.ts` checks it for
    each open release in ladder order (each after the releases it needs).
    A break is fixed in the tracker, by moving the item or splitting its
    milestone, never explained away on screen, so the roadmap shows each
    as a problem to fix: the Health view's release crossings (CS-745)
    name each one with its fix. (The Plan view's "Releases and the
    milestones they need" panel did, until it went with the Plan view,
    CS-749.) Each open milestone sits in the band of the earliest
    release that needs it ("a release is just a special milestone"),
    and the Order view takes a release's work by band.
  - **The roadmap's canvas (CS-683)**, `ZoomCanvas`, held the Plan's
    plot and went with it (CS-749); `fitZoom` and the zoom levels in
    `work.ts` stay for a later view.
  - **Proposals (CS-688)** laid proposals out by stage (to discuss,
    being shaped, ready for your yes, later). The Proposals view
    (CS-750, below) took its tab and groups them by why each is
    proposed; CS-688's card and its stages left `Work.tsx` with CS-753.
    `proposalsOf` and `proposalHeaderOf` in `work.ts` stay: CS-750's
    model is built on them.
  - **No milestone** (CS-562) is gone (CS-744; the owner, 2026-11-20:
    "what value is this tab adding? shouldn't this be stuff on your
    move if it actually requires my attention?"). Of its 80 entries
    that day, 58 were proposals (the Proposals view's, CS-750), 9
    decisions and 6 outside waits (they gate items and need no
    milestone), and 7 planned work items, the only real orphans: the
    Health view (CS-745) lists those. `noMilestoneOf` stays in
    `work.ts`, tested, for it. An old `?view=no-milestone` link opens
    Your move.
  - **Flow**: the stages (proposed, blocked, ready, in progress, done)
    as a band per stage, day by day since the history begins (replayed
    from the items' committed status changes); a band that widens is a
    queue growing, and hovering reads a day in the shared hover card
    (below, "The Flow chart's card"). Then the measures,
    each with its pair: the measure that must not get worse when this
    one is pushed.
- **Later, from HITLd's records:** tokens per item, verification, the
  merge queue, quotas and the controllers' steps. The page says so in
  one line rather than showing empty sections.
- **Staying current:** the dev server tells open pages when an item file
  changes; pages also read when the window comes to the front and every
  minute (claims elsewhere are scanned at most every 30 s, the history
  once per commit).

### The view shell (CS-744)

The tab shell the owner's views mount into (milestone CS-751: what
needs me, what's on track, what's wrong). Its job is that adding a view
is cheap and clashes with nothing, and that the tabs never move.

- **Two rows.** The page's views are the first tab row (`view=`):
  Your move, Roadmap, Proposals, Flow, and any mounted page view. The
  Roadmap tab has its own row under it (`roadmap=`): its views as tabs,
  and the shared **Proposed switch**. The
  roadmap opens on its first view, the Release view.
- **How a view mounts.** A view is one file,
  `bench/suite/views/work<Name>.tsx` (and its `work<Name>.css`), that
  exports `workView: WorkViewDef`:

  ```ts
  export const workView: WorkViewDef = {
    id: "health", // its URL value, a lowercase slug
    label: "Health", // its tab: one or two words
    question: "What is wrong in the work graph", // the tab's tip
    place: "page", // "page", "roadmap" or "older"
    order: 30, // its place in the row, lower first
    proposals: false, // the Proposed switch applies to it
    replaces: [], // views it retires, by ID
    Component: HealthView, // (props: WorkViewProps) => ReactNode
  };
  ```

  `Work.tsx` finds every such file with `import.meta.glob("./work*.tsx")`
  and places it with `mountViews` (`bench/suite/workModel.ts`). Nothing
  else changes: no table to edit, so views built in parallel never
  conflict. A mounted view with a built-in view's ID takes its place
  (CS-750's Proposals view takes `id: "proposals"`); `replaces` retires
  others. CS-749's Order view and CS-748's Projects view keep the IDs
  of the views they replace (`"plan"`, `"projects"`), so old links open
  them. A doubled ID or one that isn't a slug is left out and logged.
  Built-in orders: page Your move 10, Roadmap 20; roadmap Release 10;
  Mounted: page Health 30, What
  changed 40, Proposals 60 (CS-750 keeps the ID `"proposals"`), Flow 70
  (CS-752 keeps the ID `"flow"`); roadmap Path 20,
  Projects 30, Order 40. The route
  takes any slug for `view=` and `roadmap=`, and the shell shows the
  first view when the slug names none it has.

- **What the shell gives a view** (`WorkViewProps` in `Work.tsx`): the
  snapshot and the work in flight; the scope (`items`, `scoped`,
  `msInScope`); the search and `set` to change it; the Proposed switch's
  state (`proposals`); the release picked (`release`, alpha.1 by
  default, from `releases` in ladder order, and `onRelease`); the
  selection (`selected`, the item or milestone open in the pane;
  `openItem`, `openList`); and `hasView`/`goView` to link to another
  view only once it has landed. Parts to reuse, exported from
  `Work.tsx`: `ItemRef` (an ID with its kind's mark and short title, a
  link that opens the pane, with the hover card: how every ID is
  shown), `ReleasePicker`, `ProposedSwitch`, `ReservedText`, `KindId`
  and `KindMark`. The hover card comes from the page's
  `WorkCardProvider`; a view needs nothing to get it.
- **What a view must not touch.** The rows, the pane, the scope and the
  Key are the shell's. A view draws inside its panel only: no second
  Proposed switch on the roadmap, no tabs of its own in the rows, no
  edits to `Work.tsx`'s layout, and its search fields only through
  `set`. A view's CSS uses its own class prefix (`work-<name>-`), and
  before removing any rule in `work.css`, grep the class across
  `bench/suite`.
- **No movement.** Each row is one line at every width: tabs that don't
  fit scroll sideways under the edge fade, with no scroll buttons to
  come and go, and what sits beside them keeps its width. The
  switch's state words share one cell
  (`ReservedText`), so "shown" and "hidden" take the same room. Narrow
  (under 560 px of view), tabs pad less, the Key keeps only its marks,
  and the switch takes its own line under the roadmap's tabs, the same
  for every view at that width. Checked at 380, 768, 1024 and 1440 px
  across every view: neither row changes height and no tab moves.
- **The Proposed switch** is a real switch (role `switch`), its state
  in words beside it ("shown", "hidden"; "n/a" and disabled on a view
  that shows committed work only), and one per page. Reduced motion
  turns off its slide and the tab indicators'.

### Your move (CS-753)

The page's first tab, built into `Work.tsx` (`id: "move"`). The owner:
"the layout for your move is getting cluttered again, too much tiny
text, bad layout, etc. give it some tlc". hitld's design asks the same:
each section leads with its number, the most waited-on first, each entry
with its age.

- **Story.** The owner opens Work and asks "what needs me?". The answer
  leads: the number in each section, then the few entries that hold up
  the most, each with the one thing to do about it. A leadership team
  above the project can read the same numbers to see where the owner's
  attention goes. When nothing waits, one line says so.
- **Audience.** The owner first; the chief of staff and the
  orchestrator, who act on the answers. Nothing is applied from the
  page.
- **Two levels.** "Waiting on you": Decisions, Merges, Health
  exceptions (the Health view's that need the owner, CS-745's
  `healthForOwner`), Proposals for you, then Outside waits. "Moving
  without you", a level down and drawn quieter (outlined, not raised,
  smaller numbers): In progress, the live run (CS-547), and Ready to
  start. Wide (a view of 960 px or more), the two levels sit side by
  side, the first wider; narrow, they stack, the first on top.
- **A section** leads with its number (large, tabular; attention-colored
  in the first level when not zero), its name and one line on it: the
  oldest decision's age, how many merges wait for your yes, how many
  parties the outside waits are on. Then its top five entries, ranked,
  and the rest under "and N more", which unfolds in place ("Show fewer"
  folds it; the words share one reserved cell). An empty section is one
  line: its number, its name and why it is empty ("No finished work
  waits to merge."). A fully clear first level is one line too:
  "Nothing waits on you: no decision, merge, health exception, outside
  wait or proposal."
- **Ranking.** By what an entry holds up: the open items behind it,
  directly or through others (`unblocksOf`); for an exception, the open
  items it involves (a milestone through its open constraints) and
  everything behind them, each counted once (`holdsUpOf`). A merge that
  waits for the owner's yes (hitld's merge-held ref) comes first. Ties
  go to the oldest, then the lower ID. There is no score and no
  priority label.
- **Ages.** A decision, an outside wait or ready work from when it
  entered its stage (the board's state history); a merge from its
  close; an exception from when its item at fault entered its stage,
  else the latest such change among what it involves, else "–" with a
  tip saying the tracker can't tell; in progress from its dispatch or
  claim commit. Words, never dates: "40 minutes", "5 hours", "7 days".
  Each age's tip says what it counts from.
- **An entry** is one row: a toggle for its drawer, its ID and title
  (`ItemRef`, up to two lines, the whole title in its hover card), what
  it holds up ("holds up 3"), its age, and its one action, a button of
  one width: Decide (opens the decision's question and options in the
  pane), Review (a merge, in the pane), Fix (the Health view, with the
  exception's entity chosen), Follow up (an outside wait, in the pane).
  In progress and Ready rows have no action. Narrow (a section under
  520 px), the numbers and the action go on a second line under the
  title.
- **The drawer** holds the secondary detail, at the same size: what
  waits on it directly (up to five, with their titles) and its project;
  a merge's branch, when it closed and where the queue has it; an
  exception's kind, what is wrong, its fix and its command; an outside
  wait's party; who holds work in progress and where. Detail goes in
  the drawer, never into smaller type.
- **Proposals for you** counts proposals in CS-750's groups (needed by
  committed work, waiting on a decision or study, new, deferred; the
  needed line has the attention rule when not empty), says how many have
  no header yet (the chief of staff's to write, so not counted), and
  links to the Proposals view (`#/work?view=proposals`), where each
  one's call is in words.
- **Type.** Every text is at least the page's base size (body-md,
  14 px), IDs included. Numbers are tabular.
- **No movement.** Each row's columns have fixed widths (the title takes
  the rest), the action buttons one width, nothing bolds on hover or
  focus, and a chosen row is tinted. Nothing animates: the drawers and
  folds open at once, so reduced motion changes nothing in the view.
- **Live figures** keep CS-547's rules: each names its source and when
  it was read, under its section; an unread source is a warning naming
  it, never "nothing in progress"; what the figures leave out folds
  under one line.
- **Model.** `yourMoveOf` in `views/Work.tsx`, with `byWhatItHolds`,
  `holdsUpOf` and `moveAgeText`, tested in `test/dynoWorkMove.test.ts`
  with a fixture for each section, its ranking, ages and fold, and the
  view as it renders.

### The Release view (CS-744)

The roadmap's first view, and the one to share with a leadership team:
pick a release, and one screen says what is left in it and what holds
it. Exceptions lead, there are no dates and no priorities, and the
owner's attention is what it saves.

- **Story.** The owner, or someone above the project, asks "where is
  alpha.1?". Five figures answer at a glance, each a number with a line
  under it: milestones left (and how many are done), work left, gates
  (decisions and outside waits), ready now, and exceptions. A sentence
  restating them was tried and cut in review: each figure once.
- **Releases.** The picker (`release=`) offers the open releases in
  ladder order, alpha.1 first and by default; a proposed release joins,
  dashed, with the switch on. A release's milestones are those it is
  the first to need (`releaseBandsOf`); a later release says which
  earlier ones come first and links to them.
- **What holds it.** The gates: every open decision and outside wait on
  the release's work, reached from its milestones through their items'
  needs, never through another release's milestones. Each gives who
  decides or whom it waits on, whether it can be answered now, how long
  it has been open (from when it entered its state, else its creation),
  the milestones it holds and the work behind it; most work behind
  first. A default and a deadline show when the record has them;
  hitld's read API has no field for either yet, and a note says so.
- **Milestones left.** A row each, in the planner's order (`planOf`'s
  bands): its title, its clauses as pips with "2 of 4 checked", its
  work left in items (its items and the open work they need), what is
  ready and the gates on its way. A clause is checked, as hitld reads
  it, once every item linked to it is done and the milestone's check
  has passed; "items done, check not passed" and "no item linked yet"
  are named apart. A row opens to its outcome and its clauses, each
  with its open items; items linked to no clause yet (`c?`) are listed
  apart. A proposed milestone is outlined dashed and says so.
- **Sizes.** Items now. Once estimates exist, tokens as a range: the
  sum of the estimates there are, to that plus each unestimated item at
  their median, labeled with how many are estimated. Never a time.
- **Ready to start now.** The release's work with nothing open before
  it, in the Ready stage's blue swatch, most waiting behind first.
- **Exceptions.** The Health view's exceptions that touch the release
  (`releaseExceptionsOf` in `workHealth.ts`, `HEALTH_RULE`): its
  crossings, and every other exception on its milestones or their
  items. The count links to the Health view with the release picked.
  Without a view with ID `health` it falls back to one rule
  (`EXCEPTION_RULE` in `workModel.ts`: the release's crossings and the
  open items two or more of its milestones name) and opens a list in
  place.
- **Layout.** The picker, the five tiles (three columns at tablet
  width, two narrow), then What holds it, Milestones left, and Ready to start now,
  each a card. Numbers are tabular, widths are reserved, and nothing
  bolds on hover or selection: the chosen row is tinted. Narrow, the
  gates' table and the milestones' rows stack, each number labeled.
- **Model.** `releaseViewOf` in `bench/suite/workModel.ts`, tested in
  `test/dynoWorkRelease.test.ts`.

### The Path view (CS-746)

The roadmap's second view: pick a target, and it draws only what lies
upstream of it, small enough to draw with arrows. It answers "why isn't
this done?" for the owner, and for anyone above the project who asks
about one release, milestone or item. The 600 open items as one
flowchart answer nothing; the upstream of one target, collapsed to
milestones, does.

- **Where it is.** `?view=roadmap&roadmap=path`, after Release. The
  target is in the URL, so a link opens the same path: `focus=CS-<n>`
  names a milestone or an item (the retired Dependencies view's
  center, the same field), and otherwise the release picked
  (`release=`, alpha.1 by default) is the target. The release picker, or a search for any
  milestone or item by ID or title (Enter takes the first match, the
  arrow keys walk them), chooses it; every node but a group has a
  re-center button that makes it the target, and "Back to the path to
  alpha.1" returns. Retargeting adds a history entry, so Back works. It
  follows the shared Proposed switch.
- **The sentence above the drawing** answers "why isn't this done?" in
  three parts, counted in items and milestones, never in time: how long
  the longest chain left is (its milestones, items, gates and earlier
  releases, and how many chains are as long), the gates open on the
  path and how many can be answered now, and what can start now, with
  up to three of the items on the longest chain named under it.
- **What is upstream** (`pathViewOf` in `bench/suite/workPath.ts`). A
  release reaches what it needs; a milestone what it names; an item its
  open needs; and so on, through needs. Done and dropped work ends a
  chain. For a release, an earlier release's milestones are that
  release's (as in the Release view): it is one node, its own path one
  click away. Each open item is drawn inside the milestone that holds
  it. A milestone named on the path holds all its open items; one
  reached only through an item's need holds only the items on the path,
  and says "2 of its 9 open on this path". An item in no milestone is a
  node of its own.
- **Gates** are the decisions and outside waits on the path, each a node
  of its own, hatched in its kind's ink, with who answers it and whether
  it can be answered now. A gate is never grouped, nor is a node a gate
  holds, so every gate shows what it holds.
- **The spine** is the longest remaining chain, in nodes, drawn along
  the top with accent arrows. Between chains of one length it takes the
  one with more open work items on it, then the one whose nodes have
  the lower numbers, first node first, so the same board always draws
  the same spine; the sentence says how many are as long.
- **Layout.** Layered left to right, the target last: a node's column
  is how far it is from the target along its longest chain, so short
  chains sit near the target and the spine takes the first lane of
  every column. Other nodes in a column follow where their arrows go,
  then milestones, releases, gates, items and groups. Positions come
  from the model alone, so hovering (which brightens a node's arrows
  and dims the rest), choosing or opening a node moves nothing. Nodes
  are a fixed size: the stage as a strip down the left edge, the ID
  with its kind's mark, the title on its own line, then a line of
  counts. The drawing scrolls sideways in its own box, with an edge
  fade while more lies to the right.
- **Groups: overview by aggregation.** Three or more nodes off the spine
  whose one arrow goes to the same node, and that have nothing open
  before them or lead straight to the target, are drawn as one group
  ("16 milestones, each leads straight to beta.1"). It opens in place
  to its members, each with its counts and a re-center button.
- **Opening a node.** A milestone opens in place, over the drawing, to
  its open items on the path, the ready ones marked in the Ready stage's
  blue. Nothing else changes position. Escape closes it and returns
  focus to its toggle.
- **Ready work** is marked by the Ready stage's blue swatch on any node
  that has some, and counted in its line.
- **Loops.** Milestones can wait on each other through their items. The
  arrow that closes such a loop is left out of the drawing and named
  under it.
- **Scope.** The scope doesn't narrow a path, and a note says so.
- **Nothing is applied from the page.** IDs open the item in the pane;
  no command is shown.
- **Checked** in both themes, at 380 px (the drawing scrolls in its box,
  and the page doesn't), with the keyboard only, and with a clean
  console. Nothing in the view animates; under reduced motion the opened
  panel appears without its grow.
- **The waves grid** of the Dependencies view, the wave chart this view
  was meant to replace, went with that view (CS-775).
- **Model.** `pathViewOf`, `whyNotDone` and `pathTargetOf` in
  `bench/suite/workPath.ts`, tested in `test/dynoWorkPath.test.ts`.

### The Projects view (CS-748)

The roadmap's second view, after Release: each project as a bet. The
owner found CS-693's Projects tab hard to parse: its decisions didn't
read as part of their project, and it was crowded and hard to scan down.
This view answers what a leadership team above the project asks of each
bet: what it promises next, where it lands, how much of it is checked,
what it has cost against its appetite, and what it waits on the owner
for. No dates and no priorities.

- **Where it is.** `?view=roadmap&roadmap=projects`, mounted by
  `views/workProjects.tsx` (place `roadmap`, order 30). It keeps the
  older view's ID, so it takes that view's place and old links keep
  working; CS-693's view is retired (CS-775; "The retired older views"
  below).
  The view is `ProjectBetsView` in `views/Projects.tsx`, the model
  `projectBetsOf` in `bench/suite/projectBets.ts`, tested in
  `test/dynoWorkProjects.test.ts`.
- **Exceptions lead.** One line of figures above the grid: the projects
  shown, the owner's open decisions (in how many projects, how many can
  be answered now, in the decision kind's ink), the open milestones with
  no clauses yet, and the projects with no open milestone. Then a one-line
  key.
- **One row per project, on one grid.** Rows sort by the project's next
  release: the earliest release that is the first to need one of its
  open milestones (CS-685's bands), then where the planner reaches its
  first milestone, then by number. A quiet group head names each run
  ("Next in alpha.1, 9 projects"); projects whose milestones no release
  needs come next ("No release yet"), and projects with no open
  milestone last. No item lanes.
- **A row** is the project's ID and title, bold; its next milestone's
  outcome on one line ("Next: …"; the tracker gives a project no outcome
  of its own); and its own open decisions as badges under the name, in
  the decision kind's ink, the owner's answerable ones first, solid when
  answerable now, dashed when proposed, three shown and "n more" to open
  the row. Then three columns: **where it lands**, a slot per release in
  ladder order and one for None, each with how many open milestones that
  release is the first to need, the next release ringed in the release
  kind's ink; **clauses checked**, a bar with a segment per milestone as
  wide as its clauses, filled green as far as they are checked, hatched
  where the items are done and the check hasn't passed, dashed where the
  milestone has no clauses yet, with "n of m" and how many milestones
  aren't shaped; and **spend against appetite**, only once a record
  carries an appetite, an estimate or tokens spent. Until then there is
  no column, and a sentence says so; never an empty bar. A project with
  an appetite and no estimates reads "Appetite 400k, no estimates yet".
- **Opening.** A row opens to its milestones on the same grid, a step in:
  each with its outcome, its release slot, its clauses as segments, its
  items done, and the decisions on its way (its items' open needs, any
  project's). A milestone opens to its items: stage swatch, ID and title,
  the clause it is linked to, and its stage, open first. Open all opens
  every project.
- **Every ID** is an `ItemRef`: its kind's mark, its short title, the
  hover card, and a link that opens the pane. The selected project,
  milestone or item is tinted, never bolded.
- **No movement.** The columns are set on the grid (`--work-projects-*`
  custom properties), never by a row's content, so every row and
  milestone row align at every width (checked: one column layout across
  43 rows, with and without the pane). Numbers are tabular; Open all's
  words share one cell (`ReservedText`); a chevron with nothing to open
  keeps its place, hidden. Nothing animates, so reduced motion changes
  nothing.
- **Widths.** Under 820 px of view the slots and numbers narrow; under
  560 px each row stacks (name, decisions, slots that name their
  release, the bar), the same for every row.

### The Health view (CS-745)

The page's third tab (`view=health`): what is wrong in the work graph,
each with a proposed fix. It replaces the project matrix, whose one real
job was spotting loops.

- **Story.** The owner opens it to ask "is the plan sound?", and someone
  above the project to ask "can we trust these figures?". The answer
  leads: how many exceptions, how many need the owner, how many the run
  can fix. Then each kind that finds something, the ones that need the
  owner first; then one card naming every other check, clean or unread.
  A clean graph says so in a heading, "Nothing is wrong in the graph".
- **Two sorts of rule.** Graph rules make the graph wrong: milestone
  loops, release crossings, items in two milestones. They belong in
  `hitld work check` (human-in-the-lead #388 and #298), and this view shows
  them until hitld enforces them; each section says which sort it is.
  Judgment signals stay here: planned work in no milestone, decisions
  due, proposals left waiting (over `PROPOSAL_AGE_DAYS`, 14), spend past
  appetite, claims with no live dispatch, and work merged but still
  open. What `hitld work check` itself reports leads, when it reports
  anything.
- **Whose move.** A kind whose fix changes scope or a release needs the
  owner ("Needs you"); the claim kinds are the run's ("For the run").
  `healthForOwner` gives Your move that subset and its count (CS-753
  lays it out); the Release view's Exceptions count is
  `releaseExceptionsOf`.
- **A row.** The entity at fault with its kind's mark and title, and the
  releases it touches; what is wrong, in a sentence; then the fix, in a
  sentence. Every ID in a sentence is an `ItemRef`, with its title cut to
  fit and whole in its hover card. Under the fix, the command that does
  it, in full, with Copy command (when the browser refuses, the command
  is selected for the keyboard's copy), and Open on the entity whose
  file the fix changes, in the pane with its path and Open in editor.
  Nothing is applied from the page. Every command is hitld 0.1.0-rc.1's
  (`work check`, `work unclaim`) or git's (`branch -d`, which refuses an
  unmerged branch).
- **The fixes are the moves the owner made.** Tonight's loops ended by
  keeping each item in one milestone, the one whose release needs it
  first (CS-88 in CS-458, alpha.1); CS-341's crossing ended by moving it
  into the milestone inside the release that needs it (CS-595, beta.1).
  The words propose exactly that. A loop with no doubled item proposes
  breaking its smallest wait (`loopTies`).
- **It reads the whole graph,** proposed milestones and items included:
  a proposal can make the graph wrong (CS-341's crossing ran through
  CS-534, a proposal), so the shared Proposed switch doesn't apply. The
  scope narrows it to exceptions that involve an item or milestone in
  the scope, and a release filter (All, then each open release with its
  count; `release=`) to those touching one release.
- **What the board can't tell.** Decisions' defaults: hitld's read API
  has no default or deadline field yet, so "Decisions due" is listed
  under "Can't tell yet" with the reason, and works once the field
  arrives. Spend past appetite waits on appetites, which shaping sets.
  The claim kinds read the live run (`hitld work claims` and the
  ledger); when either can't be read, they say so rather than read as
  clean.
- **Layout.** The figures, the filter and a line on what it reads, then
  the cards, one surface level as the board's others. Numbers are
  tabular, the figures' words are `ReservedText` (choosing a release
  moves nothing), a chosen row is tinted, and nothing bolds on hover or
  focus. Narrow (under 560 px of view), the releases go under the
  entity and the indents go. The view has no motion of its own, so
  reduced motion changes nothing in it.
- **Model.** `healthOf` in `bench/suite/workHealth.ts`, tested in
  `test/dynoWorkHealth.test.ts` on a fixture for each kind, with
  tonight's two loops and the CS-341 crossing rebuilt from the tracker
  before the owner fixed them.

### The Proposals view (CS-750)

The page's Proposals tab, mounted from `views/workProposals.tsx` with
`id: "proposals"`, so it takes the place of CS-688's tab (whose code
left `Work.tsx` with CS-753). Promoting a proposal
is the owner's call (hitld 04 §4.6); the view makes each call easy.

- **Story.** The owner opens Proposals and asks "what do I do with
  these?". The answer is a call per proposal, in words: commit it, hold
  it, or drop it, with the rule that recommends one. Proposals are
  candidate commitments (CS-686), and the owner's attention is what the
  view saves: the ones holding committed work up come first.
- **Audience.** The owner first; then the chief of staff, who acts on
  the calls. Nothing is applied from the page.
- **Groups, by why each is proposed.** Five, in this order, each a card
  with its count and its rule under its name ("None now" when empty).
  The first two come from the graph and hold with or without a header;
  the rest from the header alone, never from a guess at the text.
  1. **Needed by committed work** (the exception that leads): a planned
     or in-progress item needs it, or a committed milestone names it.
     The card has the attention rule at its edge.
  2. **Waiting on a decision or study**: an open decision, or an open
     learning milestone, comes before the commit.
  3. **New**: its header makes the case for now; the oldest filed first,
     as the chief of staff brings them about five at a time.
  4. **Deferred**: its header's source or why now says it was deferred
     or is for later. None does on 2026-11-20: the owner's deferrals and
     the "later" copies have no header yet.
  5. **No header yet**: no header and nothing in the graph says why. An
     exception of its own (CS-680 writes the headers), with one button
     that copies a single question asking for all of them.
- **A row.** On the left, the proposal (`ItemRef`), its flags, and its
  header: source, why now (up to three lines; the whole of it on hover),
  rough size, age, and the decider when it isn't the owner. Without a
  header, one line says so plainly, with its age from the tracker. Then
  what the graph says, an item per line: Needed by, Waits on, Dropped
  need, Holds (a proposed milestone's constraints, each with its state),
  and, quieter, Starts after (its other needs: committing isn't
  starting). On the right, the call: "Recommended" and the call's name,
  the milestone a commit would put it in when the graph names one (a
  milestone that names it, else the committed milestone of the work
  that needs it), the reason, and three buttons of one width, Commit,
  Hold and Drop, the recommended one filled. Narrow (under 640 px of
  view), the call drops under the proposal.
- **Age.** The header's filed date, else when it became proposed (the
  board's state history), else its creation, said as "filed", "proposed"
  or "created" so the reader knows which.
- **Flags**, outlined (never filled, so they don't read as a stage): No
  header; Committed work inside (a proposed milestone with planned or
  in-progress constraints); A need was dropped; Two weeks old (a header
  filed 14 days ago or more: CS-686 brings it back once); Not shaped
  (only on a new one whose call it changes).
- **The recommendation** follows these rules, the first that matches
  (`recommendOf` in `workProposals.ts`); there is no score:
  1. Needed by committed work: commit it, after any decision before it,
     or take the need away.
  2. A proposed milestone with committed work inside: commit it.
  3. Waiting on a decision or study: hold it until that is answered.
  4. No header: hold it and ask for its header. **Drop is never
     recommended without a header**: the "later" copies are kept for the
     owner's review (CS-686's answer).
  5. A need was dropped: drop it, its premise may be gone.
  6. Deferred: hold it for review with its batch.
  7. New and shaped (an item says what done is; a milestone owes
     shaping nothing): commit it.
  8. New, not shaped, two weeks old or more: drop it with that reason.
  9. New, not shaped: hold it and send it to shaping.
- **Nothing is applied.** hitld 0.1.0-rc.1 has no command to commit or
  drop a proposal (`hitld --help`, checked 2026-11-20), so each button
  copies a question for the chief of staff: the call, why it's proposed,
  the view's recommendation and its reason, the decider when it isn't
  the owner, and `npx hitld work show <ID>` to read it, the one command
  shown, which exists in rc.1. The line under the tabs says so. A toast
  confirms the copy, or says the browser refused.
- **IDs.** Every ID shown carries its short title: the rows and lists
  through `ItemRef`, and an ID inside prose (a header's field, a group's
  rule, a reason) through the same reference, its title cut to 26
  characters so it flows with the sentence; the hover card carries the
  rest. The reasons name none of the row's own relations: those sit
  beside them with their titles.
- **The tiles** at the top, one per group (five across, three at tablet
  width, two narrow), each a number, the group's name and a line: what
  it holds up, how many answers it waits on, how many are ready to
  commit. A tile moves to its group and focuses it; the scroll is smooth
  unless reduced motion is asked for, when it jumps. Needed and No
  header take the attention rule when not empty; the rule's width is
  reserved on every tile.
- **Arriving with one chosen.** Your move links here with `?item=`. Its
  group shows all its rows, and the row is tinted and brought into view
  once on arrival. A group shows eight rows, then "Show all".
- **No movement.** Numbers are tabular, nothing bolds on hover or
  selection (the chosen row is tinted), the buttons keep one width, and
  the flags and fields reserve their columns. Reduced motion turns off
  the smooth scroll and the buttons' transitions.
- **Scope.** The scope narrows the view to its items and milestones, as
  every view.
- **Data.** Only the board's snapshot (`/work-api/query.json`): the
  proposals' text for the header, their needs and the state history.
  The board carries no field for a deferral or for a header's age apart
  from its "Filed" date.
- **Model.** `proposalsViewOf` in `bench/suite/workProposals.ts`, built
  on `proposalsOf` (CS-688), tested in `test/dynoWorkProposals.test.ts`
  with a fixture for each group and exception.

### The Order view (CS-749)

The roadmap's fourth view, after Release, Path and Projects: pick a
release, and it shows the order the planner takes its work in, each
project a lane so the interleaving shows, with each item's size. It
answers "what comes next, and in what order?" for the owner, and "how
much is left, and how fast does it go?" for anyone above the project,
without a date or a duration. It replaces the Plan view (CS-692): the
owner liked its interleaving across projects but not its executor-slot
setting, which varies through a project, and found its legend
unlabeled, its intro text unhelpful and its bars' hover and tooltip in
conflict (2026-11-20).

- **Where it is.** `?view=roadmap&roadmap=plan`, mounted by
  `views/workOrder.tsx` (place `roadmap`, order 40). It keeps the Plan
  view's ID, so old links open it. It follows the release picker
  (`release=`) and the shared Proposed switch.
- **Figures first.** Five tiles: the items in order (and in how many
  projects), the size, how many items run at once in history, how many
  start next, and how many wait on a gate (decisions and outside waits,
  in the attention ink). A line under them says what comes first
  ("Comes after alpha.1 (61 items)", each release a link), and names
  only the exceptions there are: items pulled in from a later
  release's milestone, items in no milestone, loops of needs, what the
  history couldn't time, and how much of the release the scope shows.
- **The order** is `orderPlanOf`: `planOf` (work in progress first, then
  the release bands, then hitld's queue rule; an item starts once its
  needs are done) with as many slots as runs typically had at once. A
  release's rows are the items its band works, by start, then rank.
  Decisions and outside waits are not in the order: the items behind
  them carry a cap in the gate's ink, and the order assumes them
  answered in time.
- **Sizes.** Items now, and the figure says "no token estimates yet".
  Once estimates exist, tokens as a range (the Release view's rule,
  `sizeOf`): the sum of the estimates there are, to that plus each
  unestimated item at their median, labeled with how many are
  estimated, and the list gains a column with each item's estimate.
  Across, a bar is as wide as its size.
- **Concurrency is history, not a setting** (`concurrencyOf`). A span
  runs from an item's In progress to its next state in the board's
  history, and work in progress now runs to now (from its claim, when
  it is on another branch). Each day with work in progress gives its
  most at once; the tile shows the fewest and the most of those as a
  range, labeled "At once, in history", over how many days. The order
  plans with the typical day's most (the median, rounded up), and
  "Starts next" marks the first ready items, as many as the most runs
  have had at once. A span claimed and closed at one commit time
  (landed as one merge) can't be timed: it is left out, and a line
  says how many.
- **By project.** A lane per project, in the order each project's
  first item comes, named by its `ItemRef` and its count, the names
  sticky at the left. Across is how much of the release's work comes
  before an item; each item is a bar filled by its stage, a cap in a
  gate's ink when it waits on one, an accent line under it when it
  starts next, dashed when proposed. The key above it names every
  color and mark in words. A bar is at least 6 px (3 px narrow): a long
  release scrolls sideways in its box, never the page.
- **One card per bar.** A bar's card is the shared hover card
  (`WorkCardBody`) with its place in the order in the footer ("#4 in
  alpha.1's order · Click or Enter for details"). The pointer and the
  keyboard share one active bar (`barReducer`): the bar under the
  pointer, else the bar focused from the keyboard, so exactly one card
  is open. A bar shows no other hover state than the card's outline;
  the keyboard-focused bar keeps a thinner outline while the pointer
  shows another's card. A click opens the item in the pane and leaves
  no card behind; Escape closes the card. The lanes are one tab stop:
  the left and right arrows walk the order, up and down move to the
  nearest bar in the next lane, Home and End jump to its ends, and
  Enter opens the item.
- **The sequence.** The same order as a list: the rank, the stage's
  swatch, the item's `ItemRef` (every ID with its title and the hover
  card), its project, and tags for starts next, the gates it waits on
  (with the kind's mark) and pulled in. One grid sets the columns for
  every row (CSS subgrid), so no row's content moves another's; the
  chosen item's row is tinted, never bolded. Numbers are tabular, and
  the rank column is as wide as the longest rank.
- **Help.** The info button beside the release picker opens "Reading
  the order": what across means, how the planner orders the work, the
  sizes, and how the history is read, with its days. No intro text sits
  above the view.
- **Nothing is applied from the page**, and it shows no command.
- **Widths.** Five tiles, three at tablet width, two narrow. Under 560
  px of view a lane's name takes its own line above its track, and a
  row of the sequence stacks its project and tags under its item.
- **Motion.** Nothing in the view animates; the hover card and the help
  popover appear at once under reduced motion.
- **Model.** `concurrencyOf`, `orderPlanOf`, `orderViewOf` and
  `barReducer` in `views/workOrder.tsx`, tested in
  `test/dynoWorkPlanOrder.test.ts`.

### The retired older views (CS-775)

The roadmap kept three older views behind an **Older views** menu
(CS-744) until their replacements landed: Plan, Dependencies and
Projects. The owner, 2026-11-22: "you can get rid of the older views in
the work tab." Each answered a question that a newer view answers
better, and two views of one answer drift apart, so they went, with the
menu:

- **Plan** (CS-692) is the Order view (CS-749).
- **Dependencies** (CS-694), with its waves grid and the project matrix
  under it, is the Path view (CS-746). Path answers "why isn't it done"
  for one release, milestone or item, which was the view's own question
  ("what does it wait on, what does it unblock"). The waves grid, the
  "earliest possible start" layering, and the matrix of projects waiting
  on each other have no replacement.
- **Projects** (CS-693), the project-by-release matrix, is Projects as
  bets (CS-748).

What stayed: `matchFocus` in `dependencies.ts`, since Path's search uses
it, and `planOf` and the other helpers `work.ts` shares. The Dependencies
and Projects models (`dependencyGraphOf` and its trees, `projects.ts`)
and `dependencyMatrix` went with their views. Old links keep working:

- `roadmap=deps` (and the older `waves` and `matrix`) open Path, and one
  line under the roadmap's tabs says the Dependencies view is now Path.
  `&focus=` carries over, since Path takes the same field. The note
  carries `&moved=deps` and goes when dismissed or another tab is chosen.
  `&depth=`, `&deps=all`, `&slots=` and `&psort=` are no longer read.
- `roadmap=plan` opens the Order view, and `roadmap=projects` opens
  Projects as bets.
- In an item's or milestone's pane, **Its path** (was "Its
  dependencies") opens Path with `&focus=` set to it. The hover card's
  D key does the same.

### The hover card (CS-696)

The Work page's one hover card, in place of the old map's seven plain
lines of equal weight (the owner, 2026-11-18: hard to read, and the
progress bars' colors unexplained). `HoverCard.tsx` beside `Work.tsx`;
its content comes from `workCardOf` in `work.ts`.

- **Where.** The same card on every mark that stands for work: an
  Order bar (opened by the Order view itself, so the pointer and the
  keyboard share one), a Path node, a Projects row,
  project and release head, and every row
  of the lists (Your move, the pane's trees, the chains, the tables). It
  opens on hover after a short pause and on keyboard focus, beside its
  mark and never over it: below by default, flipped or shifted along the
  mark's edge near the screen's, never across it. Escape closes it. The
  shell (`HoverCard`) takes any content, so the Flow chart's hover
  (CS-698) mounts it with its own.
- **What and how far.** The kind's glyph and the title; the ID, one
  state chip (Ready, Blocked, In progress, Proposed or Done) and the
  release it belongs to (its band in the Order view's plan, else the first
  release it gates). A set of items (a milestone, a release, a project,
  a cell) adds a small bar like its mark and the words under it, each
  beside its color: "2 done · 1 ready · 2 blocked". A lone item has its
  chip, not a bar.
- **Held up by.** Only open blockers: the open needs of its blocked
  items, and every open decision of the owner's up their chains. The
  owner's come first, set apart in amber under "Needs your answer";
  then what lies outside the set before its own items; decisions, then
  outside waits, then work. Two by name, then "+N more".
- **Slip.** One plain line against its release, read off the Order
  view's own plan (`orderPlanOf`: `planOf` with as many slots as runs
  typically had at once, from history; CS-749), so the card and the
  view agree (`planSlackOf`): a backward pass over what follows each item, the
  items that need it and the next item in its slot. "Sets beta.1's
  finish: any delay moves beta.1", or "Room to slip: about 12 items
  before beta.1 moves" (tokens once items carry estimates). A set is as
  tight as its tightest item. A small bar shows the slack hatched
  against the release's pole. It says "about": once something slips,
  the planner refills a slot another way. No time and no "critical
  path".
- **Unknowns hidden.** No line says only that something is unknown. No
  token or budget line: while across is item count, one muted note says
  so; without a release to measure against, the slip section goes.
- **Next step.** A muted footer: "Click for details · D for
  path". D opens the Path view on it (in that view, it retargets
  there); a project or a cell has no D.
- **Progress bars.** Every progress bar's segments name themselves on
  hover, "2 blocked: waiting on CS-22 and CS-23", in CS-573's stage
  colors. In the pane each segment is also a stop for the keyboard; in
  a Projects cell, a button, the cell's card labels the colors instead.
- **Size and motion.** About 320 px wide, never wider than the screen
  less 16 px; short section labels; body text at full contrast, muted
  only for the note and the footer. Below 480 px the slack's bar and the
  note go, so the card fits beside a mark mid-screen. The card fades in;
  under reduced motion it appears at once.

### The Flow chart's card (CS-698)

The cumulative flow chart is the Flow view's last card (CS-752 moved
it there from the old Flow tab; `FlowChart` is exported from
`Work.tsx`). It reads a day in the shared hover card, in
place of the line of text that used to sit under the chart (the owner,
2026-11-18: a hover card, and help with the day-to-day change). Its
content is `flowDayOf` in `work.ts`, from `flowOf`'s days.

- **Where.** Hovering the plot moves a crosshair to the nearest day and
  opens the card beside it, on the side with more room. Its anchor spans
  the crosshair and the pointer, so the card sits beside both and never
  covers the band pointed at. On a narrow screen, with no room beside
  the crosshair, the card goes above or below the chart, whichever has
  more room. The band under the pointer is underlined in the card.
- **The day.** Its date ("Today, Nov 19" for the last, read from the
  snapshot), then each stage in the chart's stacking order, top band
  first, with its swatch, its count and its change from the day before
  ("+3", "−2"), and the total under a rule. The largest change, by size
  and either sign, is bold with its stage; zeros are muted. The first
  day has no day before it, so it shows counts only and says so. Changes
  are day steps, never time.
- **What moved.** Each move between two day-ends, grouped: "Finished"
  (into Done from any stage) first, then the largest groups, "Blocked →
  Ready", "New → Proposed", "Ready → Dropped". The card names three
  items in its first two groups, with "+N more", and counts the rest. A
  stage's change is what entered it less what left, so the groups and
  the counts always agree.
- **Keys and clicks.** The plot is one stop for the keyboard (a slider
  whose value reads the day in words): ← and → step through the days
  with the card following, Home and End jump to the first day and today,
  Escape hides the card until the next step. A click or Enter lists the
  day's moves in the pane, each item opening its own pane with the day's
  list as its way back. The legend still lists a stage. The footer says
  "Click for what moved · ← → for other days".
- **Motion.** The shell's fade, dropped under reduced motion; the card
  follows the crosshair without animating.

### The Flow view (CS-752)

The page's Flow tab (`view=flow`): how well the system and the owner
work together, so the product builder and anyone above the project get
answers without asking a person. It replaces the old Flow tab's
Measures card; the cumulative flow chart stays, as its last card.

- **Story.** Someone asks "how is it going?" or "is the system getting
  better?". Exceptions lead: a "Needs a look" card lists every measure
  outside its band now, each with its band, where the band came from
  and one line on what to do. Four figures answer at a glance: merged
  in the last 7 days, your decision time, the first-pass merge rate and
  how many measures are out of band; each goes to its measure. Then six
  groups, one card each: Cost, Throughput, Latencies, Quality, You and
  the system, and The machine. No vanity counts: every measure says
  what to do when it moves the wrong way.
- **A measure.** Its name and an info mark that says how it is read
  (its sources and their limits); its line on what to do; its value
  with its basis under it ("Median of 49; 90th percentile 12 h", or
  how many items have tokens); a split where one tells more (decision
  time by door and by now or digest, check failures by cause); up to
  three items behind it, each an `ItemRef` with words ("waiting 7.4
  days"); and its trend over runs, with the band's edge dashed and
  points outside it in the attention color. Durations are drawn on a
  log scale, and the axis says so. "No band set" is said, not hidden.
- **Can't be told yet.** A measure no record can answer sits in its
  group's last lines with the reason and what would tell it, never as
  an empty chart: money (no price is recorded), spend against appetite
  (no milestone has `appetite_tokens`), check run time (the ledger's
  `verified` has no duration), worth asking and reversals (only hitld's
  trust record has them, and `hitld rights trust` is the owner's, from
  the primary checkout), corrections (no record holds them),
  contention and harness refusals (not recorded where the board reads).
  A stated value never claims more than its inputs: under five values
  it says "too few to call", and ledger pairs written in the same
  second (recorded after the fact) are left out and counted.
- **Runs.** The trends are over the ledger's runs (`run-started`), each
  from its start to the next one's, labeled by its ID ("Nov 19 #1").
  Without a ledger, over the last eight weeks, and a note says why.
- **Dates.** From git: a claim is its claim commit's author date, done
  is the close commit's author date, merged is the close commit's
  committer date (a branch replayed onto main takes a new one). A
  decision is asked at the ledger's `asked`, else the commit that filed
  it. So the spans need no fix to the board's state history (CS-786).
  Executors started by hand aren't in the ledger, so set-up to started
  counts the ledger's dispatches only, and says how many claims it
  can't see.
- **Bands.** From the project's hitld policy, else hitld rc.1's
  defaults, and each says which: questions per digest
  (`attention.decisions_per_digest_max`), interrupts per day
  (`attention.interrupts_per_day_max`), time since the last digest
  (`digests.silence_max_hours`); from the run's scope, work in progress
  (`max_executors`); from shaping, spend against appetite.
- **Read from the text.** A decision's door from its "Reversibility:"
  line; whether the answer took the recommendation, from its
  "Recommended:" line against the option its answer names; a
  follow-up from a proposal's "Source:" line naming another item's
  report or review; a merge's readiness from a "Merge CS-n" decision.
- **Cost by milestone.** Under Cost, the release picked (the shell's
  `ReleasePicker`): each milestone with tokens known on its items, with
  how many of its items have them and its clauses; the rest counted in
  a line. When none has tokens, it says so in a sentence.
- **Copy as text.** A short summary for a stakeholder: merged, lately
  merged by title, decisions, first pass, ready to merged, what is out
  of band and what can't be told yet. Titles, never bare IDs. Token
  counts only when "With token counts" is checked: the owner allows it
  per copy. The view never reads hosts, sessions, dispatch IDs, notes
  or the text of logged calls, so neither the page nor the summary can
  carry them. When the browser refuses the clipboard, the text shows
  selected for the keyboard's copy.
- **Scope.** The shell's scope narrows every measure that is an
  item's; a run's measures (digests, interrupts, calls, leases) stay
  whole and say "Run-wide" while a scope is set. No Proposed switch.
- **Layout.** The as-of line with Copy as text and its checkbox; the
  figures (two columns under 760 px); Needs a look; the six groups; the
  stages chart. A row is three columns (name, value, trend); under 760
  px the trend goes under, and under 560 px everything stacks and an
  item's words go under its title. Numbers are tabular; the trend's
  caption keeps one reserved line whether it shows the axis or a run's
  value; nothing bolds on hover or focus, and a measure jumped to is
  tinted. While a new read comes in, the last answer stays, dimmed.
- **Keys and motion.** Each trend is one stop for the keyboard, a
  slider over the runs: ← and → step through them, Home and End jump,
  and the caption reads the run; a screen reader gets every run in its
  description. A figure's jump scrolls smoothly, instantly under
  reduced motion, and the dimming's fade goes too.
- **Data.** `GET /work-api/flow.json` (`flowReader` and `readFlow` in
  `scripts/workBoard.mjs`): takes no parameters. One `hitld ledger
tail` (cut to the fields the measures read, `flowEventOf`), and git
  with argument arrays only: HEAD, one `ls-tree` and one `cat-file
--batch` of the items, the items' history with both dates (`log -p
-U0`, at most 4,000 commits), and the reverts. Kept while HEAD and
  the ledger file hold, so a warm read runs one `git rev-parse` and a
  stat. About 0.4 s cold on this repository.
- **Model.** `flowViewOf` and `flowText` in `bench/suite/workFlow.ts`,
  tested in `test/dynoWorkFlow.test.ts`: the endpoint on a throwaway
  repository, every measure group on a hand-made answer, the summary,
  and CS-704's read budget on this repository.

### The Since you last looked view (CS-747)

The page's What changed tab (`view=changes`): what changed in the plan
since a point the viewer picks, each change with the decision or reason
behind it when the record has one. It is the digest as a view: a
leadership team's weekly "what changed" without the owner writing it.

- **Story.** The owner comes back after a day away and asks "what moved
  while I wasn't looking?"; someone above the project asks it once a
  week. Four figures answer at a glance: release scope, decisions
  answered, plan changes (added, dropped and moved, with the split under
  the number) and merged and done. Each number goes to its list. Then
  the lists, what changes scope first: release scope, decisions
  answered, added, dropped, moved between milestones, merged and done.
  Proposals filed come last and closed, counted apart: they change
  nothing until the owner commits them. A line names the sections where
  nothing changed.
- **The point.** Last visit, a date, or a commit. A visit is kept in
  this browser (`localStorage`, read and written in try/catch) when the
  viewer leaves the view or the page: the commit it showed and when, one
  per commit, the last eight. The point stays put while the page is
  open. With no visit kept yet it opens on a date a week back and says
  when the first visit starts. A visit at a commit the branch doesn't
  have falls back to its time, and says so. A date is the start of that
  day in the viewer's clock; a commit is 7 to 40 hex digits on the
  branch's history. If nothing changed since the last visit, the empty
  state offers the visit before. If the tracker began after the point,
  it says so and offers the tracker's first commit instead of listing
  everything as new. The URL can't hold the point yet: the route's
  search fields are the shell's.
- **What counts as a change.** Read from the tracker's files at the
  point and at HEAD, never the working tree: an entity added (committed,
  or a proposal filed), dropped (or back to a proposal), reopened,
  committed from a proposal, done (work merged, a milestone reached, an
  outside wait ended, a release made); a decision answered, with its
  answer (an answer of one letter reads as the decision's Answer section,
  else that option's line); an item that left, joined or moved between
  milestones, and the releases on each side when they differ; a
  milestone or item that joined, left or moved between releases (the
  first release in the ladder whose needs name it). A claim (planned to
  in progress) isn't a change of scope.
- **Its reason.** In order: a field of its record (a drop's `reason`, a
  decision's `rationale`); the decision it follows (one answered in the
  window that its needs name, or that its commit's message names in the
  same sentence, or the only one that commit answered; a merge's own
  "Merge CS-n" decision); the sentences of its commit's message that
  name it, or the message's first paragraph when the commit changed
  little else; for something new, its own text's lead; a subject that
  credits the owner's word, "(owner, 2026-11-19)". Each says where it
  came from. When none has one the row says plainly that neither its
  record nor its commit says why, and a merge with no merge decision
  says that.
- **A row.** The entity with its kind's mark and short title
  (`ItemRef`), Proposed when it still is, and at the end the commit
  that made the change and its day, in a reserved width. Under it, what
  happened in a sentence; a decision's answer; the reason. Every ID in
  the free text (reasons, answers) is drawn as an `ItemRef` with its
  title, except the row's own, whose title heads the row. A section
  shows six rows, then Show all, whose words share one cell.
- **Copy as text.** A short summary for a status update: a line for the
  point, then each section with a line per change, titles in place of
  IDs, answers cut at 140 characters, at most eight lines a section,
  proposals counted. When the browser refuses the clipboard, the text
  shows selected under the head for the keyboard's copy.
- **Scope.** The shell's scope narrows to changes that involve an item
  or milestone in it. The view reads the whole tracker and has no
  Proposed switch: proposals are their own section.
- **Layout.** The point (Since, the three ways, one reserved slot for
  whichever control shows) with Copy as text at the end; a note under
  it; the four figures (two columns narrow); a line on the span
  compared; then the sections, one card each. Numbers are tabular,
  nothing bolds on hover or selection, and the row of the item open in
  the pane is tinted. Narrow (under 560 px of view), the commit goes
  under the entity, the row's title may wrap to two lines, and the
  indents go. While a new point reads, the last answer stays, dimmed.
  The view's one motion, a figure scrolling to its list, is instant
  under reduced motion, and so is the dimming.
- **Data.** `GET /work-api/changes.json?commit=<hex>` or
  `?date=<ISO 8601>` (`changesReader` and `readChanges` in
  `scripts/workBoard.mjs`): git only, never hitld's store, with every
  ref and date checked against a fixed form before it reaches git and
  git run with argument arrays. Ten git processes on a first read (both
  trees, one batch of blobs, the mainline log with its diffs, the
  Work-Item trailers); kept per HEAD and point, so a warm read runs one
  `git rev-parse`. A refused point answers 400 with fixed words.
- **Model.** `changesOf` in `bench/suite/workChanges.ts`, tested in
  `test/dynoWorkChanges.test.ts` on a throwaway repository with one
  commit per kind of change, and against CS-704's read budget on this
  repository.

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
