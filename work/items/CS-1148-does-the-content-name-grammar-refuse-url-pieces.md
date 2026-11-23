---
id: CS-1148
title: Does the content-name grammar refuse URL pieces?
kind: decision
state: done
created: 2026-11-23
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-23T23:44:07.815Z
answered_via: question-tool
answered_by: owner
---

## Question

The content-name grammar (CS-1101 A) still accepts a host and path, a path without its leading slash, and user:pass@host.

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Tighten it: refuse @, and refuse a first part that looks like a host followed by a slash.
- B. Keep it, and reword the note and the handbook.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
