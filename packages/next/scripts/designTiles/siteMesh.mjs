// A portfolio site's building for the design-globe generator (plan 4b Task
// 14): a box per story, in the site's design coordinates (its CRS's units,
// easting first), from the site's corner `origin`, `width` along design east
// and `depth` along design north.

/** Each story's walls step in this fraction of the footprint's shorter side, above the ground floor, so the stories read apart. */
const SETBACK = 0.004;

/**
 * The building's anchor: its footprint's centre at its base, the point a
 * rigid placement of it is exact at.
 *
 * @param {import("../../examples/design-globe/sites.ts").PortfolioSite} site
 * @returns {[number, number, number]}
 */
export function buildingAnchor(site) {
  const [e, n, u] = site.origin;
  return [e + site.model.width / 2, n + site.model.depth / 2, u];
}

/**
 * @param {import("../../examples/design-globe/sites.ts").PortfolioSite} site
 * @returns {{ design: Float64Array, normals: Float32Array, indices: Uint32Array,
 *   featureIds: Uint16Array, features: { name: string, kind: string }[] }}
 */
export function buildingMesh(site) {
  const { width, depth, stories, storyHeight } = site.model;
  const [e0, n0, u0] = site.origin;
  const design = [];
  const normals = [];
  const ids = [];
  const indices = [];
  const features = [];
  const inset = SETBACK * Math.min(width, depth);
  for (let story = 0; story < stories; story++) {
    features.push({ name: `${site.name}, story ${story + 1}`, kind: "story" });
    const step = story === 0 ? 0 : inset;
    const [w0, w1] = [e0 + step, e0 + width - step];
    const [s0, s1] = [n0 + step, n0 + depth - step];
    const [z0, z1] = [u0 + story * storyHeight, u0 + (story + 1) * storyHeight];
    // Each face's corners counterclockwise seen from outside, and its normal.
    const faces = [
      [
        [
          [w0, s0, z1],
          [w1, s0, z1],
          [w1, s1, z1],
          [w0, s1, z1],
        ],
        [0, 0, 1],
      ],
      [
        [
          [w0, s1, z0],
          [w1, s1, z0],
          [w1, s0, z0],
          [w0, s0, z0],
        ],
        [0, 0, -1],
      ],
      [
        [
          [w0, s0, z0],
          [w1, s0, z0],
          [w1, s0, z1],
          [w0, s0, z1],
        ],
        [0, -1, 0],
      ],
      [
        [
          [w1, s1, z0],
          [w0, s1, z0],
          [w0, s1, z1],
          [w1, s1, z1],
        ],
        [0, 1, 0],
      ],
      [
        [
          [w1, s0, z0],
          [w1, s1, z0],
          [w1, s1, z1],
          [w1, s0, z1],
        ],
        [1, 0, 0],
      ],
      [
        [
          [w0, s1, z0],
          [w0, s0, z0],
          [w0, s0, z1],
          [w0, s1, z1],
        ],
        [-1, 0, 0],
      ],
    ];
    for (const [corners, normal] of faces) {
      const first = ids.length;
      for (const corner of corners) {
        design.push(...corner);
        normals.push(...normal);
        ids.push(story);
      }
      indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
    }
  }
  return {
    design: Float64Array.from(design),
    normals: Float32Array.from(normals),
    indices: Uint32Array.from(indices),
    featureIds: Uint16Array.from(ids),
    features,
  };
}
