---
id: CS-703
title: Dyno's Work page drops the old map's helpers that nothing uses
kind: work
state: proposed
created: 2026-11-19
project: CS-18
touches: [packages/next/bench/suite/work.ts, packages/next/test/dynoWork.test.ts]
---

**Proposal** (CS-686). Source: the CS-694 executor's report, run 2026-11-18-2, 2026-11-19. Why now: `milestoneMapOf` and the other map helpers stay in `bench/suite/work.ts`, still tested in `test/dynoWork.test.ts`, though the page stopped using them when CS-694 removed the old map. Dead code that tests keep alive invites someone to build on it. Rough size: small. Decider: the owner. Filed: 2026-11-19.

## Done when

- The map helpers no view uses are removed from `bench/suite/work.ts`, with their tests, after a search shows nothing else imports them.
- `npm run typecheck` and `npm test` pass.
