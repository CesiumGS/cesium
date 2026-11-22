---
id: CS-833
title: "A SimReady scoping study: which profile, how USD comes in, and what alpha.1 must reserve, answering CS-802"
kind: work
state: done
created: 2026-11-21
project: CS-437
claimed_by: orch-11-CS-833
touches: [packages/next/docs/design, packages/next/spikes]
---

The owner, 2026-11-21, on CS-802 (is SimReady a target, at which profile and release, and how does USD come in?): "let's sort it out for alpha.1." This study gathers what CS-802 needs to be answered before alpha.1's seams freeze.

Source: the owner's answer, through the chief of staff, after a read of the plan against SimReady's requirements (2026-11-21). Why now: composition, units and axes, and semantic labels touch the content-source seam (CS-552) and the metadata path (CS-832), both in alpha.1. Rough size: medium. Decider: the executor recommends, and the owner answers CS-802. Filed: 2026-11-21.

## Done when

- It checks whether SimReady's sample assets still use Isaac's older SemanticsAPI rather than `SemanticsLabelsAPI`, and says how the engine reads each one. (Added 2026-11-21, from CS-832's report.)
- **Profile.** It recommends a SimReady profile (for example "Minimal Placeable Visual") and lists that profile's rules from NVIDIA's SimReady Foundation, each with its source and the date it was read.
- **How USD comes in.** It compares the three paths on size, start time, coverage and upkeep:
  - OpenUSD built for WebAssembly;
  - a TypeScript subset reader behind the content-source seam (CS-559);
  - conversion on a server.
  
  A small spike measures the subset reader on a few SimReady sample assets, if their license allows. Where it doesn't, it says "can't tell".
- **What alpha.1 reserves.** It says what alpha.1's seams must leave room for:
  - composition and variants;
  - stage units and axes;
  - UsdPreviewSurface and MDL fallbacks;
  - labels through CS-832;
  - UsdPhysics for CS-672.
- **Answering CS-802.** It ends in a recommendation the owner can answer CS-802 with, and lists the follow-up items.
