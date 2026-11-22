---
id: CS-957
title: Is the scene item part of a stable ID?
kind: decision
state: done
created: 2026-11-22
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-22T20:39:01.308Z
answered_via: question-tool
answered_by: owner
---

## Question

CS-832's design makes an ID per item (per placement), but the editing design's per-content edit layer needs an ID that stays the same for a feature wherever it's placed. Is the scene item part of a stable ID?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Two IDs: a feature ID per content, and an instance ID that adds the placement. Edits and metadata name the feature; picks report both.
- B. Per item only, as CS-832 has it.
- C. Per content only.

Recommended: A.

## Answer

Open.
