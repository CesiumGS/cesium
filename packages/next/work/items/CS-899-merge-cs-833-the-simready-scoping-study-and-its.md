---
id: CS-899
title: Merge CS-833, the SimReady scoping study and its USD subset reader spike
kind: decision
state: planned
created: 2026-11-22
project: CS-437
decider: owner
---

## Question

Merge CS-833, the SimReady scoping study (docs/design/simready-and-usd.md, indexed in CESIUM2_WEBGPU_PLAN.md) and its USD subset reader spike under packages/next/spikes/, into main? It changes nothing under src. Merging doesn't answer CS-802 or CS-843, or the study's two questions; the main session puts those to the owner.

SemanticsAPI: the newer SimReady samples (alcohol, apple, lamp, copper material) use only SemanticsLabelsAPI, with the taxonomies wikidata_class, wikidata_qcode and material and labels on Material prims; the older pallet uses only Isaac's SemanticsAPI, whose semanticType is the taxonomy; the note says how the engine reads each. Profile: 'Minimal Placeable Visual' is now feature FET001 1-0-1 inside Robotics-Prop 5.0.0; the recommended target is its visual features (FET001, FET006, FET009, FET011 over CAP000), read-only, with 23 rules cited and dated. How USD comes in: OpenUSD in WebAssembly as published is 19.7 to 36.4 MB (3.35 to 5.49 MB with Brotli) and threaded, so pages need COOP and COEP, and its start time can't be told without a build; the spike's TypeScript subset reader is 26,246 B minified (8,678 B Brotli), starts its worker in 11 to 13 ms and composes the fixture in 3.4 to 3.8 ms there (upper bounds on a loaded machine; quick probes, no Dyno run IDs), and read and composed 9 root layers from 6 samples, every array, path, list op, arc and variant decoded; no server converter found carries labels or physics. What alpha.1 must reserve: composition and variants (selections and payload policy as open options, per-instance IDs), units and axes declared by the source and corrected through placement, UsdPreviewSurface first then MaterialX with MDL refused by name, labels (the bound material as a precedence level, taxonomy aliases, GeomSubset IDs), UsdPhysics into CS-672's seam, and splats from USD ParticleField. The recommendation for CS-802 is its option A, refined, with 8 follow-up items for the main session. Samples: NVIDIA SimReady Foundation sample_content at commit 1abf3ae2, Apache 2.0; six assets (77 MB) sit in the setup store and nothing from them is committed. Its questions: build OpenUSD 26.11.1 for WebAssembly outside the repository for the spike only (recommended: no, unless CS-802 is answered B or a host needs full USD), and adopt LightUSD instead of our own reader (recommended: no for now; keep it as the fallback). Checked by the orchestrator on main 40f79d2b06 (replay ae939936fa of cfa2040b0f, patch identical outside work/): both type checks, eslint and prettier on the spike, markdownlint with the root config on the note, the plan and the spike README, prettier on the note, hitld work check 896 files, staleNames, the boundary and seam tests 51 of 51, and the spike's run.ts exit 0; no binary or data file and no secret in the diff. Snyk: one low path finding in run.ts, the operator's own data-folder argument, with paths inside layer files confined to it.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main to the checked replay (replaying again if main moved), regenerates the views and logs the merge. The main session puts CS-802, CS-843 and the two questions to the owner and files the follow-ups.
- B. Hold it: Nothing merges; CS-802, CS-843 and CS-559 read the study from its branch.

Recommended: Merge it. It changes nothing under src, every check passes, it meets each done-when with sources and measurements, and its open questions go to the owner as their own items.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
