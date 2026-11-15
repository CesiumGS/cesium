---
id: CS-414
title: Renderers plug in behind one seam
kind: capability
status: Planned
created: 2026-11-14
project: CS-9
outcome: "An app can ask for the WebGL 2 renderer and get an engine that runs on it, or a named reason it can't, while WebGPU apps draw exactly as before through the same seam."
done_when:
  - "c1: WebGPU apps see no change: every WebGPU parity suite gives the same results before and after the seam is extracted."
  - "c2: A second renderer reaches everything the WebGPU renderer draws (draw records, meshes, textures, imagery) without holding a WebGPU object: the import-boundary test has no content-tier exceptions for imagery, and a `webgl2` tier that may not import WebGPU code."
  - 'c3: An app gets an engine that clears to its background on WebGL 2, with the inspector naming the device and why, when it sets `renderer: "webgl2"`, when it leaves auto on a browser without WebGPU (with one warning), or when it emulates `webgl2-basic`; below the floor, `Engine.create` rejects naming what is missing, and WebGPU apps never download the WebGL 2 code.'
needs: [CS-33 c1, CS-34 c2, CS-35 c3, CS-43 c3]
check: "demo a gallery page that clears on WebGL 2 three ways, and rejects below the floor"
---

## Done when

Drafted on 2026-11-15 for the owner's review: the clauses, the check and each constraint's clause are in the front matter.

## Check

In Chrome, a gallery page with `renderer: "webgl2"`, then with WebGPU unavailable, then emulating `webgl2-basic`: each clears, and the inspector names the device and the reason; a below-floor persona shows the rejection. Backing: `node bench/run.mjs parity` (with models, globe, imagery and translucency) compared in Dyno's results store before and after CS-33 and CS-34; test/importBoundary.test.ts and scripts/checkBundle.mjs cover c2 and c3's chunk part.

## Shaping questions

- The gallery's renderer switch arrives with CS-45, and test/fakeGl.ts belongs to no item; until then the demo needs a page that sets the option by hand.

## Notes

Migrated on 2026-11-14 from the milestone "the seam" of CS-9 (its `milestones` list and its items' `milestone` key). Its 5 items are constraints marked `c?` until shaping links each to a clause.

Renamed on 2026-11-14 from "The seam" to its outcome, since HITLd names milestones by the state they reach, with its `outcome` written.
