---
id: CS-1269
title: Merge CS-27, the inspector's Profile section and emulation
kind: decision
state: planned
created: 2026-11-24
project: CS-8
decider: owner
---

## Question

Merge CS-27 into main? The inspector gains a Profile section (what each feature asked for, what it was given and which rule decided), support notices land in Problems, Engine.create's emulate runs a WebGPU persona's fallbacks for real, and Dyno takes ?persona=.

Emulation: on a WebGPU persona, the device asks only for features both the adapter and the persona have, at the persona's lower limits tier, so fallback paths really run. It can never request a feature or limit the device lacks, and the engine keeps nothing between sessions. Dyno's ?persona= lasts for the tab's session like ?limits=, shows in the inspector header, and clears with an empty value. The Profile section follows the inspector's rule that values change and layout doesn't, with DOM-skeleton tests. Notices that warn are Problems warnings, and recorded ones are notes; a kind × importance × layer matrix test keeps that in step with core's rule. Checked in the browser under the gpu lock: both themes, 1,440 and 380 px, reduced motion, keyboard to every row's info, clean console. An Opus review found no Important. It confirmed a bug the executor found, which is on main today and not caused here: without float32-blendable, the 16-bit moments fallback fails validation (a 1-component output to an RGBA16Float target), so Engine.create rejects. It's filed as separate work. Minors: the changeset and the emulate doc name no-float32-blendable as a persona, which rejects until that fix lands; GpuDevice.create gains an optional persona of an unexported type; and two accessibility details. It touches Engine.ts beside CS-363's hunk, a text conflict only. No owner paths; api/surface.txt unchanged. Checked by the orchestrator on the replay d19d229ce1 (patch identical outside work/). Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: public-commitment. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`.
- B. B. Hold it: Nothing merges; the inspector has no Profile section and emulation doesn't exercise fallbacks.

Recommended: A. Merge it. It meets the done-when with a browser check, emulation is safe, and the review found nothing Important.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
