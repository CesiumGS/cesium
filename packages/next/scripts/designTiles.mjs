// The design globe's generated tiles and exact answers (plan 4b Task 14;
// the plan's calls 15 and 17). `npm run setup` runs it, after the frames data
// and the grids, into `<store>/design-globe/`:
//  - corridor-rigid/ and corridor-reprojected/: the corridor twice, one tile
//    tree with the same tile ids and vertex order (call 15, for plan 5's
//    morph). The rigid one is design units under one root transform, the
//    rigid placement's matrix at the alignment's middle; the reprojected one
//    is every vertex through the frame, in Earth-fixed metres;
//  - site-building/ and portfolio-<id>/: each site's building, rigid at its
//    footprint's centre;
//  - answers.json: exact values at points and between pairs, from the
//    library, at DESIGN_TILES_INSTANT, for the example's checks;
//  - manifest.json: version 1 and the SHA-256 of the inputs, so it
//    regenerates only when they change.
//
// Tiles are glTF Y-up: a tile-space (E, N, U) is written (E, U, −N), and an
// Earth-fixed offset (X, Y, Z) is written (X, Z, −Y). Tile centres are whole
// design units (rigid) and whole metres (reprojected), so the engine's sums
// of tile translations are exact; a rigid vertex is the float32 nearest its
// design point less its tile's centre, and the reprojected vertex is the
// frame's image of exactly that design point (the centre plus the float32),
// so both tilesets draw one set of design points.
//
// The output is built in `design-globe.partial/` (which the dev server's
// /frames-data mount never serves) and renamed into place when complete.
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ANCHOR_STATION,
  BRIDGE,
  CORRIDOR_ALIGNMENT,
  corridorFrame,
  sectionSurface,
} from "../examples/design-globe/corridor.ts";
import { PORTFOLIO, SITE_BUILDING } from "../examples/design-globe/sites.ts";
import { Ephemeris } from "../src/ephemeris/Ephemeris.ts";
import {
  EngineeringFrame,
  designPoint,
} from "../src/engineering/EngineeringFrame.ts";
import { gridFactors } from "../src/engineering/factors.ts";
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
} from "./designTiles/corridorMesh.mjs";
import { writeGlb } from "./designTiles/gltf.mjs";
import { buildingAnchor, buildingMesh } from "./designTiles/siteMesh.mjs";
import { tilesetJson } from "./designTiles/tileset.mjs";

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
/** Linear RGBA. */
const CORRIDOR_COLOR = [0.45, 0.45, 0.43, 1];
const BUILDING_COLOR = [0.62, 0.5, 0.38, 1];

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
/** The inputs whose SHA-256 the manifest records (paths from the package). */
const INPUTS = [
  "examples/design-globe/corridor.ts",
  "examples/design-globe/sites.ts",
  "scripts/designTiles.mjs",
  "scripts/designTiles/corridorMesh.mjs",
  "scripts/designTiles/siteMesh.mjs",
  "scripts/designTiles/gltf.mjs",
  "scripts/designTiles/tileset.mjs",
  // The library the tiles and answers come from.
  "src/engineering/alignment.ts",
  "src/engineering/EngineeringFrame.ts",
  "src/engineering/placement.ts",
  "src/engineering/factors.ts",
  "src/engineering/projPins.ts",
  "src/measure/measure.ts",
];

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** What the manifest must say for the output to be current. */
function wantedManifest() {
  return {
    version: VERSION,
    instant: DESIGN_TILES_INSTANT,
    sha256: Object.fromEntries(
      INPUTS.map((file) => [file, sha256(readFileSync(join(root, file)))]),
    ),
  };
}

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
const unit = (v) => {
  const length = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / length, v[1] / length, v[2] / length];
};
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
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
    // A flat box (a level slab) keeps a little thickness.
    const half = Math.max((hi[k] - lo[k]) / 2, 1e-3);
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

/** East, north and up at an Earth-fixed position on the frame's body. */
function enuAxes(frame, position) {
  const up = unit(
    Array.from(
      frame.body.ellipsoid.geodeticSurfaceNormal(
        Float64Array.from(position),
        new Float64Array(3),
      ),
    ),
  );
  const east = unit([-position[1], position[0], 0]);
  return [east, cross(up, east), up];
}

/**
 * One tile's content in both placements, from its design-coordinate mesh.
 * The rigid content is the float32 nearest each design point less the tile's
 * centre (whole design units); the reprojected content is the frame's image
 * of exactly that point, less its own centre (whole metres).
 */
