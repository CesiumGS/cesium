// The pinned PROJ files and the PROJ-data catalog: the trust root for the
// frames data store, the dev server's grid endpoint and the loaders. Recorded
// 2026-11-06. A file that doesn't hash to its pin is refused, never loaded.

/** The SHA-256 of each stored PROJ file (proj.js v0.9.2, PROJ 9.7.1; GEOID18). */
export const PROJ_FILE_SHA256 = {
  "proj_capi.mjs":
    "26cc8f8a83edc2c859f48829bb8dd0e9303e891cab801251974c92763df9031a",
  "proj_capi.wasm":
    "6efdbdaf7f1ee6bc49b92ea784e45d04e53a1f3f6299179f9397a3cac7539914",
  "proj.db": "b192cb2fd7eb0fab76aa9495743288f4f2da4534f586ab5ccb9d869c644e8272",
  "us_noaa_g2018u0.tif":
    "fa9a407ac7ee3f5a3694008e4bcd09ce9cc250452f0c3b11700a4960340abce2",
} as const;

const TAG = "https://raw.githubusercontent.com/OSGeo/PROJ-data/1.25.0";

/**
 * PROJ-data 1.25.0 (OSGeo): `files.geojson` lists every grid with its size and
 * SHA-256, `copyright_and_licenses.csv` its agency and license. Both are
 * fetched from the tag and checked against these pins; every grid is then
 * checked against the catalog.
 */
export const PROJ_DATA_CATALOG = {
  version: "1.25.0",
  catalogUrl: `${TAG}/files.geojson`,
  catalogSha256:
    "46f26c830faa164af9ef9ef51a7325a9d3800eb12ad4b1661c1d3143af7becc3",
  catalogBytes: 331_044,
  licensesUrl: `${TAG}/copyright_and_licenses.csv`,
  licensesSha256:
    "1222fbfae2ad0033876e744d29ee40287ae6fd1f48a943fdde3c2a556b1d2379",
  licensesBytes: 39_115,
} as const;
