---
id: CS-410
title: Does `--hypothesis` on a run without `--study` open a study?
kind: decision
state: done
created: 2026-11-13
project: CS-389
decider: owner
answer: "Refuse: a run with --hypothesis and no --study is refused, and study new comes first."
rationale: "owner, 2026-11-18: against the recommendation; fewer, deliberate studies"
answered_at: 2026-11-18T02:57:15.000Z
answered_via: main-session
answered_by: owner
---

## Question

Does `--hypothesis` on a run without `--study` open a study for it?

## Options and recommendation

- **Recommended:** yes, named from the item and the date, so no hypothesis is left on a lone run.
- **Alternative:** refuse, and require `study new` first: one more step for agents, fewer studies.

CS-404 builds the recommendation unless the owner answers otherwise.

Detail: `docs/superpowers/plans/2026-11-13-dyno-dev-harness.md`, section 13.

## Answer

Recorded in the front matter: the owner's answer through the question tool in the chief of staff's session. It wasn't asked through `hitld rights ask`, so it has no check code or ledger entry.
