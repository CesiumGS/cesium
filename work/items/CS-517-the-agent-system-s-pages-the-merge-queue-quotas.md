---
id: CS-517
title: "The agent system's pages: the merge queue, quotas, the controllers' steps and token ledgers"
kind: work
state: planned
created: 2026-11-15
project: CS-389
needs: [CS-523]
---

The pages for the agent system's records, which the Work page's Flow view promises "when HITLd records them": the merge queue, quotas, the controllers' steps, and tokens spent per item and milestone from the ledger. Read through human-in-the-lead's read API, never by parsing its files.

## Done when

- Dyno shows the merge queue with each entry's state, the quotas with what is left of each, the controllers' latest steps, and tokens spent per item and per milestone, each with its source and the time it was read.
- Each page reads human-in-the-lead's read API at a version it checks, and says so when the API is missing or a different version.

Detail: `packages/next/bench/suite/DESIGN.md`, "Later, from HITLd's records".
