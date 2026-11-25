---
id: CS-532
title: Release 2.0.0-rc.1
kind: work
state: planned
created: 2026-11-15
project: CS-18
needs: [CS-528, CS-531, CS-472, CS-503, CS-511, CS-491, CS-502, CS-481, CS-482, CS-478, CS-479, CS-480, CS-483, CS-470, CS-607, CS-627, CS-636, CS-695]
release: 2.0.0-rc.1
---

## Done when

- `hitld release make` has made 2.0.0-rc.1, with its record and tag, on the owner's word, and every gate this item needs was met first.

## Notes

The release item for 2.0.0-rc.1 (the owner's answer to CS-455, the release ladder): only fixes after it; parity and the docs done. Which milestones it needs is CS-528; once answered, they join its needs.

On 2026-11-18 rc.1 needs CS-695 (every package has its API reference) in place of the item CS-619 directly (owner, 2026-11-18, fixing the release crossings CS-685 found): a release needs whole milestones.

CS-614 (the branch is a clean, modern 2.0 build) moved to alpha.1 on 2026-11-21, on the owner's word: 1.x leaves and the new build lands before alpha.1 publishes, and the package move goes once into the final layout.

CS-416 (WebGL 2 parity) moved to alpha.5 on 2026-11-24, after the owner, 2026-11-24: "the beta is for fixing bugs, feature complete should be through the alpha releases" (`docs/decisions/2026-11-17-release-plan-and-parity.md`, amendment of 2026-11-24). rc.1 now needs fixes, measurement, trust, migration and docs only.

On 2026-11-24 rc.1 stopped listing CS-423, CS-461, CS-463, CS-465, CS-467, CS-471, CS-474 and CS-504: each is in an alpha, which rc.1 already needs through beta.1.
