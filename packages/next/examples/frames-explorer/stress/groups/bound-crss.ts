// Bound CRSs: what GDAL and iModels export when a datum carries TOWGS84, and
// what a 3D Tiles 2.0 EXT_geospatial_crs_wkt2 may hold. The checks are
// exported as boundCrsChecks for R18's "Try your own".
import {
  EngineeringFrame,
  designPoint,
} from "../../../../src/engineering/EngineeringFrame.ts";
import {
  type CrsRef,
  type RecordedOperation,
  resolveOperation,
} from "../../../../src/engineering/crs.ts";
import { gridFactors } from "../../../../src/engineering/factors.ts";
import type { ProjApi } from "../../../../src/engineering/proj.ts";
import { measure } from "../../../../src/measure/measure.ts";
import { EARTH } from "../../../../src/scene/Body.ts";
import {
  type EllipsoidShape,
  ellipsoidShape,
  epsgTransformation,
  geog2dHelmert,
} from "../datum.ts";
import {
  type HelmertParameters,
  type RotationConvention,
  geodeticToGeocentric,
} from "../geodesy.ts";
import {
  ARCSECOND,
  CONVERGENCE_PATH,
  FACTOR_PATH,
  INVERSE_RESIDUAL,
  citation,
  cited,
} from "../references.ts";
import {
  type ResultBase,
  type StressCase,
  type StressContext,
  type StressResult,
  fmt,
  judgeResult,
  withDefaults,
  messageOf,
  plainAccuracy,
} from "../runner.ts";
import {
  EFFECT,
  MEASURED_AT,
  distance,
  epsg,
  fingerprintOf,
  proj,
  stressCase,
  utc,
  worstRoundTrip,
} from "../shared.ts";
import {
  type WktNode,
  axisMetres,
  bboxCentre,
  boundMethodName,
  ellipsoidOfNode,
  epsgId,
  find,
  parseWkt,
  projectionOrigin,
  sourceCrsNode,
  towgs84Of,
} from "../wkt.ts";

const GROUP = "bound-crss";

/** The forward against the hand Helmert: 1 mm (the plan's). */
const HELMERT_TOLERANCE = 1e-3;

/** Heights of the round trips, design units. */
const HEIGHTS = [0, 100, 1000] as const;

/** Below this the bound and registry results are "the same parameters": compare absolutely. */
const SAME_PLACE = 0.01;

/** The Helmert's numbers in a PROJ pipeline's helmert step (+x … +s in m, arc-seconds and ppm). */
function pipelineHelmert(pipeline: string) {
  const step = pipeline
    .split(" +step ")
    .find((s) => s.includes("+proj=helmert"));
  if (step === undefined) {
    return undefined;
  }
  const values: Record<string, string> = {};
  for (const token of step.split(" ")) {
    const eq = token.indexOf("=");
    if (token.startsWith("+") && eq > 0) {
      values[token.slice(1, eq)] = token.slice(eq + 1);
    }
  }
  const n = (k: string) => Number(values[k] ?? "0");
  return {
    parameters: {
      tx: n("x"),
      ty: n("y"),
      tz: n("z"),
      rx: n("rx") * ARCSECOND,
      ry: n("ry") * ARCSECOND,
      rz: n("rz") * ARCSECOND,
      ds: n("s") * 1e-6,
    } satisfies HelmertParameters,
    convention: (values.convention === "coordinate_frame"
      ? "coordinate-frame"
      : "position-vector") as RotationConvention,
    rates: ["dx", "dy", "dz", "drx", "dry", "drz", "ds"].some(
      (k) => k in values,
    ),
  };
}

/** The largest difference between two parameter sets, in metres at the Earth's radius. */
function parameterDifference(a: HelmertParameters, b: HelmertParameters) {
  const R = 6.4e6;
  return Math.max(
    Math.abs(a.tx - b.tx),
    Math.abs(a.ty - b.ty),
    Math.abs(a.tz - b.tz),
    R * Math.abs(a.rx - b.rx),
    R * Math.abs(a.ry - b.ry),
    R * Math.abs(a.rz - b.rz),
    R * Math.abs(a.ds - b.ds),
  );
}

