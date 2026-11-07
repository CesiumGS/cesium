// Space: DSS-43 and Orion against plan 3's SPICE fixture, and effect sizes.
import { type Frame, frameTransform } from "../../../../src/frames/Frame.ts";
import {
  convertPoint,
  eastNorthUpFrame,
  framePoint,
} from "../../../../src/frames/local.ts";
import { Ellipsoid, fromDegrees } from "../../../../src/math/ellipsoid.ts";
import { measure } from "../../../../src/measure/measure.ts";
import { Instant } from "../../../../src/time/Instant.ts";
import signalFixture from "../../../../test/fixtures/frames/signal.json";
import { ARCSECOND, citation, cited, DEGREE, printed } from "../references.ts";
import {
  type StressCase,
  type StressResult,
  fmt,
  messageOf,
} from "../runner.ts";
import {
  EFFECT,
  FLYBY,
  angle3,
  apply,
  cross3,
  distance,
  dot3,
  norm,
  orion,
  rotate,
  scale3,
  stressCase,
  sub3,
  utc,
} from "../shared.ts";

/** Plan 3's tolerances (test/data/lightTime.test.ts): c·∆lt for DSS-43, and the Doppler ratio. */
const SPICE_LIGHT_TIME = 0.5;

// m
const DOPPLER_RATIO = 3e-8;

/** Instants near the flyby from the OEM: Orion hidden by the Moon from DSS-43, and clear hours earlier. */
const BEHIND_MOON = "2026-04-06T23:04:00";

const BEFORE_OCCULTATION = "2026-04-06T20:00:00";

interface Constants {
  readonly c: number;
  readonly gmSun: number;
  readonly lc: number;
}

function iersConstants(): Constants {
  const t = cited<{ c: string; GMsun: string; LC: string }>(
    "iers-numerical-standards",
  );
  // "1.32712442099 × 10^20 m3 s−2": mantissa × 10^exponent.
  const scientific = (text: string) => {
    const [mantissa, exponent] = text.split("×").map((s) => s.trim());
    const power = /10\^([−-]?\d+)/.exec(exponent ?? "")?.[1] ?? "0";
    return printed(mantissa ?? "").value * 10 ** printed(power).value;
  };
  return {
    c: printed(t.c.split(" ")[0] ?? "").value,
    gmSun: scientific(t.GMsun),
    lc: scientific(t.LC),
  };
}

/** DSS-43 at an instant: DSN 810-005 301's 2003.0 position moved by its site velocity, ITRF metres. */
function dss43(t: Instant): number[] {
  const s = cited<{
    xyz: string[];
    epoch: string;
    velocity: { xyz: string[] };
  }>("dsn-dss43");
  // Decimal year: J2000 (TDB 0) is 2000-01-01T12:00, 2000.0 + 0.5 day.
  const year = 2000 + (t.tdb() / 86_400 + 0.5) / 365.25;
  const dt = year - printed(s.epoch).value;
  return s.xyz.map(
    (x, i) => printed(x).value + printed(s.velocity.xyz[i] ?? "").value * dt,
  );
}

type SignalRow = (typeof signalFixture.rows)[number];

