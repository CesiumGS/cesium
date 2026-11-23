---
id: CS-1000
title: How is @cesium/core/internal, the packages' shared utilities, marked as not public?
kind: decision
state: done
created: 2026-11-22
project: CS-437
decider: owner
answer: B, a separate shared package
answered_at: 2026-11-22T21:34:13.552Z
answered_via: question-tool
answered_by: owner
---

## Question

Our packages share utilities through @cesium/core/internal. How is it marked as not public?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Keep the ./internal subpath, documented as outside the versioning policy, with its members tagged @internal.
- B. A separate shared package, as Vue's @vue/shared and Babel's helpers do, documented as internal.
- C. Rename the subpath, for example ./unstable-internal.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
