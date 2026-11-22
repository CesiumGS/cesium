---
id: CS-799
title: The Health view brings a chosen row into view, so a link from Your move lands on it
kind: work
state: proposed
created: 2026-11-21
project: CS-389
touches: [packages/next/bench/suite/views/workHealth.tsx, packages/next/bench/suite/views/workHealth.css, packages/next/test/dynoWorkHealth.test.ts]
---

CS-753's calmer Your move links each health exception to the Health view. The link opens the view, but it doesn't bring the chosen row into view, so the owner has to find it in a long list.

**Proposal** (CS-686). Source: CS-753's report, relayed by orch-11, 2026-11-21. Why now: Your move's links are the main way into Health. Rough size: small. Decider: the executor. Filed: 2026-11-21.

## Done when

- A link with a chosen exception opens Health with that row scrolled into view, focused and marked, and nothing else on the page moves.
- With reduced motion, the scroll is a jump.
- Tested with a row near the end of a long list, from the pointer and from the keyboard.
