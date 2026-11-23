---
id: CS-1110
title: Does DrawOptions.underlay become a draw layer before beta.1?
kind: decision
state: done
created: 2026-11-23
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-23T22:42:29.734Z
answered_via: question-tool
answered_by: owner
---

## Question

Before beta.1's freeze, does the underlay boolean become a draw layer (layer, depth mode, order), with names shared with render features' slots?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Yes, replace the boolean.
- B. Keep underlay and add a no-depth flag.

Recommended: A.

## Answer

Open.
