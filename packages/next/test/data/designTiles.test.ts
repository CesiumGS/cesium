// The design globe's generated tiles and answers (plan 4b Task 14), read
// from the store `npm run setup` fills (`<store>/design-globe/`):
//  - the corridor's rigid and reprojected tilesets have one tree, the same
//    tile ids and per-tile vertex counts (call 15), and equal geometric
//    errors once the engine scales them by their transforms;
//  - spec section 10's round trip, design -> displayed -> design within
//    1e-4 m, on every 50th vertex of every leaf, in either placement (the
//    exact drawn position stands in for the pick);
//  - the rigid roots are their placements' matrices (`checkRigidTransform`);
//  - the answers' rigid sag at 10 and 20 km is the spec's, and answers
//    recomputed with the library are the same numbers;
//  - answers.json is `Answers`' shape (Task 17): the station 170,000
//    marker's rigid separation, the survey mark's zone 3 coordinates
//    through PROJ against NGS's datasheet, and the measurement model on the
//    library's own measurement of pairs[0].
// `npm run test:data` runs it.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it, vi } from "vitest";

// Tile.ts reaches the content decoders, which need a browser worker; the
// tilesets here are only parsed.
vi.mock("../../src/io/decoders.ts", () => ({
  decodeDraco: async () => {
    throw new Error("no Draco");
  },
  transcodeKtx2: async () => {
    throw new Error("no KTX2");
  },
}));

import {
  ANCHOR_STATION,
  CORRIDOR_ALIGNMENT,
  SURVEY_MARK,
  corridorFrame,
  sectionSurface,
} from "../../examples/design-globe/corridor.ts";
import { parseAnswers } from "../../examples/design-globe/answers.ts";
import {
  MARK_SPC_TOLERANCE,
  checkRows,
} from "../../examples/design-globe/checks.ts";
import { measurementModel } from "../../examples/design-globe/measureModel.ts";
import type { SnapResult } from "../../src/engineering/snap.ts";
import {
  corridorTree,
  largestChordError,
  type CorridorNode,
} from "../../scripts/designTiles/corridorMesh.mjs";
import { PORTFOLIO, SITE_BUILDING } from "../../examples/design-globe/sites.ts";
import { DESIGN_TILES_INSTANT } from "../../scripts/designTiles.mjs";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import { Alignment } from "../../src/engineering/alignment.ts";
import {
  EngineeringFrame,
  designPoint,
} from "../../src/engineering/EngineeringFrame.ts";
import { gridFactors } from "../../src/engineering/factors.ts";
import {
  checkRigidTransform,
  declaredDefinition,
  readGeoreference,
} from "../../src/engineering/georeferenceTileset.ts";
import {
  formatPipeline,
  parsePipeline,
} from "../../src/engineering/pipeline.ts";
import {
  placeReprojected,
  placeRigid,
  type TilesetPlacement,
} from "../../src/engineering/placement.ts";
import {
  gridSource,
  loadProj,
  type GridSource,
} from "../../src/engineering/proj.ts";
import type { ProjApi } from "../../src/engineering/projApi.ts";
import { Ephemeris } from "../../src/ephemeris/Ephemeris.ts";
import { createFrames } from "../../src/frames/frames.ts";
import { splitGlb } from "../../src/io/glb.ts";
import { measure } from "../../src/measure/measure.ts";
import { treeFromJson, type Tile } from "../../src/streaming/Tile.ts";
import { EarthOrientationParameters } from "../../src/time/eop.ts";
import { Instant } from "../../src/time/Instant.ts";
import { LeapSeconds } from "../../src/time/leapSeconds.ts";

const store = framesDataDirectory();
const out = join(store, "design-globe");
const read = (...parts: string[]) => readFileSync(join(out, ...parts));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
const tileset = (name: string): Json =>
  JSON.parse(read(name, "tileset.json").toString("utf8"));

