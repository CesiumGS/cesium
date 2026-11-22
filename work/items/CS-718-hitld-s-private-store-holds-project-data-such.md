---
id: CS-718
title: "hitld cites dyno's benchmark results by reference, reading them through dyno's commands"
kind: external
state: planned
created: 2026-11-19
project: CS-389
waiting_on: "human-in-the-lead: the measurement-tool design (HITLD-609), per arobison/human-in-the-lead#363"
---

## Waiting on

human-in-the-lead's private store holds the tracker's private records, encrypted per device and synced through a private remote. CS-717's design needs a project-owned data area in it, synced across a person's machines, for benchmark runs:

- per-device append-only shards;
- large files by content hash, fetched when opened;
- a size budget;
- retention the project controls.

Filed as arobison/human-in-the-lead#363 (2026-11-19). Until it ships, CS-717 designs a stop-gap.

Re-scoped 2026-11-20 after hitld's reply on #363. hitld won't add a data area to its private store for now (HITLD-623; the data area is HITLD-622, after v0.1.0). Instead dyno owns benchmark storage (CS-717, CS-721), and hitld keeps references to dyno's results and reads them through dyno's commands. This item now waits on that side: hitld's measurement-tool design (HITLD-609).
