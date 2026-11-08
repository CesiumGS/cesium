import { describe, expect, it } from "vitest";
import {
  GridCatalog,
  gridNameProblem,
  isPlainGridName,
} from "../src/engineering/gridCatalog.ts";
import { PROJ_DATA_CATALOG } from "../src/engineering/projPins.ts";
import { sha256Hex } from "../src/io/sha256.ts";
import {
  PLAIN_GRID_NAMES,
  RESERVED_GRID_NAMES,
  UNPLAIN_GRID_NAMES,
} from "./hostileGridNames.ts";

const HEX_A = "a".repeat(64);
const HEX_B = "b".repeat(64);
const HEX_C = "c".repeat(64);

const feature = (properties: Record<string, unknown>) => ({
  type: "Feature",
  properties,
  geometry: null,
});

const CATALOG = JSON.stringify({
  type: "FeatureCollection",
  name: "files",
  features: [
    feature({
      url: "https://cdn.proj.org/xx_geoid.tif",
      name: "xx_geoid.tif",
      type: "VERTICAL_OFFSET_GEOGRAPHIC_TO_VERTICAL",
      source_crs_code: "EPSG:4326",
      target_crs_code: "EPSG:5703",
      source: "Natural Resources Canada",
      source_country: "Canada",
      description: "WGS 84 to a height",
      full_bbox: [-131, 20, -63, 50],
      file_size: 1234,
      sha256sum: HEX_A,
    }),
    feature({
      url: "https://cdn.proj.org/yy_README.txt",
      name: "yy_README.txt",
      source: "Some Agency",
      file_size: 56,
      sha256sum: HEX_B,
    }),
    feature({
      url: "https://cdn.proj.org/zz_old.tif",
      name: "zz_old.tif",
      source: "Old Agency",
      file_size: 78,
      sha256sum: HEX_C,
      version_removed: "1.20",
    }),
  ],
});

// A quoted field holding a comma, as in the real file.
const CSV = `filename,copyright,license,version_added,version_removed
xx_geoid.tif,"Her Majesty, Natural Resources Canada",CC-BY-4.0,1.1,
yy_README.txt,Disclaimed,Public domain,1.15,
`;

describe("GridCatalog.parse", () => {
  const catalog = GridCatalog.parse(CATALOG, CSV);

  it("reads each entry's url, hash, size, type, CRSs and area", () => {
    const g = catalog.get("xx_geoid.tif");
    expect(g).toMatchObject({
      name: "xx_geoid.tif",
      url: "https://cdn.proj.org/xx_geoid.tif",
      sha256: HEX_A,
      bytes: 1234,
      type: "VERTICAL_OFFSET_GEOGRAPHIC_TO_VERTICAL",
      sourceCrs: "EPSG:4326",
      targetCrs: "EPSG:5703",
      agency: "Natural Resources Canada",
      country: "Canada",
      removed: false,
    });
    expect(g?.area).toEqual({ west: -131, south: 20, east: -63, north: 50 });
    expect(catalog.get("yy_README.txt")?.area).toBeUndefined();
    expect(catalog.entries.size).toBe(3);
    expect(catalog.get("nope.tif")).toBeUndefined();
  });

  it("takes the license from the CSV, past a quoted comma", () => {
    expect(catalog.get("xx_geoid.tif")?.license).toBe("CC-BY-4.0");
    expect(catalog.get("yy_README.txt")?.license).toBe("Public domain");
    expect(catalog.get("zz_old.tif")?.license).toBeUndefined();
  });

  it("credits the agency, license and PROJ-data version", () => {
    expect(catalog.version).toBe(PROJ_DATA_CATALOG.version);
    expect(catalog.credit("xx_geoid.tif")).toBe(
      "Natural Resources Canada (CC-BY-4.0), via PROJ-data 1.25.0",
    );
    expect(catalog.credit("zz_old.tif")).toBe(
      "Old Agency, via PROJ-data 1.25.0",
    );
    expect(() => catalog.credit("nope.tif")).toThrow(/nope\.tif/);
    expect(GridCatalog.parse(CATALOG, CSV, "9.9").credit("xx_geoid.tif")).toBe(
      "Natural Resources Canada (CC-BY-4.0), via PROJ-data 9.9",
    );
  });

  it("marks an entry with version_removed as removed", () => {
    expect(catalog.get("zz_old.tif")?.removed).toBe(true);
    expect(catalog.get("xx_geoid.tif")?.removed).toBe(false);
  });

  it("throws, naming the feature, when it has no sha256sum", () => {
    const bad = JSON.stringify({
      features: [
        feature({
          url: "https://cdn.proj.org/q.tif",
          name: "q.tif",
          file_size: 1,
        }),
      ],
    });
    expect(() => GridCatalog.parse(bad)).toThrow(/q\.tif/);
  });

  it("throws on a malformed hash or size", () => {
    const hash = JSON.stringify({
      features: [
        feature({ url: "u", name: "h.tif", file_size: 1, sha256sum: "xyz" }),
      ],
    });
    expect(() => GridCatalog.parse(hash)).toThrow(/h\.tif/);
    const size = JSON.stringify({
      features: [
        feature({ url: "u", name: "s.tif", file_size: -1, sha256sum: HEX_A }),
      ],
    });
    expect(() => GridCatalog.parse(size)).toThrow(/s\.tif/);
  });
});

describe("the grid-name rule", () => {
  it.each(UNPLAIN_GRID_NAMES)("finds %j unplain", (name) => {
    expect(gridNameProblem(name)).toBe("unplain");
    expect(isPlainGridName(name)).toBe(false);
  });

  it.each(RESERVED_GRID_NAMES)("finds %j reserved", (name) => {
    expect(gridNameProblem(name)).toBe("reserved");
    expect(isPlainGridName(name)).toBe(false);
  });

  it.each(PLAIN_GRID_NAMES)("accepts %j", (name) => {
    expect(gridNameProblem(name)).toBeUndefined();
    expect(isPlainGridName(name)).toBe(true);
  });

  it.each([...UNPLAIN_GRID_NAMES, ...RESERVED_GRID_NAMES])(
    "refuses a catalog listing %j, naming it",
    (name) => {
      const listing = JSON.stringify({
        features: [
          feature({
            url: "https://cdn.proj.org/g.tif",
            name: "g.tif",
            file_size: 1,
            sha256sum: HEX_A,
          }),
          feature({
            url: `https://cdn.proj.org/${name}`,
            name,
            file_size: 1,
            sha256sum: HEX_A,
          }),
        ],
      });
      const shown = JSON.stringify(
        name.length > 80 ? `${name.slice(0, 77)}...` : name,
      );
      expect(() => GridCatalog.parse(listing)).toThrow(
        RESERVED_GRID_NAMES.includes(name)
          ? `grid catalog: feature 1 is named ${shown}, the name of one of PROJ's own files, not a grid's`
          : `grid catalog: feature 1 is named ${shown}, which isn't a plain grid file name`,
      );
    },
  );
});

describe("sha256Hex", () => {
  it("hashes abc", async () => {
    const abc = new TextEncoder().encode("abc");
    const expected =
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    expect(await sha256Hex(abc)).toBe(expected);
    expect(await sha256Hex(abc.buffer)).toBe(expected);
  });
});
