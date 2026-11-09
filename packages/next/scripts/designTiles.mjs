// The design globe's generated tiles and exact answers (plan 4b Task 14;
// the plan's calls 15 and 17). `npm run setup` runs it, after the frames data
// and the grids, into `<store>/design-globe-dual/`:
//  - corridor/: the corridor, one tileset whose vertices carry both
//    placements (plan 5a Task 20). POSITION is design units under one root
//    transform, the rigid placement's matrix at its anchor (near the middle);
//    `_DG_REPROJECTED` is every vertex through the frame, in that same model
//    space, its second position (`CESIUM_dual_position`), so a scene item's
//    placement draws either (or anything between);
//  - site-building/: the site-grid building, rigid at its footprint's
//    centre, with no second position;
//  - portfolio-<id>/: the scale ladder (Task 17b), each portfolio site's model
//    as the corridor's, rigid at the model's middle
//    (scripts/designTiles/ladder.mjs);
//  - answers.json: exact values at points and between pairs, from the
//    library, at DESIGN_TILES_INSTANT, for the example's checks, and each
//    ladder site's extent, rigid error at its edge and whisker points;
//  - manifest.json: version 1 and the SHA-256 of the inputs, so it
//    regenerates only when they change.
//
// Tiles are glTF Y-up: a tile-space (E, N, U) is written (E, U, −N). Tile
// centres are whole design units, so the engine's sums of tile translations
// are exact; a vertex is the float32 nearest its design point less its tile's
// centre, and its reprojected position is the frame's image of exactly that
// design point (the centre plus the float32), taken back through the rigid
// placement's matrix to the float32 nearest in the tile's model space, so both
// positions draw one set of design points.
//
// The output is built in `design-globe-dual.<run>.partial/` (which the dev
// server's /frames-data mount never serves) and renamed into place when
// complete. An earlier generator's `design-globe/`, the two-tileset layout, is
// left where it is: this one neither reads nor changes it.
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  ANCHOR_STATION,
  BRIDGE,
  CORRIDOR_ALIGNMENT,
  PAIR_STATIONS,
  SURVEY_MARK,
  corridorFrame,
  sectionSurface,
} from "../examples/design-globe/corridor.ts";
import {
  ANSWERS_VERSION,
  parseAnswers,
} from "../examples/design-globe/answers.ts";
import {
  PORTFOLIO,
  SITE_BUILDING,
  modelAnchor,
} from "../examples/design-globe/sites.ts";
import {
  DUAL_POSITION_EXTENSION,
  REPROJECTED_SEMANTIC,
  STANDOFF_SEMANTIC,
  spacedPoints,
} from "../examples/design-globe/dualPosition.ts";
import { Ephemeris } from "../src/ephemeris/Ephemeris.ts";
import {
  EngineeringFrame,
  designPoint,
} from "../src/engineering/EngineeringFrame.ts";
import { gridFactors } from "../src/engineering/factors.ts";
import {
  ALIGNMENTS_EXTENSION,
  ENGINEERING_FRAME_EXTENSION,
  alignmentsExtension,
} from "../src/engineering/georeference.ts";
import { formatPipeline, parsePipeline } from "../src/engineering/pipeline.ts";
import { placeRigid } from "../src/engineering/placement.ts";
import { gridSource, loadProj } from "../src/engineering/proj.ts";
import { createFrames } from "../src/frames/frames.ts";
import { measure } from "../src/measure/measure.ts";
import { EarthOrientationParameters } from "../src/time/eop.ts";
import { Instant } from "../src/time/Instant.ts";
import { LeapSeconds } from "../src/time/leapSeconds.ts";
import {
  corridorMesh,
  corridorTree,
  largestChordError,
  largestSlopeError,
} from "./designTiles/corridorMesh.mjs";
import { writeGlb } from "./designTiles/gltf.mjs";
import {
  LEAF_ERROR_METRES,
  ladderPlan,
  ladderTree,
  planExtent,
} from "./designTiles/ladder.mjs";
import { buildingAnchor, buildingMesh } from "./designTiles/siteMesh.mjs";
import { tilesetJson } from "./designTiles/tileset.mjs";

/** Where in the store this generator writes (one tileset a site). */
export const DESIGN_TILES_DIRECTORY = "design-globe-dual";

/** The instant `measure` runs at, recorded in answers.json. */
export const DESIGN_TILES_INSTANT = "2026-01-01T00:00:00.000Z";

const VERSION = 1;
/** Station covered by a leaf tile, design units. */
const LEAF_LENGTH = 2_000;
/** A leaf's chord error, design units (0.003 ftUS, about 0.9 mm). */
const CHORD_TOLERANCE = 0.003;
/** Answer stations every this many design units, from the start. */
const ANSWER_INTERVAL = 4_000;
/** Answer offsets: the centreline (median), the lanes' middles and the outer barriers. */
const ANSWER_OFFSETS = [0, -17, 17, -40, 40];
/** Answer stations nearest these distances from the anchor, metres. */
const NEAR_DISTANCES = [10_000, 20_000];
/** The opening self-check's station (owner, 2026-11-07), on the centreline. */
const MARKER_STATION = 170_000;
/**
 * The pair across the first curve, on the tangents either side of it, on or
 * over the ground: on the viaduct before it (the curve's own first spiral
 * starts in a tunnel) and on fill after it.
 */
