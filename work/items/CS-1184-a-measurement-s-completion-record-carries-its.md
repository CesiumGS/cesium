---
id: CS-1184
title: A measurement's completion record carries its run ID when the suite prints it after install output
kind: work
state: proposed
created: 2026-11-23
project: CS-389
touches: [bench/suite/commands/measure.mjs, test/**]
---

Source: orch-11's report on CS-971's measurement, 2026-11-24. Why now: the orchestrator and the merge gates find a measurement's results through its completion record, and a null run ID means a person has to read the log to find them. Rough size: small. Decider: owner (commit, drop or shape). Filed 2026-11-23.

## Problem

Measurement 0a4b finished as done, and its log names its run (2026-11-24T05-28-31-281Z-mac-apple), but its completion record has `run_id: null`, and so no `result_command`. The suite printed the run ID after install output, and the measurement didn't pick it up from there.

## Done when

1. A measurement takes its run ID from the suite's output wherever it appears, including after install or build output, and records it with `result_command`.
2. If the suite gives none, the record says so plainly rather than reporting done with a null run ID.
3. Focused tests cover a run ID after install output, the usual case, and a missing one.
