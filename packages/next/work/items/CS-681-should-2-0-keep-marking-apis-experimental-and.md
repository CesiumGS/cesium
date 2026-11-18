---
id: CS-681
title: Should 2.0 keep marking APIs experimental, and how?
kind: decision
state: planned
created: 2026-11-17
project: CS-437
decider: owner
---

## Question

1.x marks some features `@experimental` in its docs: they may change without its usual deprecation policy. 2.0 plans stability tiers as TSDoc tags (CS-434), and the release plan lets a module that arrives after beta.1 ship in an experimental tier without holding the API freeze. The owner, 2026-11-17: "we'll also need to think through how the api is marking things as experimental and whether that's a practice we want to continue." Does 2.0 keep an experimental marking, and what does it promise?

## Options and recommendation

- **Keep it, as a tier with a contract:** `@experimental` in TSDoc and in `api/surface.txt`'s tier column, read by tests and agents; it may change in any release, is never on by default, and graduates only through an API review.
- **Keep it for whole modules only:** a package is experimental or stable; members inside a stable package are all stable.
- **Drop it:** everything public is stable at beta.1; work not ready stays unpublished until it is.

Recommendation: a tier with a contract, applied to whole modules where possible. It lets panoramas, sensors and legacy glTF ship without holding the freeze, and the tier column makes it checkable. Decide before the API review settles tiers (CS-102, CS-434).

## Answer

Open.

From the owner's release planning on 2026-11-17: `docs/decisions/2026-11-17-release-plan-and-parity.md`.