const signalCase = stressCase(
  "space.dss43-orion",
  "space",
  "DSS-43 to Orion: the downlink's light time against JPL NAIF SPICE (spkpos) within 0.5 m, and its Doppler ratio against the first-order formula from SPICE's direction within 3 × 10⁻⁸",
  ["orion"],
  async (ctx, base) => {
    const { c } = iersConstants();
    const o = orion(ctx);
    const f = ctx.frames;
    const target = framePoint(o.frame, [0, 0, 0]);
    let worstLight = 0;
    let worstDoppler = 0;
    const used: string[] = [];
    const gaps: string[] = [];
    for (const row of signalFixture.rows as readonly SignalRow[]) {
      const t = Instant.fromTdb(row.tdb);
      const station = framePoint(f.itrf, dss43(t));
      let m: ReturnType<typeof measure>;
      try {
        m = measure(station, target, t, f, { shapiro: [] });
      } catch (error) {
        // The OEM's own gaps, which plan 3's SPK fills (its gap-fill kernel).
        if (/outside its data/.test(messageOf(error))) {
          gaps.push(`${row.kind} ${row.tdb}`);
          continue;
        }
        throw error;
      }
      const leg = m.signal!.downlink;
      const lt = row.dss43.CN.lt;
      worstLight = Math.max(worstLight, Math.abs(leg.lightTime - lt) * c);
      // First-order Doppler by hand: ratio = 1 − n·(vO − vS)/c, n the unit
      // vector to Orion from SPICE (CN, ICRF axes), vO Orion's OEM velocity
      // at emission, vS the station's, both Earth-centred in ICRF axes.
      const n = scale3(row.dss43.CN.position, 1 / norm(row.dss43.CN.position));
      const emitted = Instant.fromTdb(row.tdb - lt);
      const state = o.state(emitted);
      const vO = rotate(
        frameTransform(o.reference, f.earthIcrf, emitted),
        state.subarray(3, 6),
      );
      const at = (dt: number) =>
        apply(
          frameTransform(f.itrf, f.earthIcrf, Instant.fromTdb(row.tdb + dt)),
          dss43(t),
        );
      const vS = sub3(at(0.5), at(-0.5));
      const ratio = 1 - dot3(n, sub3(vO, vS)) / c;
      worstDoppler = Math.max(worstDoppler, Math.abs(leg.dopplerRatio - ratio));
      used.push(`${row.kind}: c·∆lt ${fmt((leg.lightTime - lt) * c, 3)} m`);
    }
    const enough = used.length * 2 >= signalFixture.rows.length;
    const gapNote =
      gaps.length > 0
        ? `; ${gaps.length} rows fall in the OEM's gaps (the SPICE fixture used its SPK gap fill): ${gaps.join(", ")}`
        : "";
    return [
      {
        ...base,
        id: `${base.id}.light-time`,
        source: citation("dsn-dss43"),
        title:
          "DSS-43 receiving from Orion: the light time against JPL NAIF SPICE (spkpos CN, no Shapiro delay), c·∆lt within 0.5 m",
        pass: enough,
        value: worstLight,
        tolerance: SPICE_LIGHT_TIME,
        unit: "m",
        detail: `${used.length} rows: ${used.join("; ")}${gapNote}; DSS-43 from DSN 810-005 301 Rev. P with its plate velocity`,
      },
      {
        ...base,
        id: `${base.id}.doppler`,
        source: citation("dsn-dss43"),
        title:
          "DSS-43 receiving from Orion: the Doppler ratio against 1 − n·(vO − vS)/c with SPICE's direction and the OEM's velocity, within 3 × 10⁻⁸",
        pass: enough,
        value: worstDoppler,
        tolerance: DOPPLER_RATIO,
        detail: `${used.length} rows${gapNote}`,
      },
    ];
  },
);

