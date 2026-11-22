---
id: CS-531
title: Release 2.0.0-beta.1
kind: work
state: planned
created: 2026-11-15
project: CS-18
needs: [CS-527, CS-530, CS-415, CS-417, CS-418, CS-419, CS-420, CS-457, CS-421, CS-422, CS-456, CS-509, CS-462, CS-464, CS-424, CS-425, CS-426, CS-427, CS-487, CS-488, CS-489, CS-490, CS-492, CS-494, CS-473, CS-475, CS-476, CS-498, CS-499, CS-500, CS-501, CS-460, CS-469, CS-595, CS-641, CS-646, CS-653, CS-657, CS-668, CS-675, CS-463, CS-461, CS-505, CS-493, CS-471, CS-423, CS-465, CS-474, CS-495, CS-467, CS-534, CS-504]
release: 2.0.0-beta.1
---

## Done when

- `hitld release make` has made 2.0.0-beta.1, with its record and tag, on the owner's word, and every gate this item needs was met first.

## Notes

The release item for 2.0.0-beta.1 (the owner's answer to CS-455, the release ladder): feature complete for 2.0; the API changes only through a review the owner approves. Which milestones it needs is CS-527; once answered, they join its needs.

On 2026-11-18 beta.1 also needs CS-463 (CS-509, public Jobs API, waits on it) and CS-461 (the worker-mode spike CS-99, which worker mode needs) (owner, 2026-11-18, fixing the release crossings CS-685 found).

CS-505 (issues 2.0 found are filed and answered) joined on 2026-11-22, on the owner's word in a sweep of milestones that were in no release.

CS-493 (planets show as points, then disks) joined on 2026-11-22, in the same sweep.

CS-471, CS-423, CS-465, CS-474, CS-495, CS-467, CS-534 and CS-504 moved here from 2.0.0 on 2026-11-22. On the owner's word, all eight change or add public API that freezes at beta.1: a renamed `lodTransitions` value, the default thread, the tick budget options, what shading reads under exaggeration, the B-rep extension format, and new view, query and styling options.
