---
id: CS-1147
title: May a derived content name leave the engine?
kind: decision
state: done
created: 2026-11-23
project: CS-191
decider: owner
answer: "E: derived names stay local"
answered_at: 2026-11-23T23:36:19.895Z
answered_via: question-tool
answered_by: owner
---

## Question

A derived name (CS-1100 A) is an unkeyed MurmurHash3 digest of the whole URL, undeclared tokens included, and change sets carry names to peers, so a weak secret could be guessed against it.

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Keep it and document that an undeclared secret must be high-entropy or declared.
- B. SHA-256.
- C. A keyed hash with a per-engine key.
- D. Refuse to derive a name when the URL holds undeclared query parameters.
- E. Derived names stay local: only declared names leave the engine; sharing change sets with peers or a server needs a declared name, and the engine refuses to send one for undeclared content; the fast hash stays.

Recommended: E.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
