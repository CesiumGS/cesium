---
id: CS-717
title: "Design: one benchmark database across machines, with device fingerprints, multi-device views and transportability"
kind: work
state: planned
created: 2026-11-19
project: CS-389
touches: [docs/design/benchmark-devices-and-sharing.md]
---

The owner, 2026-11-19: share benchmark results across machines through hitld's private store, so that one benchmark database serves every machine consistently. Tag each run with a device fingerprint and its configuration, and make Trends, charts, experiments and the rest multi-device aware. Design it first, including the causal piece.

What exists today:

- Each run records an `environment` and the GPU adapter's info (`bench/suite/suite.ts`, `bench/run.mjs`).
- `machineKey` (`bench/suite/reuse.mjs`) hashes the hardware, the configuration (OS, browser, flags, viewport, driver) and the power state into one key. So a switch between battery and AC starts a new "machine", and a series splits. On 2026-11-19 the power source switched 137 times.
- Planned: CS-390 adds a `machine` field to every run, CS-407 runs on a remote machine that lands in the Mac's store, CS-408 adds device aliases and hardware classes, and CS-323 adds dedicated runners. CS-404 records machine state with each run and treats the device as a stratum in a study.

Model: the most capable one (design-heavy).

## Done when

`docs/design/benchmark-devices-and-sharing.md` settles each of these, and asks the owner what isn't the design's to decide, as decision items:

- **Identity in three parts:**
  - the *device*: a stable hardware fingerprint (CPU, cores, memory, GPU vendor, architecture and description, display) with a friendly alias, and nothing that identifies a person or a serial number;
  - the *configuration*: OS, browser and driver versions, flags, viewport, pixel ratio, power plan, engine build;
  - the *state* during the run: power source, battery, load average, thermal state, other GPU users.

  What makes two runs comparable, and what only gets recorded. How `machineKey` migrates, and how existing runs read.
- **Sharing:** each device writes its own files in its own folder in the private store, one file per run and never rewritten, so syncing never conflicts. Large artifacts (images, traces) are stored by content hash and fetched when opened. Retention follows CS-404's rule. Dyno reads the union of all shards. What works before hitld's user-data area exists (CS-718), and how it moves over.
- **Size, since the store is a git repository on GitHub** (the owner, 2026-11-19):
  - *What we make:* measured 2026-11-20 on one machine, a run summary is about 9 KB and an HTML report about 25 KB (regenerable, so not synced). The inspector's recordings, mostly PNG screenshots (1,106 of them), came to 985 MB in a week.
  - *GitHub's limits:* files over 100 MiB are blocked, repositories should stay under about 1 GB and strongly under 5 GB, and Git LFS's free tier is 10 GiB of storage and of bandwidth.
  - *Git's own behavior:* history keeps every version, so deleting old runs doesn't shrink the repository. Encrypted files don't delta-compress, so a file that's rewritten is stored whole each time. Hence one immutable file per run.
  - *So:* the design splits records from blobs. Run records, summaries and study files go in the store's git. Images, traces and recordings go to a content-addressed, encrypted blob backend outside git history, such as Git LFS, an S3-compatible bucket, or the device that made them, fetched through the hub (CS-406). The design picks the backend, sets a size budget, and says what syncs by default and what is fetched when opened.
- **Multi-device views:** a Trends series is per device and configuration. Charts filter and facet by device, hardware class (CS-408) and configuration. Baselines and alerts are per device. Normalization across hardware classes. What Overview shows when several devices disagree.
- **Experiments:** device as a stratum in a study (CS-404). A study run on several devices pools them in the hierarchical model, and each verdict names the hardware it holds for.
- **The causal piece:**
  - A diagram of what moves a measurement: the change under test, the device, the configuration and the state.
  - Which of those the design blocks (pairing on one device, interleaving), which it records and adjusts for (state), and which modify the effect (device class).
  - Transportability: when a result on one hardware class carries to another, what must be measured on the target class to carry it, and how a verdict says "can't tell".
- **Privacy:** fingerprints and run data live in the private store, never in the repository or the handbook, and the alias is what's shown.
- **Follow-up items:** the build items it implies, with needs, listed for the main session to file. That includes how CS-390's `machine` field takes this shape.
