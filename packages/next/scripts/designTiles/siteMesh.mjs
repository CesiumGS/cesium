// A portfolio site's building for the design-globe generator (plan 4b Task
// 14): a box per story, in the site's design coordinates (its CRS's units,
// easting first), from the site's corner `origin`, `width` along design east
// and `depth` along design north. The site-grid building is this mesh as
// one rigid tile, on a plinth carried down into the slope it stands on; the
// ladder's single building (Task 17b) is the same stories as a part of one
// leaf (`buildingPlan`).
import { srgb } from "./meshBuilder.mjs";

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
 *   a site whose model is a building
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
  // The plinth: the ground floor's walls carried down to its foot, closed
  // underneath (a building on a slope, on real ground).
  const foot = site.model.plinth;
  if (foot !== undefined && foot < u0) {
    const id = features.length;
    features.push({ name: `${site.name}, plinth`, kind: "plinth" });
    const [w0, w1, s0, s1, z0, z1] = [e0, e0 + width, n0, n0 + depth, foot, u0];
    const faces = [
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
        ids.push(id);
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

/** The ladder's building: brick walls, with a darker roof slab on the top story. */
const WALL = srgb("#9c6b52");
const ROOF = srgb("#4a4440");

/**
 * The building as a ladder plan: one part (the building, every story) in a
 * single leaf, its faces coloured (walls, and the roof).
 *
 * @param {import("../../examples/design-globe/sites.ts").PortfolioSite} site
 */
export function buildingPlan(site) {
  const mesh = buildingMesh(site);
  const anchor = buildingAnchor(site);
  const { width, depth, stories, storyHeight } = site.model;
  const top = site.origin[2] + stories * storyHeight;
  const feature = { name: site.name, kind: "building" };
  const draw = (b) => {
    const at = (i) => [
      mesh.design[3 * i],
      mesh.design[3 * i + 1],
      mesh.design[3 * i + 2],
    ];
    // Each face is a quad's two triangles (q0, q1, q2) and (q0, q2, q3).
    for (let t = 0; t < mesh.indices.length; t += 6) {
      const [q0, q1, q2, , , q3] = [...mesh.indices.subarray(t, t + 6)].map(at);
      const roof = mesh.normals[3 * mesh.indices[t] + 2] > 0.5 && q0[2] === top;
      b.quad(q0, q1, q2, q3, roof ? ROOF : WALL, feature);
    }
  };
  return {
    anchor,
    leafSize: Infinity,
    parts: [{ at: [anchor[0], anchor[1]], lods: [{ error: 0, draw }] }],
    grounds: [],
    landmark: {
      label: "Roof corner",
      design: [site.origin[0] + width, site.origin[1] + depth, top],
    },
  };
}