/** Parameters equal to float precision (PROJ prints -20.489 ppm as -20.4889999999569). */
const SAME_PARAMETERS = 1e-6;

export interface BoundCheckOptions {
  /** The result ids' prefix. */
  readonly idBase: string;
  /** Results from "Try your own" (R18): shown, but not counted, compared or fingerprinted. */
  readonly userInput: boolean;
  /** Where to test, longitude and latitude on the source datum (degrees). */
  readonly at?: readonly [number, number];
  /**
   * The registry CRS to compare with (else the source CRS's EPSG ID, when
   * the WKT has one), and the EPSG record of the operation PROJ will pick,
   * for a hand-checked effect.
   */
  readonly registry?: { readonly crs: CrsRef; readonly record?: string };
  /**
   * The references.json entry the WKT2 came from (ruling F6): every result's
   * source, but the registry effect's, which is its EPSG record (F28).
   */
  readonly input?: string;
}

interface Located {
  readonly frame: EngineeringFrame;
  /** The source CRS's conversion to its own geographic CRS (no datum step). */
  readonly conversion: RecordedOperation;
  readonly design: readonly [number, number, number];
  readonly where: string;
}

function locate(
  P: ProjApi,
  root: WktNode,
  wkt2: string,
  label: string,
  at: readonly [number, number] | undefined,
): Located {
  const crs = P.proj_create(wkt2);
  const source =
    P.proj_get_type(crs) === P.PJ_TYPE_BOUND_CRS
      ? P.proj_get_source_crs(crs)
      : crs;
  const sourceWkt = P.proj_as_wkt(source, P.PJ_WKT2_2019);
  const geographic = P.proj_as_wkt(
    P.proj_crs_get_geodetic_crs(source),
    P.PJ_WKT2_2019,
  );
  const conversion = resolveOperation(
    P,
    { format: "wkt2", wkt2: sourceWkt },
    geographic,
  );
  const frame = EngineeringFrame.create(
    { name: label, body: EARTH, crs: { format: "wkt2", wkt2 } },
    P,
  );
  const fromBox = bboxCentre(root);
  const fromOrigin = projectionOrigin(sourceCrsNode(root));
  const place = at ?? fromBox ?? fromOrigin;
  if (place === undefined) {
    return { frame, conversion, design: [0, 0, 0], where: "design (0, 0)" };
  }
  const projected = conversion.inverse([place[0], place[1], 0]);
  const where = `${at ? "" : fromBox ? "the area of use's centre, " : "the projection's origin, "}${fmt(place[1], 7)}°, ${fmt(place[0], 7)}°`;
  return {
    frame,
    conversion,
    design: [projected[0]!, projected[1]!, 0],
    where,
  };
}

