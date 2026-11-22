---
id: CS-802
title: Is NVIDIA SimReady a target for 2.0, at which profile and release, and how does USD come in?
kind: decision
state: planned
created: 2026-11-21
project: CS-191
decider: owner
needs: [CS-833]
---

## Question

Should 2.0 load and use NVIDIA SimReady assets? If so, at which SimReady profile, in which release, and how does OpenUSD get into the engine?

Asked on 2026-11-21 by the owner: "do we have everything we need in this plan to support nvidia simready?" A read of the plan against SimReady's requirements says no. Nothing in the plan names SimReady. The requirements were read on 2026-11-21 from NVIDIA's SimReady spec overview (docs.omniverse.nvidia.com/simready) and the SimReady Foundation's rules (nvidia.github.io/simready-foundation).

**What the plan covers today:**

- OpenPBR (CS-475) and MaterialX (CS-418, CS-477).
- USD B-reps only, through `BrepSource.fromUsd` and the B-rep tiler (CS-304, CS-305; milestone CS-495).
- A design for physics shapes the engine hands to simulators (CS-672; milestone CS-676). It reads nothing from UsdPhysics.
- USD through the content-source seam (CS-559), whose scope waits on CS-552. The B-rep design judges building OpenUSD for WebAssembly "large and risky".

**What's missing for SimReady:**

1. Composition: layers, references, payloads and variant sets on the default prim.
2. Stage units and axes: `upAxis`, `metersPerUnit` and `kilogramsPerUnit`, with corrective transforms between assets.
3. Reading UsdPhysics: rigid bodies, mass, colliders, joints and physics materials.
4. USD materials: UsdPreviewSurface and UsdShade MaterialX. MDL has no plan at all.
5. Semantic labels (`SemanticsLabelsAPI`). How metadata reaches the engine is CS-452, which is still open.
6. Non-visual sensor materials and lidar. CS-673 draws sensor coverage, not simulated returns.
7. Validation against SimReady's rules and profiles.
8. USDZ packaging.

Rule basis: novelty, public commitment. Reversibility: two-way until a format or API ships.

## Options and recommendation

- A. Target a minimal profile in 2.0.0: support SimReady's "Minimal Placeable Visual" profile. That means composition, units and axes, UsdPreviewSurface and OpenPBR or MaterialX materials, and semantic labels. Physics, MDL and sensors are left to the host application. USD comes in through a TypeScript subset reader behind the content-source seam (CS-559). (cost: Six to eight new items. It sets the format support people will rely on. The subset reader needs a stated list of what it refuses.)
- B. Target physics too: A, plus reading UsdPhysics into CS-672's physics seam. The engine then hands simulators what the asset declares. (cost: A larger CS-672, and a second seam that reads physics in, not only out.)
- C. Conversion only: SimReady assets are converted to glTF and 3D Tiles by a server or tool before loading. The engine reads no USD beyond B-reps. (cost: No live USD. Semantics and physics survive only if the converter carries them.)
- D. Not a target for 2.0: record it, and revisit after 2.0.0. (cost: Nothing now. A later start has to fit around a frozen API.)

Recommended: A, decided before beta.1. Composition, units and labels touch the content-source seam and the metadata path, both of which freeze at beta.1. Physics and sensors can follow as experimental modules, if CS-681 keeps an experimental tier. Settle CS-452 (semantic metadata) together with this.

The owner, 2026-11-21: "let's sort it out for alpha.1." CS-833 (a SimReady scoping study) gathers what this decision needs, and the owner answers it before alpha.1's seams freeze.

## Answer

Open.
