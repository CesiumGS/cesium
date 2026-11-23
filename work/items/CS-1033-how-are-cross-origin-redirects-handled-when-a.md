---
id: CS-1033
title: How are cross-origin redirects handled when a source attaches its own headers?
kind: decision
state: done
created: 2026-11-22
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-23T04:15:22.353Z
answered_via: question-tool
answered_by: owner
---

## Question

fetch strips only Authorization and cookies on a cross-origin hop, so a custom source header follows an open redirect on the trusted server to another origin. How are redirects handled?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Only when a non-Authorization source header is attached: in Node, follow redirects by hand and re-check each hop's origin; in browsers, refuse the redirect.
- B. Always refuse redirects when source headers are attached.
- C. Document it as a known limit.

Recommended: A.

## Answer

Open.
