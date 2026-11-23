---
id: CS-1127
title: Dyno's headless runner seeds the ion token into the page at run time, never into a build, a URL or a log
kind: work
state: planned
created: 2026-11-23
project: CS-199
needs: [CS-1126]
---

> **Committed by the owner (2026-11-23), through CS-1126 A.** Why: both nightlies of 2026-11-23 had 88 invalid runs, every one needing an ion token, because the headless runner serves a production build and seeds none.

## Done when

- The headless runner reads the token at run time, from the root `.env.local` or the login Keychain, and seeds it into each page's sessionStorage with an init script before the page loads.
- The token never enters a build, a URL, a result file, a screenshot, a log or a console message. A test plants a marker token and searches every output for it.
- Without a token, the runner refuses the ion scenes by name, or leaves them out with a warning, rather than recording invalid runs (with the earlier proposal on refusing).
- A one-scene run of an ion scene comes out valid in a clean worktree.
