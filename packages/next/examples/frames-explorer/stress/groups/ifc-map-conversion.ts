// IFC map conversion: buildingSMART's IFC 4.3 georeferencing examples placed
// through an engineering frame's site transform (BIM and digital twins).
import {
  EngineeringFrame,
  type SiteTransform,
} from "../../../../src/engineering/EngineeringFrame.ts";
import { EARTH } from "../../../../src/scene/Body.ts";
import { DEGREE, cited, ellipsoidOf, printed, radii } from "../references.ts";
import { type StressCase, type StressResult, fmt } from "../runner.ts";
import {
  DESIGN_ROUND_TRIP,
  epsg,
  fingerprintOf,
  proj,
  stressCase,
  worstRoundTrip,
} from "../shared.ts";

/** An IfcMapConversion's attributes, as numbers (optional ones as IFC omits them). */
export interface IfcMapConversion {
  readonly eastings: number;
  readonly northings: number;
  readonly orthogonalHeight: number;
  readonly xAxisAbscissa?: number;
  readonly xAxisOrdinate?: number;
  readonly scale?: number;
}

/**
 * The engineering frame's site transform for an IFC 4.3 IfcMapConversion.
 * IFC defines the conversion as a scaling of the local axes by Scale, then
 * an anticlockwise rotation about z of θ = arctan(XAxisOrdinate /
 * XAxisAbscissa), then a translation by (Eastings, Northings,
 * OrthogonalHeight), where (XAxisAbscissa, XAxisOrdinate) is the local x
 * axis's direction in map coordinates (easting, northing). The site
 * transform is the same map: [E, N] = [E0, N0] + s R(θ) [x, y], U = U0 + z,
 * with θ counterclockwise from grid east. θ is atan2 of the two, so its
 * sign and quadrant are the example's own (the IFC case checks the x axis
 * lands on the published vector). Omitted, the axis is (1, 0) and the
 * scale 1.0, as IFC assumes. IfcMapConversion scales z too; a site
 * transform's height is unscaled, so only a scale of 1 keeps heights exact.
 */
export function siteFromIfcMapConversion(m: IfcMapConversion): SiteTransform {
  const abscissa = m.xAxisAbscissa ?? 1;
  const ordinate = m.xAxisOrdinate ?? 0;
  if (!(Math.hypot(abscissa, ordinate) > 0)) {
    throw new RangeError(
      "IfcMapConversion: XAxisAbscissa and XAxisOrdinate give no direction",
    );
  }
  return {
    origin: [m.eastings, m.northings, m.orthogonalHeight],
    rotation: Math.atan2(ordinate, abscissa),
    scale: m.scale ?? 1,
  };
}

interface IfcExample {
  readonly targetCrs: string;
  readonly eastings: string;
  readonly northings: string;
  readonly orthogonalHeight: string;
  readonly xAxisAbscissa: string;
  readonly xAxisOrdinate: string;
  readonly scale: string;
  readonly siteRefLatitude?: readonly string[];
  readonly siteRefLongitude?: readonly string[];
  readonly siteRefElevation?: string;
}

const conversionOf = (ex: IfcExample): IfcMapConversion => ({
  eastings: printed(ex.eastings).value,
  northings: printed(ex.northings).value,
  orthogonalHeight: printed(ex.orthogonalHeight).value,
  xAxisAbscissa: printed(ex.xAxisAbscissa).value,
  xAxisOrdinate: printed(ex.xAxisOrdinate).value,
  ...(ex.scale !== "$" && { scale: printed(ex.scale).value }),
});

/**
 * IfcCompoundPlaneAngleMeasure (degrees, minutes, seconds, millionths of a
 * second) in degrees, and half its last unit (0.5e-6″).
 */
function compoundAngle(parts: readonly string[]) {
  const [d, m, s, micro] = parts.map((p) => printed(p).value) as [
    number,
    number,
    number,
    number,
  ];
  const sign = d < 0 || m < 0 || s < 0 || micro < 0 ? -1 : 1;
  const value =
    sign *
    (Math.abs(d) +
      Math.abs(m) / 60 +
      (Math.abs(s) + Math.abs(micro) / 1e6) / 3600);
  return { value, half: 0.5e-6 / 3600 };
}

/** The example's model points: the site origin and its tessellation's vertices (#5001). */
const MODEL_POINTS = [
  [0, 0, 0],
  [-500, -500, 2000],
  [500, -500, 2000],
  [500, 500, 4000],
  [-500, 500, 4000],
];

