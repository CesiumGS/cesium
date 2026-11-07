// The named sets of PROJ-data grids `npm run setup -- --grids a,b` stores in
// `<store>/grids/`. `"*"` is every non-removed grid in the catalog. Names are
// catalog keys (PROJ-data 1.25.0); `ensureGrids` throws on one that isn't, or
// that the catalog marks removed.

/** @type {Record<"portfolio" | "tests" | "egm2008" | "all", readonly string[] | "*">} */
export const GRID_SETS = {
  // The grids the design globe's sites read (call 19, plan 4b Task 12):
  // exactly what EngineeringFrame.load fetches for each site's frame, as
  // test/data/designGlobeSites.test.ts checks. London: OSTN15 and OSGM15.
  // Sydney: AUSGeoid2020. Tokyo: JPGEO2024 (proj.db 9.7.1 ranks it, 0.03 m,
  // ahead of GSIGEO2011, no stated accuracy, for JGD2011 (vertical) height;
  // GSI's official geoid since 2025-04-01; Task 9). Amsterdam: RDNAPTRANS2018.
  // Nairobi, and Jakarta's fallback: EGM96. NAVD88 heights read GEOID18,
  // NGS's current model, through a pinned pipeline wherever PROJ ranks a
  // superseded geoid ahead of it: the corridor and its site-grid building
  // (EPSG:6420+6360) read GEOID18 alone (PROJ's best, 1.14 m, is NADCON5
  // with GEOID99); Phoenix (EPSG:2223+8228) reads GEOID18 and NADCON5 from
  // NAD83 (1986) to NAD83(2011) (PROJ's best within its area, 1.1 m, is
  // Arizona's HPGN with GEOID99's tile 6).
  portfolio: [
    "uk_os_OSTN15_NTv2_OSGBtoETRS.tif",
    "uk_os_OSGM15_GB.tif",
    "au_ga_AUSGeoid2020_20180201.tif",
    "jp_gsi_jpgeo2024.tif",
    "nl_nsgi_rdtrans2018.tif",
    "nl_nsgi_nlgeo2018.tif",
    "us_nga_egm96_15.tif",
    "us_noaa_g2018u0.tif",
    "us_noaa_nadcon5_nad83_1986_nad83_harn_conus.tif",
    "us_noaa_nadcon5_nad83_harn_nad83_fbn_conus.tif",
    "us_noaa_nadcon5_nad83_fbn_nad83_2007_conus.tif",
    "us_noaa_nadcon5_nad83_2007_nad83_2011_conus.tif",
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
  // (frameLoad.test.ts also loads GEOID18 for the plan-4a California frame:
  // it is in `portfolio`.)
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
