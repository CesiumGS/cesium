---
id: CS-411
title: May the Mac make baseline runs in the laptop's browser?
kind: decision
state: done
created: 2026-11-13
project: CS-389
decider: owner
answer: "Yes: the Mac may make baseline runs in the laptop's browser, from a clean integration-branch commit, as their own series (win, served from mac)."
rationale: "owner, 2026-11-18: the recommendation"
answered_at: 2026-11-18T02:57:15.000Z
answered_via: main-session
answered_by: owner
---

## Question

May the Mac make baseline runs in the laptop's browser?

## Options and recommendation

- **Recommended:** yes, from a clean integration-branch commit on the Mac. They form their own series (`win, served from mac`), beside the laptop's locally served history.
- **Alternative:** baseline runs only from the laptop's own checkout, served locally: one series, and someone at the laptop for each baseline run.

CS-407 builds the recommendation unless the owner answers otherwise.

Detail: `docs/superpowers/plans/2026-11-13-dyno-dev-harness.md`, section 13.

## Answer

Recorded in the front matter: the owner's answer through the question tool in the chief of staff's session. It wasn't asked through `hitld rights ask`, so it has no check code or ledger entry.
