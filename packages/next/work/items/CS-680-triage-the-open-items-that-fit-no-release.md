---
id: CS-680
title: Triage the open items that fit no release
kind: work
state: planned
created: 2026-11-17
project: CS-18
needs: [CS-686]
---

The owner, 2026-11-17: "i suspect a bunch of items in the work tree already are actually proposals that need to be moved to this shape, so take a look at that, too." A count that day: of 496 open items, 361 are needed by a release (7 of them still proposed, which blocks committed work) and 135 by none: 65 proposed, mostly "later" copies of design-document lists, and 70 planned, of which 48 were created by the plan migration on 2026-11-13, committed by migration rather than by the owner. hitld has no "later" state: an uncommitted idea is a signal that points at its design section, and a proposal is short-lived (CS-686).

## Done when

- Each of those items is, on the owner's word, committed into a milestone, kept as a proposal with the header CS-686 settles, or dropped with a reason that points at the design section that holds the idea.
- The 7 proposed items that committed work needs are committed or their needs removed, starting with CS-344 (CS-348 needs it) and the constraints of CS-423, CS-465 and CS-511.
- The owner sees them in small batches, grouped by project, in the chief of staff's digests, and the Work page's items-in-no-milestone list is short.

From the owner's release planning on 2026-11-17: `docs/decisions/2026-11-17-release-plan-and-parity.md`.
