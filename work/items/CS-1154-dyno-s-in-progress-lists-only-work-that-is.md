---
id: CS-1154
title: "Dyno's In progress lists only work that is running: no branch main has moved past, and a slow hitld read shown as slow"
kind: work
state: planned
created: 2026-11-23
project: CS-389
---

> **Committed by the owner (2026-11-23).** Source: the owner's screenshot of the Work view's In progress card. It listed four items, but only CS-1127 and CS-1152 were running. CS-951 was done and merged, and showed through a trial branch's leftover claim. CS-977 is paused after a partial merge, and its footnote said it was left out while the list still showed it. The card also warned that `hitld run status` couldn't be read; that read takes about two minutes on this machine (hitld #342). The upstream fix is hitld #585.

## Done when

- In progress lists an item only when a claim on a branch main hasn't moved past is backed by a dispatch in flight, or an executor running. A claim main has superseded (the item `done` on main, or a branch tip in main's history) is shown, if at all, as stale, under the footnote.
- The list and its footnote never disagree: an item the footnote leaves out isn't listed.
- A hitld read that's slow shows as slow, with its time so far, and isn't reported as unreadable. The card keeps the last good reading until a new one arrives.
- Tests cover a done item with a leftover branch, a partial merge, and a read that takes longer than the timeout.
