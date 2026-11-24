---
id: CS-338
title: Per-element overrides at scale, through the styling language
kind: work
state: planned
created: 2026-11-13
project: CS-196
needs: [CS-1108]
---

**Proposal** (CS-686). Source: later, a copy of the follow-up list in `docs/design/infrastructure-and-geoscience-capabilities.md`, capability 5, made by the 2026-11-13 plan migration. Why now: Committed work needs it: it is a constraint of CS-534 (Infrastructure and geoscience data shows in 2.0), so that milestone cannot be checked while this stays proposed. It also waits on CS-1108 (CS-266 was closed as superseded). Rough size: medium, a few related changes. Decider: the owner. Filed: 2026-11-13.

## Done when

Colour, transparency, visibility and emphasis for millions of elements over time, keyed by stable element ID and joined to each tile's features; the note wants the process-plant example before the API review settles it.

Also (2026-11-24, folded in from CS-1286 by the owner's yes): a host writes state in bulk for its own keys, about a million at a time, with no script loop per key. That means arrays of keys and values (a `setByKey`, or a bulk key-to-ID call and then a bulk write). Unknown keys are reported, not dropped silently. It's measured in Dyno, with a run ID cited.

Detail: `docs/design/infrastructure-and-geoscience-capabilities.md`, capability 5.

## Note (2026-11-23)

Committed and reshaped (2026-11-23, CS-1108 A): overrides at scale are per-feature state columns that styles read, not an override table.
