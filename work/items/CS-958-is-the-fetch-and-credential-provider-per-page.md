---
id: CS-958
title: Is the fetch and credential provider per page or per engine?
kind: decision
state: done
created: 2026-11-22
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-22T20:39:10.329Z
answered_via: question-tool
answered_by: owner
---

## Question

The fetch and credential provider (CS-809) is per page, so two engines on one page can't use different credentials. Per page or per engine?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Per engine, defaulting to the page's.
- B. Per page, as built.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
