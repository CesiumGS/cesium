---
id: CS-262
title: "Real-time tracks: cull small shadow casters, and one glTF asset in several worlds"
kind: work
status: Planned
created: 2026-11-13
project: CS-190
---

## Done when

Cascades skip casters too small to matter (154 ms of cascades against a 42 ms opaque pass at 100,000 instances), and a glTF asset can be placed in more than one world (with the asset cache).

Detail: `docs/history/real-time-tracks-milestone.md`.
