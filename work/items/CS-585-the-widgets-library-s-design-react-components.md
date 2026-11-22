---
id: CS-585
title: "The widgets library's design: React components on StrataKit, DOM wrappers, and the Viewer composed from them"
kind: work
state: planned
created: 2026-11-17
project: CS-584
---

## Done when

- A reviewed design for a widgets package of React components built on StrataKit, with thin DOM wrappers (`attachX(element, engine)`) that mount them in pages without React.
- React is a peer dependency of the widgets package only; core never imports it, and `test/importBoundary.test.ts` says so.
- It lists each 1.x widget's job and the 2.0 widget that does it, and says how the Viewer is composed from them.

From the owner's release planning on 2026-11-17: `docs/decisions/2026-11-17-release-plan-and-parity.md`.