function tileContents(mesh, frame, reprojected) {
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
  const rigid = {
    centre,
    positions: new Float32Array(design.length),
    normals: new Float32Array(design.length),
  };
  for (let i = 0; i < count; i++) {
    const [e, n, u] = [local[3 * i], local[3 * i + 1], local[3 * i + 2]];
    rigid.positions.set([e, u, -n], 3 * i);
    const [ne, nn, nu] = [
      normals[3 * i],
      normals[3 * i + 1],
      normals[3 * i + 2],
    ];
    rigid.normals.set([ne, nu, -nn], 3 * i);
  }
  if (!reprojected) {
    return { drawn, rigid };
  }

  const fixed = new Float64Array(design.length);
  const scratch = new Float64Array(3);
  for (let i = 0; i < count; i++) {
    frame.toBodyFixed(drawn.subarray(3 * i, 3 * i + 3), scratch);
    fixed.set(scratch, 3 * i);
  }
  const flo = [Infinity, Infinity, Infinity];
  const fhi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < fixed.length; i++) {
    flo[i % 3] = Math.min(flo[i % 3], fixed[i]);
    fhi[i % 3] = Math.max(fhi[i % 3], fixed[i]);
  }
  const fixedCentre = [0, 1, 2].map((k) => Math.round((flo[k] + fhi[k]) / 2));
  // The frame's Jacobian at the tile's design centre, for the normals: the
  // projection is conformal, so it turns a design direction as it turns the
  // surface's normal.
  const at = frame.toBodyFixed(centre);
  const columns = DESIGN_AXES.map((axis) =>
    sub(
      frame.toBodyFixed([
        centre[0] + axis[0],
        centre[1] + axis[1],
        centre[2] + axis[2],
      ]),
      at,
    ),
  );
  const positions = new Float32Array(design.length);
  const fixedNormals = new Float32Array(design.length);
  const exact = new Float64Array(design.length);
  for (let i = 0; i < count; i++) {
    const [x, y, z] = [0, 1, 2].map((k) => fixed[3 * i + k] - fixedCentre[k]);
    positions.set([x, z, -y], 3 * i);
    const n = [normals[3 * i], normals[3 * i + 1], normals[3 * i + 2]];
    const m = unit(
      [0, 1, 2].map(
        (j) =>
          columns[0][j] * n[0] + columns[1][j] * n[1] + columns[2][j] * n[2],
      ),
    );
    fixedNormals.set([m[0], m[2], -m[1]], 3 * i);
  }
  // The reprojected points as drawn (centre + float32), for the box.
  for (let i = 0; i < count; i++) {
    exact[3 * i] = fixedCentre[0] + positions[3 * i];
    exact[3 * i + 1] = fixedCentre[1] - positions[3 * i + 2];
    exact[3 * i + 2] = fixedCentre[2] + positions[3 * i + 1];
  }
  return {
    drawn,
    rigid,
    reprojected: {
      centre: fixedCentre,
      positions,
      normals: fixedNormals,
      drawn: exact,
    },
  };
}

/** The `EXT_engineering_frame` declaration of a frame and a placement. */
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
              ...(crs.epoch !== undefined && { epoch: String(crs.epoch) }),
            },
          },
        }
      : {
          format: "wkt2",
          extensions: { EXT_geospatial_crs_wkt2: { wkt2: crs.wkt2 } },
        };
  // JSON has no Infinity: a spiral's tangent end is null.
  const radius = (r) => (Number.isFinite(r) ? r : null);
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
    ...(definition.alignments && {
      alignments: definition.alignments.map((a) => ({
        ...a,
        start: [...a.start],
        horizontal: a.horizontal.map((e) =>
          e.kind === "spiral"
            ? {
                ...e,
                startRadius: radius(e.startRadius),
                endRadius: radius(e.endRadius),
              }
            : { ...e },
        ),
      })),
    }),
    ...(definition.areaOfInterest && {
      areaOfInterest: { ...definition.areaOfInterest },
    }),
    placement,
  };
}

