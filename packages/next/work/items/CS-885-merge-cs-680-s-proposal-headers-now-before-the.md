---
id: CS-885
title: Merge CS-680's proposal headers now, before the owner's batch review
kind: decision
state: planned
created: 2026-11-21
project: CS-18
decider: owner
---

## Question

Merge CS-680's branch, which writes the CS-686 proposal header into the 100 proposed items that had none, into main now? CS-680 stays in progress, and its done-when (the owner's review of the proposals in batches) is still to come. With the headers on main, Dyno's Work tab and the digests show every proposal with its source, size and date.

100 proposed items lacked a **Proposal** paragraph: 72 with no Source at all, and 28 with a Source paragraph but no marker, which Dyno's proposalHeaderOf counts as headerless. Each now carries the header; none lacks one. The diff only adds header paragraphs (172 insertions) and turns 28 Source lines into the marked form (28 one-line deletions); no state, needs, milestone or other field changes, apart from CS-680's own claim. The executor's calls (reversible): Source wording for copies made by the 2026-11-13 plan migration, and for items the owner deferred; rough sizes are its judgment from title and scope, not measured; Filed is each item's created date. Its recommendations for the owner's review, through the chief of staff: commit 21 items that are constraints of planned milestones (CS-375, CS-376 and CS-377 to CS-465; CS-119 to CS-423; CS-512, CS-514 and CS-515 to CS-511; CS-337, CS-338, CS-340, CS-342 and CS-343 to CS-534; CS-344, CS-345, CS-346, CS-347 and CS-349 to CS-535), with caveats: CS-511, CS-534 and CS-535 gate no release, CS-346 was deferred by the owner yet is a CS-535 constraint, and CS-344 unblocks CS-348; and hold the other 51, which no release names. No drops. The full list is cs-680-batch-list.md in the shared notes. Checked by the orchestrator on main eed39bb0b2 (replay 7fb9dbadfd of fcc27bf2b8, patch identical): only files under packages/next/work/items and milestones change; markdownlint with the root config 0 on every changed file; hitld work check 882 files; staleNames 0; every removed line is a Source line given its marker.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge the headers now: The orchestrator fast-forwards main to the checked replay (replaying again if main moved), regenerates the views and logs the merge; CS-680 stays in progress until the owner's batch review, and its batches come through the chief of staff.
- B. Hold until the review: Nothing merges yet; the headers stay on CS-680's branch until the owner has reviewed the batches, then merge with the item's close.

Recommended: Merge the headers now. It changes only proposal text, every check passes, and the owner reviews the batches more easily with the headers on main, where Dyno shows them.

If unanswered by 2026-11-24T12:00:00Z: Hold until the review.

## Answer

Recorded in the front matter once answered.
