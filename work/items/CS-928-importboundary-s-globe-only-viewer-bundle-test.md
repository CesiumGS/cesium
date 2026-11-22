---
id: CS-928
title: importBoundary's globe-only Viewer bundle test fails in full runs under load, and passes alone
kind: work
state: proposed
created: 2026-11-22
project: CS-199
---

> **Proposal.** Source: orch-11's gates on CS-612 (2026-11-22). Why: the test failed in two full runs, at loads of 42 and 62, and passed alone both times. Its message wasn't captured, so the cause is unexplained. It isn't flaky until a cause is shown. Size: small. Decider: owner. Filed 2026-11-22.

## Done when

- The failure's message is captured under load: for example, run the full suite with the machine loaded, keeping the test's output.
- The cause is found and fixed, or shown to be the machine's, with evidence. `checkBundle.mjs` takes about 1 s at low load against a 120 s limit, so a timeout alone is unlikely.
- A full run under load passes.

## Note (2026-11-22)

The message, captured in CS-613's first full run: `checkBundle: no <worktree>/packages/ui/dist/index.js; run npm run build first`. So the test fails when the packages haven't been built. CS-612's gate chain ran the suite before building. The merge gates and CI now build first. What's left: the test should skip with a clear message, or fail with one, when `dist/` is missing.
