---
id: CS-405
title: The Studies page
kind: work
state: planned
created: 2026-11-13
project: CS-389
needs: [CS-395, CS-403, CS-404]
---

Studies: a list with status, item, question, latest evidence, branch, and a mark for uncommitted changes; studies on other local branches, read-only. A study's page: the question, hypothesis and expectations; the design as copyable commands, each marked with the run that executed it; the evidence, with each sweep in the sweep view, image runs as grids, before-and-after runs as forest plots with their results, and runs not in this store shown by ID and machine; notes; the verdict form (outcome, reasoning, cited runs picked from the evidence, decision item), which writes the file. Analysis replaced: `/analysis` redirects to Studies, and sweep runs without a study open in their run report. Overview's "Open studies". "Investigate" on alerts. Decision annotations on Trends.

Also updates the AGENTS.md section and the skill (CS-402) for the Studies page.

Model: the most capable one (design-heavy or risky), per the plan.

## Done when

The α study (CS-396) reads from question to verdict on one page. A verdict recorded in the page writes the file and appears in `study show`, and the reverse. Old `/analysis?sweep=` links land on the run's report or its study. Owner review by clicking around.

## Files

new `views/Studies.tsx`, `views/Study.tsx`, `studies.css`; `views/Analysis.tsx` (removed), `routes.tsx`, `shell.tsx` (the rail item), `views/Overview.tsx`, `views/Alerts.tsx`, `trendsModel.ts`, `DESIGN.md`

## Plan

`docs/superpowers/plans/2026-11-13-dyno-dev-harness.md`, its milestone table.
