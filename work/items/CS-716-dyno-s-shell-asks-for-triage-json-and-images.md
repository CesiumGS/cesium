---
id: CS-716
title: Dyno's shell asks for triage.json and images/index.json once per page load, not three times
kind: work
state: proposed
created: 2026-11-19
project: CS-389
touches: [packages/next/bench/suite/shell.tsx]
---

**Proposal** (CS-686). Source: CS-706's report, run 2026-11-19-1, 2026-11-19. Why now: every Dyno page load fetches `triage.json` and `images/index.json` three times each, which adds to the cold start CS-706 is cutting. Rough size: small. Decider: the owner. Filed: 2026-11-19.

## Done when

- A cold page load of any Dyno route asks for `triage.json` and `images/index.json` once each, checked with the network log in Dyno's cold-start run.
- StrictMode's double mount doesn't bring the repeats back.
- It lands after CS-704 and CS-706, which also change `shell.tsx`.