async function boundChecks(
  ctx: StressContext,
  wkt2: string,
  label: string,
  options: BoundCheckOptions,
): Promise<StressResult[]> {
  const P = ctx.proj ?? (await ctx.loadProj());
  const base = (check: string, title: string): ResultBase => ({
    id: `${options.idBase}.${check}`,
    group: GROUP,
    title: `${label}: ${title}`,
  });
  const fingerprint = options.userInput
    ? () => ({})
    : (frame: EngineeringFrame, designs: readonly ArrayLike<number>[]) => ({
        fingerprint: fingerprintOf(ctx, frame, designs),
      });
  const results: StressResult[] = [];

  let root: WktNode;
  let located: Located;
  try {
    root = parseWkt(wkt2);
    located = locate(P, root, wkt2, label, options.at);
  } catch (error) {
    return [
      {
        ...base("frame", "the CRS makes an engineering frame"),
        pass: false,
        error: messageOf(error),
      },
    ];
  }
  const { frame, conversion, design, where } = located;
  const sourceNode = sourceCrsNode(root);
  const wgs84 = ellipsoidShape("epsg-ellipsoid-wgs84");

  // 1. Units, type and factors come from the source CRS.
  {
    const sourceFrame = EngineeringFrame.create(
      {
        name: `${label} (source)`,
        body: EARTH,
        crs: {
          format: "wkt2",
          wkt2: P.proj_as_wkt(
            P.proj_get_type(P.proj_create(wkt2)) === P.PJ_TYPE_BOUND_CRS
              ? P.proj_get_source_crs(P.proj_create(wkt2))
              : P.proj_create(wkt2),
            P.PJ_WKT2_2019,
          ),
        },
        allowBallpark: true,
      },
      P,
    );
    const stated = axisMetres(sourceNode);
    const a = gridFactors(frame, design);
    const b = gridFactors(sourceFrame, design);
    const factor = Math.max(
      Math.abs(a.pointScale - b.pointScale),
      Math.abs(a.combinedFactor - b.combinedFactor),
    );
    const convergence = Math.abs(a.convergence - b.convergence);
    results.push({
      ...base(
        "source-crs",
        "the engineering frame's units, type and grid factors are the source CRS's (its WKT's axis unit, and the factors of a frame on the source CRS alone)",
      ),
      pass:
        frame.units.projected &&
        stated !== undefined &&
        frame.units.metersPerUnit === stated &&
        convergence <= CONVERGENCE_PATH,
      value: factor,
      tolerance: FACTOR_PATH,
      detail: `${frame.units.horizontalUnitName} (${frame.units.metersPerUnit} m) against the WKT's ${stated ?? "missing"} m; point scale ${fmt(a.pointScale, 10)} and ${fmt(b.pointScale, 10)}; convergence differs by ${fmt(convergence)} rad; at ${where}`,
      userInput: options.userInput,
    });
  }

  // 2. The recorded operation is the bound Helmert.
  let towgs84;
  let notHelmert: string | undefined;
  try {
    towgs84 = towgs84Of(root);
  } catch (error) {
    notHelmert = messageOf(error);
  }
  const op = frame.operation;
  const registryCrs: CrsRef | undefined =
    options.registry?.crs ??
    (() => {
      const id = epsgId(sourceNode);
      return id === undefined ? undefined : epsg(id);
    })();
  const geographicAt = conversion.forward(design);
  const box = {
    west: Math.max(-180, geographicAt[0]! - 0.05),
    south: Math.max(-90, geographicAt[1]! - 0.05),
    east: Math.min(180, geographicAt[0]! + 0.05),
    north: Math.min(90, geographicAt[1]! + 0.05),
  };
  let registry: RecordedOperation | undefined;
  let registryError: string | undefined;
  if (registryCrs !== undefined) {
    try {
      registry = resolveOperation(P, registryCrs, "EPSG:4979", {
        areaOfInterest: box,
      });
    } catch (error) {
      registryError = messageOf(error);
    }
  }
  if (notHelmert !== undefined) {
    results.push({
      ...base(
        "recorded-operation",
        "the recorded operation is the bound CRS's own Helmert",
      ),
      pass: false,
      error: notHelmert,
      detail: `recorded: ${op.pipeline}`,
      userInput: options.userInput,
    });
  } else if (towgs84 === undefined) {
    results.push({
      ...base(
        "recorded-operation",
        "the recorded operation (no TOWGS84: the check that it is the bound Helmert is skipped)",
      ),
      pass: true,
      displayOnly: true,
      detail: `skipped: the WKT carries no TOWGS84 (no BOUNDCRS with an ABRIDGEDTRANSFORMATION), so the frame uses PROJ's own choice: ${op.pipeline}`,
      userInput: options.userInput,
    });
  } else {
    const inPipeline = pipelineHelmert(op.pipeline);
    const difference =
      inPipeline === undefined
        ? Infinity
        : parameterDifference(inPipeline.parameters, towgs84.parameters);
    results.push({
      ...base(
        "recorded-operation",
        "the recorded operation is the bound CRS's own Helmert (the WKT's TOWGS84 numbers and convention), not PROJ's registry choice",
      ),
      pass:
        inPipeline !== undefined &&
        !inPipeline.rates &&
        inPipeline.convention === towgs84.convention &&
        !op.ballpark,
      value: difference,
      tolerance: SAME_PARAMETERS,
      unit: "m",
      detail: `WKT: ${towgs84.method}, ${towgs84.printed}; recorded: ${op.pipeline}${registry ? `; registry: ${registry.pipeline}` : registryError ? `; registry: ${registryError}` : ""}`,
      userInput: options.userInput,
    });
  }

  // 3. The forward against a hand-coded Helmert from the WKT's own numbers.
  const sourceEllipsoid = ellipsoidOfNode(sourceNode);
  const targetNode = find(root, "TARGETCRS");
  // WKT1's TOWGS84 is to WGS 84 by definition; a WKT2 BOUNDCRS names its target.
  const targetEllipsoid =
    targetNode === undefined && towgs84 !== undefined
      ? { name: "WGS 84", ...wgs84 }
      : ellipsoidOfNode(targetNode);
  const toWgs84 =
    targetEllipsoid !== undefined &&
    Math.abs(targetEllipsoid.a - wgs84.a) < 1e-6 &&
    Math.abs(1 / targetEllipsoid.f - 1 / wgs84.f) < 1e-9;
  const pure =
    !conversion.pipeline.includes("+proj=helmert") &&
    conversion.grids.length === 0;
  const library = frame.toBodyFixed(design);
  let hand: [number, number, number] | undefined;
  if (
    towgs84 === undefined ||
    sourceEllipsoid === undefined ||
    !toWgs84 ||
    !pure
  ) {
    const why =
      notHelmert !== undefined
        ? `the bound transformation isn't a Helmert (${boundMethodName(root) ?? "unnamed"}), so there's no hand comparison`
        : towgs84 === undefined
          ? "the WKT carries no TOWGS84 parameters, so there is no bound Helmert to compare with"
          : sourceEllipsoid === undefined
            ? "the WKT's source CRS states no ellipsoid"
            : !toWgs84
              ? "the bound CRS's target is not on the WGS 84 ellipsoid"
              : "the source CRS's conversion to its geographic CRS is not a conversion alone";
    results.push({
      ...base("helmert", "the forward against a hand-coded Helmert (skipped)"),
      pass: true,
      displayOnly: true,
      detail: `skipped: ${why}`,
      userInput: options.userInput,
    });
  } else {
    hand = geog2dHelmert(
      geographicAt,
      sourceEllipsoid,
      towgs84.parameters,
      towgs84.convention,
      wgs84,
      towgs84.keepsHeight,
    ).xyz;
    results.push({
      ...base(
        "helmert",
        `the frame's body-fixed position against the WKT's Helmert coded by hand (EPSG ${towgs84.convention === "position-vector" ? "9606, position vector" : "9607, coordinate frame"}, IOGP 373-7-2 §4.2), within 1 mm`,
      ),
      pass: true,
      value: distance(library, hand),
      tolerance: HELMERT_TOLERANCE,
      unit: "m",
      detail: `at ${where}: library ${Array.from(library, (v) => v.toFixed(4)).join(", ")}; hand ${hand.map((v) => v.toFixed(4)).join(", ")} (source ${sourceEllipsoid.name}, height kept: ${towgs84.keepsHeight ? "geog2D domain" : "no, geocentric domain"})`,
      ...fingerprint(frame, [design]),
      userInput: options.userInput,
    });
  }

  // 4. Round trips at three heights.
  {
    const designs = HEIGHTS.map((h) => [design[0], design[1], h]);
    results.push({
      ...base(
        "round-trip",
        `design to body-fixed and back at h = ${HEIGHTS.join(", ")} design units, within the refined inverse's 1e-6 m`,
      ),
      pass: true,
      value: worstRoundTrip(frame, designs),
      tolerance: INVERSE_RESIDUAL,
      unit: "m",
      detail: `at ${where}`,
      userInput: options.userInput,
    });
  }

  // 5. The effect: the bound Helmert against PROJ's best registry operation.
  if (registry !== undefined && registryCrs !== undefined) {
    const g = registry.forward(design);
    const there = geodeticToGeocentric(g[0]!, g[1]!, g[2]!, wgs84.a, wgs84.f);
    const size = distance(library, there);
    const recordId = options.registry?.record;
    let handSize: number | undefined;
    if (recordId !== undefined && hand !== undefined && sourceEllipsoid) {
      const t = epsgTransformation(recordId);
      const registryHand = geog2dHelmert(
        geographicAt,
        sourceEllipsoid,
        t.parameters,
        t.convention,
        wgs84,
      ).xyz;
      handSize = distance(hand, registryHand);
    }
    const effect = {
      value: size,
      unit: "m",
      label: "the TOWGS84 shortcut against PROJ's best registry operation",
    };
    if (handSize === undefined) {
      results.push({
        ...base(
          "registry",
          "the bound Helmert's position against PROJ's best registry operation for the same point (shown, not judged: no EPSG record to check it by hand)",
        ),
        pass: true,
        displayOnly: true,
        detail: `${fmt(size, 6)} m; registry: ${registry.pipeline} (accuracy ${registry.accuracy ?? "not stated"} m)`,
        effect,
        userInput: options.userInput,
      });
    } else {
      const relative = handSize > SAME_PLACE;
      results.push({
        ...base(
          "registry",
          `the bound Helmert's position against PROJ's best registry operation for the same point, against the EPSG record (${recordId}) by hand: ${relative ? "within 2%" : "both the same parameters, within 1 mm"}`,
        ),
        pass: true,
        value: relative
          ? Math.abs(size / handSize - 1)
          : Math.abs(size - handSize),
        tolerance: relative ? EFFECT : HELMERT_TOLERANCE,
        ...(relative ? {} : { unit: "m" }),
        detail: `library ${fmt(size, 6)} m, hand ${fmt(handSize, 6)} m; registry: ${registry.pipeline} (accuracy ${registry.accuracy ?? "not stated"} m)`,
        effect,
        userInput: options.userInput,
      });
    }
  } else if (registryError !== undefined) {
    results.push({
      ...base(
        "registry",
        "PROJ's best registry operation for the same point (shown, not judged)",
      ),
      pass: true,
      displayOnly: true,
      detail: `no registry operation: ${registryError}`,
      userInput: options.userInput,
    });
  }

  // 6. The accuracy: a TOWGS84 states none, so it is not bounded (R8).
  {
    const m = measure(
      designPoint(frame, design),
      designPoint(frame, [design[0] + 100, design[1], 0]),
      utc(ctx, MEASURED_AT),
      ctx.frames,
      { signal: false },
    );
    const unknown = m.accuracy.terms.find((t) => t.meters === undefined);
    results.push({
      ...base(
        "accuracy",
        "the frame's accuracy as the measurement states it (shown, not judged)",
      ),
      pass: true,
      displayOnly: true,
      accuracy: plainAccuracy(m.accuracy),
      detail:
        m.accuracy.meters === undefined
          ? `not bounded: ${unknown?.source ?? "a term"} is unknown (${unknown?.note ?? ""}); a TOWGS84 carries no accuracy`
          : `${fmt(m.accuracy.meters, 4)} m`,
      userInput: options.userInput,
    });
  }
  const record = options.registry?.record;
  return results.map((r) =>
    r.id === `${options.idBase}.registry` && record !== undefined
      ? { ...r, source: citation(record) }
      : options.input !== undefined
        ? { ...r, source: citation(options.input) }
        : r,
  );
}

