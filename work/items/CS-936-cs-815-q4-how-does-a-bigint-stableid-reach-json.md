---
id: CS-936
title: "CS-815 Q4: how does a bigint StableId reach JSON?"
kind: decision
state: done
created: 2026-11-22
project: CS-437
decider: owner
answer: A
answered_at: 2026-11-22T17:34:53.943Z
answered_via: question-tool
answered_by: owner
---

## Question

`JSON.stringify` throws on a `PickResult` or `RayAnswer` that holds a bigint `StableId`. How should a stable ID reach JSON?

From CS-815's executor, in CS-934's context (2026-11-22). CS-898's answer made 64-bit property values `bigint`, so the two should agree.

## Options and recommendation

- A. Keep `bigint`, and export `stableIdToHex(id)` and `parseStableId(text)`, using 16 hex digits.
- B. Make `StableId` a 16-digit hex string. (Cost: no arithmetic or ordering as numbers, and it disagrees with CS-898's `bigint` property values.)
- C. Keep `bigint` and add a `toJSON` to the records. (Cost: a hidden conversion that callers can't see.)

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
