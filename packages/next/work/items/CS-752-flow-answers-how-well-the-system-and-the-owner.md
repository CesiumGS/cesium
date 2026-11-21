---
id: CS-752
title: "Flow answers how well the system and the owner work together: cost, throughput, latencies, quality and the feedback between them"
kind: work
state: done
created: 2026-11-19
project: CS-389
needs: [CS-744]
claimed_by: orch-11-CS-752
touches: [packages/next/bench/suite/views/Work.tsx, packages/next/bench/suite/views/work.css, packages/next/bench/suite/views/workFlow.tsx, packages/next/bench/suite/views/workFlow.css, packages/next/bench/suite/workFlow.ts, packages/next/scripts/workBoard.mjs, packages/next/test/dynoWorkFlow*.test.ts]
---

The owner likes Flow for seeing how well the system is working, and wants its metrics refined so the product builder and other stakeholders get answers without asking a person: cost, productivity, efficiency, latencies, and how the system and the owner work with each other, as feedback for improving the system, the people and the outcomes. Sources are hitld's ledger (each recorded answer already carries `latency_ms` and `took_recommendation`), run and merge records, and git history.

The default roadmap view, and the one to share with a leadership team. It also sets up the new tab shell the other views mount into.

From the owner's review of the Work page and the chief of staff's first-principles proposal, 2026-11-20 (the owner: "the rest sounds great, let's build it and try it out"). Grounded in human-in-the-lead's design: the owner's attention is the scarce resource, milestones are checkable future states, there are no dates or priority labels, and views lead with exceptions (`03-data-model.md` 3.2; `12-…` 12.1.2 and 12.1.3; `02-…` on attention as a budget). The views also answer what a leadership team above the project asks the owner. Rough size: medium.

Model: the most capable one (design-heavy UI).

## Done when

- **Cost:** tokens (and money where known) per merged item, per milestone clause and per release; spend against appetite; the cost of rework (follow-ups, failed checks, rebases, reverts).
- **Throughput:** items and clauses done per week; work in progress; time from planned to claimed, claimed to done, and done to merged.
- **Latencies:** the owner's decision latency (asked to answered, by door type and by now or digest); merge-ready to merged; set-up to started for executors (the turn rule's cost); executor idle time; check run time.
- **Quality:** first-pass merge rate; check failures, and how many were proven real or load-caused; follow-ups per item; estimate accuracy once estimates exist; defects found after merge (such as E-79's red main).
- **The owner and the system:** questions per digest against the attention budget; interrupts per day; "worth asking" ratings; how often the owner takes the recommendation; defaults applied; reversals and overrides; corrections the owner gives the chief of staff or orchestrator.
- **The machine:** contention (heavy jobs at once, load), lease expiries, harness refusals, stalls.
- Each metric shows a trend over runs, a band where one is set, and one line on what to do when it's out of band. Nothing is a vanity count.
- A shareable summary (copy as text, or a read-only page) answers a stakeholder's "how is it going" with titles, not bare IDs, and carries no confidential values unless the owner allows it.
- Design pass as AGENTS.md asks: update `bench/suite/DESIGN.md`, run a UX review on the real page and fix what it finds; check both themes, 380 px wide, keyboard only, reduced motion and a clean console. Every item ID shown carries its short title. No layout shift on hover, selection or bolding. The owner reviews it by clicking around.