/** Lowercase letters, digits and dashes, for an id from a label. */
function slug(label: string): string {
  let out = "";
  for (const c of label.toLowerCase()) {
    const keep = (c >= "a" && c <= "z") || (c >= "0" && c <= "9");
    out += keep ? c : out.endsWith("-") ? "" : "-";
  }
  return out.replace(/^-+|-+$/g, "").slice(0, 40) || "crs";
}

/**
 * The Bound CRSs group's checks on any WKT2 (R18's "Try your own"): units and
 * factors from the source CRS, the recorded operation, a hand-coded Helmert
 * when the WKT carries TOWGS84 parameters (skipped, saying why, when it
 * doesn't), round trips at three heights, the effect against PROJ's best
 * registry operation, and the accuracy. Every result is marked
 * `userInput: true` and carries no fingerprint: excluded from the pass
 * counts, the data test and the fingerprints. It never throws: a WKT that
 * makes no frame gives one failed result with the error.
 */
export async function boundCrsChecks(
  ctx: StressContext,
  wkt2: string,
  label: string,
): Promise<StressResult[]> {
  const idBase = `${GROUP}.user.${slug(label)}`;
  try {
    const results = await boundChecks(ctx, wkt2, label, {
      idBase,
      userInput: true,
    });
    // Judged as the runner judges the catalog: a pass the checks don't bear
    // out is never shown (R18).
    return results.map((r) =>
      withDefaults(judgeResult({ ...r, userInput: true })),
    );
  } catch (error) {
    return [
      {
        id: `${idBase}.frame`,
        group: GROUP,
        title: `${label}: the checks ran`,
        pass: false,
        error: messageOf(error),
        userInput: true,
        accuracyNote: "not stated: the checks did not run",
      },
    ];
  }
}

