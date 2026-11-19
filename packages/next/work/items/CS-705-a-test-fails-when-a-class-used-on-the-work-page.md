---
id: CS-705
title: A test fails when a class used on the Work page has no CSS rule
kind: work
state: proposed
created: 2026-11-19
project: CS-18
touches: [packages/next/test/**, packages/next/bench/suite/views/**]
---

**Proposal** (CS-686). Source: orch-9's run summary, run 2026-11-18-2, 2026-11-19. Why now: CS-694's merge deleted the `.work-roadmap-seg` rule while the item pane still used it, so progress bars lost their fill on main until CS-693 restored it. Every check passed, because no test covers CSS. Rough size: small. Decider: the owner. Filed: 2026-11-19.

## Done when

- A test lists the class names the Work page's components use and fails, naming each, when one has no rule in the page's stylesheets, with an allowlist for classes that are deliberately unstyled.
- It would have caught the `.work-roadmap-seg` deletion: checked by deleting that rule on a scratch copy.
