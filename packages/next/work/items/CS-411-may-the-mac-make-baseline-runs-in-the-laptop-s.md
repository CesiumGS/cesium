---
id: CS-411
title: May the Mac make baseline runs in the laptop's browser?
kind: decision
status: Planned
created: 2026-11-13
project: CS-389
decided-by: owner
---

## Question

May the Mac make baseline runs in the laptop's browser?

## Options and recommendation

- **Recommended:** yes, from a clean integration-branch commit on the Mac. They form their own series (`win, served from mac`), beside the laptop's locally served history.
- **Alternative:** baseline runs only from the laptop's own checkout, served locally: one series, and someone at the laptop for each baseline run.

CS-407 builds the recommendation unless the owner answers otherwise.

Detail: `docs/superpowers/plans/2026-11-13-dyno-dev-harness.md`, section 13.

## Answer

Open.