interface InputEntry {
  readonly wkt2: string;
  readonly description: string;
}

const boundCase = (
  key: string,
  label: string,
  at: readonly [number, number] | undefined,
  registry?: BoundCheckOptions["registry"],
): StressCase =>
  stressCase(
    `bound-crss.${key}`,
    GROUP,
    `${label} as a WKT2 BOUNDCRS (input exported from a +towgs84 definition): units and factors from the source CRS, the bound Helmert recorded and matching a hand-coded Helmert within 1 mm, round trips within 1e-6 m at three heights, and the shift against PROJ's registry operation`,
    ["proj"],
    async (ctx) => {
      const entry = cited<InputEntry>(`input-wkt2-${key}`);
      return boundChecks(ctx, entry.wkt2, label, {
        idBase: `bound-crss.${key}`,
        userInput: false,
        input: `input-wkt2-${key}`,
        ...(at && { at }),
        ...(registry && { registry }),
      });
    },
  );

/**
 * A plain EPSG code whose operation is a geocentric Helmert (plan 4a's last
 * review found these round trips off by up to 2.8 mm from PROJ's push and
 * pop of the height; 4a's refined inverse fixed it): the recorded Helmert
 * against its EPSG record, the forward against the record by hand, and the
 * round trips at three heights.
 */