const CURVE_PAIR_STATIONS = [29_400, 38_400];
/** Linear RGBA. */
const BUILDING_COLOR = [0.62, 0.5, 0.38, 1];
/** The site-grid building's plinth: weathered concrete, linear RGBA. */
const PLINTH_COLOR = [0.36, 0.35, 0.33, 1];
/** The ladder's models colour every vertex (COLOR_0); the material is white. */
const WHITE = [1, 1, 1, 1];

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
/** The inputs whose SHA-256 the manifest records (paths from the package). */
const INPUTS = [
  "examples/design-globe/corridor.ts",
  "examples/design-globe/sideSlopes.ts",
  "examples/design-globe/corridorDaylight.ts",
  "examples/design-globe/sites.ts",
  "examples/design-globe/poleLineGround.ts",
  "examples/design-globe/answers.ts",
  "examples/design-globe/dualPosition.ts",
  "scripts/designTiles.mjs",
  "scripts/designTiles/corridorMesh.mjs",
  "scripts/designTiles/siteMesh.mjs",
  "scripts/designTiles/ladder.mjs",
  "scripts/designTiles/coarsen.mjs",
  "scripts/designTiles/meshBuilder.mjs",
  "scripts/designTiles/blockMesh.mjs",
  "scripts/designTiles/portMesh.mjs",
  "scripts/designTiles/solarFarmMesh.mjs",
  "scripts/designTiles/airportMesh.mjs",
  "scripts/designTiles/campusMesh.mjs",
  "scripts/designTiles/poleLineMesh.mjs",
  "scripts/designTiles/gltf.mjs",
  "scripts/designTiles/tileset.mjs",
  // The library the tiles and answers come from.
  "src/engineering/alignment.ts",
  "src/engineering/EngineeringFrame.ts",
  "src/engineering/georeference.ts",
  "src/engineering/placement.ts",
  "src/engineering/factors.ts",
  "src/engineering/pipeline.ts",
  "src/engineering/projPins.ts",
  "src/measure/measure.ts",
];

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

/**
 * What the manifest must say for the output to be current: the version, the
 * instant, the inputs' hashes, and the store's grids (name and SHA-256, from
 * its manifest), since the unpinned frames resolve against whatever grids
 * the store holds.
 */
function wantedManifest(store) {
  const files = JSON.parse(
    readFileSync(join(store, "manifest.json"), "utf8"),
  ).files;
  return {
    version: VERSION,
    instant: DESIGN_TILES_INSTANT,
    sha256: Object.fromEntries(
      INPUTS.map((file) => [file, sha256(readFileSync(join(root, file)))]),
    ),
    grids: Object.fromEntries(
      files
        .filter((f) => f.role === "grid" || f.role === "gridCatalog")
        .map((f) => [f.file, f.sha256])
        .sort(([a], [b]) => (a < b ? -1 : 1)),
    ),
  };
}

/** The manifest's inputs, without what generation records (`frames`). */
const inputsOf = ({ version, instant, sha256, grids }) =>
  JSON.stringify({ version, instant, sha256, grids });

/**
 * PROJ (with no grids loaded yet), a GridSource over the store's grids, and
 * the Frames from the store's frame data, as setup leaves them: what
 * `ensureDesignTiles` needs.
 */
export async function designTilesInputs(store) {
  const proj = await loadProj({ base: `${join(store, "proj")}/`, grids: [] });
  const grids = await gridSource({ base: `${join(store, "grids")}/` });
  const manifest = JSON.parse(
    readFileSync(join(store, "manifest.json"), "utf8"),
  );
  const file = (role) => {
    const entry = manifest.files.find((f) => f.role === role);
    if (!entry) {
      throw new Error(`designTiles: the store's manifest has no ${role} file`);
    }
    return readFileSync(join(store, entry.file));
  };
  const buffer = (bytes) =>
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const builtIn = LeapSeconds.builtIn();
  const stored = LeapSeconds.fromIers(file("leapSeconds").toString("utf8"));
  const frames = createFrames({
    leapSeconds: stored.expires > builtIn.expires ? stored : builtIn,
    eop: EarthOrientationParameters.fromCelestrakCsv(
      file("eop").toString("utf8"),
    ),
    ephemeris: Ephemeris.fromPacks(
      buffer(file("planets")),
      buffer(file("moon")),
    ),
    warnings: [],
  });
  return { proj, grids, frames };
}

// ---- Small vector helpers (float64) ----

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const translation = (t) => [
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  t[0],
  t[1],
  t[2],
  1,
];

/**
 * The box with these (unit) axes, centred where it fits `points` (absolute
 * coordinates, flat [x, y, z, …]) and the corners of `boxes`, as
 * { centre, halfAxes } in absolute coordinates.
 */
function fitBox(axes, points, boxes) {
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  const add = (p) => {
    for (let k = 0; k < 3; k++) {
      const d = dot(axes[k], p);
      lo[k] = Math.min(lo[k], d);
      hi[k] = Math.max(hi[k], d);
    }
  };
  for (let i = 0; i < points.length; i += 3) {
    add([points[i], points[i + 1], points[i + 2]]);
  }
  for (const box of boxes) {
    for (let corner = 0; corner < 8; corner++) {
      const p = [...box.centre];
      for (let k = 0; k < 3; k++) {
        const sign = corner & (1 << k) ? 1 : -1;
        for (let j = 0; j < 3; j++) {
          p[j] += sign * box.halfAxes[k][j];
        }
      }
      add(p);
    }
  }
  const centre = [0, 0, 0];
  const halfAxes = [];
  for (let k = 0; k < 3; k++) {
    const middle = (lo[k] + hi[k]) / 2;
    // A flat box (a level slab) keeps a little thickness, and every box a
    // part per million more, so float noise never leaves a child outside.
    const half = Math.max((hi[k] - lo[k]) / 2, 1e-3) * (1 + 1e-6);
    for (let j = 0; j < 3; j++) {
      centre[j] += axes[k][j] * middle;
    }
    halfAxes.push(axes[k].map((v) => v * half));
  }
  return { centre, halfAxes };
}

