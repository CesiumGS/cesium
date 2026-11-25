---
id: CS-1354
title: Merge CS-649, intervals and interval sets in /time
kind: decision
state: planned
created: 2026-11-25
project: CS-647
decider: owner
---

## Question

Merge CS-649 into main? @cesium/time gains Interval and IntervalSet on Instant: open and closed ends, data per interval, lookup at an instant, union and intersection, exact in Instant's time scales.

Ends are two instants plus a closed flag each, compared as cuts (a TT value plus just-before or just-after), so touching and open ends need no special cases. Where intervals overlap, data merges in input order and the later wins by default; touching pieces with equal data join; unbounded ends use infinite TT; NaN and a start after its stop throw; lookup is a binary search. Exactness holds because Instant stores one float64 of TT and the set code only compares, never converts; leap seconds are handled once, when an Instant is built. A Sonnet review found no Important: a differential fuzz of 20,000 random cases of of, union and intersection against a brute-force oracle gave no mismatch. Its Minors are filed as CS-1287 (Interval and IntervalSet's loose ends before the API review), among them that startCut and stopCut return a Cut type @cesium/time doesn't export. Owner paths: packages/time/src/index.ts (the two exports and four option types) and api/surface.txt (12 lines), as the done-when asks. Checked by the orchestrator on the replay 64a68c2411 (patch identical outside work/). Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: public-commitment. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with merge-item.sh. CS-1287 can start after it.
- B. B. Hold it: Nothing merges; /time has no intervals.

Recommended: A. Merge it. It meets the done-when, the fuzz found no mismatch, and the Minors are filed.

If unanswered by 2026-11-27T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