const lineOfSightCase = stressCase(
  "space.line-of-sight",
  "space",
  "Line of sight from DSS-43 to Orion near the flyby, behind the Moon at 23:04 UTC and clear at 20:00 UTC: each verdict agrees with hand geometry (the angle to Orion against the Moon's angular radius asin(1737.4 km / distance), and whether Orion is farther)",
  ["orion"],
  async (ctx, base) => {
    const { c } = iersConstants();
    const radius =
      printed(cited<{ radiusKm: string }>("naif-moon-radius").radiusKm).value *
      1000;
    const o = orion(ctx);
    const f = ctx.frames;
    const results: StressResult[] = [];
    for (const [iso, expectBlocked] of [
      [BEHIND_MOON, true],
      [BEFORE_OCCULTATION, false],
    ] as const) {
      const t = utc(ctx, iso);
      const stationItrf = dss43(t);
      const m = measure(
        framePoint(f.itrf, stationItrf),
        framePoint(o.frame, [0, 0, 0]),
        t,
        f,
      );
      const station = apply(
        frameTransform(f.itrf, f.earthIcrf, t),
        stationItrf,
      );
      // Positions at emission, Earth-centred ICRF axes (two light-time passes).
      const seen = (place: (at: Instant) => ArrayLike<number>) => {
        let p = place(t);
        for (let i = 0; i < 2; i++) {
          p = place(Instant.fromTdb(t.tdb() - distance(p, station) / c));
        }
        return sub3(p, station);
      };
      const moon = seen((at) =>
        frameTransform(f.moonIcrf, f.earthIcrf, at).subarray(12, 15),
      );
      const craft = seen((at) =>
        apply(
          frameTransform(o.reference, f.earthIcrf, at),
          o.state(at).subarray(0, 3),
        ),
      );
      const angle = angle3(moon, craft);
      const limb = Math.asin(radius / norm(moon));
      const blocked = angle < limb && norm(craft) > norm(moon);
      const clear = m.lineOfSight?.clear;
      results.push({
        ...base,
        id: `${base.id}.${expectBlocked ? "behind-moon" : "clear"}`,
        source: citation("naif-moon-radius"),
        title: `DSS-43 to Orion at ${iso} UTC: ${expectBlocked ? "hidden by the Moon" : "clear"}, by the library and by hand geometry`,
        pass: clear === !blocked && blocked === expectBlocked,
        detail: `library: ${clear ? "clear" : `blocked by ${m.lineOfSight?.blockedBy?.name ?? "?"}`}; hand: Orion ${fmt(angle / DEGREE, 6)}° from the Moon's centre, limb ${fmt(limb / DEGREE, 6)}°, Orion ${fmt(norm(craft) / 1000, 7)} km away and the Moon ${fmt(norm(moon) / 1000, 7)} km`,
        instant: t.tdb(),
      });
    }
    return results;
  },
);

