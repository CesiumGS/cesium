---
id: CS-1126
title: How do headless Dyno runs get the ion token?
kind: decision
state: done
created: 2026-11-23
project: CS-199
decider: owner
answer: A
answered_at: 2026-11-23T22:56:29.215Z
answered_via: question-tool
answered_by: owner
---

## Question

A headless dyno suite run serves a frozen production build, which never contains the token by design, and the runner seeds none, so every ion scene comes out invalid. How should headless runs get it?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. The runner reads it at run time from .env.local or the Keychain and seeds it into the page's sessionStorage with an init script; never into the build, a URL or a log. Meanwhile ion scenes are left out of the nightly.
- B. Run the nightly with --dev.
- C. Leave ion scenes out.

Recommended: A.

## Answer

Open.
