---
id: CS-1141
title: What is the styling color model?
kind: decision
state: done
created: 2026-11-23
project: CS-10
decider: owner
answer: A
answered_at: 2026-11-23T23:30:15.856Z
answered_via: question-tool
answered_by: owner
---

## Question

Do CSS Color 4 spaces go into the styling spec's profile, and which space is StyleOutputs.color in?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Styles write any CSS Color 4 space; the IR converts at compile time; StyleOutputs.color is linear-light sRGB with straight alpha.
- B. sRGB only.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
