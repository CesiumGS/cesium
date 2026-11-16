# The work tracker: one file per item

**Status (2026-11-15):** superseded in its format and tooling. The tracker now runs on human-in-the-lead (milestone CS-524): the files are in its format (CS-521; its design, part 3.4, "The files backend"), and its `hitld` commands replaced `packages/next/scripts/work/` (CS-522). The day-to-day rules are in `packages/next/AGENTS.md`, "Work items", and the `work-items` skill. What changed from this design:

- The lifecycle key is `state`, with `proposed`, `planned`, `in-progress`, `done` and `dropped`; `claimed` is `claimed_by`, `decided-by` is `decider`, `lead` is `owner`, `party` is `waiting_on`, and a milestone's `needs` are its `constraints`.
- Initiatives retired: each is a long outcome, a milestone with no parent whose constraints are the milestones of its projects. Projects have no parent.
- Only the main session creates items, on `cesium-2.0-webgpu-poc` in the main checkout (`hitld work new`); a session on a branch reports new work. The other machine allocates from a reserved ID block.
- Views are `hitld work views`, written to `packages/next/work/views/` and the lists in `work/README.md` after merges. The check for old-style names stays Cesium's own: `packages/next/scripts/staleNames.mjs`.

The rest of this document is the original design, kept as the record of the decisions behind it.

**Status (2026-11-13):** design, recording the owner's decisions of 2026-11-13. Built on branch `claude/work-tracker-f930da` with the tooling (`packages/next/scripts/work/`), the items (`packages/next/work/`) and the split of `CESIUM2_WEBGPU_PLAN.md`.

**Why our own:** two spikes tried tools on our real items. Beads (branch `claude/spike-beads-c838ce`) keeps its state in a per-clone database, not in files on the branch. Backlog.md (branch `claude/spike-backlog-md-32b869`) has the right shape (markdown files on the branch, one per item, merging closes), but its numeric IDs collide across machines and are repaired by renumbering, and a task file can carry a key (`onStatusChange`) that runs a shell command. So we keep Backlog.md's shape and write about 600 lines of our own: a file format, `new.mjs` and `views.mjs`.

## 1. The owner's decisions (2026-11-13)

- **IDs:** one global key, `CS-<n>`. The key belongs to the team, not to a project or plan, as in Linear. Numbers are permanent: never reused or renumbered once published (section 5 says when that is). An ID is the letters `CS`, a hyphen and a number, with no letter suffix and no aliases.
- **Hierarchy, as in Linear:**
  - initiatives: goals that group projects;
  - projects: a deliverable with a lead, a status and milestones, usually one plan document;
  - project milestones: named phases inside a project;
  - items: the work, decisions and outside dependencies.

  Items name their project, and project files name their initiative.
