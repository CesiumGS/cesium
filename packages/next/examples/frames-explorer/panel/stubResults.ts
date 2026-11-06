// Generated for the panel's stub (part 6a) from a real run of the catalog in
// Node (test/data/framesExplorer.test.ts, 2026-11-06): a few results of every
// group, details and fingerprint coordinates shortened. Not used by the page
// once 6b wires the worker.
import type { StressResult } from "../tests.ts";

export const STUB_RESULTS: readonly StressResult[] = [
  {
    id: "projections.epsg-32610",
    group: "projections",
    title:
      "EPSG:32610 (WGS 84 / UTM zone 10N): the origin, a 50 km line, a point 100 km off the central meridian and one at the zone's edge round-trip through the body-fixed frame within 1e-4 m",
    pass: true,
    value: 3.3762711796866336e-9,
    tolerance: 0.0001,
    unit: "m",
    detail: "13 points; operation accuracy 0 m",
    fingerprint: {
      pipeline:
        "+proj=pipeline +step +inv +proj=utm +zone=10 +ellps=WGS84 +step +proj=unitconvert +xy_in=rad +z_in=m +xy_out=deg +z_out=m",
      grids: [],
      coordinates: [
        -3473782.3808736387, -5349155.780223722, 0, -3473781.3054253734,
        -5349154.124178617, 5002.000280651459,
      ],
    },
    fingerprintCheck: {
      match: true,
    },
  },
  {
    id: "projections.epsg-32611",
    group: "projections",
    title:
      "EPSG:32611 (WGS 84 / UTM zone 11N): the origin, a 50 km line, a point 100 km off the central meridian and one at the zone's edge round-trip through the body-fixed frame within 1e-4 m",
    pass: true,
    value: 1.742344995389665e-9,
    tolerance: 0.0001,
    unit: "m",
    detail: "13 points; operation accuracy 0 m",
    fingerprint: {
      pipeline:
        "+proj=pipeline +step +inv +proj=utm +zone=11 +ellps=WGS84 +step +proj=unitconvert +xy_in=rad +z_in=m +xy_out=deg +z_out=m",
      grids: [],
      coordinates: [
        -2895613.6040372932, -5682961.679167224, 0, -2895612.707584296,
        -5682959.919779154, 5002.00028065146,
      ],
    },
    fingerprintCheck: {
      match: true,
    },
  },
  {
    id: "projections.epsg-32612",
    group: "projections",
    title:
      "EPSG:32612 (WGS 84 / UTM zone 12N): the origin, a 50 km line, a point 100 km off the central meridian and one at the zone's edge round-trip through the body-fixed frame within 1e-4 m",
    pass: true,
    value: 1.397002809832296e-9,
    tolerance: 0.0001,
    unit: "m",
    detail: "13 points; operation accuracy 0 m",
    fingerprint: {
      pipeline:
        "+proj=pipeline +step +inv +proj=utm +zone=12 +ellps=WGS84 +step +proj=unitconvert +xy_in=rad +z_in=m +xy_out=deg +z_out=m",
      grids: [],
      coordinates: [
        -2285719.878609012, -5954503.860717582, 0, -2285719.1709730094,
        -5954502.01726277, 5002.000280651459,
      ],
    },
    fingerprintCheck: {
      match: true,
    },
  },
  {
    id: "projections.epsg-32613",
    group: "projections",
    title:
      "EPSG:32613 (WGS 84 / UTM zone 13N): the origin, a 50 km line, a point 100 km off the central meridian and one at the zone's edge round-trip through the body-fixed frame within 1e-4 m",
    pass: true,
    value: 3.7424617572399286e-9,
    tolerance: 0.0001,
    unit: "m",
    detail: "13 points; operation accuracy 0 m",
    fingerprint: {
      pipeline:
        "+proj=pipeline +step +inv +proj=utm +zone=13 +ellps=WGS84 +step +proj=unitconvert +xy_in=rad +z_in=m +xy_out=deg +z_out=m",
      grids: [],
      coordinates: [
        -1650783.3278730582, -6160807.251909877, 0, -1650782.8168070582,
        -6160805.344585599, 5002.000280651459,
      ],
    },
    fingerprintCheck: {
      match: true,
    },
  },
  {
    id: "projections.epsg-32614",
    group: "projections",
    title:
      "EPSG:32614 (WGS 84 / UTM zone 14N): the origin, a 50 km line, a point 100 km off the central meridian and one at the zone's edge round-trip through the body-fixed frame within 1e-4 m",
    pass: true,
    value: 2.3751739277262316e-9,
    tolerance: 0.0001,
    unit: "m",
    detail: "13 points; operation accuracy 0 m",
    fingerprint: {
      pipeline:
        "+proj=pipeline +step +inv +proj=utm +zone=14 +ellps=WGS84 +step +proj=unitconvert +xy_in=rad +z_in=m +xy_out=deg +z_out=m",
      grids: [],
      coordinates: [
        -997760.4495483041, -6299611.54961845, 0, -997760.1406516527,
        -6299609.599321749, 5002.00028065146,
      ],
    },
    fingerprintCheck: {
      match: true,
    },
  },
  {
    id: "units.foot.same-place",
    group: "units",
    title:
      "3280.84 feet east from the same place in EPSG:6420 (US survey feet) and its international-foot copy: the lengths differ by the foot definitions' ratio, (1200/3937)/0.3048, within 1e-9",
    pass: true,
    value: 1.0380585280245214e-12,
    tolerance: 1e-9,
    detail:
      "units from PROJ: US survey foot 0.30480060960121924 m, foot 0.3048 m; ratio of lengths 1.000002000002962, of the foot definitions 1.000002000004",
  },
  {
    id: "units.foot.same-numbers",
    group: "units",
    title:
      "The same numbers in EPSG:6420 and its international-foot copy: a 1 km line is longer by 2 ppm in US survey feet, against the hand formula (1200/3937)/0.3048 − 1, within 2%",
    pass: true,
    value: 0.0016949974164102155,
    tolerance: 0.02,
    detail:
      "units from PROJ: US survey foot 0.30480060960121924 m, foot 0.3048 m; 2.003394 ppm against 2.000004 ppm by hand (the places differ by about 4 m, which moves the scale factor by a few parts in 1e9)",
    effect: {
      value: 2.003394001581782,
      unit: "ppm",
      label: "reading US survey feet as international feet (about 2 mm per km)",
    },
  },
  {
    id: "site-grids.round-trip.rotation-0.scale-1",
    group: "site-grids",
    title:
      "Site grid rotated 0° and scaled 1: lands at the site formula's grid point (within 1e-9 m) and round-trips within 1e-4 m",
    pass: true,
    value: 2.0705742600014147e-9,
    tolerance: 0.0001,
    unit: "m",
    detail: "site formula off by 0 m",
  },
  {
    id: "site-grids.round-trip.rotation-0.scale-1.0000375",
    group: "site-grids",
    title:
      "Site grid rotated 0° and scaled 1.0000375: lands at the site formula's grid point (within 1e-9 m) and round-trips within 1e-4 m",
    pass: true,
    value: 2.0410153748975043e-9,
    tolerance: 0.0001,
    unit: "m",
    detail: "site formula off by 0 m",
  },
  {
    id: "site-grids.round-trip.rotation-0.scale-0.99996",
    group: "site-grids",
    title:
      "Site grid rotated 0° and scaled 0.99996: lands at the site formula's grid point (within 1e-9 m) and round-trips within 1e-4 m",
    pass: true,
    value: 1.9111504069675467e-9,
    tolerance: 0.0001,
    unit: "m",
    detail: "site formula off by 0 m",
  },
  {
    id: "recorded-operations.geoid",
    group: "recorded-operations",
    title:
      "EPSG:6420+6360 records its operation once, with the GEOID18 grid us_noaa_g2018u0.tif in its pipeline",
    pass: true,
    detail:
      "pipeline +proj=pipeline +step +proj=unitconvert +xy_in=us-ft +xy_out=m +step +inv +proj=lcc +lat_0=36.5 +lon_0=-120.5 +lat_1=38.4333333333333 +lat_2=37.0666666666667 +x_0=2000000.0001016 +y_0=500000.0001016 +ellps=GRS80 +step +proj=unitconvert +z_in=us-ft +…",
    accuracy: {
      meters: 2.8497029350833625,
      terms: [
        {
          source: "earthOrientation",
          meters: 0.013460206417361675,
          note: "End a: measured Earth orientation (UT1 35 µs, polar motion 0.1 mas)",
        },
        {
          source: "projection",
          meters: 2.015,
          note: 'End a: engineering frame "California zone 3": PROJ operation (us_noaa_g2018u0.tif)',
        },
        {
          source: "earthOrientation",
          meters: 0.013252964420501431,
          note: "End b: measured Earth orientation (UT1 35 µs, polar motion 0.1 mas)",
        },
        {
          source: "projection",
          meters: 2.015,
          note: 'End b: engineering frame "California zone 3": PROJ operation (us_noaa_g2018u0.tif)',
        },
      ],
      warnings: [],
    },
    fingerprint: {
      pipeline:
        "+proj=pipeline +step +proj=unitconvert +xy_in=us-ft +xy_out=m +step +inv +proj=lcc +lat_0=36.5 +lon_0=-120.5 +lat_1=38.4333333333333 +lat_2=37.0666666666667 +x_0=2000000.0001016 +y_0=500000.0001016 +ellps=GRS80 +step +proj=unitconvert +z_in=us-ft +z_out=m +step +proj=vgridshift +grids=us_noaa_g2018u0.tif +multiplier=1 +step +proj=unitconvert +xy_in=rad +xy_out=deg",
      grids: [
        {
          name: "us_noaa_g2018u0.tif",
          sha256:
            "fa9a407ac7ee3f5a3694008e4bcd09ce9cc250452f0c3b11700a4960340abce2",
        },
      ],
      coordinates: [
        -2605278.2486746777, -4422884.798357462, 3772914.7395646037,
        -2708954.915437575, -4261602.286444082, 3883205.7750612297,
      ],
    },
    instant: 825595269.1853565,
    fingerprintCheck: {
      match: true,
    },
  },
  {
    id: "recorded-operations.missing-grid",
    group: "recorded-operations",
    title:
      "EPSG:22617+9245 (NAD83(CSRS)v6 / UTM 17N + CGVD2013a(2010) height) needs ca_nrc_CGG2013an83.tif, which is never loaded: creating the frame throws, naming that grid",
    pass: true,
    expectedError: "missing: .*ca_nrc_CGG2013an83\\.tif",
    error:
      "No PROJ operation from EPSG:22617+9245 to EPSG:4979 has all its grids; missing: ca_nrc_CGG2013ai08.tif, ca_nrc_CGG2013an83.tif; pass allowBallpark: true to accept a ballpark transformation",
  },
  {
    id: "frame-tree.compositions.itrf-gcrf",
    group: "frame-tree",
    title:
      "ITRF and GCRF: round trips, and compositions through the six other frames, agree within 1 mm per 1e9 m and 1e-12 in rotation",
    pass: true,
    value: 0.000054612403338191695,
    tolerance: 0.0007692247286752116,
    unit: "m",
    detail:
      "160 samples; the worst against its own tolerance shown; rotation 3.33e-16 (limit 1e-12)",
  },
  {
    id: "frame-tree.compositions.itrf-earth-icrf",
    group: "frame-tree",
    title:
      "ITRF and EARTH_ICRF: round trips, and compositions through the six other frames, agree within 1 mm per 1e9 m and 1e-12 in rotation",
    pass: true,
    value: 0.00002562425624050408,
    tolerance: 0.0007685757834357454,
    unit: "m",
    detail:
      "160 samples; the worst against its own tolerance shown; rotation 4.44e-16 (limit 1e-12)",
  },
  {
    id: "frame-tree.compositions.itrf-eme2000",
    group: "frame-tree",
    title:
      "ITRF and EME2000: round trips, and compositions through the six other frames, agree within 1 mm per 1e9 m and 1e-12 in rotation",
    pass: true,
    value: 0.000026677278002949666,
    tolerance: 0.0006237263916958713,
    unit: "m",
    detail:
      "160 samples; the worst against its own tolerance shown; rotation 4.44e-16 (limit 1e-12)",
  },
  {
    id: "frame-tree.compositions.itrf-hcrs",
    group: "frame-tree",
    title:
      "ITRF and HCRS: round trips, and compositions through the six other frames, agree within 1 mm per 1e9 m and 1e-12 in rotation",
    pass: true,
    value: 0.00003438852259083327,
    tolerance: 0.15240413950914602,
    unit: "m",
    detail:
      "160 samples; the worst against its own tolerance shown; rotation 4.44e-16 (limit 1e-12)",
  },
  {
    id: "frame-tree.compositions.itrf-moon-icrf",
    group: "frame-tree",
    title:
      "ITRF and MOON_ICRF: round trips, and compositions through the six other frames, agree within 1 mm per 1e9 m and 1e-12 in rotation",
    pass: true,
    value: 0.000030241145459539457,
    tolerance: 0.0007686031542929854,
    unit: "m",
    detail:
      "160 samples; the worst against its own tolerance shown; rotation 4.44e-16 (limit 1e-12)",
  },
  {
    id: "time.leap-second.monotonic",
    group: "time",
    title:
      "UTC labels every 0.5 s from 23:59:59 through 23:59:60.5 to 00:00:00.5 give TT strictly increasing in 0.5 s steps",
    pass: true,
    value: 0,
    tolerance: 0.000001,
    unit: "s",
    detail: "TT − TT₀: 0, 0.5, 1, 1.5, 2, 2.5 s",
    instant: 536500868.18395054,
  },
  {
    id: "time.leap-second.two-seconds",
    group: "time",
    title:
      "From 2016-12-31T23:59:59 to 2017-01-01T00:00:00 UTC, one labelled second, TT advances 2 s",
    pass: true,
    value: 0,
    tolerance: 0.000001,
    unit: "s",
    detail: "TT advanced 2 s",
    instant: 536500868.18395054,
  },
  {
    id: "time.eop-end",
    group: "time",
    title:
      "An Earth-fixed measurement 60 days past the EOP table's predictions throws, giving the table's dates",
    pass: true,
    expectedError:
      "ITRF: the EOP table covers .* and its predictions end there",
    error:
      "ITRF: the EOP table covers 1962-01-01T00:00:00.000Z to 2027-05-05T00:00:00.000Z and its predictions end there; measurements past it need newer EOP data (npm run setup refreshes it)",
    instant: 867931269.1840343,
  },
  {
    id: "trajectory.gap",
    group: "trajectory",
    title:
      "Orion's state at 2026-04-02T22:49:30 UTC, in a gap between the OEM's segments, throws and names the covered spans",
    pass: true,
    expectedError:
      "outside its data \\(covered: \\d{4}-.+ to \\d{4}-.+; \\d{4}-.+ to \\d{4}-",
    error:
      'Trajectory "orion": 2026-04-02T22:49:30.000Z is outside its data (covered: 2026-04-02T01:58:21.397Z to 2026-04-02T22:49:21.397Z; 2026-04-02T22:49:59.741Z to 2026-04-03T00:02:39.801Z; 2026-04-03T00:02:48.802Z to 2026-04-07T00:54:48.802Z; 2026-04-07T00:55:00.000Z to 2026-04-10T23:29:00.000Z; 2026-0…',
    instant: 828442239.1856313,
  },
  {
    id: "trajectory.moon-me.distance",
    group: "trajectory",
    title:
      "Orion at the lunar flyby, converted to MOON_ME, keeps its distance from the Moon's centre (within 1 mm per 1e9 m)",
    pass: true,
    value: 0.000010021030902862549,
    tolerance: 0.000818024259355645,
    unit: "m",
    detail: "8282.559 km from the Moon's centre",
    accuracy: {
      meters: 10.332349429859576,
      terms: [
        {
          source: "ephemeris",
          meters: 0.01,
          note: "DE440 Earth-Moon fit to lunar laser ranging (Park et al. 2021)",
        },
        {
          source: "relativity",
          meters: 0.03,
          note: "End a: selenocentric relativistic terms, stated and not applied",
        },
        {
          source: "trajectory",
          meters: 0.2779864803187378,
          note: 'End b: Trajectory "orion": position sigma',
        },
        {
          source: "coordinateScale",
          meters: 10.3285608028166,
          note: 'End b: Trajectory "orion": the scale of its coordinates (TDB or TT) is not stated, taken as TDB-compatible: 2.5e-8 of the geocentric distance',
        },
      ],
      warnings: [],
    },
    instant: 828788469.1856287,
  },
  {
    id: "trajectory.moon-me.round-trip",
    group: "trajectory",
    title:
      "Orion at the lunar flyby round-trips through MOON_ME back to its reference frame within 1 mm per 1e9 m",
    pass: true,
    value: 0.000012346365177760388,
    tolerance: 0.000818024259355645,
    unit: "m",
    detail: "reference EME2000",
    accuracy: {
      meters: 10.332349429859576,
      terms: [
        {
          source: "ephemeris",
          meters: 0.01,
          note: "DE440 Earth-Moon fit to lunar laser ranging (Park et al. 2021)",
        },
        {
          source: "relativity",
          meters: 0.03,
          note: "End a: selenocentric relativistic terms, stated and not applied",
        },
        {
          source: "trajectory",
          meters: 0.2779864803187378,
          note: 'End b: Trajectory "orion": position sigma',
        },
        {
          source: "coordinateScale",
          meters: 10.3285608028166,
          note: 'End b: Trajectory "orion": the scale of its coordinates (TDB or TT) is not stated, taken as TDB-compatible: 2.5e-8 of the geocentric distance',
        },
      ],
      warnings: [],
    },
    instant: 828788469.1856287,
  },
  {
    id: "measurement.grid-to-ground",
    group: "measurement",
    title:
      "A 10,000 ftUS design line on California zone 3 (site scale 1.0000375): design distance × site scale × metres per foot ÷ mean combined factor is the true distance, within 0.01 m",
    pass: true,
    value: 0.0000033186774999194313,
    tolerance: 0.01,
    unit: "m",
    detail:
      "design 10000 US survey foot; true 3048.324343749235 m; predicted 3048.3243470679126 m; combined factor 0.9999330941186371",
    accuracy: {
      meters: 2.849701951977205,
      terms: [
        {
          source: "earthOrientation",
          meters: 0.013252247617135645,
          note: "End a: measured Earth orientation (UT1 35 µs, polar motion 0.1 mas)",
        },
        {
          source: "projection",
          meters: 2.015,
          note: 'End a: engineering frame "California zone 3 site": PROJ operation (us_noaa_g2018u0.tif)',
        },
        {
          source: "earthOrientation",
          meters: 0.013251152243703063,
          note: "End b: measured Earth orientation (UT1 35 µs, polar motion 0.1 mas)",
        },
        {
          source: "projection",
          meters: 2.015,
          note: 'End b: engineering frame "California zone 3 site": PROJ operation (us_noaa_g2018u0.tif)',
        },
      ],
      warnings: [],
    },
    instant: 825595269.1853565,
  },
  {
    id: "measurement.clothoid",
    group: "measurement",
    title:
      "Points at stations and offsets along a clothoid alignment (tangent, spiral, arc, spiral, tangent) give back their station and offset within 1e-9 design units",
    pass: true,
    value: 1.1368683772161603e-12,
    tolerance: 1e-9,
    unit: "design units",
    detail: "27 points, every element",
  },
  {
    id: "measurement.design-vs-itrf",
    group: "measurement",
    title:
      "A design point measured to another point gives the same distance as the design point fixed in ITRF, within 1e-9 m",
    pass: true,
    value: 0,
    tolerance: 1e-9,
    unit: "m",
    detail:
      "2624.781595166941 m from the design point, 2624.781595166941 m from its ITRF position",
    accuracy: {
      meters: 2.0150871667881507,
      terms: [
        {
          source: "earthOrientation",
          meters: 0.013252247617135645,
          note: "End a: measured Earth orientation (UT1 35 µs, polar motion 0.1 mas)",
        },
        {
          source: "projection",
          meters: 2.015,
          note: 'End a: engineering frame "California zone 3 site": PROJ operation (us_noaa_g2018u0.tif)',
        },
        {
          source: "earthOrientation",
          meters: 0.013253968741061727,
          note: "End b: measured Earth orientation (UT1 35 µs, polar motion 0.1 mas)",
        },
      ],
      warnings: [],
    },
    instant: 825595269.1853565,
  },
  {
    id: "reference-values.ngs-gu2195.grid",
    group: "reference-values",
    title:
      "GU2195 (SPC CA 3): northing 555,553.819 m and easting 1,905,441.053 m from the datasheet's position, within half a unit of their last digit plus the position's own rounding",
    pass: true,
    value: 0.000388322863727808,
    tolerance: 0.0007787740207983445,
    unit: "m",
    detail:
      "computed N 555553.8189, E 1905441.0526 m; the position's rounding allows 0.000278 m; operation accuracy 2.015 m (a datum ensemble, not this check's path)",
    fingerprint: {
      pipeline:
        "+proj=pipeline +step +inv +proj=lcc +lat_0=36.5 +lon_0=-120.5 +lat_1=38.4333333333333 +lat_2=37.0666666666667 +x_0=2000000 +y_0=500000 +ellps=GRS80 +step +proj=vgridshift +grids=us_noaa_g2018u0.tif +multiplier=1 +step +proj=unitconvert +xy_in=rad +xy_out=deg",
      grids: [
        {
          name: "us_noaa_g2018u0.tif",
          sha256:
            "fa9a407ac7ee3f5a3694008e4bcd09ce9cc250452f0c3b11700a4960340abce2",
        },
      ],
      coordinates: [
        -2669623.2348006126, -4345820.745939748, 3817029.9170203456,
      ],
    },
    fingerprintCheck: {
      match: true,
    },
  },
  {
    id: "reference-values.ngs-gu2195.convergence",
    group: "reference-values",
    title: "GU2195 (SPC CA 3): convergence -0 39 01.3 (d m s), within 0.05″",
    pass: true,
    value: 0.024242767471442418,
    tolerance: 0.0502062648062471,
    unit: "″",
    detail:
      "computed -0.650354377°, published -0.6503611111° (both from true north to grid north, positive east)",
  },
  {
    id: "reference-values.ngs-ak7130.grid",
    group: "reference-values",
    title:
      "AK7130 (SPC FL E): northing 464,326.710 m and easting 165,563.220 m from the datasheet's position, within half a unit of their last digit plus the position's own rounding",
    pass: true,
    value: 0.00045519485138356686,
    tolerance: 0.0007908620704699876,
    unit: "m",
    detail:
      "computed N 464326.7105, E 165563.2202 m; the position's rounding allows 0.00029 m; operation accuracy 2.015 m (a datum ensemble, not this check's path)",
    fingerprint: {
      pipeline:
        "+proj=pipeline +step +inv +proj=tmerc +lat_0=24.3333333333333 +lon_0=-81 +k=0.999941177 +x_0=200000 +y_0=0 +ellps=GRS80 +step +proj=vgridshift +grids=us_noaa_g2018u0.tif +multiplier=1 +step +proj=unitconvert +xy_in=rad +xy_out=deg",
      grids: [
        {
          name: "us_noaa_g2018u0.tif",
          sha256:
            "fa9a407ac7ee3f5a3694008e4bcd09ce9cc250452f0c3b11700a4960340abce2",
        },
      ],
      coordinates: [843288.6976178947, -5544461.68256802, 3027654.3317784853],
    },
    fingerprintCheck: {
      match: true,
    },
  },
  {
    id: "reference-values.ngs-aa5394.grid",
    group: "reference-values",
    title:
      "AA5394 (SPC PA S): northing 98,316.257 m and easting 675,926.158 m from the datasheet's position, within half a unit of their last digit plus the position's own rounding",
    pass: true,
    value: 0.0002885193098336458,
    tolerance: 0.0007734409569503345,
    unit: "m",
    detail:
      "computed N 98316.2570, E 675926.1577 m; the position's rounding allows 0.000272 m; operation accuracy 2.015 m (a datum ensemble, not this check's path)",
    fingerprint: {
      pipeline:
        "+proj=pipeline +step +inv +proj=lcc +lat_0=39.3333333333333 +lon_0=-77.75 +lat_1=40.9666666666667 +lat_2=39.9333333333333 +x_0=600000 +y_0=0 +ellps=GRS80 +step +proj=vgridshift +grids=us_noaa_g2018u0.tif +multiplier=1 +step +proj=unitconvert +xy_in=rad +xy_out=deg",
      grids: [
        {
          name: "us_noaa_g2018u0.tif",
          sha256:
            "fa9a407ac7ee3f5a3694008e4bcd09ce9cc250452f0c3b11700a4960340abce2",
        },
      ],
      coordinates: [1108939.4362844098, -4749616.094112043, 4096316.73479157],
    },
    fingerprintCheck: {
      match: true,
    },
  },
  {
    id: "reference-values.iogp-transverse-mercator-forward",
    group: "reference-values",
    title:
      "IOGP 373-7-2's Transverse Mercator example (OSGB 1936 / British National Grid, EPSG:27700), forward, shown: its E 577274.99, N 69740.50 (JHS formulas) against the library's (Krüger series, Poder–Engsager), the method difference, with no pass or fail",
    pass: true,
    displayOnly: true,
    detail:
      "computed E 577274.9838, N 69740.4923; pipeline +proj=pipeline +step +inv +proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +step +proj=unitconvert +xy_in=rad +xy_out=deg; the conversion alone; the Ordnance Survey's example…",
    effect: {
      value: 9.903443335887946,
      unit: "mm",
      label:
        "IOGP's Transverse Mercator example (JHS formulas) against the library (Krüger series, Poder–Engsager)",
    },
    fingerprint: {
      pipeline:
        "+proj=pipeline +step +inv +proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +step +proj=unitconvert +xy_in=rad +xy_out=deg",
      grids: [],
      coordinates: [577274.9838134756, 69740.49226662391, 0],
    },
    fingerprintCheck: {
      match: true,
    },
  },
  {
    id: "vertical-profile.parabola.elevations",
    group: "vertical-profile",
    title:
      "Elevations at the BVC (8+00, 94.000), EVC (12+00, 96.000) and stations 8+50, 9+00, 10+00 and 11+00 (95.34375, 96.375, 97.5, 97.375) within 1e-9",
    pass: true,
    value: 0,
    tolerance: 1e-9,
    unit: "ft",
    detail:
      "800: 94; 850: 95.34375; 900: 96.375; 1000: 97.5; 1100: 97.375; 1200: 96",
  },
  {
    id: "vertical-profile.parabola.high-point",
    group: "vertical-profile",
    title:
      "The high point at x = −g1·L/(g2 − g1) = 240 from the BVC (station 10+40.00, elevation 97.6) is a maximum: 0.01 either side is lower",
    pass: true,
    value: 1.4210854715202004e-14,
    tolerance: 1e-9,
    unit: "ft",
    detail:
      "elevation 97.60000000000001 at 1040; 97.59999999375 and 97.59999999375 at ±0.01",
  },
  {
    id: "vertical-profile.parabola.k",
    group: "vertical-profile",
    title:
      "K = L/|g2 − g1| = 400/5 = 80 (length per percent of grade change), from the profile's rate of change of grade, within 1e-9",
    pass: true,
    value: 0,
    tolerance: 1e-9,
    detail: "K 80",
  },
  {
    id: "distortion.web-mercator-scale.k-0",
    group: "distortion",
    title:
      "EPSG:3857's parallel scale at 0° against sqrt(1 − e² sin² φ) / cos φ (WGS 84), within 1e-9",
    pass: true,
    value: 0,
    tolerance: 1e-9,
    detail: "k 1, by hand 1; the sphere's 1/cos φ is 1",
  },
  {
    id: "distortion.web-mercator-scale.k-45",
    group: "distortion",
    title:
      "EPSG:3857's parallel scale at 45° against sqrt(1 − e² sin² φ) / cos φ (WGS 84), within 1e-9",
    pass: true,
    value: 4.440892098500626e-16,
    tolerance: 1e-9,
    detail:
      "k 1.4118447577583935, by hand 1.411844757758394; the sphere's 1/cos φ is 1.414213562373095",
  },
  {
    id: "distortion.low-distortion.portland",
    group: "distortion",
    title:
      "OCRS Portland zone at Portland1, at the design height h0 = (k0 − 1)·RG: distortion within the handbook's ±10 ppm target, matching δ = k·RG/(RG + h) − 1 by hand within 2%",
    pass: true,
    value: 0.0000014518625754966763,
    tolerance: 0.02,
    detail: "h0 12.757 m; 6.06214 ppm, by hand 6.06215 ppm; target ±10 ppm",
    effect: {
      value: 6.062137987372651,
      unit: "ppm",
      label: "grid against ground in the OCRS Portland zone",
    },
    fingerprint: {
      pipeline:
        "+proj=pipeline +step +inv +proj=lcc +lat_1=45.5 +lat_0=45.5 +lon_0=-122.75 +k_0=1.000002 +x_0=100000 +y_0=50000 +ellps=GRS80 +step +proj=unitconvert +xy_in=rad +z_in=m +xy_out=deg +z_out=m",
      grids: [],
      coordinates: [-2445974.75218936, -3769997.015307533, 4510874.571753689],
    },
    fingerprintCheck: {
      match: true,
    },
  },
  {
    id: "rigid-placement-budget.extents.lat-0-1mm",
    group: "rigid-placement-budget",
    title:
      "Latitude 0° (WGS 84 / UTM zone 31N): the extent where rigid placement is off by 1 mm is within 10% of √(2Rε) = 112.8 m, and its separation within 10% of 1 mm",
    pass: true,
    value: 0.001680595573301913,
    tolerance: 0.1,
    detail:
      "extent 112.944 m, separation there 0.001 m; R 6356752 m; site scale 0.9996",
    effect: {
      value: 112.94367204819955,
      unit: "m",
      label:
        "how far a rigidly placed site reaches before it is off by 1 mm at 0°",
    },
  },
  {
    id: "rigid-placement-budget.extents.lat-0-1cm",
    group: "rigid-placement-budget",
    title:
      "Latitude 0° (WGS 84 / UTM zone 31N): the extent where rigid placement is off by 1 cm is within 10% of √(2Rε) = 356.6 m, and its separation within 10% of 1 cm",
    pass: true,
    value: 0.001680634005168713,
    tolerance: 0.1,
    detail:
      "extent 357.159 m, separation there 0.01 m; R 6356752 m; site scale 0.9996",
    effect: {
      value: 357.15926467867234,
      unit: "m",
      label:
        "how far a rigidly placed site reaches before it is off by 1 cm at 0°",
    },
  },
  {
    id: "rigid-placement-budget.extents.lat-0-10cm",
    group: "rigid-placement-budget",
    title:
      "Latitude 0° (WGS 84 / UTM zone 31N): the extent where rigid placement is off by 10 cm is within 10% of √(2Rε) = 1128 m, and its separation within 10% of 10 cm",
    pass: true,
    value: 0.0016806316985760184,
    tolerance: 0.1,
    detail:
      "extent 1129.44 m, separation there 0.1 m; R 6356752 m; site scale 0.9996",
    effect: {
      value: 1129.4367612147512,
      unit: "m",
      label:
        "how far a rigidly placed site reaches before it is off by 10 cm at 0°",
    },
  },
  {
    id: "coordinate-epoch.nad83-itrf2014.helmert-iogp-position-vector",
    group: "coordinate-epoch",
    title:
      "The hand-coded Helmert reproduces IOGP 373-7-2's position vector example (WGS 72 to WGS 84) within half a unit of its last digit plus its inputs' own rounding",
    pass: true,
    value: 0.005932976957410574,
    tolerance: 0.010000001,
    unit: "m",
    detail: "computed 3657660.7741, 255778.4300, 5201387.7491",
  },
  {
    id: "coordinate-epoch.nad83-itrf2014.helmert-iogp-time-dependent",
    group: "coordinate-epoch",
    title:
      "The hand-coded Helmert reproduces IOGP 373-7-2's time-dependent coordinate frame example (ITRF2008 to GDA94 at 2013.90) forward and reversed, within half a unit of its last digit plus its inputs' own rounding",
    pass: true,
    value: 0.0004527084529399872,
    tolerance: 0.001000001,
    unit: "m",
    detail:
      "forward -3789470.0042, 4841770.6865, -1690895.1080; reverse -3789470.7098, 4841770.4035, -1690893.9520",
  },
  {
    id: "coordinate-epoch.nad83-itrf2014.no-epoch",
    group: "coordinate-epoch",
    title:
      "The same point with no coordinate epoch (the rates do not apply) against epoch 2026.0: the error of leaving the epoch out matches the hand Helmert's 16-year move within 2%",
    pass: true,
    value: 1.5668614494757094e-7,
    tolerance: 0.02,
    detail: "no epoch is 0 m from epoch 2010.0 (the parameter reference epoch)",
    effect: {
      value: 29.881140490840252,
      unit: "cm",
      label: "the error of giving no coordinate epoch, for a 2026 position",
    },
    fingerprint: {
      pipeline:
        "+proj=pipeline +step +proj=unitconvert +xy_in=deg +z_in=m +xy_out=rad +z_out=m +step +proj=cart +ellps=GRS80 +step +inv +proj=helmert +x=1.0053 +y=-1.90921 +z=-0.54157 +rx=0.02678138 +ry=-0.00042027 +rz=0.01093206 +s=0.00036891 +dx=0.00079 +dy=-0.0006 +dz=-0.00144 +drx=6.667e-05 +dry=-0.00075744 +drz=-5.133e-05 +ds=-7.201e-05 +t_epoch=2010 +convention=coordinate_frame +step +inv +proj=cart +ellps=GRS80 +step +proj=unitconvert +xy_in=rad +z_in=m +xy_out=deg +z_out=m",
      grids: [],
      coordinates: [-2669624.0165800042, -4345819.472245232, 3817029.88737936],
    },
    fingerprintCheck: {
      match: true,
    },
  },
  {
    id: "axes-and-the-antimeridian.axes.epsg-4326",
    group: "axes-and-the-antimeridian",
    title:
      "GU2195's 36 59 44.62514(N) 121 33 44.16406(W) as EPSG:4326, longitude first, to NAD83(2011) / UTM zone 10N: within 1 mm of its published N 4,095,364.617, E 627,934.650",
    pass: true,
    value: 0.00007692929440003547,
    tolerance: 0.001,
    unit: "m",
    detail:
      "computed E 627934.6499, N 4095364.6170; pipeline +proj=pipeline +step +proj=unitconvert +xy_in=deg +xy_out=rad +step +proj=utm +zone=10 +ellps=GRS80",
    fingerprint: {
      pipeline:
        "+proj=pipeline +step +proj=unitconvert +xy_in=deg +xy_out=rad +step +proj=utm +zone=10 +ellps=GRS80",
      grids: [],
      coordinates: [627934.6499283955, 4095364.616971877, 0],
    },
    fingerprintCheck: {
      match: true,
    },
  },
  {
    id: "axes-and-the-antimeridian.axes.northing-first",
    group: "axes-and-the-antimeridian",
    title:
      "EPSG:31467 (northing first in EPSG): design (3 500 000, 5 540 000) lies on the 9° meridian, and 1 km steps in design E and N move east and north by the hand-computed angles, within 1e-3",
    pass: true,
    value: 0.0000018072717078432277,
    tolerance: 0.001,
    fingerprint: {
      pipeline:
        "+proj=pipeline +step +inv +proj=tmerc +lat_0=0 +lon_0=9 +k=1 +x_0=3500000 +y_0=0 +ellps=bessel +step +proj=push +v_3 +step +proj=cart +ellps=bessel +step +proj=helmert +x=598.1 +y=73.7 +z=418.2 +rx=0.202 +ry=0.045 +rz=-2.455 +s=6.7 +convention=position_vector +step +inv +proj=cart +ellps=WGS84 +step +proj=pop +v_3 +step +proj=unitconvert +xy_in=rad +z_in=m +xy_out=deg +z_out=m",
      grids: [],
      coordinates: [
        4057609.139443144, 642586.6949808575, 4862527.344943873,
        4057452.6692779413, 643574.376639122, 4862527.288498062,
      ],
    },
    detail:
      "origin 8.99896057°E 49.9963399°N; east step 0.01394675° (hand 0.01394677°), north step 0.008990445° (hand 0.008990462°)",
    fingerprintCheck: {
      match: true,
    },
  },
  {
    id: "axes-and-the-antimeridian.antimeridian.zone-1",
    group: "axes-and-the-antimeridian",
    title:
      "UTM zone 1N: points at ±179.999° (latitudes 0° and 45°) round-trip within 1e-4 m",
    pass: true,
    value: 1.3170890160421031e-9,
    tolerance: 0.0001,
    unit: "m",
    detail: "E 166132.872, E 263632.789, E 165910.014, E 263475.158",
    fingerprint: {
      pipeline:
        "+proj=pipeline +step +inv +proj=utm +zone=1 +ellps=WGS84 +step +proj=unitconvert +xy_in=rad +z_in=m +xy_out=deg +z_out=m",
      grids: [],
      coordinates: [
        -6378136.999028551, -111.31949078952906, 0, -4517590.878160863,
        -78.84683509132593, 4487348.408865919,
      ],
    },
    fingerprintCheck: {
      match: true,
    },
  },
  {
    id: "space.dss43-orion.light-time",
    group: "space",
    title:
      "DSS-43 receiving from Orion: the light time against plan 3's SPICE fixture (spkpos CN, no Shapiro delay), c·∆lt within plan 3's 0.5 m",
    pass: true,
    value: 0.4496481514393411,
    tolerance: 0.5,
    unit: "m",
    detail:
      "8 rows: nearStart: c·∆lt -0.402 m; spread: c·∆lt -0.241 m; spread: c·∆lt -0.117 m; spread: c·∆lt -0.361 m; spread: c·∆lt -0.0717 m; spread: c·∆lt -0.45 m; nearJoin: c·∆lt 0.172 m; nearEnd: c·∆lt 0.134 m; 4 rows fall in the OEM's gaps (plan 3 used its SPK ga…",
  },
  {
    id: "space.dss43-orion.doppler",
    group: "space",
    title:
      "DSS-43 receiving from Orion: the Doppler ratio against 1 − n·(vO − vS)/c with SPICE's direction and the OEM's velocity, within plan 3's 3e-8",
    pass: true,
    value: 1.7815997566117403e-9,
    tolerance: 3e-8,
    detail:
      "8 rows; 4 rows fall in the OEM's gaps (plan 3 used its SPK gap fill): nearJoin 828442233.5826567, nearJoin 828446630.9866567, nearJoin 828795366.1856549, nearJoin 829136091.9216455",
  },
  {
    id: "space.effects.earth-orientation",
    group: "space",
    title:
      "Earth orientation's uncertainty at the flyby, at DSS-43 on the Earth's surface (display only)",
    pass: true,
    displayOnly: true,
    detail:
      "0.01364 m: End a: measured Earth orientation (UT1 35 µs, polar motion 0.1 mas)",
    effect: {
      value: 0.013639468813818672,
      unit: "m",
      label: "Earth orientation's uncertainty at DSS-43",
    },
    instant: 828788469.1856287,
  },
  {
    id: "operation-candidates.ed50-north-sea.candidates",
    group: "operation-candidates",
    title:
      "PROJ's candidates for ED50 to WGS 84 within 0.1° of 56°N 3°E include at least two accurate (non-ballpark) operations; without the area of interest it offers only the ballpark",
    pass: true,
    detail:
      "with the area: ED50 to WGS 84 (18) (1 m); ED50 to WGS 84 (2) (6 m); ED50 to WGS 84 (1) (10 m); without: Ballpark geographic offset from ED50 to WGS 84",
  },
  {
    id: "operation-candidates.ed50-north-sea.recorded",
    group: "operation-candidates",
    title:
      "resolveOperation with the same area records the candidate its documented rule picks from listOperations' list (pipeline and accuracy)",
    pass: true,
    detail:
      "recorded ED50 to WGS 84 (18), accuracy 1 m: +proj=pipeline +step +proj=unitconvert +xy_in=deg +xy_out=rad +step +proj=push +v_3 +step +proj=cart +ellps=intl +step +proj=helmert +x=-89.5 +y=-93.8 +z=-123.1 +rx=0 +ry=0 +rz=-0.156 +s=1.2 +convention=position_v…",
    fingerprint: {
      pipeline:
        "+proj=pipeline +step +proj=unitconvert +xy_in=deg +xy_out=rad +step +proj=push +v_3 +step +proj=cart +ellps=intl +step +proj=helmert +x=-89.5 +y=-93.8 +z=-123.1 +rx=0 +ry=0 +rz=-0.156 +s=1.2 +convention=position_vector +step +inv +proj=cart +ellps=WGS84 +step +proj=pop +v_3 +step +proj=unitconvert +xy_in=rad +z_in=m +xy_out=deg +z_out=m",
      grids: [],
      coordinates: [3570010.5977921733, 187004.5110007386, 5264400.008199947],
    },
    fingerprintCheck: {
      match: true,
    },
  },
  {
    id: "operation-candidates.ed50-north-sea.spread",
    group: "operation-candidates",
    title:
      "The largest distance between the accurate candidates' WGS 84 positions of the point, against the same from the EPSG records' parameters by hand (IOGP 373-7-2 §4.2), within 2%",
    pass: true,
    value: 3.498716871774832e-10,
    tolerance: 0.02,
    detail:
      "library 2.05237 m, hand 2.05237 m over ED50 to WGS 84 (18), ED50 to WGS 84 (2), ED50 to WGS 84 (1)",
    effect: {
      value: 2.0523725561904693,
      unit: "m",
      label:
        "how far apart ED50's registered transformations put one North Sea point",
    },
  },
  {
    id: "ifc-map-conversion.ifc43-utm.origin",
    group: "ifc-map-conversion",
    title:
      "The model origin through the map conversion and EPSG:25832 against the example's IfcSite RefLatitude and RefLongitude (49°05′43.983700″ N, 8°26′01.247300″ E), within half a unit of the printed Eastings and Northings and of the site's angles",
    pass: true,
    value: 0.000958401665666368,
    tolerance: 0.007092944414400645,
    unit: "m",
    detail:
      "the frame's operation: +proj=pipeline +step +inv +proj=utm +zone=32 +ellps=GRS80 +step +proj=unitconvert +xy_in=rad +z_in=m +xy_out=deg +z_out=m (ETRS89 to WGS 84 is EPSG's null transformation, so this checks the map conversion and the projection)",
    fingerprint: {
      pipeline:
        "+proj=pipeline +step +inv +proj=utm +zone=32 +ellps=GRS80 +step +proj=unitconvert +xy_in=rad +z_in=m +xy_out=deg +z_out=m",
      grids: [],
      coordinates: [
        4139234.0249408535, 613715.3130213002, 4797609.466876835,
        4140937.3774163947, 614322.5928316381, 4798718.680906426,
      ],
    },
    fingerprintCheck: {
      match: true,
    },
  },
  {
    id: "ifc-map-conversion.ifc43-utm.elevation",
    group: "ifc-map-conversion",
    title:
      "The model origin's height (OrthogonalHeight 113.7 on a CRS with no vertical axis, passed through) against the IfcSite's RefElevation 113.7, within half its last digit",
    pass: true,
    value: 0,
    tolerance: 0.05,
    unit: "m",
  },
  {
    id: "ifc-map-conversion.ifc43-utm.gauss-kruger",
    group: "ifc-map-conversion",
    title:
      "The E.7.1 example's model origin (the same site on EPSG:31467, DHDN) against the IfcSite's latitude and longitude, within half a unit of its printed Eastings and Northings plus the DHDN operation's stated accuracy",
    pass: true,
    value: 1.3745291164152524,
    tolerance: 3.0070929434144005,
    unit: "m",
    detail:
      "+proj=pipeline +step +inv +proj=tmerc +lat_0=0 +lon_0=9 +k=1 +x_0=3500000 +y_0=0 +ellps=bessel +step +proj=push +v_3 +step +proj=cart +ellps=bessel +step +proj=helmert +x=598.1 +y=73.7 +z=418.2 +rx=0.202 +ry=0.045 +rz=-2.455 +s=6.7 +convention=position_vect…",
    effect: {
      value: 1.3745291164152524,
      unit: "m",
      label:
        "how far the Gauss-Krüger copy of the same IFC site lands from the UTM one, through DHDN's datum shift",
    },
    fingerprint: {
      pipeline:
        "+proj=pipeline +step +inv +proj=tmerc +lat_0=0 +lon_0=9 +k=1 +x_0=3500000 +y_0=0 +ellps=bessel +step +proj=push +v_3 +step +proj=cart +ellps=bessel +step +proj=helmert +x=598.1 +y=73.7 +z=418.2 +rx=0.202 +ry=0.045 +rz=-2.455 +s=6.7 +convention=position_vector +step +inv +proj=cart +ellps=WGS84 +step +proj=pop +v_3 +step +proj=unitconvert +xy_in=rad +z_in=m +xy_out=deg +z_out=m",
      grids: [],
      coordinates: [4139235.06734793, 613715.3234504282, 4797608.572214335],
    },
    fingerprintCheck: {
      match: true,
    },
  },
  {
    id: "plate-motion.gda94-gda2020.hand",
    group: "plate-motion",
    title:
      "The hand-coded 7-parameter Helmert (coordinate frame, the manual's Equation 18) takes the manual's GDA94 XYZ of ALIC to its printed GDA2020 XYZ, within half a unit of the last digit plus the inputs' own",
    pass: true,
    value: 0.00004851818084716797,
    tolerance: 0.00010000100000000001,
    unit: "m",
    detail: "computed -4052052.7379, 4212835.9897, -2545104.5898",
  },
  {
    id: "plate-motion.gda94-gda2020.library",
    group: "plate-motion",
    title:
      "resolveOperation from GDA94 (EPSG:4939) to GDA2020 (EPSG:7843) takes ALIC's printed latitude, longitude and height to the hand Helmert's position within 1 mm (the library picks the 7-parameter transformation, not the conformal grid)",
    pass: true,
    value: 1.9199706733309015e-9,
    tolerance: 0.001,
    unit: "m",
    detail:
      "no grid; accuracy 0.01 m; +proj=pipeline +step +proj=unitconvert +xy_in=deg +z_in=m +xy_out=rad +z_out=m +step +proj=cart +ellps=GRS80 +step +proj=helmert +x=0.06155 +y=-0.01087 +z=-0.04019 +rx=-0.0394924 +ry=-0.0327221 +rz=-0.0328979 +s=-0.009994 +conventi…",
    fingerprint: {
      pipeline:
        "+proj=pipeline +step +proj=unitconvert +xy_in=deg +z_in=m +xy_out=rad +z_out=m +step +proj=cart +ellps=GRS80 +step +proj=helmert +x=0.06155 +y=-0.01087 +z=-0.04019 +rx=-0.0394924 +ry=-0.0327221 +rz=-0.0328979 +s=-0.009994 +convention=coordinate_frame +step +inv +proj=cart +ellps=GRS80 +step +proj=unitconvert +xy_in=rad +z_in=m +xy_out=deg +z_out=m",
      grids: [],
      coordinates: [
        -4052052.7379184873, 4212835.989773808, -2545104.5898395195,
      ],
    },
    fingerprintCheck: {
      match: true,
    },
  },
  {
    id: "plate-motion.gda94-gda2020.shift",
    group: "plate-motion",
    title:
      "The size of the GDA94 to GDA2020 shift at ALIC, against the manual's printed N, E and U differences, within 2%",
    pass: true,
    value: 0.00001598998201068902,
    tolerance: 0.02,
    detail: "library 1.74674 m; manual sqrt(N² + E² + U²) = 1.74677 m",
    effect: {
      value: 1.7467387794709617,
      unit: "m",
      label: "how far GDA2020 moved Alice Springs from GDA94",
    },
  },
  {
    id: "below-the-ellipsoid.elevation-factor.equator.500",
    group: "below-the-ellipsoid",
    title:
      "The elevation factor at h = -500 m at 0°N against R/(R + h) = 1.0000786627 (R = sqrt(M N) = 6356752.314 m), within 1e-12, and above 1",
    pass: true,
    value: 0,
    tolerance: 1e-12,
    detail: "library 1.0000786627048897; combined factor 0.9996786312069318",
  },
  {
    id: "below-the-ellipsoid.elevation-factor.equator.2000",
    group: "below-the-ellipsoid",
    title:
      "The elevation factor at h = -2000 m at 0°N against R/(R + h) = 1.00031472509 (R = sqrt(M N) = 6356752.314 m), within 1e-12, and above 1",
    pass: true,
    value: 0,
    tolerance: 1e-12,
    detail: "library 1.0003147250909397; combined factor 0.9999145991680196",
  },
  {
    id: "below-the-ellipsoid.tunnel.portal-level",
    group: "below-the-ellipsoid",
    title:
      "The same line measured at the portals (h = +300 m) is longer than at tunnel level: the difference against the hand formula's, within 2%",
    pass: true,
    value: 0.0000018905601011365292,
    tolerance: 0.02,
    detail: "library 0.392115 m, hand 0.392114 m",
    effect: {
      value: 0.3921149558154866,
      unit: "m",
      label:
        "how much shorter a 5 km line is 500 m lower (tunnel against portal level)",
    },
  },
  {
    id: "heights-and-wgs84.nad83-itrf2014",
    group: "heights-and-wgs84",
    title:
      "NAD83(2011) against ITRF2014 at epoch 2026.0 at the California datasheet point (GU2195): the size of the difference, against the Coordinate epoch group's hand-coded EPSG 8970 Helmert, within 2%",
    pass: true,
    value: 2.1813069461806833e-8,
    tolerance: 0.02,
    detail: "library 1.65028 m, hand 1.65028 m; operation accuracy 0 m",
    effect: {
      value: 1.6502787812443718,
      unit: "m",
      label:
        "how far NAD83(2011) is from ITRF2014 (≈ today's WGS 84) in 2026 at GU2195",
    },
  },
  {
    id: "heights-and-wgs84.wgs84-ensemble",
    group: "heights-and-wgs84",
    title:
      "EPSG:4326 is the WGS 84 datum ensemble: NAD83(2011) to it, and the California frame to EPSG:4979, state accuracies of at least the ensemble's 2 m (EPSG datum ensemble 6326)",
    pass: true,
    detail:
      'NAD83(2011) to EPSG:4326: 2 m (+proj=noop); California frame to EPSG:4979: 2.015 m. Why: WGS 84 as EPSG:4326 is an ensemble of 8 realizations with an ensemble accuracy of 2 m, and EPSG treats them as one ("EPSG::6326 has been the then current realization.")…',
  },
  {
    id: "heights-and-wgs84.three-heights.separation",
    group: "heights-and-wgs84",
    title:
      "The geoid separation (ellipsoid height − NAVD88 height) beside the datasheet's GEOID18 height (shown, not judged: the NAVD88 row above checks it to 1.1 mm)",
    pass: true,
    displayOnly: true,
    detail: "library -32.745 m, datasheet -32.745 m",
    effect: {
      value: -32.745039832232095,
      unit: "m",
      label:
        "how far the NAVD88 height and the GPS (ellipsoid) height differ at GU2195",
    },
  },
  {
    id: "bound-crss.ed50-utm31n.source-crs",
    group: "bound-crss",
    title:
      "ED50 / UTM zone 31N: the engineering frame's units, type and grid factors are the source CRS's (its WKT's axis unit, and the factors of a frame on the source CRS alone)",
    pass: true,
    value: 0,
    tolerance: 1e-10,
    detail:
      "metre (1 m) against the WKT's 1 m; point scale 0.9995999999 and 0.9995999999; convergence differs by 0 rad; at 56°, 3°",
    userInput: false,
  },
  {
    id: "bound-crss.ed50-utm31n.recorded-operation",
    group: "bound-crss",
    title:
      "ED50 / UTM zone 31N: the recorded operation is the bound CRS's own Helmert (the WKT's TOWGS84 numbers and convention), not PROJ's registry choice",
    pass: true,
    value: 0,
    tolerance: 0.000001,
    unit: "m",
    detail:
      "WKT: Position Vector transformation (geog2D domain), X-axis translation -87, Y-axis translation -98, Z-axis translation -121, X-axis rotation 0, Y-axis rotation 0, Z-axis rotation 0, Scale difference 1; recorded: +proj=pipeline +step +inv +proj=utm +zone=31…",
    userInput: false,
  },
  {
    id: "bound-crss.ed50-utm31n.accuracy",
    group: "bound-crss",
    title:
      "ED50 / UTM zone 31N: the frame's accuracy as the measurement states it (shown, not judged)",
    pass: true,
    displayOnly: true,
    accuracy: {
      meters: undefined,
      terms: [
        {
          source: "earthOrientation",
          meters: 0.009631487739750002,
          note: "End a: measured Earth orientation (UT1 35 µs, polar motion 0.1 mas)",
        },
        {
          source: "projection",
          meters: undefined,
          note: 'End a: engineering frame "ED50 / UTM zone 31N": PROJ operation (no grids); its accuracy is not known',
        },
        {
          source: "earthOrientation",
          meters: 0.009631487737736403,
          note: "End b: measured Earth orientation (UT1 35 µs, polar motion 0.1 mas)",
        },
        {
          source: "projection",
          meters: undefined,
          note: 'End b: engineering frame "ED50 / UTM zone 31N": PROJ operation (no grids); its accuracy is not known',
        },
      ],
      warnings: [],
    },
    detail:
      'not bounded: projection is unknown (End a: engineering frame "ED50 / UTM zone 31N": PROJ operation (no grids); its accuracy is not known); a TOWGS84 carries no accuracy',
    userInput: false,
  },
  {
    id: "bound-crss.tokyo-jprcs-ix.accuracy",
    group: "bound-crss",
    title:
      "Tokyo / Japan Plane Rectangular CS IX: the frame's accuracy as the measurement states it (shown, not judged)",
    pass: true,
    displayOnly: true,
    accuracy: {
      meters: undefined,
      terms: [
        {
          source: "earthOrientation",
          meters: 0.013592803932450473,
          note: "End a: measured Earth orientation (UT1 35 µs, polar motion 0.1 mas)",
        },
        {
          source: "projection",
          meters: undefined,
          note: 'End a: engineering frame "Tokyo / Japan Plane Rectangular CS IX": PROJ operation (no grids); its accuracy is not known',
        },
        {
          source: "earthOrientation",
          meters: 0.013592803830555365,
          note: "End b: measured Earth orientation (UT1 35 µs, polar motion 0.1 mas)",
        },
        {
          source: "projection",
          meters: undefined,
          note: 'End b: engineering frame "Tokyo / Japan Plane Rectangular CS IX": PROJ operation (no grids); its accuracy is not known',
        },
      ],
      warnings: [],
    },
    detail:
      'not bounded: projection is unknown (End a: engineering frame "Tokyo / Japan Plane Rectangular CS IX": PROJ operation (no grids); its accuracy is not known); a TOWGS84 carries no accuracy',
    userInput: false,
  },
  {
    id: "bound-crss.wgs84-utm31n.registry",
    group: "bound-crss",
    title:
      "WGS 84 / UTM zone 31N (no TOWGS84): the bound Helmert's position against PROJ's best registry operation for the same point (shown, not judged: no EPSG record to check it by hand)",
    pass: true,
    displayOnly: true,
    detail:
      "9.31777e-10 m; registry: +proj=pipeline +step +inv +proj=utm +zone=31 +ellps=WGS84 +step +proj=unitconvert +xy_in=rad +z_in=m +xy_out=deg +z_out=m (accuracy 0 m)",
    effect: {
      value: 9.317772109982395e-10,
      unit: "m",
      label: "the TOWGS84 shortcut against PROJ's best registry operation",
    },
    userInput: false,
  },
  {
    id: "time-scales.offsets.tt-tai",
    group: "time-scales",
    title:
      "TT − TAI from Instant.tai() at four instants from 1980 to 2026, including inside the 2016 leap second, against 32.184 s, within a few float64 ulps of TT",
    pass: true,
    value: 1.525879156361043e-8,
    tolerance: 0.000001,
    unit: "s",
  },
  {
    id: "time-scales.offsets.gps-zero",
    group: "time-scales",
    title:
      "TAI − UTC at GPS time's zero point (1980-01-06T00:00:00 UTC) from Instant.tai(), against the 19 s that makes GPS time = TAI − 19 s",
    pass: true,
    value: 0,
    tolerance: 0.000001,
    unit: "s",
    detail: "TAI − UTC there is 19 s; so GPS time = TAI − 19 s",
  },
  {
    id: "time-scales.gps-utc-leap.step",
    group: "time-scales",
    title:
      "GPS − UTC is 17 s at 2016-12-31T23:59:59 and 18 s at 2017-01-01T00:00:00 (Bulletin C 52's UTC − TAI of -36 and -37 s, less 19 s)",
    pass: true,
    value: 0,
    tolerance: 0.000001,
    unit: "s",
    detail: "GPS − UTC: 17 s, then 18 s",
    instant: 536500868.18395054,
  },
  {
    id: "lunar-time.moon-vs-earth.synodic",
    group: "lunar-time",
    title:
      "Averaged over a synodic month (29.530589 days from 2026-01-01T00:00:00 UTC, 709 hourly samples): the lunar clock gains on the Earth clock, against Ashby & Patla's 56.02 μs/day, within 2%",
    pass: true,
    value: 0.0005413960821282204,
    tolerance: 0.02,
    detail:
      "library 55.9897 µs/day; Ashby & Patla 56.02 μs/day (selenoid against geoid)",
    effect: {
      value: 55.98967099147918,
      unit: "µs/day",
      label: "how much faster a clock on the Moon ticks",
    },
    instant: 820497669.183918,
  },
  {
    id: "lunar-time.moon-vs-earth.sidereal",
    group: "lunar-time",
    title:
      "The same average over a sidereal month (27.321661 days, 656 samples), shown, not judged: the Sun's tide and the Earth–Moon system's orbital motion vary with the synodic month, so a sidereal window leaves part of a cycle in the mean",
    pass: true,
    displayOnly: true,
    detail:
      "57.5303 µs/day, 2.7% from Ashby & Patla; it moves with the window's start (56.6 to 58.1 µs/day for starts in 2026)",
    effect: {
      value: 57.530293290228904,
      unit: "µs/day",
      label: "the lunar clock's gain averaged over a sidereal month",
    },
    instant: 820497669.183918,
  },
];
