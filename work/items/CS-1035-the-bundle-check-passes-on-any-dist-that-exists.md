---
id: CS-1035
title: The bundle check passes on any dist/ that exists, and its "absent" checks have no control
kind: work
state: proposed
created: 2026-11-22
project: CS-199
---

> **Proposal.** Source: the Fable evidence review (`fable-review-evidence.md`, finding 7), 2026-11-22. Severity: Important. Land before: alpha.1. **Items:** CS-928, CS-612. Decider: owner.

## Done when

- Have the build write `dist/.build.json` (a hash of the package's `src/` and the commit); `checkBundle` recomputes the hash and exits 2 on a mismatch. Add controls: the series and "DAF/SPK" must be found in a lazy chunk of the globe page; `RENDERER_MODULES` must match at least one module of the globe page; fail with "can no longer tell" otherwise.
- The finding's evidence in the review is rechecked first, since the code may have moved.
