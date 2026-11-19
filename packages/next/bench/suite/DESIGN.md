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
- **Five views, one question each:**
  - **Your move** (the default): the owner's attention is the
    constraint, so each section leads with its number and lists the
    most waited-on first, counting what waits through other items.
    Your decisions and, beside them, the proposals for you (CS-688: the
    current batch to discuss, at most five, oldest filed first, and
    every one ready for your yes, each with its header and its stage,
    linking into the Proposals view with it chosen); In progress
    across the page (CS-547), which tells the truth about the live run;
    then ready to start and waiting outside, as they stand now; a
    decision or an outside wait in progress stays in its own section.
  - **In progress** reads the live run, not just the item files: the
    run and the orchestrator holding its lease (`hitld run status`);
    "Working now", every dispatch in flight (`hitld ledger in-flight`)
    and every other open claim (`hitld work claims`), each with who
    holds it, its branch, and its age from the dispatch's start or the
    claim commit, never from the stage history's day buckets; and
    "Done, not merged", every item done on a local branch and not on
    the main branch (git), with its branch and where the merge queue
    has it: held for the owner's yes (hitld's `refs/hitld/merge-held`),
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
    releases" from first principles. The roadmap answers three questions,
    one view each: **Plan**, when things get built (CS-692, the default);
    **Dependencies**, why something waits and what it unblocks, for one
    chosen milestone or item (CS-694); and **Projects**, how ready each
    project is for each release (CS-693). They rest on five principles,
    which every roadmap view follows:
    - Position carries the question being asked. Across is sequence,
      never dependency depth, because a position always reads as an
      order. Depth, where it is shown, is labeled "earliest possible
      start" and counted in waves, never steps.
    - One view per question: when (Plan), why (Dependencies), how ready
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

  - **Plan (CS-692)**: what gets built when, grouped by release, with no
    dates and no durations. `planOf` in `work.ts` sequences the open work
    items as the run would: each executor slot (the run's
    `max_executors`; one in run 2026-11-18-2) takes the next item in the
    planner's order whose needs are all finished. The order is work in
    progress first, then the release bands in ladder order, then
    hitld's queue rule (`orderQueue` in its `dispatch/queue.mjs`): most
    open items unblocked, then the smaller estimate, then the ID. An item
    a band's work needs is worked in that band, wherever its milestone
    sits. Decisions and outside waits take no slot; the items behind
    them carry their glyph after the bar, and the plan assumes they are
    answered in time and says so. Across is cumulative tokens per slot;
    the read API carries no estimates today, so it is item count, and
    the view says so, naming how many items it counted as one (with
    some estimates, the rest count at their median, and it says how
    many). The slot count is a control above the plan (`&slots=`, 1 to
    8, one when absent), so the owner can see the plan with more
    executors. Rows are the releases in ladder order, then "No release
    needs these"; a release folds to one summary bar and opens to one
    bar per milestone, from its first item's start to its last item's
    finish, each item's stretch filled by its stage; a milestone opens
    to its items; items a band works that none of its milestones holds
    sit in "Not in a … milestone" (or "In no milestone"), and milestones
    with nothing left to sequence are named under the band. The first
    release with work starts open; Expand all and Collapse all are
    beside the slots. Each release is a marker on the axis, a labeled
    flag along the top and a line down the plot, where the last item it
    needs finishes (its milestones, their items and what those need,
    and the releases before it). The markers are part of the plot: they
    move with the zoom, their labels keep their size and stack where
    they would overlap, and on a narrow plot a prerelease is named by
    its tag ("alpha.1"). Choosing a marker (`&release=`) answers "what
    sets its finish?": the chain of needs that ends at its last item is
    outlined, what it doesn't need is dimmed, and a sentence above the
    plot gives the finish, the last item, the chain and its length, the
    other work the slots do before and during it, and how many open
    decisions and outside waits it assumes answered. The key is one
    line (fill: stage, glyph: kind, dashed: proposed, line: a release
    is done) with a "?" popover that has the full key and how the plan
    is sequenced. The plot sits in the roadmap's canvas (`ZoomCanvas`,
    zooming across only: rows keep their height), starting fitted to
    the width and fitted again when the slot count changes; the names
    stay at the left and the markers at the top while it pans. Nothing
    animates. "Releases and the milestones they need" follows the plot.
  - **Earliest possible start** (the depth layering): each open
    milestone in the first wave it could start, in project lanes. It
    lives only in the Dependencies view's whole structure (CS-694,
    `&roadmap=deps&deps=all`; the older `&roadmap=waves` lands there),
    as that view's waves grid; "The roadmap's Dependencies view" below
    describes it. The milestone map and list that showed it before, with
    their legend block, flags, release-band arrangement, zoom and
    long hover cards (CS-683, CS-685), were taken off the page with it
    (the owner, 2026-11-19: the old map's legend and hover must not come
    along), and the fewest crossings layout and its d3-dag layering went
    too (the owner, dropping CS-691 on 2026-11-18). `milestoneMapOf` and
    the other map helpers in `work.ts` stay, tested, until a later item
    removes or reuses them. The roadmap is committed work by default;
    the Proposed toggle in the roadmap's tools (CS-563,
    `&proposed=show`, off when absent, with the count of proposed
    milestones) adds the proposed milestones and release items to every
    view, outlined dashed. In Projects, the proposed releases join as
    columns and proposed milestones' items join their releases; the
    project matrix counts every open item either way.
  - **Release bands (CS-685).** The owner's rule: a release needs whole
    milestones, and every open item a milestone it needs pulls in,
    directly or through other items, belongs to a milestone the same
    release needs, or to no milestone. A release needs what the releases
    before it need too. `releaseClosuresOf` in `work.ts` checks it for
    each open release in ladder order (each after the releases it needs).
    A break is fixed in the tracker, by moving the item or splitting its
    milestone, never explained away on screen, so the roadmap shows each
    as a problem to fix: "Releases and the milestones they need", after
    the Plan's plot, gives each release with its milestones (folded
    behind it) and, always open, its problems. Each problem names the
    release, what it pulls in, the milestone that holds it and that
    milestone's band, the path of needs from the release to it (IDs with
    their kind's mark, named on hover), and the two fixes. A release
    that needs an item itself, not through a milestone, is a problem
    too. With none, the panel says so. Each open milestone sits in the
    band of the earliest release that needs it ("a release is just a
    special milestone"), and the Plan groups its rows by band.
  - **The roadmap's canvas (CS-683)**, `ZoomCanvas`, holds the Plan's
    plot: pinch, or Ctrl or ⌘ with the wheel, zooms about the pointer;
    the wheel and a drag pan; the keys + and − step through the levels,
    Shift+1 fits and Shift+0 goes back to 100%. The bar over it shows the
    level and has zoom out, zoom in and Fit, all reachable by keyboard.
    The zoom is semantic: text is drawn at full size or not at all.
    Nothing animates, so reduced motion needs nothing more.
  - **Proposals (CS-688)**: candidate commitments (CS-686), laid out as
    the flow they go through: new to discuss, being shaped, ready for
    your yes, and the "later" copies awaiting review. A proposal is a
    proposed item or milestone. Its header (source, why now and what it
    unblocks, rough size, decider, date) is the paragraph of its text
    that starts `**Proposal**`, read field by field
    (`proposalHeaderOf` in `work.ts`; the adapter passes on only the
    proposals' text, from `hitld work query --bodies`). The stage
    follows from the tracker (`proposalsOf`): being shaped when an open
    decision or study (a learning milestone) comes before the commit;
    later when it has no header yet, since nobody has made its case for
    now (CS-680 gives each one); ready for your yes when it has a
    header and is shaped (an item's text has a "Done when", a milestone
    has nothing left to shape); to discuss when it has a header but
    isn't shaped. A line under the title says how to commit one until
    HITLd's dashboard can: ask the main session to commit it, drop it
    or send it to shaping. An alert lane leads, with the proposals that
    committed work (a planned item, or a committed milestone's
    constraints) needs, and what needs each, named: commit it or take
    the need away. Then a section per stage, each with its count and
    the rule that puts a proposal there ("None now" when empty),
    grouped by project, a proposed milestone first in its project.
    Every row has the same columns: the proposal, what a commit needs,
    and how many open items wait on it. Under the title, its header
    (source and why now, why now cut to two lines, then size, decider
    and date), or a line saying it has none yet. What a commit needs is
    the decider's yes (the owner when the header names no one), after
    any open decision or study; the needs that hold back only its start
    ("Starts after") sit under it, smaller, since committing isn't
    starting. A proposed milestone's row lists every one of its
    constraints with its state, proposed ones with the dashed outline
    the roadmap uses (CS-563); the row opens the milestone in the pane,
    as an item's row opens the item. A toggle narrows the view to one
    stage (`&stage=` discuss, shaping, ready or later; every stage when
    absent). Narrow, each row stacks, with the column's name over what
    a commit needs. Nothing animates.
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

### The roadmap's Dependencies view (CS-694)

The second of the roadmap's three views (the owner, 2026-11-18: Plan,
CS-692; Dependencies; Projects, CS-693), on the three-view brief CS-692
records: one view per question, and this one answers why. Every wait
between 90-odd milestones drawn at once answers neither "what is this
waiting on?" nor "what does this unblock?", so the view asks about one
thing at a time and shows the rest on demand.

- **Where it is.** `?view=roadmap&roadmap=deps`, the Dependencies toggle
  between Plan and Projects. `&focus=CS-<n>` is the center;
  `&depth=` the levels shown, 1 to 6 (3 when absent); `&deps=all` the
  whole structure. It follows the roadmap's Proposed toggle: proposed
  milestones join only when asked for, outlined dashed (CS-563).
- **Choosing the center.** From the Plan view directly (each milestone
  and item row has a dependencies button beside its name, quiet until
  pointed at or focused), from the pane (Its dependencies, on any
  milestone or item, so from a list, Find or the map), from its own
  search field (ID or words in the title, milestones
  first; the arrow keys walk the matches, Enter takes the first), or,
  with nothing chosen, from the milestones most work waits on, or the
  one open in the pane. A node's center button moves the center to it.
- **Layout.** What the center waits on to its left, the center, what it
  unblocks to its right; narrower than 900 px they stack, the center
  first. Each side is a small tree, expanded to the depth chosen. Its
  head says how far its chain goes: how many open milestones and items,
  up to how many levels, and how many of them are the owner's decisions
  and outside waits, in their kinds' ink.
- **A node** is one line: a stage fill, its ID with its kind's mark,
  its title (which opens it in the pane), and the center button. Under
  it, small: its state and whether it is ready (a milestone's items
  ready and done; an owner decision as "Your decision" and an outside
  wait as "Waits outside:" and the party, each in its kind's ink with its
  mark), its release, and why it is there ("CS-200 needs CS-210", the
  item needs behind a wait between milestones). A node cut short by the
  depth says what lies beyond ("16 more, 7 levels") and opens one level
  more. A node the tree reaches twice is expanded where it is nearest
  the center and quiet elsewhere ("also elsewhere"); one that leads back
  to a node on the way is a loop and ends there.
- **Two levels, each read at its own** (`dependencies.ts`). An item
  waits on its open needs, items and milestones. A milestone waits on
  what holds it up besides its own work: the milestones (or items in
  none) its open items need, the milestones it names, and its own open
  decisions and outside waits; its own work is its content, listed in
  the pane. Unblocks is the other way round, and an item also leads up
  to the milestones that hold it, so the chain carries on there. Done
  and dropped work isn't in the trees.
- **A node's release** is CS-685's band: the earliest release that needs
  the milestone; for an item, the earliest of its milestones' and of a
  release that needs it directly; otherwise "No release".
- **The whole structure, behind the toggle,** for reshaping work, and
  the depth layering's only home. First every open milestone at its
  **earliest possible start, in waves** (`wavesOf` in
  `dependencies.ts`): a grid with project lanes down and waves across,
  each cell listing its milestones as small chips (the mark, the ID, the
  title cut to fit). A milestone's wave is one more than the latest wave
  of the milestones it waits on; it is the earliest it could start with
  unlimited hands, never when it will (the Plan view answers when).
  Release items take no wave. One key line (the lead sentence, dashed
  for proposed, ↻ for a loop) carries a "?" whose popover explains the
  rest, as the Plan's does. No wait is drawn; a chip's tip is short
  (its title, its loop, how many it waits on), and choosing it centers
  the view on it. The grid scrolls sideways in its own box, the lanes'
  names held. Then the project matrix, CS-693's, the roadmap's only
  one (see "The roadmap's Projects view").
- **The key** is one line, worded for the layout (left and right, or
  under it when stacked); stages, kinds and proposed are explained in
  tooltips. Nothing animates.

### The roadmap's Projects view (CS-693)

The third of the roadmap's three views (the owner, 2026-11-18): Plan
answers when (CS-692), Dependencies why (CS-694), and Projects how
ready. It replaces Project waits, a matrix that said which project
waits on which but not what that means for the releases (the owner: "i
also haven't found it super useful thus far"). It answers, for the
owner and for whoever picks the next work: what does each release
still need from each project, how far along is it, what holds it up,
and which projects are the bottlenecks. `?view=roadmap&roadmap=projects`,
the third toggle after Plan and Dependencies; the model is
`bench/suite/projects.ts`, the view `views/Projects.tsx`.

- **By release.** Projects are rows; releases are columns in ladder
  order, as CS-685's release bands, then No release. An item belongs to
  the earliest release whose milestones hold it; one no milestone holds
  belongs to the earliest release that reaches it through needs, as
  the closure rule allows; the rest are in no release. A cell is what
  that release is the first to need from that project, every kind of
  item: done of all, a stage bar, then each other stage's count by its
  swatch (in progress, ready, blocked, proposed), and "By" with the IDs
  of what holds the blocked ones up. Those are open decisions and
  outside waits anywhere upstream, and the first open item of another
  project on each way up (that project's own row says what holds it),
  decisions first. An empty cell says "Needs nothing". Choosing a cell
  opens it under its row: the items by stage, each blocked one with
  what blocks it, each opening in the pane.
- **Holds up**, the column beside the name and the default sort: how
  many open items in other projects wait on the project's open work,
  directly or through others, in how many projects and for which
  releases. Sorted by it, the bottlenecks rise to the top; its head
  sorts by it, the Project head by project number (`&psort=project`).
  Choosing the figure lists what waits, by project.
- **What sets a release's finish** is the Plan view's: the chain of
  needs that ends at the last item the release needs, as `planOf`
  sequences the work with the Plan's executor slots (`&slots=`). The
  words "critical path" are not used. A cell holding items on it gets
  the accent bar at its left and "Sets the finish of beta.1", as the
  Plan outlines the chain; Holds up says which releases' finish the
  project sets, and in the sort it breaks ties.
- **Decisions in their row.** A project's open decisions of the
  owner's that hold up release work sit under its row as cards (the
  decision's mark, its question, and how many items wait on it for
  which releases), as CS-683 drew them on the map. Each opens in the
  pane. This settles the question CS-683's executor asked: this view
  draws decisions.
- **The project matrix lives in the Dependencies view's whole
  structure** (`&roadmap=deps&deps=all`), under the waves, and is the
  roadmap's only one; "Projects' waits on each other" above the
  Projects view goes there. Old links to Project waits
  (`&roadmap=matrix`) land there too. The cells are `dependencyMatrix`'s:
  each row's open items that need the column's. The order
  (`projectMatrixOf`) is upstream first, so marks sit below the
  diagonal, and among the projects that can come next, the one most
  coupled to those just placed, so tightly coupled projects sit
  together. Loops, projects that wait on each other through their items
  (strongly connected components), sit together in a double outline,
  as the old map drew loops, labeled "Loop 1"; inside a loop, the order
  puts as few marks above the diagonal as a greedy rule finds, so every
  mark above it sits inside a loop. Pointing at or moving to a cell
  names its row and column; choosing it lists the items behind it. The
  old matrix's release strip is gone: which projects feed a release is
  now a column of the Projects view.
- **Encoding.** One key line above the view: the stage fills, the
  decision and outside-wait marks, and the finish bar. Kind color is
  only ink on a glyph or name, stage color only a fill (CS-573); a
  dashed outline is proposed (CS-563): a proposed release's head, and a
  cell all in proposed milestones. Labels sit on the marks; the details
  are in the cell's detail and simple tips until the shared hover card
  (CS-696).
- **Narrow.** Below 560 px the table becomes a card per project: its
  name, Holds up, each release it has work for, the releases that need
  nothing from it on one line, and its decisions; a toggle sorts. The
  matrix scrolls inside its box. Nothing animates, so reduced motion
  changes nothing.

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
