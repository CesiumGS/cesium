---
id: CS-410
title: Does `--hypothesis` on a run without `--study` open a study?
kind: decision
status: Planned
created: 2026-11-13
project: CS-389
decided-by: owner
---

## Question

Does `--hypothesis` on a run without `--study` open a study for it?

## Options and recommendation

- **Recommended:** yes, named from the item and the date, so no hypothesis is left on a lone run.
- **Alternative:** refuse, and require `study new` first: one more step for agents, fewer studies.

CS-404 builds the recommendation unless the owner answers otherwise.

Detail: `docs/superpowers/plans/2026-11-13-dyno-dev-harness.md`, section 13.

## Answer

Open.