const spaceEffectsCase = stressCase(
  "space.effects",
  "space",
  "Effect sizes at the Moon: the EME2000 frame bias, the GCRF scale, MOON_ME against MOON_PA at the south pole, each against its published values composed by hand within 2%, and the Earth-orientation uncertainty (display only)",
  ["orion"],
  async (ctx, base) => {
    const f = ctx.frames;
    const t = utc(ctx, FLYBY);
    const { c, gmSun, lc } = iersConstants();
    const results: StressResult[] = [];
    const moonDistance = norm(
      frameTransform(f.moonIcrf, f.earthIcrf, t).subarray(12, 15),
    );

    // 1. The frame bias: a point at the Moon's distance on EARTH_ICRF's x axis,
    //    in EME2000. To first order the bias rotates by (−η0, ξ0, dα0) about
    //    the axes, so on the x axis it moves r·sqrt(ξ0² + dα0²) (IERS 2010).
    const bias = cited<{ xi0: string; eta0: string; dalpha0: string }>(
      "iers-frame-bias",
    );
    const first = (text: string) =>
      printed(text.split("±")[0]!.trim()).value * ARCSECOND;
    const xi0 = first(bias.xi0);
    const dalpha0 = first(bias.dalpha0);
    const onX = framePoint(f.earthIcrf, [moonDistance, 0, 0], t);
    const biased = distance(
      convertPoint(onX, f.eme2000).position,
      onX.position,
    );
    const handBias = moonDistance * Math.hypot(xi0, dalpha0);
    results.push({
      ...base,
      id: `${base.id}.frame-bias`,
      source: citation("iers-frame-bias"),
      title:
        "The EME2000 frame bias at the Moon's distance: a point on EARTH_ICRF's x axis moves r·sqrt(ξ0² + dα0²) (IERS Conventions 2010), within 2%",
      pass: true,
      value: Math.abs(biased / handBias - 1),
      tolerance: EFFECT,
      detail: `${fmt(biased, 6)} m, by hand ${fmt(handBias, 6)} m at r ${fmt(moonDistance / 1000, 7)} km`,
      effect: {
        value: biased,
        unit: "m",
        label: "the EME2000 frame bias at the Moon's distance",
      },
      instant: t.tdb(),
    });

    // 2. The GCRF scale, eq. 11.19, at the Moon's distance perpendicular to
    //    the Earth's barycentric velocity V (so its V term vanishes):
    //    |∆r| = r (U/c² + LC), U = GM☉/r☉.
    const earthAt = (dt: number) =>
      frameTransform(
        f.earthIcrf,
        f.icrf,
        Instant.fromTdb(t.tdb() + dt),
      ).subarray(12, 15);
    const V = scale3(sub3(earthAt(1), earthAt(-1)), 0.5);
    const across = cross3(V, [0, 0, 1]);
    const p = scale3(across, moonDistance / norm(across));
    const inGcrf = framePoint(f.gcrf, p, t);
    const scaled = distance(convertPoint(inGcrf, f.earthIcrf).position, p);
    const sunDistance = norm(
      frameTransform(f.hcrs, f.earthIcrf, t).subarray(12, 15),
    );
    const handScale = moonDistance * (gmSun / (c * c * sunDistance) + lc);
    results.push({
      ...base,
      id: `${base.id}.gcrf-scale`,
      source: citation("iers-numerical-standards"),
      title:
        "The GCRF (TT-compatible) against EARTH_ICRF (TDB-compatible) at the Moon's distance: r·(GM☉/(c² r☉) + LC), eq. 11.19, within 2%",
      pass: true,
      value: Math.abs(scaled / handScale - 1),
      tolerance: EFFECT,
      detail: `${fmt(scaled, 6)} m, by hand ${fmt(handScale, 6)} m (r☉ ${fmt(sunDistance / 1e9, 7)} million km)`,
      effect: {
        value: scaled,
        unit: "m",
        label: "the GCRF's TT scale at the Moon's distance",
      },
      instant: t.tdb(),
    });

    // 3. MOON_ME against MOON_PA at the lunar south pole: the DE440 angles
    //    (67.8526″ about z, 78.6944″ about y, 0.2785″ about x) composed to
    //    first order; at the pole only the x and y rotations move the point.
    const me = cited<{ angles: string[]; axes: number[] }>(
      "naif-moon-me-de440",
    );
    const about = (axis: number) =>
      printed(me.angles[me.axes.indexOf(axis)] ?? "NaN").value * ARCSECOND;
    const radius =
      printed(cited<{ radiusKm: string }>("naif-moon-radius").radiusKm).value *
      1000;
    const pole = framePoint(f.moonPa, [0, 0, -radius], t);
    const moved = distance(
      convertPoint(pole, f.moonMe).position,
      pole.position,
    );
    const handPole = radius * Math.hypot(about(1), about(2));
    results.push({
      ...base,
      id: `${base.id}.moon-me-pa`,
      source: citation("naif-moon-me-de440"),
      title:
        "MOON_ME against MOON_PA at the lunar south pole: R·sqrt(θx² + θy²) from the DE440 frame kernel's angles, within 2%",
      pass: true,
      value: Math.abs(moved / handPole - 1),
      tolerance: EFFECT,
      detail: `${fmt(moved, 6)} m, by hand ${fmt(handPole, 6)} m`,
      effect: {
        value: moved,
        unit: "m",
        label: "MOON_ME against MOON_PA at the lunar south pole",
      },
      instant: t.tdb(),
    });

    // 4. Earth orientation's uncertainty at the clock's instant (display only).
    const station = dss43(t);
    const m = measure(
      framePoint(f.itrf, station),
      framePoint(orion(ctx).frame, [0, 0, 0]),
      t,
      f,
      { signal: false },
    );
    const eop = m.accuracy.terms.find(
      (term) => term.source === "earthOrientation",
    );
    const meters = eop?.meters;
    results.push({
      ...base,
      id: `${base.id}.earth-orientation`,
      source: citation("dsn-dss43"),
      title:
        "Earth orientation's uncertainty at the flyby, at DSS-43 on the Earth's surface (display only)",
      pass: true,
      displayOnly: true,
      detail:
        eop === undefined
          ? "no Earth-orientation term"
          : `${fmt(meters ?? NaN, 4)} m: ${eop.note}`,
      effect: {
        value: meters ?? NaN,
        unit: "m",
        label: "Earth orientation's uncertainty at DSS-43",
      },
      instant: t.tdb(),
    });
    results.push({
      ...base,
      id: `${base.id}.earth-orientation-angle`,
      source: citation("dsn-dss43"),
      title:
        "Earth orientation's uncertainty at the flyby as an angle toward Orion (display only)",
      pass: true,
      displayOnly: true,
      detail: `${fmt(meters === undefined ? NaN : meters / norm(station) / ARCSECOND, 4)}″: the same uncertainty over DSS-43's ${fmt(norm(station) / 1000, 6)} km from the Earth's centre`,
      effect: {
        value: meters === undefined ? NaN : meters / norm(station) / ARCSECOND,
        unit: "″",
        label: "Earth orientation's uncertainty toward Orion",
      },
      instant: t.tdb(),
    });
    return results;
  },
);

