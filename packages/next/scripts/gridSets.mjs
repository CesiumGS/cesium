// The named sets of PROJ-data grids `npm run setup -- --grids a,b` stores in
// `<store>/grids/`. `"*"` is every non-removed grid in the catalog. Names are
// catalog keys (PROJ-data 1.25.0); `ensureGrids` throws on one that isn't, or
// that the catalog marks removed.

/** @type {Record<"portfolio" | "tests" | "egm2008" | "all", readonly string[] | "*">} */
export const GRID_SETS = {
  // The grids of the portfolio's call 19 (UK, Australia, Japan, Netherlands,
  // EGM96, GEOID18). Japan's is JPGEO2024: proj.db 9.7.1 ranks it (0.03 m)
  // ahead of GSIGEO2011 (no stated accuracy) for JGD2011 (vertical) height,
  // so EngineeringFrame.load fetches it, and it has been GSI's official
  // geoid since 2025-04-01 (plan 4b Task 9).
  portfolio: [
    "uk_os_OSTN15_NTv2_OSGBtoETRS.tif",
    "uk_os_OSGM15_GB.tif",
    "au_ga_AUSGeoid2020_20180201.tif",
    "jp_gsi_jpgeo2024.tif",
    "nl_nsgi_rdtrans2018.tif",
    "nl_nsgi_nlgeo2018.tif",
    "us_nga_egm96_15.tif",
    "us_noaa_g2018u0.tif",
  ],
  // The grids the data tests use. EPSG:26741 (California CS27 zone I) to
  // WGS 84: PROJ's best candidate (2.15 m, NAD27 to NAD83 (1) + NAD83 to
  // WGS 84 (43)) reads the CONUS NADCON grid and California's HPGN grid; the
  // next (5 m) reads CONUS alone (the names PROJ reports, plan 4b Task 6).
  // EPSG:2393+5717 (KKJ / Finland Uniform + N60): the best candidate reads
  // the FIN2000 geoid and a TIN, a catalog .json (tinshift). And DKLAT(2023),
  // Denmark's lowest astronomical tide (EPSG:25832+10550, a depth CRS; Task
  // 7): proj.db 9.7.1 relates Amersfoort / RD New + LAT NL depth only by
  // ballparks, so the Dutch LAT grid isn't used. GSIGEO2011, Japan's geoid
  // before JPGEO2024: geoids.test.ts checks it against GSI's transitional
  // GSIGEO2011 calculator through its own pinned operation (Task 9).
  tests: [
    "us_noaa_conus.tif",
    "us_noaa_cnhpgn.tif",
    "fi_nls_fin2000.tif",
    "fi_nls_ykj_etrs35fin.json",
    "dk_sdfi_dklat_2023.tif",
    "jp_gsi_gsigeo2011.tif",
  ],
  // EGM2008 at 2.5 arc-minutes (80,585,622 bytes).
  egm2008: ["us_nga_egm08_25.tif"],
  all: "*",
};
