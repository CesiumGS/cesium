---
id: CS-404
title: "Studies: the model, the files and the commands"
kind: work
state: in-progress
created: 2026-11-13
project: CS-389
needs: [CS-390, CS-687]
claimed_by: orch-11-CS-404
---

The study file format (the tracker's frontmatter subset and sections) in `packages/next/work/studies/`, with its validator, shared with the tracker's `check`. `study new`, `note`, `attach`, `verdict`, `abandon`, `reopen`, `show`; `studies` (with `--all-branches`, reading other branches through git). `run --study`, inheriting item and expectations. A run with `--hypothesis` and no `--study` is refused, saying to run `study new` first (the owner's answer to CS-410, 2026-11-18; no implicit study). ID uniqueness across local branches. Retention keeping every run a study cites or attaches. The dev server's read endpoints and its validated write endpoint, which writes files into its own worktree.

The model (CS-687, answered A, 2026-11-19): a study has one **kind** (comparison, sweep, feasibility, calibration), which sets what it writes down before results and what its verdict looks like, and a **set of instruments** (Lab pages, scenes, suites) whose runs it draws on. Regression watches aren't a kind: they're standing checks, and a failing one opens a study.

Statistical rigor, borrowed from online experimentation platforms such as Statsig (the owner, 2026-11-19: fold them in). Each kind's pre-registration holds what applies to it:

- **Unit of analysis:** the run, not the frame. Frames within a run are correlated, so per-frame samples never count as independent. Ratio metrics (CPU per tick) use the delta method or a bootstrap over runs.
- **Primary metric:** one, sometimes up to three, each with its direction and the minimum effect worth detecting, fixed before results.
- **Guardrails:** each with a margin, tested for non-inferiority. A guardrail passes when the data shows it is no worse than the margin, not when nothing significant shows.
- **Secondary metrics:** corrected for multiple comparisons (Benjamini-Hochberg). The primary metric is not corrected.
- **Sample plan:** runs needed, from the instrument's noise floor and the minimum effect (a power analysis). The order: baseline and candidate paired by device and scene, and interleaved. A stopping rule: fixed, or sequential with always-valid intervals, so stopping early doesn't inflate false positives.
- **Health checks:** each instrument's noise floor is calibrated by an A/A run (baseline against itself). Each run records the machine's state: power source, battery, load average, thermal state. A study refuses a verdict from runs that fail its health bar, such as load above its limit or on battery, and says which runs failed.
- **Bayesian readout** (the owner, 2026-11-19), beside the computed verdict, which stays frequentist:
  - the probability that the candidate beats the minimum effect, and the expected loss of shipping it;
  - for a study over several scenes or devices, a hierarchical model that pools across them and flags any that differ;
  - priors from each instrument's A/A history, fixed before results and kept in the file;
  - for sweeps, Bayesian optimization to choose the next settings to run.
- **Where a result holds:** the device is a stratum in the design, and each verdict names the hardware it holds for.
- **Decision rule:** the verdict (supported, refuted, inconclusive) is computed from the pre-stated criteria. A missing instrument's runs make it inconclusive. Overriding the computed verdict needs a written reason, kept in the file.

Each instrument in the catalog declares its metrics, their units and its noise floor, and the date of the A/A run that measured it. Runs from different instruments join by commit, device and settings.

Its endpoints follow CS-358's fixes for the dev server's file endpoints. The plan assumes the recommendations of CS-409 and CS-410; if the owner answers otherwise, this item follows the answer.

Model: the most capable one (design-heavy or risky), per the plan.

## Done when

A study made, run against, noted and concluded from the CLI reads back with its evidence, and its file diffs cleanly. A verdict citing an invalid run warns. A run with `--hypothesis` and no study is refused, naming `study new`, and creates no file. A study on another local branch lists with its branch. The endpoint rejects a malformed or oversized body and never writes outside `work/studies/` (tested). A cited run survives retention. `studies --item CS-<n> --json` is stable for the tracker. A study's file records its kind and instruments, and `study new` asks for the fields its kind requires. A comparison without a primary metric, a minimum effect, guardrail margins or a sample plan is refused before any run counts. A verdict is computed from the pre-stated criteria, tested on a fixture where a guardrail fails and one where an instrument's runs are missing (inconclusive). A run whose recorded machine state fails the study's health bar is excluded, and the verdict says so. A power-analysis helper turns a noise floor and a minimum effect into a run count, checked against a known case. The sequential option keeps its false-positive rate at the stated level on simulated A/A data (a deterministic seed). The Bayesian readout matches a closed-form case (two normal groups with a conjugate prior), its probability of a win is calibrated on simulated A/A data (a deterministic seed), and the hierarchical model recovers a planted one-scene difference on a fixture.

## Files

new `bench/suite/studies.mjs`, `commands/studies.mjs`, `packages/next/work/studies/README.md`; `cli.mjs` (dispatch, `--study`), `schema.ts`, `vite.config.ts` (endpoints), `data.ts`, the store's clean-up; the tracker's `scripts/work/views.mjs` (`check` calls the validator)

## Plan

`docs/superpowers/plans/2026-11-13-dyno-dev-harness.md`, its milestone table.
