---
id: CS-960
title: Which clock do content sources see?
kind: decision
state: done
created: 2026-11-22
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-22T20:39:29.128Z
answered_via: question-tool
answered_by: owner
---

## Question

The content-source seam runs on the engine's wall clock, while picks and camera records use the world's scene clock, and neither names an epoch or time scale. Which clock do sources see?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. The world's scene clock, with its epoch and time scale named, and wall time as a separate field.
- B. The engine's wall clock until CS-816, then decide.

Recommended: A.

## Answer

Open.
