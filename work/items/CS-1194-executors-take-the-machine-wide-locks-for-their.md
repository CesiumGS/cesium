---
id: CS-1194
title: "Executors take the machine-wide locks for their own heavy steps: AGENTS.md and the dyno skill say how"
kind: work
state: done
created: 2026-11-23
project: CS-199
touches: [AGENTS.md, .claude/skills/dyno/**]
---

The owner, after a check of `policy.json` against the machine-lock guide: "yes, file it. you can change AGENTS.md and the dyno skill to close this gap". Then, on the stalled merge train, the owner chose "Every heavy step locks".

The gap: `policy.json` lists the machine-wide locks (`gpu`, `cpu-heavy`, `benchmark`, `merge-queue`), and the orchestrator's gate scripts take `cpu-heavy` per step. But executors' own suites, builds and GPU runs took no lock unless their brief said so, and neither `AGENTS.md` nor the `dyno` skill mentioned the locks. CS-847's batch suite failed four timing tests at a load of about 30 on 8 cores while eight executors ran unlocked heavy work beside it.

## Done when

- `AGENTS.md` (Testing cadence) says which steps take `cpu-heavy` and which take `gpu`, the order for both, lock per step in one command, and that focused work takes none.
- The `dyno` skill has a "Machine-wide locks" section with the same rules and a one-command example.
- Nothing else changes; the orchestrator's gate script (outside the repository) takes the lock for executors that call it.
