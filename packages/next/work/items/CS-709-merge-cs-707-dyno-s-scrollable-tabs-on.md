---
id: CS-709
title: Merge CS-707, Dyno's scrollable tabs on StrataKit's supported API
kind: decision
state: planned
created: 2026-11-19
project: CS-389
decider: owner
---

## Question

Merge CS-707, Dyno's Work tabs on StrataKit's supported scrollable API with a lint guard against deprecated props, into main?

CS-707's branch passed the queue's checks by hand on main 2665b29edc: typecheck, hitld work check (706 files) and the full suite (5,681 passed, 0 failed); tested commit 4b16427b3a. Root lint has one error (src/render/post/chain.ts, PostStageKind unused) that main has too. The Work tabs use variant scrollable with default scroll buttons; a work.css rule clears StrataKit's fade when the tabs fit (note 51), and note 50 now says the fault was ours. It removes work.css's narrow .work-tabs rules, which only the Work page used. Deviations: eslint.config.js adds typescript-eslint no-deprecated for bench/suite, with 27 existing findings held in eslint.seatbelt.tsv. Presentation: orch-10-merge-ready-CS-707.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main to the tested commit (re-checked if main moves), regenerates the views and logs the merge.
- B. Hold it: Nothing merges; the Work tabs keep the standard variant and no lint guard is added.

Recommended: Merge it. It is green on main's tip, its CSS removal is confined to the tabs it changes, the lint error is pre-existing, and its deviations are the ones the brief expected.

If unanswered by 2026-11-21T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
