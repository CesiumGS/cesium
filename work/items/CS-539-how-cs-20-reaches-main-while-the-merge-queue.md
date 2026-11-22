---
id: CS-539
title: How CS-20 reaches main while the merge queue cannot verify it
kind: decision
state: done
created: 2026-11-15
project: CS-8
decider: owner
answer: "B. Owner merges by hand: The owner reviews the branch and merges it outside the queue, after running the full suite in the main checkout."
rationale: merge by hand
answered_at: 2026-11-16T03:31:46.502Z
answered_via: main-session
answered_by: owner
---

## Question

How should CS-20 reach main, given that the merge queue cannot verify it again on the current base?

CS-20 is done on branch worktree-agent-ada0695bdceea7221 at 837dd20bfa, and its fast checks (typecheck, work check) pass when run by hand. The first hitld merge rejected it as missing because of a malformed report line, and the second failed a later stage (suite or burn-in, reason lost) and then crashed: the ledger event verified-fail-CS-20-91753cbba33c already exists, because the queue keys it by item and base commit. Until main moves or HITLd changes that key, every merge run that fails CS-20 crashes the same way. A likely cause of the failure is test/volumes.test.ts, which fails to load on the base commit too (a missing generated engine shader), but that is not confirmed. CS-20 is on the critical path and unblocks 44 items.

Rule basis: blast-radius. Reversibility: two-way.

## Options and recommendation

- A. Wait for a HITLd fix: CS-20 stays queued. The event-ID collision is reported as a HITLd defect, and the orchestrator runs hitld merge again on the release that fixes it. (cost: CS-20 and the 44 items it unblocks wait for a HITLd release.)
- B. Owner merges by hand: The owner reviews the branch and merges it outside the queue, after running the full suite in the main checkout. (cost: No queue evidence or trust record for this merge, and the suite failure's cause stays unknown until someone runs it.)

Recommended: Wait for a HITLd fix. This is a test run of HITLd, so the collision is the finding, and a hand merge would skip the queue's suite check while its failure is unexplained.

If unanswered by 2026-11-17T17:00:00Z: Wait for a HITLd fix.

## Answer

Recorded in the front matter once answered.
