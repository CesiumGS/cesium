// A rigid declaration checked against the root transform (plan 4b task 11,
// Review Focus 3's anchor case), on the California zone 3 ftUS + NAVD88
// frame. `npm run test:data` runs it.
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import { EngineeringFrame } from "../../src/engineering/EngineeringFrame.ts";
import { ENGINEERING_FRAME_EXTENSION } from "../../src/engineering/georeference.ts";
import {
  checkRigidTransform,
  georeferenceTileset,
  readGeoreference,
} from "../../src/engineering/georeferenceTileset.ts";
import { placeRigid } from "../../src/engineering/placement.ts";
import { loadProj } from "../../src/engineering/proj.ts";
import * as m4 from "../../src/math/mat4.ts";
import { EARTH } from "../../src/scene/Body.ts";
import type { Tileset3D } from "../../src/streaming/Tileset3D.ts";

const base = `${join(framesDataDirectory(), "proj")}/`;
const ANCHOR = [6_080_000, 2_110_000, 100];
const CRS = {
  format: "wkid",
  extensions: {
    EXT_geospatial_crs_wkid: { authority: "EPSG", wkid: 6420, vcsWkid: 6360 },
  },
};

async function californiaFrame() {
  return EngineeringFrame.create(
    {
      name: "CA3",
      body: EARTH,
      crs: { format: "wkid", authority: "EPSG", wkid: 6420, vcsWkid: 6360 },
    },
    await loadProj({ base }),
  );
}

/** `m` rotated by `angle` about the body-fixed z axis through `about`. */
function rotatedAbout(m: m4.Mat4, about: ArrayLike<number>, angle: number) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const r = m4.mat4();
  r[0] = c;
  r[1] = s;
  r[4] = -s;
  r[5] = c;
  // p -> about + R (p - about)
  r[12] = about[0]! - (c * about[0]! - s * about[1]!);
  r[13] = about[1]! - (s * about[0]! + c * about[1]!);
  return m4.multiply(m4.mat4(), r, m);
}

/**
 * The parts of a loaded Tileset3D that georeferenceTileset reads, around a
 * parsed declaration (the unit test runs the real class).
 */
function standIn(rootTransform: m4.Mat4, declaration: unknown): Tileset3D {
  return {
    url: "https://tiles.test/corridor/tileset.json",
    warnings: new Set<string>(),
    georeference: readGeoreference({
      extensions: { [ENGINEERING_FRAME_EXTENSION]: declaration },
    }),
    modelMatrix: m4.mat4(),
    root: { transform: rootTransform },
    placement: undefined,
  } as unknown as Tileset3D;
}

describe("checkRigidTransform", () => {
  it("passes for the placement's own matrix", async () => {
    const placement = placeRigid(await californiaFrame(), ANCHOR);
    expect(() =>
      checkRigidTransform(placement, placement.rigid!.matrix),
    ).not.toThrow();
  });

  it("throws for the matrix translated by 1 cm, naming placement.anchor", async () => {
    const placement = placeRigid(await californiaFrame(), ANCHOR);
    const moved = m4.copy(m4.mat4(), placement.rigid!.matrix);
    moved[12] = moved[12]! + 0.01;
    expect(() => checkRigidTransform(placement, moved)).toThrow(
      /placement\.anchor/,
    );
  });

  it("throws for the matrix rotated by 1e-6 rad, naming placement.anchor", async () => {
    const placement = placeRigid(await californiaFrame(), ANCHOR);
    const matrix = placement.rigid!.matrix;
    // About the drawn anchor, so the anchor itself stays put: the columns
    // catch it.
    const shown = placement.displayed(ANCHOR);
    const turned = rotatedAbout(matrix, shown, 1e-6);
    const at = m4.transformPoint(
      new Float64Array(3),
      turned,
      new Float64Array(ANCHOR),
    );
    expect(
      Math.hypot(at[0]! - shown[0]!, at[1]! - shown[1]!, at[2]! - shown[2]!),
    ).toBeLessThan(1e-3);
    expect(() => checkRigidTransform(placement, turned)).toThrow(
      /placement\.anchor/,
    );
    // About the body's centre, the anchor moves by metres.
    expect(() =>
      checkRigidTransform(placement, rotatedAbout(matrix, [0, 0, 0], 1e-6)),
    ).toThrow(/placement\.anchor/);
  });
});

