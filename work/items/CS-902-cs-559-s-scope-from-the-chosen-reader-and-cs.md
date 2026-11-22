---
id: CS-902
title: CS-559's scope, from the chosen reader and CS-833's study
kind: work
state: planned
created: 2026-11-22
project: CS-191
needs: [CS-901]
---

> **Committed by the owner (2026-11-22)**, through CS-802's answer B. Source: `docs/design/simready-and-usd.md` (CS-833).

## Done when

- CS-559's done-when is rewritten around the reader CS-901 chooses:
  - USDA, USDC and USDZ;
  - the composition arcs it reads;
  - the list of what it refuses, by name;
  - payloads by view;
  - the fixture from CS-833's spike.
- The rewrite includes the study's limits for untrusted files: allocation and composition depth are bounded, and the reader runs in a worker.
