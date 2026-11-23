---
id: CS-1096
title: How does CS-921's center term handle values past 2³⁰ units?
kind: decision
state: done
created: 2026-11-23
project: CS-10
decider: owner
answer: A
answered_at: 2026-11-23T20:29:14.781Z
answered_via: question-tool
answered_by: owner
---

## Question

CS-921's round 3 falls back to float32 past 2³⁰ units (about 1.07 × 10⁹ m) so F(c) − eye can't wrap, losing exactness from 1.07 to 2.1 × 10⁹ m: at the Sun–Earth L1 and L2 points a center 62.5 m from the eye comes out as 0. How should it handle values past 2³⁰ units? (review-CS-921-r3.md)

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Fall back only on overflow: detect int32 overflow in tg_diff with a sign test, and fall back to float32 for that term only; exact to 2³¹ units, no wrap.
- B. Keep round 3's fallback at 2³⁰ units.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
