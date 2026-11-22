# Studies

A study is a judgment: a question and a hypothesis written down before results, the runs that test it, and a verdict that cites them and informs a decision. Runs execute and stay in the results store on the machine that made them; a study holds no machine details and cites runs by ID. The design is `docs/superpowers/plans/2026-11-13-dyno-dev-harness.md`, section 2, and the model is CS-687's answer (a kind and a set of instruments).

One Markdown file per study, named by its ID (the creation date and a short slug): `2026-11-21-alpha-default.md`. Make and change them with `dyno study …` or Dyno's Studies page, both of which validate the whole file before writing it. Nothing commits: an agent commits study changes with its work, and the owner commits changes made in Dyno.

## Commands

```sh
npx @cesium/dyno study new alpha-default --kind comparison --item CS-396 \
  --question "…" --hypothesis "…" --instruments suite \
  --baseline 2.0@main --candidate 2.0 \
  --primary cpuP50:lower:0.05 --guardrails settleMs:0.03,bytes:0.05 --noise 0.04
npx @cesium/dyno measure start suite --study 2026-11-21-alpha-default --scenes …
npx @cesium/dyno study note <id> "…"
npx @cesium/dyno study attach <id> <run> [run…]
npx @cesium/dyno study show <id> [--branch b]
npx @cesium/dyno study verdict <id> --cite <run>:"what it showed" [--decision CS-n]
npx @cesium/dyno study abandon <id> --reason "…"
npx @cesium/dyno study reopen <id> --reason "…"
npx @cesium/dyno study check
npx @cesium/dyno study power --noise 0.04 --effect 0.05
npx @cesium/dyno studies [--item CS-n] [--status s] [--kind k] [--all-branches]
```

