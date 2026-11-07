// An operation may read only grids we verified and staged (plan 4b Task 14,
// fix round 3; the security re-check's S1). Whatever makes the operation —
// a pinned pipeline, PROJ's chosen candidate, WKT naming a file — each grid
// its PROJ string reads must be a plain file name `loadGrids` loaded (an
// optional one at least a plain name), or it is refused, naming the grid.
// A file of its own, so a PROJ of its own with only GEOID18 loaded.
// `npm run test:data` runs it.
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { corridorFrame } from "../../examples/design-globe/corridor.ts";
import { framesDataDirectory } from "../../scripts/frameData.mjs";
import { resolveOperation, type CrsRef } from "../../src/engineering/crs.ts";
import { EngineeringFrame } from "../../src/engineering/EngineeringFrame.ts";
import {
  gridSource,
  loadGrids,
  loadedGrids,
  loadProj,
} from "../../src/engineering/proj.ts";

const store = framesDataDirectory();
const GEOID18 = "us_noaa_g2018u0.tif";
/** The real GEOID18, by an absolute path outside PROJ's staging directory. */
const ABSOLUTE = join(store, "grids", GEOID18);

const setup = async () => {
  const P = await loadProj({ base: `${join(store, "proj")}/`, grids: [] });
  const source = await gridSource({ base: `${join(store, "grids")}/` });
  await loadGrids(P, source, [GEOID18]);
  return { P, source };
};

const DEGREE = 'ANGLEUNIT["degree",0.0174532925199433]';
const FOOT = 'LENGTHUNIT["US survey foot",0.304800609601219]';
/** California zone 3 (ftUS) with NAVD88 bound to NAD83(2011) by `file`. */
const boundTo = (file: string): CrsRef => ({
  format: "wkt2",
  wkt2: `COMPOUNDCRS["S1",PROJCRS["NAD83(2011) / California zone 3 (ftUS)",BASEGEOGCRS["NAD83(2011)",DATUM["NAD83 (National Spatial Reference System 2011)",ELLIPSOID["GRS 1980",6378137,298.257222101,LENGTHUNIT["metre",1]]],PRIMEM["Greenwich",0,${DEGREE}]],CONVERSION["SPCS83 California zone 3 (US survey foot)",METHOD["Lambert Conic Conformal (2SP)",ID["EPSG",9802]],PARAMETER["Latitude of false origin",36.5,${DEGREE}],PARAMETER["Longitude of false origin",-120.5,${DEGREE}],PARAMETER["Latitude of 1st standard parallel",38.4333333333333,${DEGREE}],PARAMETER["Latitude of 2nd standard parallel",37.0666666666667,${DEGREE}],PARAMETER["Easting at false origin",6561666.667,${FOOT}],PARAMETER["Northing at false origin",1640416.667,${FOOT}]],CS[Cartesian,2],AXIS["easting (X)",east,${FOOT}],AXIS["northing (Y)",north,${FOOT}]],BOUNDCRS[SOURCECRS[VERTCRS["NAVD88 height",VDATUM["North American Vertical Datum 1988"],CS[vertical,1],AXIS["gravity-related height (H)",up,LENGTHUNIT["metre",1]]]],TARGETCRS[GEOGCRS["NAD83(2011)",DATUM["NAD83 (National Spatial Reference System 2011)",ELLIPSOID["GRS 1980",6378137,298.257222101,LENGTHUNIT["metre",1]]],CS[ellipsoidal,3],AXIS["geodetic latitude (Lat)",north,${DEGREE}],AXIS["geodetic longitude (Lon)",east,${DEGREE}],AXIS["ellipsoidal height (h)",up,LENGTHUNIT["metre",1]]]],ABRIDGEDTRANSFORMATION["NAVD88 height to NAD83(2011) height",METHOD["Geographic3D to GravityRelatedHeight (gtx)",ID["EPSG",9665]],PARAMETERFILE["Geoid (height correction) model file","${file}"]]]]`,
});

const pinned = (grids: string) =>
  `+proj=pipeline +step +proj=unitconvert +xy_in=us-ft +xy_out=m +step +inv +proj=lcc +lat_0=36.5 +lon_0=-120.5 +lat_1=38.4333333333333 +lat_2=37.0666666666667 +x_0=2000000.0001016 +y_0=500000.0001016 +ellps=GRS80 +step +proj=unitconvert +z_in=us-ft +z_out=m +step +proj=vgridshift +grids=${grids} +multiplier=1 +step +proj=unitconvert +xy_in=rad +xy_out=deg`;
const CORRIDOR = corridorFrame().crs;

describe("an operation reads only grids we verified and staged", () => {
  it("refuses WKT whose PARAMETERFILE names a grid by path (S1), naming it", async () => {
    const { P } = await setup();
    for (const file of [ABSOLUTE, "/etc/hosts"]) {
      expect(() => resolveOperation(P, boundTo(file), "EPSG:4979")).toThrow(
        file,
      );
    }
  });

  it("refuses such WKT in a frame, loading nothing for it", async () => {
    const { P, source } = await setup();
    const before = [...loadedGrids(P)];
    await expect(
      EngineeringFrame.load(
        {
          ...corridorFrame(),
          name: "S1",
          crs: boundTo(ABSOLUTE),
          pipeline: undefined,
          alignments: [],
        },
        { proj: P, grids: source },
      ),
    ).rejects.toThrow(ABSOLUTE);
    expect([...loadedGrids(P)]).toEqual(before);
  });

  it("refuses a pinned pipeline reading a grid by path, even an optional one", async () => {
    const { P } = await setup();
    for (const grids of [ABSOLUTE, `@/etc/hosts,${GEOID18}`, `@${ABSOLUTE}`]) {
      const name = grids.split(",")[0]!.replace(/^@/, "");
      expect(
        () =>
          resolveOperation(P, CORRIDOR, "EPSG:4979", {
            pipeline: pinned(grids),
          }),
        grids,
      ).toThrow(name);
    }
  });

  it("still resolves the corridor's pin and PROJ's own choice on the staged grid", async () => {
    const { P } = await setup();
    expect(
      resolveOperation(P, CORRIDOR, "EPSG:4979", { pipeline: pinned(GEOID18) })
        .grids,
    ).toEqual([GEOID18]);
    // An optional grid by a plain name that isn't loaded: PROJ goes on.
    expect(
      resolveOperation(P, CORRIDOR, "EPSG:4979", {
        pipeline: pinned(`@us_noaa_g2012bu0.tif,${GEOID18}`),
      }).missingOptionalGrids,
    ).toEqual(["us_noaa_g2012bu0.tif"]);
    expect(resolveOperation(P, CORRIDOR, "EPSG:4979").grids).toEqual([GEOID18]);
  });
});
