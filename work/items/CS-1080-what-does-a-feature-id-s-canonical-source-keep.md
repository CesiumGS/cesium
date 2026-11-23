---
id: CS-1080
title: What does a feature ID's canonical source keep of a URL's query when its kind declares nothing?
kind: decision
state: done
created: 2026-11-22
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-23T05:01:25.574Z
answered_via: question-tool
answered_by: owner
---

## Question

Feature IDs are saved across runs. For a URL whose content kind declares nothing about its query, the canonical source drops the query except ion's v, so ?layer=roads and ?layer=buildings share feature IDs. What does it keep?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. The whole query, minus known credential and signature parameters (access_token, key, signatures and the like).
- B. Drop the query unless the kind declares parameters, as today.
- C. Keep the whole query.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
