# Reference data shipped with the engine (owner, 2026-11-08)

**What this holds:** Which reference data the engine ships and how (owner, 2026-11-08). Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

Not built. Air-gapped and offline use can't download data at runtime, so ephemerides and related reference data should be available bundled, license permitting. Today `scripts/frameData.mjs` and `scripts/setup.mjs` download them into a store outside the repo.

**Shape:** a separate optional data package with its own NOTICE, not the main package, so the Apache 2.0 core takes on no third-party data duties and everyone else doesn't download it. Astropy's `astropy-iers-data` is the precedent.

**What the license text says (read 2026-11-08; have legal confirm before shipping):**

- **JPL and NAIF kernels:** NAIF's rules allow use by anyone, including commercially, and redistribution of unmodified kernels. An excerpted kernel counts as modified, and the attribution must then name whoever last changed it. Logos and any implied endorsement need NASA or JPL approval.
- **Geoids and US grids:** PROJ-data labels EGM96, EGM2008, GEOID18 and NADCON as public domain, but that rests on PROJ-data's labels, not the agencies' own pages. Some national grids are CC-BY-4.0 and need attribution, and UK grids are BSD-2-Clause.
- **EPSG (in `proj.db`):** may be used and distributed, including in a commercial product with added value, but not sold as a dataset, and its terms must pass to recipients. Apache SIS is reported not to ship it for license reasons. Check this one with legal.
- **Earth orientation and leap seconds:** no primary terms found for IERS, USNO or CelesTrak. Open question. These also expire, so a bundle needs a stated date, a refresh path and an honest accuracy statement once it's stale.

**Sizes:** `de440s.bsp` 32.7 MB, Moon orientation 12.9 MB, and the engine's own 2000 to 2050 packs 2.84 MB in all. EGM2008 at 2.5 arcminutes is 80.6 MB, GEOID18 16.7 MB, `proj.db` 9.6 MB. So small packs are cheap, and a full geoid set isn't. Stay on DE440 for now (2026-11-08): DE442's stated purpose is updating the Uranus barycenter, and NAIF lists no matching lunar orientation kernel, while the Moon's orientation here pairs with DE440 (`moon_pa_de440_200625.bpc`). Revisit if a DE442 lunar kernel appears or Uranus's satellites come into scope. Keep the ephemeris version a provider's choice rather than a constant.