/** A box relative to a tile centre, as 3D Tiles writes it. */
const boxJson = (box, centre) => [
  ...sub(box.centre, centre),
  ...box.halfAxes[0],
  ...box.halfAxes[1],
  ...box.halfAxes[2],
];

const DESIGN_AXES = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

/**
 * One tile's content, from its design-coordinate mesh: its positions, the
 * float32 nearest each design point less the tile's centre (whole design
 * units), and with `rigid` (the rigid placement's matrix) each vertex's second
 * position, the frame's image of exactly that point, in the same model space,
 * with how far apart the two stand along the vertex's normal, metres, and how
 * far apart they are in design units.
 */
function tileContents(mesh, frame, rigid) {
  const { design, normals } = mesh;
  const count = design.length / 3;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < design.length; i++) {
    lo[i % 3] = Math.min(lo[i % 3], design[i]);
    hi[i % 3] = Math.max(hi[i % 3], design[i]);
  }
  const centre = [0, 1, 2].map((k) => Math.round((lo[k] + hi[k]) / 2));
  const local = new Float32Array(design.length);
  for (let i = 0; i < design.length; i++) {
    local[i] = design[i] - centre[i % 3];
  }
  // The design points the tiles draw: centre + float32, exact in float64.
  const drawn = new Float64Array(design.length);
  for (let i = 0; i < design.length; i++) {
    drawn[i] = centre[i % 3] + local[i];
  }
  const positions = new Float32Array(design.length);
  const yUpNormals = new Float32Array(design.length);
  for (let i = 0; i < count; i++) {
    const [e, n, u] = [local[3 * i], local[3 * i + 1], local[3 * i + 2]];
    positions.set([e, u, -n], 3 * i);
    const [ne, nn, nu] = [
      normals[3 * i],
      normals[3 * i + 1],
      normals[3 * i + 2],
    ];
    yUpNormals.set([ne, nu, -nn], 3 * i);
  }
  if (rigid === undefined) {
    return { drawn, centre, positions, normals: yUpNormals };
  }

  const inverse = invertAffine(rigid);
  const reprojected = new Float32Array(design.length);
  const standOff = new Float32Array(count);
  let maxDistance = 0;
  const fixed = new Float64Array(3);
  for (let i = 0; i < count; i++) {
    frame.toBodyFixed(drawn.subarray(3 * i, 3 * i + 3), fixed);
    const back = transformPoint(inverse, fixed);
    const [e, n, u] = [0, 1, 2].map((k) => back[k] - centre[k]);
    reprojected.set([e, u, -n], 3 * i);
    maxDistance = Math.max(
      maxDistance,
      Math.hypot(e - local[3 * i], n - local[3 * i + 1], u - local[3 * i + 2]),
    );
    // The gap and the normal Earth-fixed (the rigid matrix rotates and scales
    // alike), the normal's length dividing out.
    const at = transformPoint(rigid, drawn.subarray(3 * i, 3 * i + 3));
    const normal = [0, 1, 2].map(
      (k) =>
        rigid[k] * normals[3 * i] +
        rigid[4 + k] * normals[3 * i + 1] +
        rigid[8 + k] * normals[3 * i + 2],
    );
    const length = Math.hypot(...normal) || 1;
    standOff[i] =
      Math.abs(
        (fixed[0] - at[0]) * normal[0] +
          (fixed[1] - at[1]) * normal[1] +
          (fixed[2] - at[2]) * normal[2],
      ) / length;
  }
  // The reprojected end keeps these rigid normals (a placed vertex moves but
  // isn't turned: 0.197 degrees at most on the corridor). Before scene items
  // the generator also wrote reprojected normals, from the frame's Jacobian at
  // each tile's centre, inverse transpose; `git show b2f8c3ae0e:packages/next/
  // scripts/designTiles.mjs` has it (`tileContents`). Plan 5f's review
  // (CESIUM2_WEBGPU_PLAN.md section 13.26) decides where it comes back.
  return {
    drawn,
    centre,
    positions,
    normals: yUpNormals,
    reprojected,
    standOff,
    maxDistance,
  };
}

/** `m⁻¹` of a column-major affine matrix (float64). */
function invertAffine(m) {
  const [a, b, c, , d, e, f, , g, h, i] = m;
  const det = a * (e * i - f * h) - d * (b * i - c * h) + g * (b * f - c * e);
  const r = new Float64Array(16);
  r[0] = (e * i - f * h) / det;
  r[1] = (c * h - b * i) / det;
  r[2] = (b * f - c * e) / det;
  r[4] = (f * g - d * i) / det;
  r[5] = (a * i - c * g) / det;
  r[6] = (c * d - a * f) / det;
  r[8] = (d * h - e * g) / det;
  r[9] = (b * g - a * h) / det;
  r[10] = (a * e - b * d) / det;
  r[12] = -(r[0] * m[12] + r[4] * m[13] + r[8] * m[14]);
  r[13] = -(r[1] * m[12] + r[5] * m[13] + r[9] * m[14]);
  r[14] = -(r[2] * m[12] + r[6] * m[13] + r[10] * m[14]);
  r[15] = 1;
  return r;
}

/** `m` applied to the point `p`, column-major affine (float64). */
function transformPoint(m, p) {
  return [0, 1, 2].map(
    (k) => m[k] * p[0] + m[4 + k] * p[1] + m[8 + k] * p[2] + m[12 + k],
  );
}

