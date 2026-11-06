// Below the ellipsoid: elevation factors, a tunnel's ground distance and a
// sight line from below the surface (mining and tunnelling).
import { EngineeringFrame } from "../../../../src/engineering/EngineeringFrame.ts";
import { gridFactors } from "../../../../src/engineering/factors.ts";
import { framePoint } from "../../../../src/frames/local.ts";
import { measure } from "../../../../src/measure/measure.ts";
import { EARTH } from "../../../../src/scene/Body.ts";
import { DEGREE, ellipsoidOf, onEarth } from "../references.ts";
import { type StressCase, type StressResult, fmt } from "../runner.ts";
import { EFFECT, MEASURED_AT, epsg, proj, stressCase, utc } from "../shared.ts";

/** The plan's tolerances: elevation factors 1e-12, the tunnel 1e-9 relative. */
const ELEVATION_FACTOR = 1e-12;

const TUNNEL = 1e-9;

/** UTM's scale on its central meridian, k0 (EPSG 9807's definition): exactly 0.9996. */
const UTM_K0 = 0.9996;

/** UTM zone 31N's false easting: the central meridian, 3°E. */
const CENTRAL_MERIDIAN_E = 500_000;

/** The Gaussian mean radius sqrt(M N) at a latitude, by hand. */
function gaussianRadius(latitudeDegrees: number): number {
  const { a, e2 } = ellipsoidOf("epsg-ellipsoid-wgs84");
  const s = Math.sin(latitudeDegrees * DEGREE);
  return (a * Math.sqrt(1 - e2)) / (1 - e2 * s * s);
}

/**
 * The latitude of a point on a transverse Mercator's central meridian from
 * its northing, by hand: the meridian arc m = N / k0, inverted by the fixed
 * point φ = m / M(φ / 2) (the arc's mean meridian radius). Good to about
 * 1e-6 rad, far finer than the factors below need.
 */
function latitudeOnMeridian(northing: number): number {
  const { a, e2 } = ellipsoidOf("epsg-ellipsoid-wgs84");
  const m = northing / UTM_K0;
  let phi = m / a;
  for (let i = 0; i < 6; i++) {
    const s = Math.sin(phi / 2);
    const M = (a * (1 - e2)) / (1 - e2 * s * s) ** 1.5;
    phi = m / M;
  }
  return phi / DEGREE;
}

const elevationFactorCase = stressCase(
  "below-the-ellipsoid.elevation-factor",
  "below-the-ellipsoid",
  "Elevation factors at h = −500 m and −2000 m on UTM zone 31N (the equator and 60°N) against R/(R + h) with R the Gaussian mean radius, within 1e-12, and greater than 1",
  ["proj"],
  async (ctx, base) => {
    const frame = EngineeringFrame.create(
      { name: "UTM 31N", body: EARTH, crs: epsg(32631) },
      proj(ctx),
    );
    const results: StressResult[] = [];
    // The equator on the central meridian is (500000, 0) exactly; 60°N is
    // placed by the operation's inverse (its latitude error is ~1e-12°).
    const at60 = frame.operation.inverse([3, 60, 0]);
    for (const [name, latitude, e, n] of [
      ["equator", 0, CENTRAL_MERIDIAN_E, 0],
      ["60n", 60, at60[0]!, at60[1]!],
    ] as const) {
      const R = gaussianRadius(latitude);
      for (const h of [-500, -2000]) {
        const f = gridFactors(frame, [e, n, h]);
        const hand = R / (R + h);
        results.push({
          ...base,
          id: `${base.id}.${name}.${-h}`,
          title: `The elevation factor at h = ${h} m at ${latitude}°N against R/(R + h) = ${fmt(hand, 12)} (R = sqrt(M N) = ${fmt(R, 10)} m), within 1e-12, and above 1`,
          pass: f.elevationFactor > 1,
          value: Math.abs(f.elevationFactor - hand),
          tolerance: ELEVATION_FACTOR,
          detail: `library ${f.elevationFactor}; combined factor ${f.combinedFactor}`,
        });
      }
    }
    return results;
  },
);

