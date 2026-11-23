---
id: CS-1087
title: Where does a content's identity come from?
kind: decision
state: done
created: 2026-11-22
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-23T06:26:02.422Z
answered_via: question-tool
answered_by: owner
---

## Question

From the architecture review of CS-847: today the engine derives a content's identity from its request URL and guesses which parts are identity, secret or noise. Where should identity come from?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. A name its host or resolver declares; a plain URL with none falls back to a digest of the URL under CS-1080's rule. No URL text enters an ID, a change set or a message.
- B. Derived from the URL and options, as built.
- C. A name is required for anything saved or written; an undeclared URL gets IDs for the session only.

Recommended: A.

## Answer

Open.