/**
 * The tileset-level extensions of a frame and a placement: the
 * `BENTLEY_engineering_frame` declaration, and the frame's alignments as
 * `BENTLEY_alignments` (IFC 4.3's segment types) when it has any.
 */
export function frameExtensions(definition, placement) {
  return {
    [ENGINEERING_FRAME_EXTENSION]: declaration(definition, placement),
    ...(definition.alignments?.length && {
      [ALIGNMENTS_EXTENSION]: alignmentsExtension(definition.alignments),
    }),
  };
}

/** The `BENTLEY_engineering_frame` declaration of a frame and a placement. */
function declaration(definition, placement) {
  const crs = definition.crs;
  const crsJson =
    crs.format === "wkid"
      ? {
          format: "wkid",
          extensions: {
            EXT_geospatial_crs_wkid: {
              authority: crs.authority,
              wkid: crs.wkid,
              ...(crs.vcsWkid !== undefined && { vcsWkid: crs.vcsWkid }),
              // Our proposal beside the draft's fields (georeference.ts):
              // vcsWkid's registry, when it isn't wkid's.
              ...(crs.vcsAuthority !== undefined && {
                vcsAuthority: crs.vcsAuthority,
              }),
              ...(crs.epoch !== undefined && { epoch: String(crs.epoch) }),
            },
          },
        }
      : {
          format: "wkt2",
          extensions: { EXT_geospatial_crs_wkt2: { wkt2: crs.wkt2 } },
        };
  return {
    name: definition.name,
    body: definition.body.name === "Moon" ? "MOON" : "EARTH",
    crs: crsJson,
    ...(definition.site && {
      site: {
        origin: [...definition.site.origin],
        rotation: definition.site.rotation,
        scale: definition.site.scale,
      },
    }),
    ...(definition.areaOfInterest && {
      areaOfInterest: { ...definition.areaOfInterest },
    }),
    // The operation the tiles were built with, so a reader resolves the same
    // frame: the pinned pipeline (as the one string factory writes it), or
    // the geoid fallback.
    ...(definition.pipeline !== undefined && {
      pipeline: formatPipeline(
        typeof definition.pipeline === "string"
          ? parsePipeline(definition.pipeline)
          : definition.pipeline,
      ),
    }),
    ...(definition.geoidFallback !== undefined && {
      geoidFallback: definition.geoidFallback,
    }),
    ...(definition.fallbackSigma !== undefined && {
      fallbackSigma: definition.fallbackSigma,
    }),
    placement,
  };
}

