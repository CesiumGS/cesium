---
id: CS-368
title: `Engine.queries` takes the application's backends
kind: work
status: Planned
created: 2026-11-13
project: CS-8
---

An application or a second renderer can supply its own query backends (owner, 2026-11-13: yes).

## Done when

- In `test/queriesEngine.test.ts`, an engine given a stub backend answers `castRays` through it.

Detail: `docs/design/investigations-2026-11-13.md`, "Decisions (owner, 2026-11-13)", item 5.
