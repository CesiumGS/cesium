---
id: CS-99
title: "The worker-mode spike: a headed run on an otherwise idle GPU"
kind: work
state: planned
created: 2026-11-13
project: CS-12
---

The job system's next step 1: run the worker-mode spike headed, on an otherwise idle GPU, and see whether ticks are smoother. The worker mode's default waits for it (`docs/design/job-system.md`), and so do the profiles' worker snapshots (CS-31).