/** Horizons' observer row for the Moon from a Sacramento site (Task 6b), as references.json copies it. */
interface HorizonsMoon {
  site: { longitude: string; latitude: string; heightKm: string };
  time: string;
  raIcrf: string;
  decIcrf: string;
  azimuth: string;
  elevation: string;
  deltaAu: string;
  au: string;
}

/** Horizons' astrometric direction against ours, ″: 10 mas, about 19 m at the Moon's distance. */
export const MOON_DIRECTION = 0.01;

/** Horizons' light-time range against ours, m. */
export const MOON_RANGE = 1;

/** A unit vector at right ascension `ra` and declination `dec`, degrees. */
const unitRaDec = (ra: number, dec: number): number[] => [
  Math.cos(dec * DEGREE) * Math.cos(ra * DEGREE),
  Math.cos(dec * DEGREE) * Math.sin(ra * DEGREE),
  Math.sin(dec * DEGREE),
];

/** An east-north-up unit vector at azimuth `az` (clockwise from north) and elevation `el`, degrees. */
const unitAzEl = (az: number, el: number): number[] => [
  Math.cos(el * DEGREE) * Math.sin(az * DEGREE),
  Math.cos(el * DEGREE) * Math.cos(az * DEGREE),
  Math.sin(el * DEGREE),
];

