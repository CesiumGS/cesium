// The grid names every path refuses, and some it accepts: one list, so each
// path's tests (GridCatalog.parse, loadGrids, a recorded operation's grids,
// a tileset's declared pipeline and WKT2, the dev server's grid endpoint)
// prove the same rule (gridCatalog.ts's `gridNameProblem`).

/** Not a bare file name of PROJ-data's alphabet: "unplain". */
export const UNPLAIN_GRID_NAMES: readonly string[] = [
  "../proj.db",
  "/etc/hosts",
  "sub/g.tif",
  "C:\\x.tif",
  "https://example.com/g.tif",
  ".hidden.tif",
  // A leading "_" or "-", once allowed by one check and not another.
  "_g.tif",
  "-g.tif",
  // Windows drops a trailing dot: this would be proj.db.
  "proj.db.",
  "g.tif.",
  "g.tif-",
  "a..b.tif",
  "g tif",
  "gé.tif",
  `${"a".repeat(125)}.tif`,
];

/** PROJ's own files and the rest of RESERVED_NAMES, and `*.partial`, in any case: "reserved". */
export const RESERVED_GRID_NAMES: readonly string[] = [
  "proj.db",
  "PROJ.DB",
  "Proj.Ini",
  "proj_capi.wasm",
  "ITRF2014",
  "epsg",
  "owner",
  "files.geojson",
  "copyright_and_licenses.csv",
  "tmp",
  "dev",
  "g.tif.partial",
  "g.tif.PARTIAL",
];

/** Every name no path may take. */
export const HOSTILE_GRID_NAMES: readonly string[] = [
  ...UNPLAIN_GRID_NAMES,
  ...RESERVED_GRID_NAMES,
];

/** Names the rule accepts (each still must be a current catalog key to be used). */
export const PLAIN_GRID_NAMES: readonly string[] = [
  "g.tif",
  "us_noaa_g2018u0.tif",
  "a",
  "a-b_c.d.tif",
  "BETA2007.gsb",
  `${"a".repeat(124)}.tif`,
];
