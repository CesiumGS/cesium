---
id: CS-1287
title: Interval and IntervalSet's loose ends before the API review
kind: work
state: proposed
created: 2026-11-24
project: CS-647
needs: [CS-649]
---

> **Proposal.** Source: CS-649's review (no Important; 20,000 random cases matched a brute-force reference), relayed by orch-11 (2026-11-24). Why now: these are loose ends to settle before the API review freezes `@cesium/time`'s interval types. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- `Interval.startCut` and `stopCut` return a `Cut` type that `@cesium/time` doesn't export. Either export it (with `npm run surface`), or make the methods internal.
- `IntervalSet.intervals` is frozen, as its docs already say it's immutable.
- `valueAt` can't tell "no interval" from undefined data, so its docs point to `contains` and `find`.
- The docs say that ends built from UTC or TDB can differ from the same moment given in TT by one unit in the last place. So touching intervals built in different time scales may show a gap or an overlap.
- The comment "one ulp" in `test/intervalSet.test.ts` says two, and the docs say `===` where they say "bitwise equal".
- Named tests cover: infinite ends in a set, a closed single point in a set, intersection with an empty set, `find(NaN)` and NaN data.
- The docs note that `IntervalSet.of` is quadratic when many intervals overlap.