const moonFromSacramentoCase = stressCase(
  "space.moon-from-sacramento",
  "space",
  "The Moon from a Sacramento site against JPL Horizons' observer table: the astrometric direction (ICRF, light time) within 0.01″, the light-time range within 1 m, and the airless apparent azimuth and elevation (display only: about 0.3″ apart, unexplained)",
  ["frames"],
  async (ctx, base) => {
    const h = cited<HorizonsMoon>("jpl-horizons-moon-sacramento");
    const f = ctx.frames;
    const t = Instant.fromIso(
      h.time.replace(/Z$/, ""),
      "UTC",
      f.data.leapSeconds,
    );
    const lon = printed(h.site.longitude).value;
    const lat = printed(h.site.latitude).value;
    const position = Ellipsoid.WGS84.cartographicToCartesian(
      fromDegrees(lon, lat, printed(h.site.heightKm).value * 1000),
      new Float64Array(3),
    );
    const site = eastNorthUpFrame(
      "Horizons site",
      f.itrf,
      Ellipsoid.WGS84,
      position,
    );
    const auKm = printed(h.au.split("=")[1]!.replace("km", "")).value;
    // Ours: Horizons' light time is Newtonian, as plan 3's SPICE checks, so
    // the light time leaves out the Shapiro delay (shown in the detail).
    const m = measure(
      framePoint(site, [0, 0, 0]),
      framePoint(f.moonIcrf, [0, 0, 0]),
      t,
      f,
      { shapiro: [] },
    );
    const withShapiro = measure(
      framePoint(site, [0, 0, 0]),
      framePoint(f.moonIcrf, [0, 0, 0]),
      t,
      f,
    );
    const leg = m.signal!.downlink;
    // The astrometric direction: the Moon's centre at emission from the
    // site at reception, ICRF axes (barycentric positions).
    const at = (frame: Frame, tdb: number) =>
      frameTransform(frame, f.icrf, Instant.fromTdb(tdb)).subarray(12, 15);
    const astrometric = sub3(
      at(f.moonIcrf, t.tdb() - leg.lightTime),
      at(site, t.tdb()),
    );
    const direction =
      angle3(
        astrometric,
        unitRaDec(printed(h.raIcrf).value, printed(h.decIcrf).value),
      ) / ARCSECOND;
    const delta = printed(h.deltaAu).value * auKm * 1000;
    // The apparent direction in the site's axes, against Horizons' airless
    // azimuth and elevation; and again with polar motion left out of our
    // horizon, which leaves about 0.3″ unexplained (fix 1).
    const apparent = leg.receiverDirection;
    const theirs = unitAzEl(
      printed(h.azimuth).value,
      printed(h.elevation).value,
    );
    const eop = f.data.eop.atInstant(t, f.data.leapSeconds);
    const toSite = frameTransform(f.itrf, site, t);
    // Polar motion takes ITRF's z axis to the pole of date, (x, −y, 1): a
    // small rotation (y, x, 0) about ITRF's axes; in the site's axes:
    const pm = [0, 1, 2].map(
      (i) => toSite[i]! * eop.yp + toSite[4 + i]! * eop.xp,
    );
    const turned = sub3(apparent, cross3(pm, apparent));
    const az = (v: ArrayLike<number>) =>
      ((Math.atan2(v[0]!, v[1]!) / DEGREE + 360) % 360).toFixed(9);
    const el = (v: ArrayLike<number>) =>
      (Math.asin(v[2]! / norm(v)) / DEGREE).toFixed(9);
    const source = citation("jpl-horizons-moon-sacramento");
    return [
      {
        ...base,
        id: `${base.id}.direction`,
        source,
        title:
          "The Moon's astrometric direction from a Sacramento site (ICRF, corrected for the light time) against JPL Horizons' R.A. and DEC (ICRF), within 0.01″",
        pass: true,
        value: direction,
        tolerance: MOON_DIRECTION,
        unit: "″",
        detail: `Horizons R.A. ${h.raIcrf}°, DEC ${h.decIcrf}°; ours ${fmt(direction * 1000, 3)} mas from it, ${fmt(direction * ARCSECOND * delta, 3)} m at the Moon`,
        instant: t.tdb(),
      },
      {
        ...base,
        id: `${base.id}.range`,
        source,
        title:
          "The Moon's light-time range from a Sacramento site against JPL Horizons' delta, within 1 m (Newtonian light time on both sides)",
        pass: true,
        value: leg.range - delta,
        tolerance: MOON_RANGE,
        unit: "m",
        detail: `Horizons ${h.deltaAu} au = ${fmt(delta / 1000, 13)} km; ours ${fmt(leg.range / 1000, 13)} km (c·τ, τ ${fmt(leg.lightTime, 10)} s); the Shapiro delay adds ${fmt(withShapiro.signal!.downlink.range - leg.range, 3)} m, left out of both`,
        effect: {
          value: leg.range / 1000,
          unit: "km",
          label: "the Moon's light-time range from Sacramento",
        },
        instant: t.tdb(),
      },
      {
        ...base,
        id: `${base.id}.horizon`,
        source,
        title:
          "The Moon's airless apparent azimuth and elevation from a Sacramento site against JPL Horizons' (display only: about 0.3″ apart, unexplained)",
        pass: true,
        displayOnly: true,
        detail: `Horizons azimuth ${h.azimuth}°, elevation ${h.elevation}°; ours ${az(apparent)}°, ${el(apparent)}°, ${fmt(angle3(apparent, theirs) / ARCSECOND, 3)}″ apart. With polar motion (x ${fmt(eop.xp / ARCSECOND, 4)}″, y ${fmt(eop.yp / ARCSECOND, 4)}″, the EOP table's) taken out of our horizon, still ${fmt(angle3(turned, theirs) / ARCSECOND, 3)}″ apart: polar motion accounts for only part of it, and the rest is unexplained. Our Earth orientation agrees with SPICE's to a few hundredths of an arcsecond (plan 3's DSS-43 checks), and our light time and aberration match its fixture (space.dss43-orion); our astrometric direction matches Horizons' to about a milliarcsecond (.direction)`,
        effect: {
          value: angle3(apparent, theirs) / ARCSECOND,
          unit: "″",
          label: "our apparent azimuth and elevation against Horizons'",
        },
        instant: t.tdb(),
      },
    ];
  },
);

export const spaceCases: readonly StressCase[] = [
  signalCase,
  lineOfSightCase,
  spaceEffectsCase,
  moonFromSacramentoCase,
];
