// The programs Cesium IR's tests run on, in one list: the WGSL emitter's
// cases (every op over its edge cases, and a composite), the spike's style,
// twist and MaterialX programs, every built-in transform's program, the
// transform front end's samples, and the passes' outputs on them (scalarized
// programs, Jacobians, literals made uniforms). The JSON tests (CS-49) take
// each one through the writer and the reader.

import { ROAD } from "../examples/transform-graph/data/road.ts";
import {
  flattenDescriptor,
  geocentricToGeographicDescriptor,
  geographicToGeocentricDescriptor,
  heightOffsetDescriptor,
  lambertConformalConicDescriptor,
  lambertConformalConicToGeographicDescriptor,
  transverseMercatorDescriptor,
  transverseMercatorToGeographicDescriptor,
  verticalExaggerationDescriptor,
  webMercatorDescriptor,
  webMercatorToGeographicDescriptor,
} from "../packages/next/src/georeference/index.ts";
import {
  IR_VERSION,
  jacobianProgram,
  literalsToUniforms,
  scalarize,
  type Program,
} from "../packages/next/src/ir/index.ts";
import { wgslCases } from "../packages/next/src/ir/wgslCases.ts";
import { parseTransform } from "../packages/next/src/transform/parse.ts";
import {
  bendDescriptor,
  bumpDescriptor,
  corridorUnrollDescriptor,
  latticeDescriptor,
  radialDistortionDescriptor,
  scaleAboutDescriptor,
  scaleAlongAxesDescriptor,
  taperDescriptor,
  twistDescriptor,
  velocityModelDescriptor,
  type TransformDescriptor,
} from "../packages/next/src/transforms/index.ts";
import { materialXProgram } from "../spikes/core-ir/fromMaterialX.ts";
import { styleProgram } from "../spikes/core-ir/fromStyle.ts";
import { transformProgram } from "../spikes/core-ir/fromTransform.ts";
import {
  MTLX,
  STYLE,
  STYLE_EDITED,
  TWIST_SOURCE,
} from "../spikes/core-ir/samples.ts";
import * as samples from "./transformIrSamples.ts";

const WGS84 = [6378137, 6378137, 6356752.314245179] as const;

const alignment = {
  start: [100, -50] as const,
  heading: 0.3,
  station: 1000,
  elements: [
    { kind: "line", length: 100 },
    { kind: "arc", length: 80, radius: 150 },
    { kind: "line", length: 50 },
    { kind: "arc", length: 60, radius: -100 },
    { kind: "line", length: 40 },
  ] as const,
};
const polyline = [
  [0, 0],
  [100, 10],
  [180, 40],
  [230, 40.5],
] as const;

const DESCRIPTORS: Record<string, TransformDescriptor> = {
  scaleAbout: scaleAboutDescriptor,
  scaleAlongAxes: scaleAlongAxesDescriptor,
  bump: bumpDescriptor,
  bend: bendDescriptor,
  twist: twistDescriptor,
  taper: taperDescriptor,
  "lattice 2x2x2": latticeDescriptor([2, 2, 2]),
  "lattice 1x2x3": latticeDescriptor([1, 2, 3]),
  radialDistortion: radialDistortionDescriptor,
  velocityModel: velocityModelDescriptor,
  "corridorUnroll, lines and arcs": corridorUnrollDescriptor(alignment),
  "corridorUnroll, a polyline": corridorUnrollDescriptor({ polyline }),
  "corridorUnroll, the road": corridorUnrollDescriptor({ polyline: ROAD }),
  verticalExaggeration: verticalExaggerationDescriptor(WGS84),
  heightOffset: heightOffsetDescriptor(WGS84),
  flatten: flattenDescriptor(
    [
      [10, 45],
      [10.3, 44.95],
      [10.35, 45.2],
    ],
    WGS84,
  ),
  transverseMercator: transverseMercatorDescriptor(WGS84),
  lambertConformalConic: lambertConformalConicDescriptor(WGS84),
  webMercator: webMercatorDescriptor(WGS84),
  geographicToGeocentric: geographicToGeocentricDescriptor(WGS84),
  geocentricToGeographic: geocentricToGeographicDescriptor(WGS84),
  transverseMercatorToGeographic:
    transverseMercatorToGeographicDescriptor(WGS84),
  lambertConformalConicToGeographic:
    lambertConformalConicToGeographicDescriptor(WGS84),
  webMercatorToGeographic: webMercatorToGeographicDescriptor(WGS84),
};

export interface CorpusProgram {
  readonly name: string;
  readonly program: Program;
}

// The spike's front ends write the spike's version; these are the same
// programs in this version.
const current = (p: Program): Program => ({ ...p, version: IR_VERSION });

/** The base programs: what the front ends and the emitter tests build. */
function baseCorpus(): CorpusProgram[] {
  const out: CorpusProgram[] = [];
  for (const c of wgslCases()) {
    out.push({ name: `wgsl case: ${c.name}`, program: c.program });
  }
  out.push(
    {
      name: "spike style",
      program: current(styleProgram(STYLE) as Program),
    },
    {
      name: "spike style, edited",
      program: current(styleProgram(STYLE_EDITED) as Program),
    },
    {
      name: "spike twist",
      program: current(transformProgram(TWIST_SOURCE) as Program),
    },
    {
      name: "spike MaterialX bands",
      program: current(materialXProgram(MTLX) as Program),
    },
  );
  for (const [name, descriptor] of Object.entries(DESCRIPTORS)) {
    out.push({
      name: `built-in ${name}`,
      program: parseTransform(descriptor.source),
    });
  }
  for (const [name, fn] of Object.entries(samples)) {
    out.push({
      name: `transform sample ${name}`,
      program: parseTransform(fn as (...args: never[]) => unknown),
    });
  }
  return out;
}

/**
 * Every program the tests use, and what the passes make of the transform
 * programs: scalarized, their Jacobians along `p`, and with literals made
 * uniforms.
 */
export function corpus(): CorpusProgram[] {
  const base = baseCorpus();
  const out = [...base];
  // A pass that refuses a program (scalarize has no lane form of `normalize`
  // yet) leaves it out of its own row of the list.
  const add = (name: string, make: () => Program) => {
    try {
      out.push({ name, program: make() });
    } catch (error) {
      if (!/^(scalarize|jvp|differentiate)/.test((error as Error).message)) {
        throw error;
      }
    }
  };
  for (const { name, program } of base) {
    add(`${name}, scalarized`, () => scalarize(program));
    add(
      `${name}, literals as uniforms`,
      () => literalsToUniforms(program).program,
    );
    if (name.startsWith("built-in ") || name.startsWith("transform sample ")) {
      add(`${name}, Jacobian`, () => jacobianProgram(program, "p"));
    }
  }
  return out;
}
