---
id: CS-23
title: Support reports on `Engine` and `View` (`view.support`, `view.effective`, `view.explain`, `strict`)
kind: work
state: done
created: 2026-11-13
project: CS-8
needs: [CS-22]
claimed_by: orch-11-CS-23
touches: [packages/next/src/profile/**, packages/next/src/scene/Engine.ts, packages/next/src/scene/View.ts]
---

Wired into `Engine` and `View` (`view.support`, `view.effective`, `view.explain`, `strict`). Needs CS-22. Turning today's silent fallbacks into notices is CS-507, split from this item on 2026-11-15.

## Done when

- On a fake engine, `view.support`, `view.effective` and `view.explain(feature)` give, for each feature, what was asked, what was given, and the rule and reason behind it.
- The values stay right after a resize and after device loss.
- Under `strict`, a pinned step that can't run throws.
- Glare and translucency parity are unchanged.

## Plan

`docs/superpowers/plans/2026-11-13-engine-profiles.md`, its milestone table.
