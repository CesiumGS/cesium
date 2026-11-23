---
id: CS-1150
title: Is the content-name grammar a character class with no / and no @? (revisits CS-1148)
kind: decision
state: done
created: 2026-11-23
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-23T23:57:23.887Z
answered_via: question-tool
answered_by: owner
---

## Question

CS-1148 A refuses @ and a host-and-slash first part, but a path without its leading slash still fits, and looks-like-a-host is a judgment.

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. 1 to 128 characters from ASCII letters, digits and . _ ~ : + -, with no / and no @; parts joined with :.
- B. CS-1148 A as worded, with a host test.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
