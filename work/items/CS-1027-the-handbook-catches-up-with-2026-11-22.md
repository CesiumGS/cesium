---
id: CS-1027
title: "The handbook catches up with 2026-11-22: generated project states, the packages, WebGPU first, and pinned runs for its figures"
kind: work
state: planned
created: 2026-11-22
project: CS-609
needs: [CS-1023, CS-1024, CS-1025]
---

> **Committed by the owner (2026-11-22), through CS-1023 A, CS-1024 B and CS-1025 B.** Source: the Fable handbook review (`fable-review-handbook.md`, 15 findings by tab). Hold any CS-847 text until CS-847 merges: the handbook's "designed, not built" is true until then.

## Done when

- Each project's state on the Overview, System architecture, Shading and Browser compatibility tabs is generated from `work/` at build time, and the hand-kept waves paragraph is gone.
- The graphics API reads "WebGPU first; a WebGL 2 renderer is planned, with its seam built".
- The performance figures come from `bench/results` and from pinned runs in Dyno's results store, each cited by run ID with its date.
- The move to seven packages reaches the prose. The "one package" lede, the five dynamic imports that show "Not yet described", about 70 bare `src/` paths, and the `/proj` and `widgets/` names are fixed. The 13 code samples import by package name.
- Plan 5b: check its tasks against the code, and mark each built or remaining, citing the code (the owner, 2026-11-22: "Not sure; check").
- Each tab's "checked" date and status are updated (the chief of staff's call: a `checked` date on each tab's header, with a warning on drift; reversible).
- The review's other findings are fixed or listed with a reason.
