---
id: CS-1163
title: Release 2.0.0-alpha.2
kind: work
state: planned
created: 2026-11-23
project: CS-18
needs: [CS-530, CS-420, CS-457, CS-421, CS-422, CS-456, CS-509, CS-462, CS-464, CS-463, CS-461, CS-465, CS-423]
release: 2.0.0-alpha.2
---

## Done when

- `hitld release make` has made 2.0.0-alpha.2, with its record and tag, on the owner's word, and every gate this item needs was met first.

## Notes

A release in the alpha series (the owner's answer to CS-1157, 2026-11-23): the approved API and other bodies: the public API review and its changes, the Earth and the Moon with their skies and cameras, the frames follow-ups, B-reps and measurement, and one time model. A host can build on it; the API may still change. The grouping follows the item graph (each alpha needs nothing from a later one) and is the chief of staff's call, and cheap to change: move a milestone between alphas by editing the needs.

Regrouped on 2026-11-24, after the owner, 2026-11-24: "i think worker mode and jobs needs to come up, i don't want to waste work doing things on the main thread and then reimplementing it on the jobs system". This alpha is now the approved API, off the main thread: the public API review and its changes, worker mode, the job system's ports and the thread defaults. Worker mode builds on the review (the façade, CS-108, needs the reshaped reads and writes), so they land together, and everything after alpha.1 is built on Jobs. The chief of staff's call, and cheap to change.
