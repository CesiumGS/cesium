---
id: CS-718
title: hitld's private store holds project data, such as benchmark runs, synced across a person's machines
kind: external
state: planned
created: 2026-11-19
project: CS-389
waiting_on: "human-in-the-lead: a user-data area in the private store (issue not filed yet)"
---

## Waiting on

human-in-the-lead's private store holds the tracker's private records, encrypted per device and synced through a private remote. CS-717's design needs a project-owned data area in it, synced across a person's machines, for benchmark runs:

- per-device append-only shards;
- large files by content hash, fetched when opened;
- a size budget;
- retention the project controls.

To be filed as a feature request on human-in-the-lead once the owner approves the text. Until then, CS-717 designs a stop-gap.
