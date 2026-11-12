// The caches of the update path (src/brep/faceDigest.ts, `prepareGpuPatches`'
// and `formBounds`' `cache`): a face seen before, in a form changed a little,
// is not prepared or bounded again, and what is reused is what would have been
// made. The real kernels' forms are in test/data/csgUpdateCaches.test.ts.
import { describe, expect, it } from "vitest";
import {
  boxBrep,
  cappedCylinderBrep,
  filletedBlockBrep,
  trimmedNurbsBrep,
} from "../examples/brep-first-look/fixtures.ts";
import { faceDigest, faceDigests } from "../src/brep/faceDigest.ts";
import type { BrepForm } from "../src/brep/form.ts";
import { createBoundsCache, formBounds } from "../src/brep/formBounds.ts";
import {
  createPrepareCache,
  prepareGpuPatches,
} from "../src/brep/gpuPatches.ts";

/** The form with every pcurve point nudged, as a face edited in (u, v) would be. */
function nudged(form: BrepForm): BrepForm {
  return {
    ...form,
    curves2: {
      ...form.curves2,
      points: form.curves2.points.map((p, i) => (i % 3 === 2 ? p : p + 1e-3)),
    },
  };
}

describe("faceDigest", () => {
  it("is one string per face, the same for a form and a copy of it", () => {
    const form = filletedBlockBrep();
    const digests = faceDigests(form);
    expect(digests).toHaveLength(form.faceSurface.length);
    expect(digests.every((d) => /^[0-9a-z]+\.[0-9a-z]+$/.test(d))).toBe(true);
    const copy: BrepForm = { ...form };
    expect(faceDigests(copy)).toEqual(digests);
    expect(faceDigest(form, 0)).toBe(digests[0]);
    // Computed once for a form.
    expect(faceDigests(form)).toBe(digests);
  });

  it("tells faces with different surfaces apart, and notices a changed pcurve", () => {
    const form = boxBrep();
    expect(new Set(faceDigests(form)).size).toBe(6);
    const moved = faceDigests(nudged(form));
    expect(moved.every((d, i) => d !== faceDigests(form)[i])).toBe(true);
  });

  it("notices a changed edge curve or tolerance, which the bounds read", () => {
    const form = boxBrep();
    const before = faceDigests(form);
    const looser = {
      ...form,
      edgeTolerance: form.edgeTolerance.map((t) => t * 2 + 1e-6),
    };
    expect(faceDigests(looser).every((d, i) => d !== before[i])).toBe(true);
    const bent: BrepForm = {
      ...form,
      curves3: {
        ...form.curves3,
        points: form.curves3.points.map((p, i) => p + (i % 4 === 3 ? 0 : 1e-3)),
      },
    };
    expect(faceDigests(bent).some((d, i) => d !== before[i])).toBe(true);
  });
});

describe.each([
  ["a block", boxBrep],
  ["a filleted block", filletedBlockBrep],
  ["a capped cylinder", cappedCylinderBrep],
  ["a trimmed NURBS", trimmedNurbsBrep],
])("the preparation cache on %s", (_name, make) => {
  it("reuses every face of an unchanged form, and gives what a fresh preparation does", () => {
    const form = make();
    const cache = createPrepareCache();
    const first = prepareGpuPatches(form, { cache });
    expect(cache.reused).toBe(0);
    const again = prepareGpuPatches(make(), { origin: first.origin, cache });
    expect(cache.reused).toBe(form.faceSurface.length);
    expect(cache.prepared).toBe(0);
    expect(again).toEqual(prepareGpuPatches(form, { origin: first.origin }));
  });

  it("prepares the faces that changed, in their place in the list", () => {
    const form = make();
    const cache = createPrepareCache();
    const { origin } = prepareGpuPatches(form, { cache });
    const edited = nudged(form);
    const partial = prepareGpuPatches(edited, { origin, cache });
    expect(partial).toEqual(prepareGpuPatches(edited, { origin }));
    // Faces are indexed by their place in the form, whatever came from the cache.
    partial.faces.forEach((face, i) => expect(face.face).toBe(i));
    partial.spans.forEach((span) =>
      expect(partial.faces[span.face]!.supported).toBe(true),
    );
  });

  it("reuses nothing for another origin or trim tolerance", () => {
    const form = make();
    const cache = createPrepareCache();
    const { origin } = prepareGpuPatches(form, { cache });
    prepareGpuPatches(form, { origin: origin.map((x) => x + 1), cache });
    expect(cache.reused).toBe(0);
    prepareGpuPatches(form, {
      origin: origin.map((x) => x + 1),
      trimTolerance: 1e-3,
      cache,
    });
    expect(cache.reused).toBe(0);
  });
});

describe("the bounds cache", () => {
  it("gives the bounds a call without it does, for an unchanged and a changed form", () => {
    for (const make of [boxBrep, filletedBlockBrep, trimmedNurbsBrep]) {
      const form = make();
      const cache = createBoundsCache();
      expect(formBounds(form, { cache })).toEqual(formBounds(form));
      expect(cache.entries.size).toBeGreaterThan(0);
      expect(formBounds(make(), { cache })).toEqual(formBounds(form));
      const edited = nudged(form);
      expect(formBounds(edited, { cache })).toEqual(formBounds(edited));
    }
  });

  it("is not used for another tolerance", () => {
    const form = filletedBlockBrep();
    const cache = createBoundsCache();
    formBounds(form, { cache });
    expect(formBounds(form, { cache, tolerance: 1e-2 })).toEqual(
      formBounds(form, { tolerance: 1e-2 }),
    );
  });
});