/** Each tile's content URI (or "") and its children, in order. */
type Shape = { uri: string; children: Shape[] };
const shape = (tile: Json): Shape => ({
  uri: tile.content?.uri ?? "",
  children: (tile.children ?? []).map(shape),
});

/** A GLB's POSITION accessor as a Float32Array. */
function positions(bytes: Uint8Array): Float32Array {
  const { json, bin } = splitGlb(bytes);
  const accessor =
    json.accessors[json.meshes[0].primitives[0].attributes.POSITION];
  const view = json.bufferViews[accessor.bufferView];
  const offset =
    bin!.byteOffset + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  return new Float32Array(
    bin!.buffer.slice(offset, offset + 12 * accessor.count),
  );
}

/** Pairs of (json tile, engine tile), depth first. */
function* walk(
  json: Json,
  tile: Tile,
  chain: number[][] = [],
): Generator<{
  json: Json;
  tile: Tile;
  chain: number[][];
}> {
  const here = json.transform ? [...chain, json.transform] : chain;
  yield { json, tile, chain: here };
  const children = json.children ?? [];
  for (let i = 0; i < children.length; i++) {
    yield* walk(children[i], tile.children[i]!, here);
  }
}

const tree = (json: Json) =>
  treeFromJson(json, "http://x/tileset.json", undefined, {
    warnings: new Set<string>(),
  } as never).root;

/** A column-major 4x4 applied to a point. */
const apply = (m: ArrayLike<number>, p: ArrayLike<number>) =>
  [0, 1, 2].map(
    (i) => m[i]! * p[0]! + m[4 + i]! * p[1]! + m[8 + i]! * p[2]! + m[12 + i]!,
  );

/** glTF Y-up content to tile space (Z-up): (x, y, z) -> (x, -z, y). */
const zUp = (p: Float32Array, i: number) => [
  p[3 * i]!,
  -p[3 * i + 2]!,
  p[3 * i + 1]!,
];