const writeJson = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 1)}\n`);
};

/**
 * Writes a tileset or two from a tree of design meshes: `top` is the top
 * content tile, each node with `id`, `mesh()` (built on demand),
 * `geometricError` (design units) and `children`. Above it a contentless
 * root holds the rigid placement's matrix (rigid) or nothing (reprojected),
 * so tile centres stay small enough for float32. With `reprojectedDir`, the
 * reprojected tileset too. Returns the vertex count (one placement's) and
 * the GLB bytes written.
 */
function writeTilesets({
  top,
  frame,
  placement,
  rigidDir,
  reprojectedDir,
  name,
  color,
  log,
}) {
  const mpu = frame.units.metersPerUnit;
  let vertices = 0;
  let bytes = 0;
  // Post-order: a node's box contains its children's.
  const visit = (node) => {
    const children = node.children.map(visit);
    const mesh = node.mesh();
    const contents = tileContents(mesh, frame, reprojectedDir !== undefined);
    vertices += mesh.design.length / 3;
    const uri = `tiles/${node.id}.glb`;
    const glb = (positions, normals) =>
      writeGlb({
        positions,
        normals,
        indices: mesh.indices,
        featureIds: mesh.featureIds,
        features: mesh.features,
        color,
      });
    const rigidGlb = glb(contents.rigid.positions, contents.rigid.normals);
    mkdirSync(join(rigidDir, "tiles"), { recursive: true });
    writeFileSync(join(rigidDir, uri), rigidGlb);
    bytes += rigidGlb.byteLength;
    const result = {
      id: node.id,
      uri,
      geometricError: node.geometricError,
      children,
      rigid: {
        centre: contents.rigid.centre,
        box: fitBox(
          DESIGN_AXES,
          contents.drawn,
          children.map((c) => c.rigid.box),
        ),
      },
    };
    if (reprojectedDir !== undefined) {
      const r = contents.reprojected;
      const reprojectedGlb = glb(r.positions, r.normals);
      mkdirSync(join(reprojectedDir, "tiles"), { recursive: true });
      writeFileSync(join(reprojectedDir, uri), reprojectedGlb);
      bytes += reprojectedGlb.byteLength;
      result.reprojected = {
        centre: r.centre,
        box: fitBox(
          enuAxes(frame, r.centre),
          r.drawn,
          children.map((c) => c.reprojected.box),
        ),
      };
    }
    return result;
  };
  const built = visit(top);

  // The tile JSON: translations from the parent's centre to the tile's.
  const tileNode = (node, mode, parentCentre, scale) => ({
    id: node.id,
    box: boxJson(node[mode].box, node[mode].centre),
    geometricError: node.geometricError * scale,
    transform: translation(sub(node[mode].centre, parentCentre)),
    content: node.uri,
    children: node.children.map((c) =>
      tileNode(c, mode, node[mode].centre, scale),
    ),
  });
  // The root: contentless, centred on the origin (design or Earth-fixed).
  // Its error, in design units, is its rigid box's diagonal, so the top tile
  // is drawn whenever the whole is more than a few pixels.
  const half = built.rigid.box.halfAxes.map((a) => Math.hypot(...a));
  const rootError = Math.max(2 * Math.hypot(...half), 2 * built.geometricError);
  const rootNode = (mode, scale) => ({
    id: "root",
    box: boxJson(built[mode].box, [0, 0, 0]),
    geometricError: rootError * scale,
    children: [tileNode(built, mode, [0, 0, 0], scale)],
  });
  const rigidJson = tilesetJson(rootNode("rigid", 1), {
    transform: Array.from(placement.rigid.matrix),
    extension: declaration(frame.definition, {
      mode: "rigid",
      anchor: Array.from(placement.rigid.anchor),
    }),
  });
  // The tileset's own error isn't scaled by any transform: metres in both.
  rigidJson.geometricError = rootError * mpu;
  writeJson(join(rigidDir, "tileset.json"), rigidJson);
  if (reprojectedDir !== undefined) {
    // Metres where the rigid tileset has design units: the engine scales the
    // rigid one's errors by its root transform (metersPerUnit), so both state
    // the same error.
    const reprojectedJson = tilesetJson(rootNode("reprojected", mpu), {
      extension: declaration(frame.definition, { mode: "reprojected" }),
    });
    writeJson(join(reprojectedDir, "tileset.json"), reprojectedJson);
  }
  log(
    `  ${name}: ${vertices.toLocaleString("en-US")} vertices, ${(bytes / 1e6).toFixed(1)} MB of GLB`,
  );
  return { vertices, bytes };
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
        displayed: Array.from(placement.displayed(design)),
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

  const instant = Instant.fromUtc(
    Date.parse(DESIGN_TILES_INSTANT),
    LeapSeconds.builtIn(),
  );
  const elements = alignment.horizontalElements;
  const at = (station, offset) => {
    const design = alignment.pointAt(station, offset);
    design[2] += sectionSurface(offset);
    return { station, offset, design: Array.from(design) };
  };
  const pairs = [
    {
      id: "first-tangent",
      label: "10,000 ft on the first tangent",
      a: at(alignment.startStation, 0),
      b: at(alignment.startStation + 10_000, 0),
    },
    {
      id: "curve",
      label: "Across the 5,000 ft curve, spiral to spiral",
      a: at(elements[1].station, 0),
      b: at(elements[4].station, 0),
    },
    {
      id: "bridge",
      label: "Across the bridge, in the right lanes",
      a: at(BRIDGE.fromStation, 17),
      b: at(BRIDGE.toStation, 17),
    },
    {
      id: "end-to-end",
      label: "End to end",
      a: at(alignment.startStation, 0),
      b: at(alignment.endStation, 0),
    },
  ].map((pair) => {
    const m = measure(
      designPoint(frame, pair.a.design),
      designPoint(frame, pair.b.design),
      instant,
      frames,
      { signal: false, alignment: alignment.name },
    );
    return {
      ...pair,
      design: {
        distance: m.design.distance,
        horizontalDistance: m.design.horizontalDistance,
        unitName: m.design.unitName,
      },
      distance: m.distance,
    };
  });
  return {
    version: VERSION,
    instant: DESIGN_TILES_INSTANT,
    frame: {
      name: frame.definition.name,
      crs: frame.definition.crs,
      pipeline: frame.definition.pipeline,
      operation: frame.operation.matchedCandidate ?? null,
      operationAccuracy: frame.operation.accuracy ?? null,
      grids: [...frame.operation.grids],
      metersPerUnit: mpu,
      metersPerHeightUnit: frame.metersPerHeightUnit,
    },
    alignment: alignment.name,
    anchor: { station: ANCHOR_STATION, design: Array.from(anchor) },
    notes: [
      "Design points are on the section's surface: the profile plus the cross slope at the offset (under the barriers at offsets 0 and ±40).",
      "bodyFixed and displayed are Earth-fixed metres; geodetic is radians and metres above the ellipsoid; convergence is radians.",
      "distanceFromAnchor is the horizontal design distance from the anchor in metres; nearKm marks the whole stations nearest 10 and 20 km on either side.",
      "Pairs: design distances are in design units (3D with the height difference converted), distance is the straight line in metres.",
    ],
    points,
    pairs,
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
  const out = join(store, "design-globe");
  const wanted = wantedManifest();
  const outputs = [
    "answers.json",
    "corridor-rigid/tileset.json",
    "corridor-reprojected/tileset.json",
    "site-building/tileset.json",
    ...PORTFOLIO.map((site) => `portfolio-${site.id}/tileset.json`),
  ];
  try {
    const current = JSON.parse(
      readFileSync(join(out, "manifest.json"), "utf8"),
    );
    if (
      JSON.stringify(current) === JSON.stringify(wanted) &&
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
  const partial = `${out}.partial`;
  rmSync(partial, { recursive: true, force: true });
  mkdirSync(partial, { recursive: true });

  const frame = await EngineeringFrame.load(corridorFrame(), { proj, grids });
  const alignment = frame.alignments.find(
    (a) => a.name === CORRIDOR_ALIGNMENT.name,
  );
  const placement = placeRigid(frame, alignment.pointAt(ANCHOR_STATION));
  const tree = corridorTree(alignment, {
    leafLength: LEAF_LENGTH,
    chordTolerance: CHORD_TOLERANCE,
  });
  // A leaf states the sampling's tolerance; a parent twice its children's
  // largest, or its own stations' largest chord error where that is more
  // (decimating 2× makes a curve's chords err about 4× as much).
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
            ),
      children,
    };
  };
  const corridor = writeTilesets({
    top: withErrors(tree),
    frame,
    placement,
    rigidDir: join(partial, "corridor-rigid"),
    reprojectedDir: join(partial, "corridor-reprojected"),
    name: "corridor (rigid and reprojected)",
    color: CORRIDOR_COLOR,
    log: logger,
  });

  for (const site of [SITE_BUILDING, ...PORTFOLIO]) {
    const siteFrame = await EngineeringFrame.load(site.frame, { proj, grids });
    const mesh = buildingMesh(site);
    // Exact boxes: a leaf errs only by float32 rounding, half an ulp of its
    // largest coordinate from its centre.
    const reach = Math.max(
      site.model.width,
      site.model.depth,
      site.model.stories * site.model.storyHeight,
    );
    writeTilesets({
      top: {
        id: "0-0",
        mesh: () => mesh,
        geometricError: reach * 2 ** -24,
        children: [],
      },
      frame: siteFrame,
      placement: placeRigid(siteFrame, buildingAnchor(site)),
      rigidDir: join(
        partial,
        site === SITE_BUILDING ? "site-building" : `portfolio-${site.id}`,
      ),
      name: site.name,
      color: BUILDING_COLOR,
      log: logger,
    });
  }

  writeJson(
    join(partial, "answers.json"),
    corridorAnswers(frame, alignment, placement, frames),
  );
  writeJson(join(partial, "manifest.json"), wanted);
  rmSync(out, { recursive: true, force: true });
  renameSync(partial, out);
  const seconds = (performance.now() - started) / 1000;
  logger(
    `design globe: ${corridor.vertices.toLocaleString("en-US")} corridor vertices per placement, written in ${seconds.toFixed(1)} s`,
  );
}