const epsgHelmertCase = (
  code: number,
  geographicCode: number,
  record: string,
  ellipsoid: string,
  at: readonly [number, number],
  label: string,
): StressCase =>
  stressCase(
    `bound-crss.epsg-${code}`,
    GROUP,
    `EPSG:${code} (${label}), whose operation is a geocentric Helmert: the recorded Helmert is EPSG's ${record.slice(5)}, the forward matches it coded by hand within 1 mm, and round trips at h = 0, 100 and 1000 hold within 1e-6 m (guarding plan 4a's refined inverse)`,
    ["proj"],
    async (ctx, base) => {
      const P = proj(ctx);
      const frame = EngineeringFrame.create(
        { name: label, body: EARTH, crs: epsg(code) },
        P,
      );
      const conversion = resolveOperation(
        P,
        epsg(code),
        `EPSG:${geographicCode}`,
      );
      const projected = conversion.inverse([at[0], at[1], 0]);
      const design = [projected[0]!, projected[1]!, 0];
      const t = epsgTransformation(record);
      const inPipeline = pipelineHelmert(frame.operation.pipeline);
      const wgs84 = ellipsoidShape("epsg-ellipsoid-wgs84");
      const source: EllipsoidShape = ellipsoidShape(ellipsoid);
      const geographic = conversion.forward(design);
      const hand = geog2dHelmert(
        geographic,
        source,
        t.parameters,
        t.convention,
        wgs84,
      ).xyz;
      const library = frame.toBodyFixed(design);
      return [
        {
          ...base,
          id: `${base.id}.recorded-operation`,
          title: `EPSG:${code}'s recorded operation is the Helmert of ${t.record.name} (EPSG ${record.slice(5)}), its parameters as the registry prints them`,
          pass: inPipeline !== undefined && !frame.operation.ballpark,
          value:
            inPipeline === undefined
              ? Infinity
              : parameterDifference(inPipeline.parameters, t.parameters),
          tolerance: SAME_PARAMETERS,
          unit: "m",
          detail: `${frame.operation.pipeline}; accuracy ${frame.operation.accuracy ?? "not stated"} m against the record's ${t.record.accuracy} m`,
        },
        {
          ...base,
          id: `${base.id}.helmert`,
          title: `EPSG:${code} at ${at[1]}°, ${at[0]}°: the frame's body-fixed position against ${t.record.name} coded by hand from the EPSG record, within 1 mm`,
          pass: true,
          value: distance(library, hand),
          tolerance: HELMERT_TOLERANCE,
          unit: "m",
          detail: `library ${Array.from(library, (v) => v.toFixed(4)).join(", ")}; hand ${hand.map((v) => v.toFixed(4)).join(", ")}`,
          fingerprint: fingerprintOf(ctx, frame, [design]),
        },
        {
          ...base,
          id: `${base.id}.round-trip`,
          title: `EPSG:${code}: design to body-fixed and back at h = 0, 100 and 1000 design units, within the refined inverse's 1e-6 m (plan 4a found up to 2.8 mm before its fix)`,
          pass: true,
          value: worstRoundTrip(
            frame,
            HEIGHTS.map((h) => [design[0]!, design[1]!, h]),
          ),
          tolerance: INVERSE_RESIDUAL,
          unit: "m",
        },
      ];
    },
  );

export const boundCrssCases: readonly StressCase[] = [
  boundCase("ed50-utm31n", "ED50 / UTM zone 31N", [3, 56], {
    crs: epsg(23031),
    record: "epsg-1311",
  }),
  boundCase(
    "tokyo-jprcs-ix",
    "Tokyo / Japan Plane Rectangular CS IX",
    [139.767, 35.681],
    { crs: epsg(30169), record: "epsg-15484" },
  ),
  boundCase("osgb36-bng", "OSGB 1936 / British National Grid", [-1.5, 52.65], {
    crs: epsg(27700),
    record: "epsg-1314",
  }),
  boundCase("wgs84-utm31n", "WGS 84 / UTM zone 31N (no TOWGS84)", undefined),
  epsgHelmertCase(
    30169,
    4301,
    "epsg-15484",
    "epsg-ellipsoid-bessel-1841",
    [139.767, 35.681],
    "Tokyo / Japan Plane Rectangular CS IX",
  ),
  epsgHelmertCase(
    26741,
    4267,
    "epsg-1175",
    "epsg-ellipsoid-clarke-1866",
    [-122.4, 40.6],
    "NAD27 / California zone I",
  ),
];