describe("georeferenceTileset", () => {
  it("places a rigid declaration whose root transform agrees", async () => {
    const proj = await loadProj({ base });
    const matrix = placeRigid(await californiaFrame(), ANCHOR).rigid!.matrix;
    const tileset = standIn(matrix, {
      name: "Corridor",
      crs: CRS,
      placement: { mode: "rigid", anchor: ANCHOR },
    });
    const placement = await georeferenceTileset(tileset, { proj });
    expect(tileset.placement).toBe(placement);
    expect(placement.mode).toBe("rigid");
    expect(placement.frame.definition.name).toBe("Corridor");
    const back = placement.designOf(placement.displayed(ANCHOR));
    for (let i = 0; i < 3; i++) {
      expect(Math.abs(back[i]! - ANCHOR[i]!)).toBeLessThan(1e-9);
    }
  });

  it("refuses an anchor that disagrees with the root transform, and warns", async () => {
    const proj = await loadProj({ base });
    const matrix = placeRigid(await californiaFrame(), ANCHOR).rigid!.matrix;
    // Declared 1 ftUS east of where the root transform was made.
    const tileset = standIn(matrix, {
      crs: CRS,
      placement: {
        mode: "rigid",
        anchor: [ANCHOR[0]! + 1, ANCHOR[1], ANCHOR[2]],
      },
    });
    await expect(georeferenceTileset(tileset, { proj })).rejects.toThrow(
      /placement\.anchor/,
    );
    expect(tileset.placement).toBeUndefined();
    expect([...tileset.warnings].join("\n")).toContain("placement.anchor");
  });

  it("names the frame after the tileset's URL when the declaration has no name", async () => {
    const proj = await loadProj({ base });
    const tileset = standIn(m4.mat4(), {
      crs: CRS,
      placement: { mode: "reprojected" },
    });
    const placement = await georeferenceTileset(tileset, { proj });
    expect(placement.mode).toBe("reprojected");
    expect(placement.frame.definition.name).toBe(
      "https://tiles.test/corridor/tileset.json",
    );
  });
});

describe("a wkt2 CRS reference", () => {
  it("is refused when it holds a PROJ string, which proj_create would take", async () => {
    await expect(
      (async () =>
        EngineeringFrame.create(
          {
            name: "w",
            body: EARTH,
            crs: {
              format: "wkt2",
              wkt2: "+proj=utm +zone=11 +datum=WGS84 +units=m +type=crs",
            },
          },
          await loadProj({ base }),
        ))(),
    ).rejects.toThrow(/must be WKT: it holds a PROJ-string token/);
  });

  it("from a tileset goes through PROJ's strict WKT parser", async () => {
    const proj = await loadProj({ base });
    const good = proj.proj_as_wkt(
      proj.proj_create("EPSG:32611"),
      proj.PJ_WKT2_2019,
    );
    const declared = (wkt2: string) =>
      standIn(m4.mat4(), {
        crs: {
          format: "wkt2",
          extensions: { EXT_geospatial_crs_wkt2: { wkt2 } },
        },
        placement: { mode: "reprojected" },
      });
    // WKT2 in form, but a node PROJ's grammar doesn't have.
    const bad = declared(good.replace("CS[", 'NOTANODE["x"],CS['));
    await expect(georeferenceTileset(bad, { proj })).rejects.toThrow(
      /extensions\.EXT_engineering_frame\.crs\.extensions\.EXT_geospatial_crs_wkt2\.wkt2: .*strict WKT2/,
    );
    expect(bad.placement).toBeUndefined();
    expect([...bad.warnings].join("\n")).toContain("strict WKT2");
    // PROJ's own WKT2 places.
    const placed = await georeferenceTileset(declared(good), { proj });
    expect(placed.mode).toBe("reprojected");
    expect(placed.frame.units.projected).toBe(true);
  });
});
