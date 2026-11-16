---
id: CS-376
title: Shared-memory rings and decode-only jobs
kind: work
state: proposed
created: 2026-11-13
project: CS-12
needs: [CS-87]
---

## Done when

Fetching moves out of decode jobs; workers and the device thread share rings, with stealing and decode writing into a shared upload ring, if measurements show copies matter.

Detail: `docs/design/job-system.md`, "Shared memory, detected".