const tunnelCase = stressCase(
  "below-the-ellipsoid.tunnel",
  "below-the-ellipsoid",
  "A 5 km tunnel along UTM zone 31N's central meridian, portals at h = +300 m and the bore at h = −200 m: the ground distance at tunnel level from the grid distance through the library's combined factor, against k0·R/(R + h) by hand, within 1e-9 relative",
  ["proj"],
  async (ctx, base) => {
    const frame = EngineeringFrame.create(
      { name: "UTM 31N", body: EARTH, crs: epsg(32631) },
      proj(ctx),
    );
    const n0 = 5_000_000;
    const length = 5_000;
    const grid = length; // along the meridian, the grid distance is the northing difference
    // The library's ground distance: grid ÷ the combined factor, averaged
    // along the line by Simpson's rule.
    const ground = (h: number) => {
      const cf = (n: number) =>
        gridFactors(frame, [CENTRAL_MERIDIAN_E, n, h]).combinedFactor;
      const mean = (cf(n0) + 4 * cf(n0 + length / 2) + cf(n0 + length)) / 6;
      return grid / mean;
    };
    // By hand: on the central meridian k = k0 exactly, so CF = k0·R/(R + h).
    const handGround = (h: number) => {
      const cf = (n: number) => {
        const R = gaussianRadius(latitudeOnMeridian(n));
        return (UTM_K0 * R) / (R + h);
      };
      const mean = (cf(n0) + 4 * cf(n0 + length / 2) + cf(n0 + length)) / 6;
      return grid / mean;
    };
    const tunnel = ground(-200);
    const portal = ground(300);
    const handTunnel = handGround(-200);
    const handPortal = handGround(300);
    return [
      {
        ...base,
        id: `${base.id}.ground`,
        title:
          "The tunnel's ground distance at h = −200 m: grid distance ÷ the library's combined factor, against grid ÷ (k0·R/(R + h)) by hand, within 1e-9 relative",
        pass: true,
        value: Math.abs(tunnel / handTunnel - 1),
        tolerance: TUNNEL,
        detail: `library ${fmt(tunnel, 12)} m, hand ${fmt(handTunnel, 12)} m for ${grid} m of grid at ${fmt(latitudeOnMeridian(n0), 6)}°N`,
      },
      {
        ...base,
        id: `${base.id}.portal-level`,
        title:
          "The same line measured at the portals (h = +300 m) is longer than at tunnel level: the difference against the hand formula's, within 2%",
        pass: portal > tunnel,
        value: Math.abs((portal - tunnel) / (handPortal - handTunnel) - 1),
        tolerance: EFFECT,
        detail: `library ${fmt(portal - tunnel, 6)} m, hand ${fmt(handPortal - handTunnel, 6)} m`,
        effect: {
          value: portal - tunnel,
          unit: "m",
          label:
            "how much shorter a 5 km line is 500 m lower (tunnel against portal level)",
        },
      },
    ];
  },
);

const sightLineCase = stressCase(
  "below-the-ellipsoid.sight-line",
  "below-the-ellipsoid",
  "A station at h = −200 m and −2000 m sighting a point 20,000 km straight up: the line of sight is clear (the station does not block itself, plan 3's fixed bug), and the same station sighting a point on the far side of the Earth is blocked, by hand geometry",
  ["frames"],
  async (ctx, base) => {
    const t = utc(ctx, MEASURED_AT);
    const f = ctx.frames;
    const results: StressResult[] = [];
    const [lon, lat] = [8.43, 49.1];
    for (const h of [-200, -2000]) {
      const station = framePoint(f.itrf, onEarth(lon, lat, h));
      // Straight up: the zenith direction never re-enters the ellipsoid.
      const overhead = framePoint(f.itrf, onEarth(lon, lat, 2e7));
      // The antipode, 20,000 km up: the line passes through the Earth's centre.
      const behind = framePoint(f.itrf, onEarth(lon - 180, -lat, 2e7));
      const up = measure(station, overhead, t, f);
      const down = measure(station, behind, t, f);
      results.push({
        ...base,
        id: `${base.id}.${-h}`,
        title: `From ${h} m below the ellipsoid: clear to the zenith (hand: zenith angle 0, so the line leaves the body at once), blocked by the Earth toward the antipode (hand: the line passes the Earth's centre)`,
        pass:
          up.lineOfSight?.clear === true &&
          down.lineOfSight?.clear === false &&
          down.lineOfSight?.blockedBy?.name === EARTH.name,
        detail: `zenith: ${up.lineOfSight?.clear ? "clear" : `blocked by ${up.lineOfSight?.blockedBy?.name ?? "?"}`}; antipode: ${down.lineOfSight?.clear ? "clear" : `blocked by ${down.lineOfSight?.blockedBy?.name ?? "?"}`}`,
        instant: t.tdb(),
      });
    }
    return results;
  },
);

export const belowTheEllipsoidCases: readonly StressCase[] = [
  elevationFactorCase,
  tunnelCase,
  sightLineCase,
];
