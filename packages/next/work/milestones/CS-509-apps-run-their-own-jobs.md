---
id: CS-509
title: Apps run their own jobs
kind: capability
status: Planned
created: 2026-11-15
project: CS-12
outcome: "An app runs its own work from a module on the engine's job system, below visible content, with the engine on either thread."
done_when:
  - "c1: An app runs its own job from a module URL with `engine.jobs.run`, in its own worker group, below visible content by default; a slow or failing app job doesn't delay content, and the same call works in both thread modes."
needs: [CS-100 c1, CS-463 c1, CS-464 c1]
check: "integration-test test/engineJobs.test.ts"
---

## Why

App jobs wait until the internal job API has settled across its ports (the job-system design, "Owner's decisions after review"): main-thread work fits the tick's slices (CS-463) and tile selection runs off the main thread (CS-464). CS-100 also needs the worker façade (CS-108, in CS-422). Moved out of "Loads and decodes run on Jobs" (CS-462) on the owner's answer of 2026-11-15.

## Done when

Drafted on 2026-11-15 for the owner's review: the clause, the check and each constraint's clause are in the front matter.

## Check

`test/engineJobs.test.ts`: an app job runs in the app group below visible content, its failure leaves content loading, and the same call passes with the engine in a worker.
