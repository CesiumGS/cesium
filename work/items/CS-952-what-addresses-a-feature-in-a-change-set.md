---
id: CS-952
title: What addresses a feature in a change set?
kind: decision
state: done
created: 2026-11-22
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-22T19:17:44.662Z
answered_via: question-tool
answered_by: owner
---

## Question

A stable ID is a one-way hash, so a source or server can't turn one back into its own key. What addresses a feature in a change set?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. The source's own key, with the engine's stable ID beside it.
- B. The hashed ID only, with the content's ID and the hash published so others can repeat it.

Recommended: A.

## Answer

Open.
