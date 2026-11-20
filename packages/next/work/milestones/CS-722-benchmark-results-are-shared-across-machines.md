---
id: CS-722
title: Benchmark results are shared across machines, and dyno is one command
kind: milestone
state: planned
created: 2026-11-19
project: CS-389
outcome: Every run records its device, configuration and machine state; results from every machine sit in storage dyno manages, and Trends, charts and studies compare devices; and dyno is one non-interactive command that people and hitld call.
done_when:
  - "c1: a dev run from a worktree records purpose, item, study, worktree, base, machine, servedFrom and ID. `--purpose baseline` is refused from a dirty tree or a feature branch. Two runs started together run one after the other."
  - "c2: `npx dyno` covers what `cli.mjs` and `bench/run.mjs` do. Every command prints JSON with `api_version` under `--json`. `dyno status --json` reports busy, waiting-for-quiet or quiet. The old entry points still work."
  - "c3: a run on any device records its device, configuration and state. A power-source switch changes neither the device nor its Trends series (tested). No identity field holds a host name, user name, serial number or network address (tested)."
  - "c4: runs made on two devices appear in each other's Dyno after one sync, with screenshots fetched when opened. No object is ever rewritten. Uploads never run during a measurement (tested; the owner checks once on two real devices)."
  - "c5: no credential, endpoint or bucket name appears in any output, log, result or repository file (a canary test). A removed device's later objects are ignored, and its keys are revoked by the checklist."
  - "c6: every result carries a label, confidential by default. `storage status` reports use against the budget per namespace. Nothing is deleted without `--apply`, nothing pinned is deleted, and every deletion leaves a tombstone."
  - "c7: Trends, Compare, Alerts and Overview keep devices apart and facet by device and hardware class. Overview names the devices when they disagree. Compare refuses a timing verdict across devices."
  - "c8: the design `docs/design/benchmark-devices-and-sharing.md` is merged, and the filed items and clauses match it."
  - "c9: a study made with a kind and its instruments reads back with its verdict (CS-404). A study run on several devices pools them by hardware class, and each verdict lists, per class, measured or can't tell, never \"measured\" for a class without runs (CS-739)."
constraints: [CS-390 c1, CS-721 c2, CS-733 c3, CS-734 c4, CS-735 c5, CS-736 c6, CS-737 c6, CS-738 c7, CS-717 c8, CS-404 c9, CS-739 c9]
check: "demo a baseline run on two devices, synced, read side by side in Trends and Overview"
---

## Done when

The clauses, the check and each constraint's clause are in the front matter, from CS-717's design (section 10), filed 2026-11-19. Independent check: a fresh reviewer reads the design against the filed items and clauses. The owner makes a baseline run on two devices, syncs, and reads both in Trends and Overview by clicking around.

## Notes

The owner, 2026-11-19: "let's do the 717 design and then take the output from that and the other cli stuff and make a new milestone for them for alpha." It joins 2.0.0-alpha.1 (CS-530).

- **Its items so far:** CS-390, run identity and the run lock, which CS-721 needs and the design's `machine` field builds on. CS-390 also stays in CS-478. Then CS-717, the design, and CS-721, the dyno command.
- **Joined 2026-11-19:** CS-733 to CS-738, CS-717's build items. Decisions they wait on: CS-726 (where results live, and spend), CS-727 (keys and remote reading), CS-728 (default classification), CS-730 (bucket client or dependency), CS-731 (whether recordings upload).
- **Studies join alpha.1** (the owner's answer to CS-732, B): CS-404 and CS-739 are in c9. CS-404 also stays in CS-480. CS-740 needs CS-394 and so CS-393, both in CS-479, and waits on the owner before it joins. If CS-726 is answered C, CS-735 needs CS-406 (in CS-481).
- **Not in it:** CS-718, hitld's side, which is external and would hold alpha on another project.
