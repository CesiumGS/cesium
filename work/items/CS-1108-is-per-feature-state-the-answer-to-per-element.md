---
id: CS-1108
title: Is per-feature state the answer to per-element overrides, with no separate override table?
kind: decision
state: done
created: 2026-11-23
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-23T22:41:47.437Z
answered_via: question-tool
answered_by: owner
---

## Question

Styling's per-element overrides (CS-266): state columns keyed by stable ID that styles read, or a fixed override table?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. State columns that styles read; the host builds its override table on them.
- B. A fixed override table applied after the style.
- C. Both.

Recommended: A.

## Answer

Open.
