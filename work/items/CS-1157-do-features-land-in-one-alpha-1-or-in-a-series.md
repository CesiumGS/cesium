---
id: CS-1157
title: Do features land in one alpha.1, or in a series of alphas before beta.1?
kind: decision
state: done
created: 2026-11-23
project: CS-18
decider: owner
answer: "A. Several alphas: alpha.1 stays as it is; beta.1's features move into alpha.2, alpha.3 and so on, grouped by theme; beta.1 becomes the feature and API freeze, gated by the API approval (CS-420), its changes (CS-457) and the fixes the alphas turn up."
answered_at: 2026-11-24T00:35:54.735Z
answered_via: question-tool
answered_by: owner
---

## Question

beta.1 should only fix bugs and shortcomings found in the alphas. On 2026-11-23 it needed 51 milestones and 23 loose work items, most of them features (WebGL 2, worker mode, the Moon, OpenPBR, 1.x format coverage, the StrataKit widgets, particles, the styling language). Where should that feature work go?

Asked by the chief of staff on 2026-11-23, after the owner asked whether all feature work should go into alpha.1 so that beta.1 is fixes only.

## Options and recommendation

- A. Several alphas: alpha.1 stays as it is; beta.1's features move into alpha.2, alpha.3 and so on, grouped by theme; beta.1 becomes the feature and API freeze, gated by the API approval (CS-420), its changes (CS-457) and the fixes the alphas turn up.
- B. All in alpha.1: alpha.1 becomes the whole feature set, about 74 milestones, and no release ships until all of it lands.

Recommended: A.

Either way, a release needs whole milestones: each loose work item a release needs joins a milestone first.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`). This amends the release ladder (CS-455): beta.1 was "feature complete for 2.0"; it is now the freeze after the alphas.
