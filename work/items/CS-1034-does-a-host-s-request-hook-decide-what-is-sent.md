---
id: CS-1034
title: Does a host's request hook decide what is sent after it rewrites the origin?
kind: decision
state: done
created: 2026-11-22
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-23T04:15:50.277Z
answered_via: question-tool
answered_by: owner
---

## Question

A host's request hook that moves a request to another origin (a mirror) now drops the source's headers. Keep that, or send what the hook returns?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. The hook decides: its returned request is sent as is, and only credentials with declared origins are re-checked against the new origin.
- B. Keep dropping headers on a rewrite to another origin.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
