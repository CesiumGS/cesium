---
id: CS-718
title: hitld's private store holds project data, such as benchmark runs, synced across a person's machines
kind: external
state: planned
created: 2026-11-19
project: CS-389
waiting_on: "human-in-the-lead: a user-data area in the private store (arobison/human-in-the-lead#363)"
---

## Waiting on

human-in-the-lead's private store holds the tracker's private records, encrypted per device and synced through a private remote. CS-717's design needs a project-owned data area in it, synced across a person's machines, for benchmark runs:

- per-device append-only shards;
- large files by content hash, fetched when opened;
- a size budget;
- retention the project controls.

Filed as arobison/human-in-the-lead#363 (2026-11-19). Until it ships, CS-717 designs a stop-gap.
