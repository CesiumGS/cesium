---
id: CS-790
title: A Lab parity page draws through a compiled curvilinear route, so IR changes are checked in pixels
kind: work
state: proposed
created: 2026-11-21
project: CS-10
needs: [CS-53]
touches: [packages/next/bench/**, packages/next/bench/suite/commands/lab.mjs, packages/next/test]
---

CS-53 moved every transform pass onto Cesium IR, with golden fixtures that pin every number bit for bit. One of its done-when bullets, browser parity, couldn't be shown: no parity suite draws through a compiled transform route. Routes compile only under a curvilinear map, and no suite places one. CS-54 and every later IR item will have the same gap.

**Proposal** (CS-686). Source: CS-53's report, relayed by orch-11, 2026-11-21. Why now: it's the only way to see IR changes in pixels, and CS-54 (routes on both emitters) is next. Rough size: small to medium. Decider: the executor, for the scene. Filed: 2026-11-21.

## Done when

- A Lab parity page places a curvilinear map (exaggeration or UTM) and draws through a compiled route, with both exact and linear normals. `dyno lab --list` lists it.
- Its baseline is taken on main and compared against the previous commit and a base commit, as AGENTS.md asks for rendering changes. Any pixel difference is explained.
- Run on a server of the executor's own, never the owner's 5190 or 5199. Never a bare `npx dyno`.