- `study new` refuses an ID that exists in this worktree or on any local branch, and names every field the kind requires that is missing (exit 2).
- A run with `--study <id>` inherits the study's item, hypothesis, baseline and candidate, and expectations, and keeps a copy of them in its plan. An explicit option that differs overrides the study, and the run records the override (`studyOverrides`). The study must be open, check cleanly, state its hypothesis and have every field its kind requires: before then no run counts.
- A run with `--hypothesis` and no `--study` is refused, naming `study new` (the owner's answer to CS-410). It writes nothing.
- `studies --all-branches` also lists studies that exist only on other local branches, read through git, read-only, labeled with their branch.
- `studies --item CS-<n> --json` is what the tracker reads. Each row holds `id`, `title`, `kind`, `item`, `status`, `created`, `instruments`, `question`, `outcome`, `decision`, `holds_for`, `branch`, `path`, `uncommitted` and `valid`, and `readOnly` for a study from another branch. Fields are added, never renamed or removed, without raising dyno's `api_version`.

## The file

A front matter block in the tracker's YAML subset (`key: value` lines, inline and block lists, no multi-line values), then the sections Question, Hypothesis, Design, Notes and Verdict. Keys are written in a fixed order, and `attached` and `cites` one run per line, so a change diffs as the lines it changes.

```markdown
---
id: 2026-11-21-alpha-default
title: The error exponent α for vertical exaggeration
kind: comparison
item: CS-396
status: open
created: 2026-11-21
instruments: [suite]
baseline: 2.0@main
candidate: 2.0
primary: [cpuP50:lower:0.05]
guardrails: [settleMs:0.03]
runs: 7
order: paired-interleaved
stopping: fixed
alpha: 0.05
power: 0.8
noise: 0.04
prior: normal:0:0.04
health: [power:ac, thermal:nominal]
---

## Question

Which α should the vertical exaggeration default to?

## Hypothesis

α 0.5 draws α 1's image within noise with a third of its terrain tiles or fewer.

## Design

- `npx @cesium/dyno measure start suite --study 2026-11-21-alpha-default …`

## Notes

- 2026-11-21: α 1 at ×10 in the valley never settles.
```

Every study has `id`, `title`, `kind`, `item` (the `CS-<n>` it serves), `status` (open, concluded, abandoned), `created` and `instruments`. A concluded study adds `computed` and `outcome` (supported, refuted, inconclusive), `holds_for` (the devices it holds for), `cites`, and optionally `decision`. `attached` lists earlier runs it draws on.

## Kinds

The kind sets what a study writes down before results and what its verdict looks like.

| Kind        | Requires                                                                                | May add                                                                  |
| ----------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| comparison  | `baseline`, `candidate`, `primary`, `guardrails`, `noise`, `runs`, `order`, `stopping`  | `secondary`, `alpha`, `power`, `aa_run`, `prior`, `health`               |
| sweep       | `axes`, `reference` (a setting=value point), `primary`, `noise`, `runs`                 | `guardrails`, `secondary`, `alpha`, `power`, `aa_run`, `prior`, `health` |
| feasibility | `criteria` (what feasible means, as bounds), `runs`                                     | `candidate`, `alpha`, `noise`, `aa_run`, `health`                        |
| calibration | `reference` (what it is compared against), `tolerances` (each quantity's error), `runs` | `candidate`, `alpha`, `noise`, `aa_run`, `health`                        |

The forms:

- **Primary:** `metric:lower|higher:effect`, one to three, each with its direction and the minimum effect worth detecting, as a fraction. It isn't corrected for multiple comparisons.
- **Guardrails:** `metric:margin` (relative to the baseline, in the metric's worse direction) or an absolute bound, `metric<=value` or `metric>=value`. A guardrail passes when the data shows it is no worse than its margin (non-inferiority), not when nothing significant shows.
- **Secondary:** metric names, reported with Benjamini-Hochberg q-values. They never decide the verdict.
- **Criteria** and **tolerances:** bounds, `metric<=value` or `metric>=value`, per scene.
- **Sample plan:** `runs` per arm, `order: paired-interleaved` (baseline and candidate paired by device and scene, and interleaved), and `stopping: fixed` or `sequential`. `study new` takes `runs` from the power analysis when it isn't given: the smallest n with (t(1 − α/2, n − 1) + t(power, n − 1))² (σ / δ)² ≤ n, σ the noise floor and δ the smallest minimum effect, on the log scale. `dyno study power` does the sum alone.
- **Noise floor:** `noise`, the standard deviation of one paired log ratio, from an A/A run of the instrument (the baseline against itself), named by `aa_run`.
- **Prior:** `normal:<mean>:<sd>` on the effect's log ratio, fixed before results; `study new` writes `normal:0:<noise>`.
- **Health bar:** `power:ac`, `load:<n>` (the one-minute load average), `thermal:nominal`, `battery:<percent>`. The default is `power:ac` and `thermal:nominal`.

Metrics must be ones the study's instruments declare (`bench/suite/instruments.mjs`): `suite` (benchmark runs, the report's metrics and families such as `tiles.terrain`), `coldstart`, `images` (`flipMean`, `flipP95`) and `lab` (none until CS-401 records Lab runs).

## The verdict

`study verdict` computes the verdict from what the study wrote down before results; it is never chosen.

- **The unit of analysis is the run** (one repetition, a fresh browser session), never a tick: ticks within a run are correlated. A repetition's observation is its log ratio, candidate over baseline, averaged over scenes. Ratio metrics pooled over runs use the delta method or a bootstrap over runs (`bench/suite/studyStats.mjs`).
- **Each device is a stratum.** The verdict names the hardware it holds for (`holds_for`). Supported on one device and refuted on another is inconclusive.
- **Health:** each run records the machine's state (power source, battery, load average, thermal state). A run that fails the study's health bar is excluded, and the verdict names it and why. A run that didn't record a field the bar asks about is kept, with a warning that it can't be checked.
- **A comparison is supported** when every primary metric's interval excludes no change in its direction and every guardrail passes. It is **refuted** when a primary moves the wrong way, when its interval shows no effect worth having (inside ± the minimum effect), or when a guardrail is broken (its interval is wholly past the margin). Otherwise it is **inconclusive**, and says what would settle it.
- **Fixed stopping** decides nothing before the plan's runs are in. **Sequential stopping** uses an always-valid interval (a mixture sequential probability ratio test with the noise floor and the minimum effect), so stopping early doesn't inflate false positives.
- **A missing instrument's runs** make the verdict inconclusive on that device.
- **The Bayesian readout,** beside the computed verdict: the probability that the candidate is better, the probability that it beats the minimum effect, and the expected loss of shipping it, from a normal model with the file's prior; with three or more scenes, a hierarchical model pools them and flags any that differs.
- **Overriding** the computed verdict (`--outcome`) needs `--override "<why>"`. The file keeps both, and the reason on an `Override:` line in the Verdict section.
- **Citations:** each cited run says what it showed, with numbers and units. Citing an invalid run, a run excluded by the health bar, a recording, a run from a device the verdict doesn't hold for, or a run not in this store warns.
- A verdict that informs a decision item names it (`decision`). Closing the decision stays the owner's step in the tracker (CS-409).

The Verdict section's readout gives relative changes and probabilities, never milliseconds or bytes: measured values stay in the results store.

## Retention

Retention never drops a run a study cites or attaches, on any local branch: `studyRuns` in `bench/suite/studies.mjs` reads every branch's study files through git, and `planPrune` keeps those runs and pinned ones. The store's pruning (CS-736) calls them.

## Dyno's dev server

`GET /bench-results/studies/index.json` lists studies (`?all=1` adds other branches); `GET /bench-results/studies/<id>` returns one, with its evidence and its verdict so far. `POST /bench-results/studies/<id>` takes `{ "op": "note" | "attach" | "verdict" | "abandon" | "reopen", … }`, validated as the CLI validates, and writes the file into the server's own worktree, never outside `work/studies/`. A write needs the `X-Dyno-Study: 1` header, a JSON body of at most 64 KiB, and a same-origin page.

## Checks

`dyno study check` validates every study file in the worktree; `test/dynoStudies.test.ts` runs the same check on the files committed here, so `npm test` fails on an invalid study.
