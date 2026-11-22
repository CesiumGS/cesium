---
id: CS-726
title: Where does dyno store shared benchmark results, and what may it spend?
kind: decision
state: done
created: 2026-11-19
project: CS-389
decider: owner
answer: A
answered_at: 2026-11-20T04:31:13.985Z
answered_via: question-tool
answered_by: owner
---

## Question

dyno owns benchmark storage (arobison/human-in-the-lead#363). Where do the shared records and blobs live, and what spend is approved?

From CS-717's design, filed by the main session on 2026-11-19 for milestone CS-722 (the owner: take the design's output and make an alpha milestone). The design is `docs/design/benchmark-devices-and-sharing.md` (CS-717), section 9.

## Options and recommendation

- A. A hosted S3-compatible bucket: prefix-scoped write keys that can't delete; it works from every device and from enabled remote sessions. About 50 GB at list prices of roughly 0.6 to 2.3 US cents per GB-month is under about a dollar a month (egress free at some providers, about 9 cents per GB at others; confirm at the source). One more account and trust boundary.
- B. A self-hosted S3-compatible server: no spend; the owner keeps it up and backed up, and remote sessions need it reachable from outside.
- C. Blobs held on the device that made them, fetched through the hub (CS-406): no spend; a blob is readable only while its device is on and local, with no cloud reach. Pulls CS-406 into alpha.1, and records still need a shared home.
- D. Git LFS: free to 10 GiB of storage and bandwidth, but LFS objects can't be deleted without deleting the repository, so retention and budgets fail.

Recommended: A, with the design's budgets as the spend appetite (runs 2 GB, events 100 MB, assets 20 GB, recordings 30 GB).

Reversibility: two-way: the layout is backend-neutral, and moving is a copy.

## Answer

A, a hosted S3-compatible bucket, with the design's budgets as the spend appetite (owner, 2026-11-19).