const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 1)}\n`);
};

/**
 * Writes a tileset from a tree of design meshes: `top` is the top content
 * tile, each node with `id`, `mesh()` (built on demand; null for a tile with
 * no content, placed between its children), `geometricError` (design units)
 * and `children`. Above it a contentless root holds the rigid placement's
 * matrix, so tile centres stay small enough for float32. With `dual`, each
 * vertex carries its reprojected position too, and the tileset declares it
 * (`DUAL_POSITION_EXTENSION`). `normals: false` leaves NORMAL out (flat-shaded
 * content: glTF's reader computes the faces' normals). Returns the vertex
 * count, the GLB bytes written, the tile count, and with `whiskerSpacing`
 * (design units) leaf design points at least that far apart, flat.
 */
function writeTileset({
  top,
  frame,
  placement,
  dir,
  dual = false,
  name,
  color,
  log,
  normals = true,
  whiskerSpacing,
}) {
  let vertices = 0;
  let bytes = 0;
  let tiles = 0;
  let maxDistance = 0;
  const leafPoints = [];
  const rigid = placement.rigid.matrix;
  // Post-order: a node's box contains its children's.
  const visit = (node) => {
    const children = node.children.map(visit);
    const mesh = node.mesh();
    tiles++;
    if (mesh === null) {
      // No content: centred among its children, its box holding theirs.
      const centre = [0, 1, 2].map((k) =>
        Math.round(
          children.reduce((sum, c) => sum + c.centre[k], 0) / children.length,
        ),
      );
      return {
        id: node.id,
        geometricError: node.geometricError,
        children,
        centre,
        box: fitBox(
          DESIGN_AXES,
          [],
          children.map((c) => c.box),
        ),
      };
    }
    const contents = tileContents(mesh, frame, dual ? rigid : undefined);
    vertices += mesh.design.length / 3;
    maxDistance = Math.max(maxDistance, contents.maxDistance ?? 0);
    if (whiskerSpacing !== undefined && node.children.length === 0) {
      leafPoints.push(contents.drawn);
    }
    const uri = `tiles/${node.id}.glb`;
    const glb = writeGlb({
      positions: contents.positions,
      ...(normals && { normals: contents.normals }),
      indices: mesh.indices,
      featureIds: mesh.featureIds,
      features: mesh.features,
      color,
      ...(mesh.colors !== undefined && { colors: mesh.colors }),
      ...(dual && {
        attributes: {
          [REPROJECTED_SEMANTIC]: contents.reprojected,
          [STANDOFF_SEMANTIC]: contents.standOff,
        },
      }),
    });
    mkdirSync(join(dir, "tiles"), { recursive: true });
    writeFileSync(join(dir, uri), glb);
    bytes += glb.byteLength;
    return {
      id: node.id,
      uri,
      geometricError: node.geometricError,
      children,
      centre: contents.centre,
      box: fitBox(
        DESIGN_AXES,
        contents.drawn,
        children.map((c) => c.box),
      ),
    };
  };
  const built = visit(top);

  // The tile JSON: translations from the parent's centre to the tile's.
  const tileNode = (node, parentCentre) => ({
    id: node.id,
    box: boxJson(node.box, node.centre),
    geometricError: node.geometricError,
    transform: translation(sub(node.centre, parentCentre)),
    content: node.uri,
    children: node.children.map((c) => tileNode(c, node.centre)),
  });
  // The root: contentless, centred on the origin of design space.
  // Its error, in design units, is its box's diagonal, so the top tile is
  // drawn whenever the whole is more than a few pixels.
  const half = built.box.halfAxes.map((a) => Math.hypot(...a));
  const rootError = Math.max(2 * Math.hypot(...half), 2 * built.geometricError);
  const json = tilesetJson(
    {
      id: "root",
      box: boxJson(built.box, [0, 0, 0]),
      geometricError: rootError,
      children: [tileNode(built, [0, 0, 0])],
    },
    {
      transform: Array.from(rigid),
      extensions: {
        ...frameExtensions(frame.definition, {
          mode: "rigid",
          anchor: Array.from(placement.rigid.anchor),
        }),
        ...(dual && {
          [DUAL_POSITION_EXTENSION]: {
            position: REPROJECTED_SEMANTIC,
            maxDistance,
          },
        }),
      },
    },
  );
  // The tileset's own error isn't scaled by any transform: metres.
  json.geometricError = rootError * frame.units.metersPerUnit;
  writeJson(join(dir, "tileset.json"), json);
  log(
    `  ${name}: ${tiles.toLocaleString("en-US")} tiles, ${vertices.toLocaleString("en-US")} vertices, ${(bytes / 1e6).toFixed(1)} MB of GLB`,
  );
  let whiskers;
  if (whiskerSpacing !== undefined) {
    const all = new Float64Array(leafPoints.reduce((n, p) => n + p.length, 0));
    let at = 0;
    for (const p of leafPoints) {
      all.set(p, at);
      at += p.length;
    }
    whiskers = spacedPoints(all, whiskerSpacing).flatMap((v) => [
      all[3 * v],
      all[3 * v + 1],
      all[3 * v + 2],
    ]);
  }
  return { vertices, bytes, tiles, maxDistance, whiskers };
}

/**
 * The parts of a rigid placement's error at a design point, metres (the
 * placement at `anchor` ignores all three): the curvature d²/2R (R the
 * Gaussian radius √(MN) at the anchor), the scale d·|1 − 1/k| (k the
 * combined factor at the anchor: grid distance = ground distance × k), and
 * the geoid's rise from the anchor to the point (the change in ellipsoidal
 * height less the change in design height). The error is about
 * √((curvature − geoid)² + scale²).
 */
export function rigidErrorTerms(frame, anchor, point) {
  const d =
    Math.hypot(point[0] - anchor[0], point[1] - anchor[1]) *
    frame.units.metersPerUnit;
  const from = frame.toGeodetic(anchor);
  const to = frame.toGeodetic(point);
  const [a, , c] = frame.body.ellipsoid.radii;
  const e2 = 1 - (c * c) / (a * a);
  const w = Math.sqrt(1 - e2 * Math.sin(from.latitude) ** 2);
  const radius = Math.sqrt(((a * (1 - e2)) / w ** 3) * (a / w));
  const k = gridFactors(frame, anchor).combinedFactor;
  return {
    curvature: (d * d) / (2 * radius),
    scale: d * Math.abs(1 - 1 / k),
    geoid:
      to.height -
      from.height -
      (point[2] - anchor[2]) * frame.metersPerHeightUnit,
  };
}

/** A ladder site's answers: its extent, its rigid error at its edge and three points. */
function siteAnswers(site, frame, placement, plan, tree, written) {
  const mpu = frame.units.metersPerUnit;
  const anchor = modelAnchor(site);
  const { extent, farthest } = planExtent(plan, anchor);
  const point = (label, design) => ({
    label,
    design: Array.from(design),
    bodyFixed: Array.from(frame.toBodyFixed(design)),
    rigidDisplayed: Array.from(placement.displayed(design)),
    displayError: placement.displayError(design),
    distanceFromAnchor:
      Math.hypot(design[0] - anchor[0], design[1] - anchor[1]) * mpu,
  });
  const points = [
    point("Anchor", anchor),
    point("Farthest point", farthest),
    point(plan.landmark.label, plan.landmark.design),
  ];
  return {
    name: site.name,
    kind: site.model.kind,
    extent: extent * mpu,
    anchor: [...anchor],
    displayError: points[1].displayError,
    distanceFromAnchor: points[1].distanceFromAnchor,
    terms: rigidErrorTerms(frame, anchor, farthest),
    combinedFactor: gridFactors(frame, anchor).combinedFactor,
    points,
    tiles: {
      count: written.tiles,
      levels: tree.levels,
      vertices: written.vertices,
      leafError: LEAF_ERROR_METRES,
    },
    whiskers: written.whiskers,
  };
}

/** Points and pairs computed with the library: the example checks against them. */
function corridorAnswers(frame, alignment, placement, frames) {
  const mpu = frame.units.metersPerUnit;
  const anchor = placement.rigid.anchor;
  const horizontal = (p) =>
    Math.hypot(p[0] - anchor[0], p[1] - anchor[1]) * mpu;
  const stations = new Map();
  const tag = (station, label, extra = {}) => {
    const entry = stations.get(station) ?? { tags: [] };
    entry.tags.push(label);
    Object.assign(entry, extra);
    stations.set(station, entry);
  };
  for (
    let s = alignment.startStation;
    s <= alignment.endStation;
    s += ANSWER_INTERVAL
  ) {
    tag(s, `every ${ANSWER_INTERVAL.toLocaleString("en-US")}`);
  }
  for (const element of alignment.horizontalElements.slice(1)) {
    tag(element.station, `join (${element.kind} starts)`);
  }
  tag(alignment.endStation, "end");
  tag(BRIDGE.fromStation, "bridge start");
  tag(BRIDGE.toStation, "bridge end");
  tag(PAIR_STATIONS[0], "pair start");
  tag(PAIR_STATIONS[1], "pair end");
  tag(CURVE_PAIR_STATIONS[0], "curve pair start");
  tag(CURVE_PAIR_STATIONS[1], "curve pair end");
  tag(MARKER_STATION, "marker");
  // The whole stations nearest each distance on either side of the anchor.
  for (const target of NEAR_DISTANCES) {
    for (const side of [-1, 1]) {
      let best;
      const first =
        side < 0
          ? Math.ceil(alignment.startStation)
          : Math.ceil(ANCHOR_STATION);
      const last =
        side < 0
          ? Math.floor(ANCHOR_STATION)
          : Math.floor(alignment.endStation);
      for (let s = first; s <= last; s++) {
        const gap = Math.abs(horizontal(alignment.pointAt(s)) - target);
        if (best === undefined || gap < best.gap) {
          best = { s, gap };
        }
      }
      if (best !== undefined && best.gap < 1) {
        tag(best.s, `nearest ${target / 1000} km`, { nearKm: target / 1000 });
      }
    }
  }

  const points = [];
  for (const station of [...stations.keys()].sort((a, b) => a - b)) {
    const { tags, nearKm } = stations.get(station);
    for (const offset of ANSWER_OFFSETS) {
      const design = alignment.pointAt(station, offset);
      design[2] += sectionSurface(offset);
      const geodetic = frame.toGeodetic(design);
      const factors = gridFactors(frame, design);
      points.push({
        station,
        offset,
        tags,
        ...(nearKm !== undefined && { nearKm }),
        design: Array.from(design),
        bodyFixed: Array.from(frame.toBodyFixed(design)),
        rigidDisplayed: Array.from(placement.displayed(design)),
        displayError: placement.displayError(design),
        geodetic: {
          longitude: geodetic.longitude,
          latitude: geodetic.latitude,
          height: geodetic.height,
        },
        combinedFactor: factors.combinedFactor,
        convergence: factors.convergence,
        distanceFromAnchor: horizontal(design),
      });
    }
  }

  // The built-in leap seconds: 37 s on 2026-01-01, as in every later table
  // (leap seconds are never withdrawn), whichever table `frames` holds.
  const instant = Instant.fromUtc(
    Date.parse(DESIGN_TILES_INSTANT),
    LeapSeconds.builtIn(),
  );
  const pointIndex = (station, offset) => {
    const i = points.findIndex(
      (p) => p.station === station && p.offset === offset,
    );
    if (i < 0) {
      throw new Error(
        `designTiles: no answer point at station ${station}, offset ${offset}`,
      );
    }
    return i;
  };
  const measured = (a, b) =>
    measure(designPoint(frame, a), designPoint(frame, b), instant, frames, {
      signal: false,
      alignment: alignment.name,
    });
  const pairs = [
    {
      id: "last-tangent",
      label: "10,000 ftUS on the last tangent",
      a: [PAIR_STATIONS[0], 0],
      b: [PAIR_STATIONS[1], 0],
    },
    {
      id: "curve",
      label: "Across the 5,000 ft curve, tangent to tangent",
      a: [CURVE_PAIR_STATIONS[0], 0],
      b: [CURVE_PAIR_STATIONS[1], 0],
    },
    {
      id: "bridge",
      label: "Across the bridge, in the right lanes",
      a: [BRIDGE.fromStation, 17],
      b: [BRIDGE.toStation, 17],
    },
    {
      id: "end-to-end",
      label: "End to end",
      a: [alignment.startStation, 0],
      b: [alignment.endStation, 0],
    },
  ].map(({ id, label, a, b }) => {
    const from = pointIndex(...a);
    const to = pointIndex(...b);
    const m = measured(points[from].design, points[to].design);
    return {
      id,
      label,
      from,
      to,
      designDistance: m.design.distance,
      horizontalDistance: m.design.horizontalDistance,
      trueDistance: m.distance,
      ends: {
        a: { station: a[0], offset: a[1] },
        b: { station: b[0], offset: b[1] },
      },
    };
  });

  // The opening self-check: station 170,000's true position and where the
  // rigid placement draws the same design point.
  const markerIndex = pointIndex(MARKER_STATION, 0);
  const markerPoint = points[markerIndex];
  const marker = {
    station: MARKER_STATION,
    offset: 0,
    point: markerIndex,
    design: markerPoint.design,
    bodyFixed: markerPoint.bodyFixed,
    rigidDisplayed: markerPoint.rigidDisplayed,
    separation: Math.hypot(
      ...sub(markerPoint.rigidDisplayed, markerPoint.bodyFixed),
    ),
  };

  // The NGS mark: Earth-fixed straight from its published NAD83(2011)
  // position (on the Earth's ellipsoid, as the frame's operation takes
  // NAD83(2011)), and into design coordinates through the frame's own
  // operation (PROJ's zone 3, and NAVD88 through GEOID18).
  const g = SURVEY_MARK.geodetic;
  const markFixed = Array.from(
    frame.body.ellipsoid.cartographicToCartesian(
      {
        longitude: g.longitude,
        latitude: g.latitude,
        height: g.ellipsoidHeight,
      },
      new Float64Array(3),
    ),
  );
  const markDesign = Array.from(frame.fromBodyFixed(markFixed));
  const nearest = alignment.stationOffset(markDesign);
  const nearestDesign = Array.from(alignment.pointAt(nearest.station, 0));
  const toMark = measured(markDesign, nearestDesign);
  const mark = {
    pid: SURVEY_MARK.pid,
    name: SURVEY_MARK.name,
    datasheetUrl: SURVEY_MARK.datasheetUrl,
    retrieved: SURVEY_MARK.retrieved,
    geodetic: { ...g },
    publishedSpc: { ...SURVEY_MARK.publishedSpc },
    published: { ...SURVEY_MARK.published },
    design: markDesign,
    bodyFixed: markFixed,
    nearest: { station: nearest.station, offset: nearest.offset },
    nearestDesign,
    designDistance: toMark.design.distance,
    horizontalDistance: toMark.design.horizontalDistance,
    // `measure`'s, as the page's: the straight line between where the two
    // design points truly are.
    trueDistance: toMark.distance,
  };

  return {
    version: ANSWERS_VERSION,
    instant: DESIGN_TILES_INSTANT,
    anchorStation: ANCHOR_STATION,
    alignment: alignment.name,
    frame: {
      name: frame.definition.name,
      unitName: frame.units.horizontalUnitName,
      metersPerUnit: mpu,
      metersPerHeightUnit: frame.metersPerHeightUnit,
      operation: frame.operation.matchedCandidate ?? null,
      operationAccuracy: frame.operation.accuracy ?? null,
      grids: [...frame.operation.grids],
    },
    notes: [
      "Design points are on the section's surface: the profile plus the cross slope at the offset (under the barriers at offsets 0 and ±40).",
      "bodyFixed and rigidDisplayed are Earth-fixed metres; geodetic is radians and metres above the ellipsoid; convergence is radians.",
      "distanceFromAnchor is the horizontal design distance from the anchor in metres; nearKm marks the whole stations nearest 10 and 20 km on either side.",
      "Pairs: from and to index points; designDistance is 3D in design units (the height difference converted), horizontalDistance E and N alone, trueDistance the straight line in metres.",
      "marker: station 170,000 on the centreline, its true position and the rigid placement's; separation is the distance between them, metres.",
      "mark: an NGS survey mark from its datasheet. design is its published NAD83(2011) position through the frame's operation; bodyFixed is that position on the ellipsoid, independent of the pipeline; its distances are to the nearest centreline point (on the profile).",
    ],
    points,
    pairs,
    marker,
    mark,
  };
}

/**
 * Generates `<store>/design-globe/` unless its manifest is current (same
 * version, instant and input hashes, and every output present).
 *
 * @param {string} store
 * @param {import("../src/engineering/projApi.ts").ProjApi} proj
 * @param {import("../src/engineering/proj.ts").GridSource} grids
 * @param {import("../src/frames/frames.ts").Frames} frames
 * @param {(line: string) => void} [logger]
 */
export async function ensureDesignTiles(
  store,
  proj,
  grids,
  frames,
  logger = console.log,
) {
  const out = join(store, DESIGN_TILES_DIRECTORY);
  const wanted = wantedManifest(store);
  const outputs = [
    "answers.json",
    "corridor/tileset.json",
    "site-building/tileset.json",
    ...PORTFOLIO.map((site) => `portfolio-${site.id}/tileset.json`),
  ];
  try {
    const current = JSON.parse(
      readFileSync(join(out, "manifest.json"), "utf8"),
    );
    if (
      inputsOf(current) === inputsOf(wanted) &&
      outputs.every((file) => existsSync(join(out, file)))
    ) {
      logger(`design globe: current (${relative(store, out)}/manifest.json)`);
      return;
    }
  } catch {
    // Absent or unreadable: generate.
  }
  const started = performance.now();
  logger(`design globe: generating into ${out}`);
  // A build directory of this run's own (two setups at once don't share
  // one), ending ".partial" so the dev server never serves it; another
  // run's, left for an hour, is swept.
  const tag = `${process.pid}-${Date.now()}`;
  const partial = `${out}.${tag}.partial`;
  for (const name of readdirSync(store)) {
    const path = join(store, name);
    if (
      name.startsWith(`${DESIGN_TILES_DIRECTORY}.`) &&
      name.endsWith(".partial") &&
      Date.now() - statSync(path).mtimeMs > 3_600_000
    ) {
      rmSync(path, { recursive: true, force: true });
    }
  }
  mkdirSync(partial, { recursive: true });
  // Each frame's resolved operation, for the manifest.
  const resolved = {};
  const record = (id, f) => {
    resolved[id] = {
      grids: [...f.operation.grids],
      operation: f.operation.matchedCandidate ?? null,
      ...(f.fallback && { fallback: f.fallback.model }),
    };
  };

  const frame = await EngineeringFrame.load(corridorFrame(), { proj, grids });
  const alignment = frame.alignments.find(
    (a) => a.name === CORRIDOR_ALIGNMENT.name,
  );
  record("corridor", frame);
  const placement = placeRigid(frame, alignment.pointAt(ANCHOR_STATION));
  const tree = corridorTree(alignment, {
    leafLength: LEAF_LENGTH,
    chordTolerance: CHORD_TOLERANCE,
  });
  // A leaf states the sampling's tolerance; a parent twice its children's
  // largest, or its own stations' largest chord error where that is more
  // (decimating 2× makes a curve's chords err about 4× as much), or what its
  // side slopes miss of its leaves' (`largestSlopeError`: the slopes' runs
  // and rises change at the sampled sections, which a parent skips). The
  // ticks a parent drops (it keeps every 2^level-th) aren't counted: they
  // are small marks 0.03 ft above the surface.
  const leafStations = (node) =>
    node.children.length === 0
      ? node.stations
      : Float64Array.from(
          new Set(node.children.flatMap((c) => [...leafStations(c)])),
        );
  const withErrors = (node) => {
    const children = node.children.map(withErrors);
    return {
      id: node.id,
      mesh: () =>
        corridorMesh(alignment, node.stations, {
          tickInterval: node.tickInterval,
        }),
      geometricError:
        children.length === 0
          ? CHORD_TOLERANCE
          : Math.max(
              2 * Math.max(...children.map((c) => c.geometricError)),
              largestChordError(alignment, node.stations),
              largestSlopeError(alignment, node.stations, leafStations(node)),
            ),
      children,
    };
  };
  const corridor = writeTileset({
    top: withErrors(tree),
    frame,
    placement,
    dir: join(partial, "corridor"),
    dual: true,
    name: "corridor (rigid and reprojected)",
    // Each vertex's colour (corridorMesh.mjs `CORRIDOR_PALETTE`).
    color: WHITE,
    log: logger,
  });

  const loadSite = async (site) => {
    try {
      const siteFrame = await EngineeringFrame.load(site.frame, {
        proj,
        grids,
      });
      record(site.id, siteFrame);
      return siteFrame;
    } catch (error) {
      throw new Error(
        `design globe: ${site.name}'s frame doesn't load from the store's grids (it reads ${site.grids.join(", ")}; setup's default grid sets, portfolio and tests, have them): ${error.message}`,
        { cause: error },
      );
    }
  };

  // The site-grid building: one rigid tile.
  {
    const siteFrame = await loadSite(SITE_BUILDING);
    const mesh = buildingMesh(SITE_BUILDING);
    // Exact boxes: a leaf errs only by float32 rounding, half an ulp of its
    // largest coordinate from its centre.
    const { width, depth, stories, storyHeight, plinth } = SITE_BUILDING.model;
    const reach = Math.max(
      width,
      depth,
      stories * storyHeight +
        (SITE_BUILDING.origin[2] - (plinth ?? SITE_BUILDING.origin[2])),
    );
    // The plinth in concrete, the stories in the building's colour.
    const colors = new Float32Array(mesh.featureIds.length * 4);
    mesh.featureIds.forEach((id, v) => {
      colors.set(
        mesh.features[id].kind === "plinth" ? PLINTH_COLOR : BUILDING_COLOR,
        v * 4,
      );
    });
    writeTileset({
      top: {
        id: "0-0",
        mesh: () => ({ ...mesh, colors }),
        geometricError: reach * 2 ** -24,
        children: [],
      },
      frame: siteFrame,
      placement: placeRigid(siteFrame, buildingAnchor(SITE_BUILDING)),
      dir: join(partial, "site-building"),
      name: SITE_BUILDING.name,
      // The vertices carry the colours; the material is white, or glTF
      // multiplies them (the stories would read BUILDING_COLOR squared).
      color: WHITE,
      log: logger,
    });
  }

  // The scale ladder: each portfolio site's model in both placements, one
  // tree, rigid at the model's middle.
  const sites = {};
  for (const site of PORTFOLIO) {
    const at = performance.now();
    const siteFrame = await loadSite(site);
    const mpu = siteFrame.units.metersPerUnit;
    const plan = ladderPlan(site, { metersPerUnit: mpu });
    const tree = ladderTree(plan, {
      leafError: LEAF_ERROR_METRES / mpu,
      metersPerUnit: mpu,
    });
    const placement = placeRigid(siteFrame, modelAnchor(site));
    const written = writeTileset({
      top: tree.top,
      frame: siteFrame,
      placement,
      dir: join(partial, `portfolio-${site.id}`),
      dual: true,
      name: `${site.name} (${site.model.kind}, rigid and reprojected)`,
      color: WHITE,
      log: logger,
      // Flat-shaded throughout: the reader's own face normals, a third of
      // the bytes saved.
      normals: false,
      // About twelve across the model, 2 m apart at the least.
      whiskerSpacing: Math.max(
        2 / mpu,
        planExtent(plan, modelAnchor(site)).extent / 12,
      ),
    });
    sites[site.id] = siteAnswers(
      site,
      siteFrame,
      placement,
      plan,
      tree,
      written,
    );
    const answer = sites[site.id];
    logger(
      `    ${(answer.extent / 1000).toFixed(2)} km across, ${tree.levels} levels; rigid ${answer.displayError.toPrecision(3)} m off at ${(answer.distanceFromAnchor / 1000).toFixed(2)} km; ${((performance.now() - at) / 1000).toFixed(1)} s`,
    );
  }

  // Checked as the page reads it, so the file is the type's shape.
  writeJson(
    join(partial, "answers.json"),
    parseAnswers({
      ...corridorAnswers(frame, alignment, placement, frames),
      sites,
    }),
  );
  writeJson(join(partial, "manifest.json"), { ...wanted, frames: resolved });
  // Move the old output aside, the new one in, then remove the old.
  const old = `${out}.${tag}-old.partial`;
  if (existsSync(out)) {
    renameSync(out, old);
  }
  renameSync(partial, out);
  rmSync(old, { recursive: true, force: true });
  const seconds = (performance.now() - started) / 1000;
  logger(
    `design globe: ${corridor.vertices.toLocaleString("en-US")} corridor vertices and the ladder's seven sites, written in ${seconds.toFixed(1)} s`,
  );
}