describe("the design globe's generated tiles", () => {
  let rigidJson: Json;
  let reprojectedJson: Json;
  let answers: Json;
  const alignment = new Alignment(CORRIDOR_ALIGNMENT);
  const anchor = alignment.pointAt(ANCHOR_STATION);

  let P: ProjApi;
  let source: GridSource;
  let frame: EngineeringFrame;
  let rigid: TilesetPlacement;
  let reprojected: TilesetPlacement;
  beforeAll(async () => {
    if (!existsSync(join(out, "manifest.json"))) {
      throw new Error(`${out}/manifest.json is missing: run \`npm run setup\``);
    }
    rigidJson = tileset("corridor-rigid");
    reprojectedJson = tileset("corridor-reprojected");
    answers = JSON.parse(read("answers.json").toString("utf8"));
    P = await loadProj({ base: `${join(store, "proj")}/`, grids: [] });
    source = await gridSource({ base: `${join(store, "grids")}/` });
    // Every frame here is the one the tileset's own declaration describes,
    // loaded as georeferenceTileset loads it: a reader of the declaration
    // gets these tiles' frame.
    frame = await declaredFrame(rigidJson, "corridor-rigid");
    rigid = placeRigid(frame, anchor);
    reprojected = placeReprojected(
      await declaredFrame(reprojectedJson, "corridor-reprojected"),
    );
  });

  /** The frame a tileset's declaration describes, its grids checked first. */
  async function declaredFrame(json: Json, name: string) {
    const declared = readGeoreference(json)!;
    return EngineeringFrame.load(
      declaredDefinition(declared, name, source.catalog),
      {
        proj: P,
        grids: source,
      },
    );
  }

  it("writes a manifest of version 1 with the inputs' hashes", () => {
    const manifest = JSON.parse(read("manifest.json").toString("utf8"));
    expect(manifest.version).toBe(1);
    for (const file of [
      "examples/design-globe/corridor.ts",
      "examples/design-globe/sites.ts",
      "scripts/designTiles.mjs",
      "scripts/designTiles/corridorMesh.mjs",
      "scripts/designTiles/siteMesh.mjs",
    ]) {
      expect(manifest.sha256[file]).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("gives both corridor tilesets one tree, the same tile ids and vertex counts", () => {
    expect(shape(reprojectedJson.root)).toEqual(shape(rigidJson.root));
    const uris: string[] = [];
    const collect = (s: Shape) => {
      if (s.uri) {
        uris.push(s.uri);
      }
      s.children.forEach(collect);
    };
    collect(shape(rigidJson.root));
    expect(uris.length).toBeGreaterThan(80);
    expect(new Set(uris).size).toBe(uris.length);
    for (const uri of uris) {
      const a = positions(read("corridor-rigid", uri));
      const b = positions(read("corridor-reprojected", uri));
      expect(b.length, uri).toBe(a.length);
    }
  });

  it("states equal geometric errors once the engine scales them", () => {
    const a = [...walk(rigidJson.root, tree(rigidJson))];
    const b = [...walk(reprojectedJson.root, tree(reprojectedJson))];
    expect(b).toHaveLength(a.length);
    // The tileset's own error isn't scaled: metres in both.
    expect(rigidJson.geometricError).toBe(reprojectedJson.geometricError);
    // The generator's tree again, for each parent's stations.
    const nodes = new Map<string, CorridorNode>();
    const index = (node: CorridorNode) => {
      nodes.set(`tiles/${node.id}.glb`, node);
      node.children.forEach(index);
    };
    index(
      corridorTree(alignment, { leafLength: 2_000, chordTolerance: 0.003 }),
    );
    let checkedParents = 0;
    const leaf = a.find((x) => !x.json.children)!;
    expect(leaf.json.geometricError).toBe(0.003);
    for (let i = 0; i < a.length; i++) {
      const [x, y] = [a[i]!.tile.geometricError, b[i]!.tile.geometricError];
      expect(Math.abs(x - y) / y).toBeLessThan(1e-12);
      if (a[i]!.json.children) {
        // Parents state at least twice their children's error, and at
        // least their own stations' largest chord error.
        for (const child of a[i]!.json.children) {
          expect(a[i]!.json.geometricError).toBeGreaterThanOrEqual(
            2 * child.geometricError,
          );
        }
        const uri: string | undefined = a[i]!.json.content?.uri;
        if (uri !== undefined) {
          const node = nodes.get(uri)!;
          expect(a[i]!.json.geometricError, uri).toBeGreaterThanOrEqual(
            largestChordError(alignment, node.stations),
          );
          checkedParents++;
        }
      }
    }
    expect(checkedParents).toBe(85);
  });

  it("round-trips every 50th vertex of every leaf within 1e-4 m, in either placement", () => {
    const rigidTiles = [...walk(rigidJson.root, tree(rigidJson))];
    const reprojectedTiles = [
      ...walk(reprojectedJson.root, tree(reprojectedJson)),
    ];
    const mpu = frame.units.metersPerUnit;
    const mph = frame.metersPerHeightUnit;
    let checked = 0;
    let worstRigid = 0;
    let worstReprojected = 0;
    for (let t = 0; t < rigidTiles.length; t++) {
      const r = rigidTiles[t]!;
      if (r.json.children || !r.json.content) {
        continue;
      }
      const q = reprojectedTiles[t]!;
      // The tile's centre in design units: its translations from the root.
      const centre = [0, 1, 2].map((k) =>
        r.chain.slice(1).reduce((sum, m) => sum + m[12 + k]!, 0),
      );
      const a = positions(read("corridor-rigid", r.json.content.uri));
      const b = positions(read("corridor-reprojected", q.json.content.uri));
      for (let i = 0; i < a.length / 3; i += 50) {
        const local = zUp(a, i);
        const design = local.map((v, k) => centre[k]! + v);
        const gap = (got: ArrayLike<number>) =>
          Math.hypot(
            (got[0]! - design[0]!) * mpu,
            (got[1]! - design[1]!) * mpu,
            (got[2]! - design[2]!) * mph,
          );
        const shown = apply(r.tile.transform, local);
        worstRigid = Math.max(worstRigid, gap(rigid.designOf(shown)));
        const drawn = apply(q.tile.transform, zUp(b, i));
        worstReprojected = Math.max(
          worstReprojected,
          gap(reprojected.designOf(drawn)),
        );
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(3_000);
    expect(worstRigid).toBeLessThan(1e-4);
    expect(worstReprojected).toBeLessThan(1e-4);
  });

  it("places all ten tilesets by their own declarations", async () => {
    const declared = readGeoreference(rigidJson)!;
    // The corridor's declared operation is its GEOID18 pin, exactly.
    expect(declared.pipeline).toBe(
      formatPipeline(parsePipeline(corridorFrame().pipeline as string)),
    );
    expect(frame.operation.grids).toEqual(["us_noaa_g2018u0.tif"]);
    expect(readGeoreference(reprojectedJson)!.pipeline).toBe(declared.pipeline);
    expect(declared.placement).toEqual({
      mode: "rigid",
      anchor: Array.from(anchor),
    });
    expect(readGeoreference(reprojectedJson)!.placement).toEqual({
      mode: "reprojected",
    });
    expect(rigidJson.root.transform).toEqual(Array.from(rigid.rigid!.matrix));
    expect(() =>
      checkRigidTransform(rigid, Float64Array.from(rigidJson.root.transform)),
    ).not.toThrow();
    for (const site of [SITE_BUILDING, ...PORTFOLIO]) {
      const dir =
        site === SITE_BUILDING ? "site-building" : `portfolio-${site.id}`;
      const json = tileset(dir);
      const georeference = readGeoreference(json)!;
      expect(georeference.placement.mode, site.id).toBe("rigid");
      expect(georeference.geoidFallback, site.id).toBe(
        site.frame.geoidFallback,
      );
      expect(georeference.pipeline !== undefined, site.id).toBe(
        site.frame.pipeline !== undefined,
      );
      const siteFrame = await declaredFrame(json, dir);
      expect([...siteFrame.operation.grids].sort(), site.id).toEqual(
        [...site.grids].sort(),
      );
      const placement = placeRigid(
        siteFrame,
        (georeference.placement as { readonly anchor: readonly number[] })
          .anchor,
      );
      expect(json.root.transform, site.id).toEqual(
        Array.from(placement.rigid!.matrix),
      );
      expect(() =>
        checkRigidTransform(placement, Float64Array.from(json.root.transform)),
      ).not.toThrow();
    }
  });

  it("states the spec's rigid sag at the points nearest 10 and 20 km from the anchor", () => {
    expect(answers.instant).toBe(DESIGN_TILES_INSTANT);
    const near = (km: number) =>
      answers.points.filter((p: Json) => p.nearKm === km && p.offset === 0);
    expect(near(10).length).toBeGreaterThan(0);
    expect(near(20).length).toBeGreaterThan(0);
    for (const p of near(10)) {
      expect(Math.abs(p.distanceFromAnchor - 10_000)).toBeLessThan(1);
      expect(Math.abs(p.displayError - 7.8)).toBeLessThanOrEqual(1.5);
    }
    for (const p of near(20)) {
      expect(Math.abs(p.distanceFromAnchor - 20_000)).toBeLessThan(1);
      expect(Math.abs(p.displayError - 31)).toBeLessThanOrEqual(3);
    }
    const end = answers.points.find(
      (p: Json) => p.station === alignment.endStation && p.offset === 0,
    );
    expect(end.distanceFromAnchor / 1000).toBeCloseTo(20.8, 1);
    expect(answers.pairs).toHaveLength(4);
  });

  it("recomputes three answers with the library, exactly", () => {
    const dir = store;
    const bytes = (file: string) => {
      const b = readFileSync(join(dir, file));
      return b.buffer.slice(
        b.byteOffset,
        b.byteOffset + b.byteLength,
      ) as ArrayBuffer;
    };
    const manifest = JSON.parse(
      readFileSync(join(dir, "manifest.json"), "utf8"),
    );
    const file = (role: string) =>
      manifest.files.find((f: Json) => f.role === role).file as string;
    const builtIn = LeapSeconds.builtIn();
    const stored = LeapSeconds.fromIers(
      readFileSync(join(dir, file("leapSeconds")), "utf8"),
    );
    const leapSeconds = stored.expires > builtIn.expires ? stored : builtIn;
    const frames = createFrames({
      leapSeconds,
      eop: EarthOrientationParameters.fromCelestrakCsv(
        readFileSync(join(dir, file("eop")), "utf8"),
      ),
      ephemeris: Ephemeris.fromPacks(
        bytes(file("planets")),
        bytes(file("moon")),
      ),
      warnings: [],
    });
    // The generator's instant uses the built-in leap seconds (37 s then, as
    // in every table since 2017).
    const instant = Instant.fromUtc(Date.parse(DESIGN_TILES_INSTANT), builtIn);

    // A point at 10 km, and one off the centreline on the bridge.
    for (const point of [
      answers.points.find((p: Json) => p.nearKm === 10),
      answers.points.find(
        (p: Json) => p.station === 61_200 && p.offset === -17,
      ),
    ]) {
      const design = alignment.pointAt(point.station, point.offset);
      expect(point.design[0]).toBe(design[0]);
      expect(point.design[1]).toBe(design[1]);
      expect(point.design[2]).toBe(design[2]! + sectionSurface(point.offset));
      expect(Array.from(frame.toBodyFixed(point.design))).toEqual(
        point.bodyFixed,
      );
      expect(Array.from(rigid.displayed(point.design))).toEqual(
        point.rigidDisplayed,
      );
      expect(rigid.displayError(point.design)).toBe(point.displayError);
      const geodetic = frame.toGeodetic(point.design);
      expect([geodetic.longitude, geodetic.latitude, geodetic.height]).toEqual([
        point.geodetic.longitude,
        point.geodetic.latitude,
        point.geodetic.height,
      ]);
      const factors = gridFactors(frame, point.design);
      expect(factors.combinedFactor).toBe(point.combinedFactor);
      expect(factors.convergence).toBe(point.convergence);
    }

    // The pair across the bridge.
    const pair = answers.pairs.find((p: Json) => p.id === "bridge");
    const ends = [answers.points[pair.from], answers.points[pair.to]];
    expect(ends.map((p: Json) => [p.station, p.offset])).toEqual([
      [pair.ends.a.station, pair.ends.a.offset],
      [pair.ends.b.station, pair.ends.b.offset],
    ]);
    const m = measure(
      designPoint(frame, ends[0].design),
      designPoint(frame, ends[1].design),
      instant,
      frames,
      { signal: false, alignment: CORRIDOR_ALIGNMENT.name },
    );
    expect(m.design!.distance).toBe(pair.designDistance);
    expect(m.design!.horizontalDistance).toBe(pair.horizontalDistance);
    expect(m.distance).toBe(pair.trueDistance);

    // The measurement model on pairs[0], 10,000 ft on the first tangent's
    // +2% grade: the horizontal and 3D design distances, and the true one.
    const first = answers.pairs[0];
    const [a, b] = [first.from, first.to].map(
      (i: number) => answers.points[i].design,
    );
    const exact = (design: number[]): SnapResult => ({
      snapPoint: frame.toBodyFixed(design),
      hitPoint: frame.toBodyFixed(design),
      distance: 0,
      kind: "segment",
      design: designPoint(frame, design, {
        how: "snap",
        tolerance: 0,
        kind: "segment",
      }),
      tolerance: 0,
      exact: true,
      source: "server",
      provisional: false,
    });
    const view = measurementModel(
      exact(a),
      exact(b),
      measure(designPoint(frame, a), designPoint(frame, b), instant, frames, {
        signal: false,
        alignment: CORRIDOR_ALIGNMENT.name,
      }),
    );
    expect(view.horizontalDistance).toBe("10,000.000 ftUS");
    expect(view.designDistance).toBe("10,002.000 ftUS");
    expect(view.trueDistance).toBe(
      `${first.trueDistance.toLocaleString("en-US", {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      })} m`,
    );
    expect(view.a.station).toBe("100+00.000");
    expect(view.b.station).toBe("200+00.000");
  });

  it("writes answers.json as Answers' shape", () => {
    expect(() => parseAnswers(answers)).not.toThrow();
    expect(parseAnswers(answers)).toEqual(answers);
    expect(answers.anchorStation).toBe(ANCHOR_STATION);
    expect(answers.frame.unitName).toBe("US survey foot");
  });

  // The owner's "about 31.6 m" is the rigid error at the station nearest 20
  // km from the anchor (171,255); at station 170,000 it is about 30.6 m.
  it("records the station 170,000 marker: about 30.6 m between its true and rigid positions", () => {
    const marker = answers.marker;
    expect(marker.station).toBe(170_000);
    const point = answers.points[marker.point];
    expect([point.station, point.offset]).toEqual([170_000, 0]);
    expect(Array.from(frame.toBodyFixed(marker.design))).toEqual(
      marker.bodyFixed,
    );
    expect(Array.from(rigid.displayed(marker.design))).toEqual(
      marker.rigidDisplayed,
    );
    expect(marker.separation).toBe(rigid.displayError(marker.design));
    expect(Math.abs(marker.separation - 30.6)).toBeLessThan(0.1);
    expect(reprojected.displayError(marker.design)).toBe(0);
  });

  it("places the NGS mark: PROJ's zone 3 against the datasheet, and its distances to the centreline", () => {
    const mark = answers.mark;
    expect(mark.pid).toBe(SURVEY_MARK.pid);
    // The published position on the ellipsoid against the datasheet's own
    // X, Y, Z (to the millimetre it publishes; the GRS80 and WGS 84
    // ellipsoids differ by about 0.1 mm here).
    for (let k = 0; k < 3; k++) {
      expect(
        Math.abs(mark.bodyFixed[k] - SURVEY_MARK.publishedXyz[k]!),
      ).toBeLessThan(0.0006);
    }
    // PROJ's zone 3 from the published position, against the datasheet's.
    expect(Array.from(frame.fromBodyFixed(mark.bodyFixed))).toEqual(
      mark.design,
    );
    const rows = checkRows(parseAnswers(answers), {
      points: new Map(),
      pairs: new Map(),
      mark: { easting: mark.design[0], northing: mark.design[1] },
    });
    for (const id of ["mark.easting", "mark.northing"]) {
      const row = rows.find((r) => r.id === id)!;
      expect(row.kind).toBe("published reference");
      expect(row.tolerance).toBe(MARK_SPC_TOLERANCE);
      expect(row.status, `${id}: ${row.shown} against ${row.expected}`).toBe(
        "pass",
      );
    }
    // Its nearest centreline point and the distances to it.
    const at = alignment.stationOffset(mark.design);
    expect([at.station, at.offset]).toEqual([
      mark.nearest.station,
      mark.nearest.offset,
    ]);
    expect(
      Math.abs(mark.horizontalDistance - Math.abs(mark.nearest.offset)),
    ).toBeLessThan(1e-6);
    expect(Math.abs(mark.nearest.offset)).toBeLessThan(600);
    expect(mark.trueDistance).toBeGreaterThan(
      mark.horizontalDistance * frame.units.metersPerUnit * 0.99,
    );
  });
});