const ifcCase = stressCase(
  "ifc-map-conversion.ifc43-utm",
  "ifc-map-conversion",
  "buildingSMART's IFC 4.3 example E.7.3 (IfcMapConversion on EPSG:25832) as a site transform: the model origin lands on the example's IfcSite latitude, longitude and elevation at their printed precision, the model's x axis on the published (XAxisAbscissa, XAxisOrdinate), and the model round-trips; the same site's E.7.1 Gauss-Krüger example lands within its datum operation's stated accuracy",
  ["proj"],
  async (ctx, base) => {
    const P = proj(ctx);
    const ex = cited<IfcExample>("ifc43-geographic-referencing-utm");
    const conversion = conversionOf(ex);
    const site = siteFromIfcMapConversion(conversion);
    const frame = EngineeringFrame.create(
      { name: "IFC E.7.3", body: EARTH, crs: epsg(25832), site },
      P,
    );
    const results: StressResult[] = [];
    const lat = compoundAngle(ex.siteRefLatitude!);
    const lon = compoundAngle(ex.siteRefLongitude!);
    const elevation = printed(ex.siteRefElevation!);
    const wgs84 = ellipsoidOf("epsg-ellipsoid-wgs84");
    const { M, N } = radii(wgs84.a, wgs84.e2, lat.value);
    // Metres on the ground between a geodetic position and the IfcSite's.
    const apart = (g: { longitude: number; latitude: number }) =>
      Math.hypot(
        (g.latitude / DEGREE - lat.value) * DEGREE * M,
        (g.longitude / DEGREE - lon.value) *
          DEGREE *
          N *
          Math.cos(lat.value * DEGREE),
      );
    const origin = frame.toGeodetic([0, 0, 0]);
    // Half a unit of the printed Eastings and Northings (0.01 m), and of the
    // IfcSite's millionths of a second.
    const mapHalf = Math.hypot(
      printed(ex.eastings).half,
      printed(ex.northings).half,
    );
    const siteHalf = Math.hypot(lat.half * DEGREE * M, lon.half * DEGREE * N);
    results.push({
      ...base,
      id: `${base.id}.origin`,
      title:
        "The model origin through the map conversion and EPSG:25832 against the example's IfcSite RefLatitude and RefLongitude (49°05′43.983700″ N, 8°26′01.247300″ E), within half a unit of the printed Eastings and Northings and of the site's angles",
      pass: true,
      value: apart(origin),
      tolerance: mapHalf + siteHalf + 1e-9,
      unit: "m",
      detail: `the frame's operation: ${frame.operation.pipeline} (ETRS89 to WGS 84 is EPSG's null transformation, so this checks the map conversion and the projection)`,
      fingerprint: fingerprintOf(ctx, frame, MODEL_POINTS),
    });
    results.push({
      ...base,
      id: `${base.id}.elevation`,
      title:
        "The model origin's height (OrthogonalHeight 113.7 on a CRS with no vertical axis, passed through) against the IfcSite's RefElevation 113.7, within half its last digit",
      pass: true,
      value: Math.abs(origin.height - elevation.value),
      tolerance: elevation.half,
      unit: "m",
    });

    // The rotation's sign, from the example's own numbers: the model's x
    // axis must land on (XAxisAbscissa, XAxisOrdinate) in grid coordinates.
    // A point 1 km along the model's x axis: grid coordinates near 5e6 m
    // keep about 1e-10 m, so a long lever keeps the direction to 1e-13 rad.
    const lever = 1000;
    const o = frame.projected([0, 0, 0]);
    const x = frame.projected([lever, 0, 0]);
    const along = [(x[0]! - o[0]!) / lever, (x[1]! - o[1]!) / lever];
    const published = [conversion.xAxisAbscissa!, conversion.xAxisOrdinate!];
    const angle = Math.atan2(
      along[0]! * published[1]! - along[1]! * published[0]!,
      along[0]! * published[0]! + along[1]! * published[1]!,
    );
    results.push({
      ...base,
      id: `${base.id}.x-axis`,
      title:
        "The model's x axis (a point 1 km along it) in grid coordinates against the published direction (XAxisAbscissa 0.270600445976, XAxisOrdinate 0.962691746426): the angle between them, within 1e-12 rad (the opposite rotation would be 148.6° off)",
      pass: Math.abs(Math.hypot(along[0]!, along[1]!) - site.scale) < 1e-9,
      value: Math.abs(angle),
      tolerance: 1e-12,
      unit: "rad",
      detail: `θ = ${fmt(site.rotation / DEGREE, 10)}° counterclockwise from grid east; x axis → (${fmt(along[0]!, 12)}, ${fmt(along[1]!, 12)})`,
    });
    results.push({
      ...base,
      id: `${base.id}.round-trip`,
      title:
        "The example's model points (the origin and its tessellation's vertices) round-trip from design to body-fixed and back within 1e-4 m",
      pass: true,
      value: worstRoundTrip(frame, MODEL_POINTS),
      tolerance: DESIGN_ROUND_TRIP,
      unit: "m",
      detail:
        "the example's project unit is the millimetre but its Scale is omitted (1.0 by IFC's rule), so these points are placed as metres; the checks above do not depend on the scale",
    });

    // The same site in the E.7.1 example, on DHDN / 3-degree Gauss-Krüger
    // zone 3: through DHDN's datum operation to WGS 84, whose stated
    // accuracy is the path's tolerance.
    const gk = cited<IfcExample>("ifc43-geographic-referencing-gk");
    const gkFrame = EngineeringFrame.create(
      {
        name: "IFC E.7.1",
        body: EARTH,
        crs: epsg(31467),
        site: siteFromIfcMapConversion(conversionOf(gk)),
      },
      P,
    );
    const gkApart = apart(gkFrame.toGeodetic([0, 0, 0]));
    const accuracy = gkFrame.operation.accuracy;
    results.push({
      ...base,
      id: `${base.id}.gauss-kruger`,
      title:
        "The E.7.1 example's model origin (the same site on EPSG:31467, DHDN) against the IfcSite's latitude and longitude, within half a unit of its printed Eastings and Northings plus the DHDN operation's stated accuracy",
      pass: accuracy !== undefined,
      value: gkApart,
      tolerance: mapHalf + siteHalf + (accuracy ?? 0),
      unit: "m",
      detail: `${gkFrame.operation.pipeline}; accuracy ${accuracy ?? "not stated"} m`,
      effect: {
        value: gkApart,
        unit: "m",
        label:
          "how far the Gauss-Krüger copy of the same IFC site lands from the UTM one, through DHDN's datum shift",
      },
      fingerprint: fingerprintOf(ctx, gkFrame, [[0, 0, 0]]),
    });
    return results;
  },
);

export const ifcMapConversionCases: readonly StressCase[] = [ifcCase];
