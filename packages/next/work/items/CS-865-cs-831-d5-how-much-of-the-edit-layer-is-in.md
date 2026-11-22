---
id: CS-865
title: "CS-831 D5: how much of the edit layer is in alpha.1?"
kind: decision
state: done
created: 2026-11-21
project: CS-579
decider: owner
answer: A
answered_at: 2026-11-22T06:05:54.659Z
answered_via: question-tool
answered_by: owner
---

## Question

How much of the edit layer is in alpha.1?

From CS-831's design (`docs/design/editing.md`, "Decisions for the owner"), asked by the chief of staff on 2026-11-21.

## Options and recommendation

- A. The types and rules, plus the edit layer's hide, replace and insert built in CS-552's core, with its public API experimental. Sessions, writers and presence come after. (cost: more in alpha.1.)
- B. Types and rules only, the edit layer built later. (cost: every query path changes later.)

Recommended: A, the design's recommendation.

## Answer

The owner, 2026-11-21: A. Types, rules, and hide, replace and insert built in the seam's core (CS-847), with experimental public API.