- **Kinds:** `work`; `decision` (a question with an owner who decides, usually this repository's owner); `external` (outside our control: devices, answers from Cesium ion, other teams, bugs to file upstream); and `project` and `initiative`, the containers.
- **Lifecycle, stored:** Proposed, Planned, In progress, Done, Dropped (section 3).
- **Readiness, derived and never stored:** an item is ready when every item it needs is Done; otherwise it is blocked by the items it names.
- **Priority** is a separate field.
- **Location:** `packages/next/work/`. Each item is a file of frontmatter plus a free markdown body.
- **Claims:** a session claims an item in its branch's first commit, and `views.mjs claims` runs at session start. This isn't atomic (section 6).
- **The overall plan** splits four ways: decisions (`docs/decisions/`), designs (`docs/design/`), history (`docs/history/`) and work (these items). Its old section 6 becomes item lists generated between markers.
- **Views:** a project dependency view, an initiative rollup and a decision backlog, all derived from the item graph.
- **Later:** a board in Dyno (a Proposed item in the tracker's own project).

## 2. Files

```text
packages/next/work/
  README.md                       how to use it, plus the generated lists
  initiatives/CS-1-renderers-and-engine-profiles.md
  projects/CS-10-cesium-ir.md
  items/CS-48-the-core-types-rates-equations-literal-slots.md
```

- **Names:** `CS-<n>-<slug>.md`. The slug comes from the title when the file is created and never changes, even when the title does. The `id` in the frontmatter must match the name's number. Because the name is fixed at creation, the same number under two different names is two different items (section 5).
- **Folders by kind:** containers live in `initiatives/` and `projects/`; every other kind lives in `items/`, so an item that changes kind (a decision that turns into work) doesn't move.
- **Body:** free markdown for prose. By convention, a work item has "Done when"; a decision has "Question", its options and recommendation, and "Answer" once decided; an external item has "Waiting on". The body links to the plan section that holds the detail rather than copying it.

### 2.1 Frontmatter

The frontmatter is a small subset of YAML, read by our own parser: `key: value` lines, inline lists `[CS-1, CS-2]`, and block lists (`- CS-1` lines under a key). No multi-line strings, anchors, aliases or tags: the parser refuses them. Values are plain strings; quotes are optional.

| Key | Kinds | Required | Value |
| --- | --- | --- | --- |
| `id` | all | yes | `CS-<n>`, matching the file name |
| `title` | all | yes | one line |
| `kind` | all | yes | `work`, `decision`, `external`, `project` or `initiative` |
| `status` | all | yes | `Proposed`, `Planned`, `In progress`, `Done` or `Dropped` |
| `priority` | all | no | `urgent`, `high`, `medium` or `low`; absent means none |
| `created` | all | no | the date the file was made, `YYYY-MM-DD` |
| `project` | work, decision, external | yes | the project's ID |
| `milestone` | work, decision, external | no | one of the project's `milestones` |
| `needs` | work, decision, external | no | IDs of items that must be Done first; never a project or initiative |
| `claimed` | work, decision, external | with In progress, for work | who has it: a session or a person's handle |
| `reason` | all | with Dropped | why it was dropped |
| `decided-by` | decision | yes | who decides, usually `owner` |
| `party` | external | yes | who we wait on (`Cesium ion`, `CesiumJS 1.x`, `devices`) |
| `initiative` | project | yes | the initiative's ID |
| `lead` | project, initiative | yes | who leads it |
| `plan` | project | no | the plan document, repository-relative |
| `milestones` | project | no | the project's milestone names, in order |

**Any other key is an error.** The schema is an allowlist, so a key that a tool somewhere would run (Backlog.md's `onStatusChange`, or a future tool's hook) can't be added unnoticed. `check` names the known code-running keys (`onStatusChange`, `on_status_change`, `hooks`, `script`, `run`, `exec`, `command`) with their own message. The scripts never execute, evaluate or import anything read from an item file.

### 2.2 Projects and initiatives

- A **project** is one deliverable: usually a plan document in `docs/superpowers/plans/`, named by `plan`. Its body keeps the summary that the overall plan's milestone section had (what was reviewed and decided, and when), and the cross-item ordering notes. Its `milestones` are the plan's own phases, where it has them.
- An **initiative** groups projects under a goal. Its body says what the goal is and what would make it done.
- **Status** is stored for containers too: the lead moves it. The views show the derived progress beside it (items Done of total, ready, blocked), so a stale stored status shows up.

## 3. Lifecycle and readiness

| Status | Means |
| --- | --- |
| Proposed | An option, not committed. Contingent work lives here, with `needs` on the decision that would commit it |
| Planned | Committed, not started |
| In progress | Claimed: `claimed` says by whom. A decision In progress is being discussed; an external item In progress has been asked or filed and is waiting |
| Done | Finished. A decision is Done when its body records the answer; an external item when the answer arrived or the upstream fix landed |
| Dropped | Not doing it, with `reason`. The file stays, so its number and history stay readable |

- **Ready:** a Planned item whose `needs` are all Done. Proposed items are never ready: they are committed first (Proposed to Planned, by the owner or the project's lead), usually when the decision they need is answered. A ready item that is claimed is listed as claimed.
- **Blocked:** a Planned or Proposed item with at least one need not Done. `blocked` lists the open needs by ID and title.
- **Dropped needs:** an item that needs a Dropped item can never become ready. `check` reports it, so the need is removed or the item dropped too.
- **Partial dependencies** don't exist: where a plan said "its second half needs X", the item is split in two, each with its own `needs`.
- **Contingent work:** the pattern is a decision item ("Do the measurements ask for X?") that needs the measuring item, and a Proposed work item that needs the decision. Answering "yes" moves the work to Planned; "no" drops it with the decision as the reason.

## 4. Allocating IDs: `new.mjs`

```sh
node scripts/work/new.mjs --kind work --project CS-10 --title "…" [--needs CS-48,CS-49] [--milestone core] [--status Planned]
```

- It takes the highest `CS-<n>` it can see and adds one. It looks in:
  - this checkout's `packages/next/work/`, uncommitted files included;
  - every worktree's working copy (`git worktree list`), uncommitted files included;
  - every local branch and remote-tracking branch (`git ls-tree`), so a branch without a worktree counts.
- It writes the file with the frontmatter filled in and a body skeleton for the kind, prints the new ID and the repository-relative path (never an absolute path, which would leak a machine's layout into a commit or plan), and stages nothing.
- Racing creates in two worktrees of one clone can still pick the same number if both scan before either writes. `new.mjs` writes with an exclusive create and re-scans once, which narrows the window to the same instant; the duplicate check catches the rest.

## 5. Across machines: the duplicate check

Our second machine is reached by `git bundle`, and collaborators clone. Two clones that both create an item between handoffs will both pick the same next number: nothing local can prevent that.

- **When a number becomes permanent:** when its item reaches `cesium-2.0-webgpu-poc`. Before that, the item exists only on a work branch, and fixing a collision there is a rename on one branch, not a renumbering of published history.
- **The check:** `views.mjs check --branches` reads the items on every local branch and worktree and reports a number used by two different file names (two different items, since the name is fixed at creation). The same file name on two branches is one item edited in two places, which is normal.
- **The rule:** after fetching a bundle into a local branch, and before merging it, run `check --branches`. If an incoming item collides with one already on `cesium-2.0-webgpu-poc` or on another local branch, the branch arriving second renames its item with a fresh number from `new.mjs` (file name, `id`, and every reference on that branch), then merges. Two unmerged branches that collide: whichever merges second renames.
- `check` without `--branches` also reports a duplicate inside one tree, which is what a careless merge would leave.

## 6. Claims, and their limits

- **Claiming:** in the work branch's first commit, set the item's `status: In progress` and `claimed: <who>`. One commit, so the claim is visible as early as possible.
- **Seeing claims:** `views.mjs claims` reads every worktree's working copy (uncommitted edits included) and every local branch, lists claims that differ from this checkout, and flags an item claimed in two places. Run it at session start, before choosing work.
- **The limitation:** claims are not atomic. Two sessions can claim one item at the same moment; nothing stops the second. Inside one clone, the second session sees the first's claim as soon as it is written in the first's worktree. Across machines, a claim is visible only after a bundle carries it. Two claims meet as a merge conflict on the `claimed` line, which is honest but late. The rules that keep this rare: claim first, check `claims` before starting, and the main session merges in order.
- **Closing:** the work branch sets its item to Done in the same change that does the work, so merging the branch closes the item. No separate bookkeeping commit.

## 7. Views: `views.mjs`

| Command | Shows |
| --- | --- |
| `ready` | Planned items whose needs are all Done, by project, with claims |
| `blocked` | open items with their open needs |
| `claims` | claims elsewhere (other worktrees and branches), double claims flagged |
| `decisions [--who owner]` | open decision items by project, with what waits on each: the decision backlog |
| `projects` | each project: progress, ready and blocked counts, which projects it waits on and which wait on it |
| `initiatives` | each initiative: its projects' progress rolled up, ready work, open decisions and external waits |
| `mermaid items [--project CS-n]`, `mermaid projects` | the item graph or the project graph, as Mermaid |
| `lists [--write]` | the per-initiative, per-project item lists; `--write` replaces the text between `<!-- work:lists:begin -->` and `<!-- work:lists:end -->` in `packages/next/work/README.md` |
| `check [--branches]` | schema and allowlisted keys, IDs and file names, duplicate IDs, unknown or wrong-kind `needs`, Dropped needs, cycles, milestones that aren't the project's, and stale old-style names in the repository's documents and comments (section 8); `--branches` adds section 5's check |

`check` runs in `npm test` (`test/work.test.ts`), so a broken item fails the suite.

## 8. The migration (2026-11-13)

- Every open milestone after M6 in the overall plan's milestone list, the job-system ports and the transform graph's open tasks became work items. Open owner questions became decision items, and outside dependencies (devices, ion's answers, the follow-ups for other teams) became external items. Finished work (M0 to M6 and the increments) stays as history prose in `docs/history/`, not as items.
- Every old milestone name and every section-number reference into the overall plan was rewritten to the new IDs and file paths across the plans, the new documents, the handbook, AGENTS.md, scripts and code comments. There are no aliases: the tools accept only `CS-<n>`.
- `check` fails on a stale old-style name: a plan-scoped milestone name of the old kind (the IR, JP, LT, MX, SR and WF series, the WebGL 2 and refinement series, the engine profiles' series and the overall milestone names after M6) or a bare section-number reference into the old plan. Two files are exempt: `docs/history/2026-11-13-work-items-renumbered.md`, the table from old names and section numbers to new IDs and files, kept so that commit messages and session notes written before the migration stay readable; and `test/work.test.ts`, whose fixtures hold old names on purpose.
- `scripts/splitCheck.mjs` (then in `scripts/work/`) compared the old plan with the new documents: every heading, every table row and every number of the old file is accounted for in the new layout, in both its modes: exact lines, and numbers and code spans once references were rewritten. The section-6 milestones and the follow-ups table, which became items, are checked by numbers and code spans.

## 9. Later: a board in Dyno

A Proposed item in this project: a Dyno page with a kanban by lifecycle, the item and project dependency graphs, filters by initiative, project, kind and "waiting on the owner", and the ready and blocked views. It reads the files on the current branch. Where it sits in Dyno waits on Dyno's rail rethink, in the Dyno harness plan (not yet merged).

## 10. Open questions for the owner

These are decision items in the tracker's project (see `views.mjs decisions`):

1. **The initiatives.** Seven are proposed from the old milestone groupings: renderers and engine profiles; Cesium IR and materials; threading; loading and level of detail; warps and the transform graph; the development harness; upstream follow-ups. Recommend keeping them until a second engineer's work shows a better cut.
2. **The renumbering table.** Keep `docs/history/2026-11-13-work-items-renumbered.md` as the one place old names may appear, or delete it once the old names stop appearing in session prompts. Recommend keeping it: commit messages before 2026-11-13 use the old names.
