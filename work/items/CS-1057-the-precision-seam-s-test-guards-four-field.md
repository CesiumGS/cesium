---
id: CS-1057
title: The precision seam's test guards four field names; everything else that needs ordered float math is outside it
kind: work
state: proposed
created: 2026-11-22
project: CS-10
---

> **Proposal.** Source: the Fable accuracy review (`fable-review-accuracy.md`, finding F3), 2026-11-22. Severity: Important. Land before: beta.1. **Items:** CS-921. Decider: owner.

## Done when

- one rule and one test. The rule: any shader code that depends on float operation order has a lab suite that reads the GPU's answer back, and a device self-test at start-up. The test: scan emitted WGSL and GLSL (the golden fixtures' texts) and Slang for a float subtraction of two "hi" values and for two-sum patterns outside an allowlist.
- The finding's evidence in the review is rechecked first, since the code may have moved.
