// What a composed stage holds, against what the engine would need from it:
// units and axes, composition arcs, semantic labels in both schemas,
// materials (UsdPreviewSurface, MDL, MaterialX), geometry and physics. This
// is the spike's report. Spike code for CS-833 and CS-843; not part of
// @cesium/next.

import {
  resolveAsset,
  type AssetIo,
  type ComposeCounts,
  type Prim,
  type Stage,
} from "./compose.ts";
import { isArray, type Value } from "./layer.ts";

export interface Coverage {
  stage: {
    upAxis: string;
    metersPerUnit: number | "unset";
    kilogramsPerUnit: number | "unset";
    defaultPrim: string;
    defaultPrimKind: string;
  };
  counts: ComposeCounts;
  prims: number;
  typeNames: Record<string, number>;
  apiSchemas: Record<string, number>;
  semantics: {
    /** Prims with SemanticsLabelsAPI, and their labels by taxonomy. */
    labelsApi: number;
    labelsApiTaxonomies: Record<string, string[]>;
    /** Prims with Isaac's older SemanticsAPI, and their labels by semanticType. */
    legacyApi: number;
    legacyTypes: Record<string, string[]>;
  };
  materials: {
    materials: number;
    previewSurface: number;
    mdl: number;
    materialX: number;
    /** Materials with an MDL surface and a UsdPreviewSurface one too. */
    mdlWithPreview: number;
    mdlOnly: number;
    mdlModules: string[];
    shaderIds: Record<string, number>;
    textures: number;
    texturesFound: number;
    bound: number;
  };
  geometry: {
    meshes: number;
    points: number;
    triangles: number;
    ngons: number;
    subdivisionSchemes: Record<string, number>;
    geomSubsets: number;
    withNormals: number;
    withUvs: number;
    undecodedArrays: number;
    implicit: Record<string, number>;
    pointInstancers: number;
    /** Transform ops declared with no value, read as identity. */
    valuelessOps: number;
    /** Size of the bounds in meters along x, y and z of the stage, after units. */
    sizeMeters: [number, number, number] | null;
  };
  physics: {
    rigidBodies: number;
    colliders: number;
    massApis: number;
    joints: number;
    physicsMaterials: number;
    approximations: Record<string, number>;
    physxSchemas: Record<string, number>;
  };
  timeSampled: number;
}

type Mat = number[]; // 4x4, column-major, column vectors.

const IDENTITY: Mat = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function mul(a: Mat, b: Mat): Mat {
  const o = new Array<number>(16).fill(0);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) {
        s += a[k * 4 + r]! * b[c * 4 + k]!;
      }
      o[c * 4 + r] = s;
    }
  }
  return o;
}

function rot(axis: 0 | 1 | 2, deg: number): Mat {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const m = [...IDENTITY];
  const [i, j] = axis === 0 ? [1, 2] : axis === 1 ? [2, 0] : [0, 1];
  m[i * 4 + i] = c;
  m[j * 4 + j] = c;
  m[i * 4 + j] = s;
  m[j * 4 + i] = -s;
  return m;
}

function nums(v: Value | undefined): number[] | undefined {
  if (typeof v === "number") {
    return [v];
  }
  if (isArray(v)) {
    return Array.from(v.data);
  }
  if (Array.isArray(v) && v.every((x) => typeof x === "number")) {
    return v as number[];
  }
  if (Array.isArray(v)) {
    const out: number[] = [];
    for (const x of v as Value[]) {
      const n = nums(x);
      if (!n) {
        return undefined;
      }
      out.push(...n);
    }
    return out;
  }
  return undefined;
}

/** The prim's local transform from its xformOpOrder, or undefined where an op isn't understood. */
function localMatrix(
  prim: Prim,
  stage: Stage,
  valueless: { n: number },
): Mat | undefined {
  const order = prim.props.get("xformOpOrder")?.value;
  if (!Array.isArray(order)) {
    return IDENTITY;
  }
  let m = IDENTITY;
  for (const raw of order as Value[]) {
    if (typeof raw !== "string") {
      return undefined;
    }
    if (raw === "!resetXformStack!") {
      continue;
    }
    const inverse = raw.startsWith("!invert!");
    const name = inverse ? raw.slice(8) : raw;
    const prop = prim.props.get(name);
    if (prop && prop.value === undefined && !prop.timeSamples) {
      // Declared with no value. OpenUSD reads such an op as identity; so does the spike, and counts it.
      valueless.n++;
      continue;
    }
    const v = nums(prop?.value);
    if (!v) {
      return undefined;
    }
    const type = name.split(":")[1] ?? "";
    let op: Mat;
    if (type === "translate") {
      op = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, v[0]!, v[1]!, v[2]!, 1];
    } else if (type === "scale") {
      op = [
        v[0]!,
        0,
        0,
        0,
        0,
        v[1] ?? v[0]!,
        0,
        0,
        0,
        0,
        v[2] ?? v[0]!,
        0,
        0,
        0,
        0,
        1,
      ];
    } else if (type === "transform") {
      // USD's matrices are row-major for row vectors; transposed, they are column-major for column vectors.
      op = v.slice(0, 16);
    } else if (/^rotate[XYZ]$/.test(type)) {
      op = rot("XYZ".indexOf(type[6]!) as 0 | 1 | 2, v[0]!);
    } else if (/^rotate[XYZ]{3}$/.test(type)) {
      // rotateXYZ applies X first: as column vectors, Rz * Ry * Rx.
      op = IDENTITY;
      for (let i = 0; i < 3; i++) {
        op = mul(rot("XYZ".indexOf(type[6 + i]!) as 0 | 1 | 2, v[i]!), op);
      }
    } else if (type === "orient") {
      const usda = stage.layer(prop!.layer)?.format === "usda";
      const [w, x, y, z] = usda
        ? [v[0]!, v[1]!, v[2]!, v[3]!]
        : [v[3]!, v[0]!, v[1]!, v[2]!];
      op = [
        1 - 2 * (y * y + z * z),
        2 * (x * y + z * w),
        2 * (x * z - y * w),
        0,
        2 * (x * y - z * w),
        1 - 2 * (x * x + z * z),
        2 * (y * z + x * w),
        0,
        2 * (x * z + y * w),
        2 * (y * z - x * w),
        1 - 2 * (x * x + y * y),
        0,
        0,
        0,
        0,
        1,
      ];
    } else {
      return undefined;
    }
    if (inverse) {
      return undefined;
    } // Rare in assets; refused rather than inverted.
    m = mul(m, op);
  }
  return m;
}

function bump(r: Record<string, number>, k: string, n = 1): void {
  r[k] = (r[k] ?? 0) + n;
}

function addLabels(
  r: Record<string, string[]>,
  k: string,
  labels: readonly string[],
): void {
  const a = (r[k] ??= []);
  for (const l of labels) {
    if (!a.includes(l) && a.length < 12) {
      a.push(l);
    }
  }
}

export async function coverage(
  stage: Stage,
  root: Prim,
  io: AssetIo,
): Promise<Coverage> {
  const rootFields = stage.layer(stage.root)?.specs.get("/")?.fields;
  const num = (k: string): number | "unset" => {
    const v = rootFields?.get(k);
    return typeof v === "number" ? v : "unset";
  };
  const defaultPrim =
    typeof rootFields?.get("defaultPrim") === "string"
      ? (rootFields.get("defaultPrim") as string)
      : "";
  const out: Coverage = {
    stage: {
      upAxis:
        typeof rootFields?.get("upAxis") === "string"
          ? (rootFields.get("upAxis") as string)
          : "unset",
      metersPerUnit: num("metersPerUnit"),
      kilogramsPerUnit: num("kilogramsPerUnit"),
      defaultPrim: defaultPrim || "unset",
      defaultPrimKind: "unset",
    },
    counts: stage.counts,
    prims: 0,
    typeNames: {},
    apiSchemas: {},
    semantics: {
      labelsApi: 0,
      labelsApiTaxonomies: {},
      legacyApi: 0,
      legacyTypes: {},
    },
    materials: {
      materials: 0,
      previewSurface: 0,
      mdl: 0,
      materialX: 0,
      mdlWithPreview: 0,
      mdlOnly: 0,
      mdlModules: [],
      shaderIds: {},
      textures: 0,
      texturesFound: 0,
      bound: 0,
    },
    geometry: {
      meshes: 0,
      points: 0,
      triangles: 0,
      ngons: 0,
      subdivisionSchemes: {},
      geomSubsets: 0,
      withNormals: 0,
      withUvs: 0,
      undecodedArrays: 0,
      implicit: {},
      pointInstancers: 0,
      valuelessOps: 0,
      sizeMeters: null,
    },
    physics: {
      rigidBodies: 0,
      colliders: 0,
      massApis: 0,
      joints: 0,
      physicsMaterials: 0,
      approximations: {},
      physxSchemas: {},
    },
    timeSampled: 0,
  };
  const byPath = new Map<string, Prim>();
  const textureChecks: Promise<boolean>[] = [];
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  let boundsOk = true;
  const valueless = { n: 0 };

  const walk = (p: Prim, parent: Mat | undefined): void => {
    byPath.set(p.path, p);
    if (p.path !== "/") {
      out.prims++;
    }
    if (p.path === `/${defaultPrim}`) {
      out.stage.defaultPrimKind =
        typeof p.fields.get("kind") === "string"
          ? (p.fields.get("kind") as string)
          : "unset";
    }
    if (p.typeName) {
      bump(out.typeNames, p.typeName);
    }
    for (const a of p.apiSchemas) {
      bump(out.apiSchemas, a);
      if (a.startsWith("PhysxSchema") || a.startsWith("Physx")) {
        bump(out.physics.physxSchemas, a);
      }
    }
    const local = parent && localMatrix(p, stage, valueless);
    const world = parent && local ? mul(parent, local) : undefined;
    if (p.path !== "/" && !world) {
      boundsOk = false;
    }

    // Semantics: SemanticsLabelsAPI:<taxonomy> with semantics:labels:<taxonomy>.
    let hasLabels = false;
    let hasLegacy = false;
    for (const [name, prop] of p.props) {
      if (prop.timeSamples) {
        out.timeSampled++;
      }
      const m = /^semantics:labels:(.+)$/.exec(name);
      if (m && Array.isArray(prop.value)) {
        hasLabels = true;
        addLabels(
          out.semantics.labelsApiTaxonomies,
          m[1]!,
          (prop.value as Value[]).map(String),
        );
      }
      // Isaac's SemanticsAPI: semantic:<instance>:params:semanticType and semanticData.
      const l = /^semantic:(.+):params:semanticType$/.exec(name);
      if (l) {
        hasLegacy = true;
        const data = p.props.get(`semantic:${l[1]}:params:semanticData`)?.value;
        addLabels(
          out.semantics.legacyTypes,
          String(prop.value),
          data === undefined ? [] : [String(data)],
        );
      }
    }
    if (
      hasLabels ||
      p.apiSchemas.some((a) => a.startsWith("SemanticsLabelsAPI"))
    ) {
      out.semantics.labelsApi++;
    }
    if (hasLegacy || p.apiSchemas.some((a) => a.startsWith("SemanticsAPI"))) {
      out.semantics.legacyApi++;
    }

    // Materials and shaders.
    if (p.typeName === "Material") {
      out.materials.materials++;
    }
    if (p.props.get("material:binding")?.targets.length) {
      out.materials.bound++;
    }
    if (p.typeName === "Shader") {
      const id = p.props.get("info:id")?.value;
      const mdl = p.props.get("info:mdl:sourceAsset")?.value;
      if (typeof id === "string") {
        bump(out.materials.shaderIds, id);
      }
      if (typeof mdl === "string") {
        bump(out.materials.shaderIds, "(MDL)");
        const sub = p.props.get("info:mdl:sourceAsset:subIdentifier")?.value;
        const label = `${mdl.split("/").pop()}${typeof sub === "string" ? `::${sub}` : ""}`;
        if (
          !out.materials.mdlModules.includes(label) &&
          out.materials.mdlModules.length < 16
        ) {
          out.materials.mdlModules.push(label);
        }
      }
    }
    for (const [, prop] of p.props) {
      if (
        prop.typeName === "asset" &&
        typeof prop.value === "string" &&
        /\.(png|jpe?g|exr|hdr|tga|tiff?|ktx2?|dds)$/i.test(prop.value)
      ) {
        out.materials.textures++;
        const r = resolveAsset(stage.anchor(prop.layer), prop.value);
        textureChecks.push(r ? io.exists(r) : Promise.resolve(false));
      }
    }

    // Geometry.
    if (p.typeName === "Mesh") {
      out.geometry.meshes++;
      const pts = p.props.get("points")?.value;
      const counts = p.props.get("faceVertexCounts")?.value;
      if (isArray(pts)) {
        out.geometry.points += pts.data.length / 3;
        if (world) {
          const d = pts.data;
          for (let i = 0; i + 2 < d.length; i += 3) {
            for (let k = 0; k < 3; k++) {
              const v =
                world[k]! * d[i]! +
                world[4 + k]! * d[i + 1]! +
                world[8 + k]! * d[i + 2]! +
                world[12 + k]!;
              if (v < lo[k]!) {
                lo[k] = v;
              }
              if (v > hi[k]!) {
                hi[k] = v;
              }
            }
          }
        }
      } else if (pts) {
        out.geometry.undecodedArrays++;
      }
      if (isArray(counts)) {
        for (const c of counts.data) {
          out.geometry.triangles += Math.max(0, c - 2);
          if (c > 4) {
            out.geometry.ngons++;
          }
        }
      } else if (counts) {
        out.geometry.undecodedArrays++;
      }
      const scheme = p.props.get("subdivisionScheme")?.value;
      bump(
        out.geometry.subdivisionSchemes,
        typeof scheme === "string" ? scheme : "catmullClark (unset)",
      );
      if (p.props.has("normals") || p.props.has("primvars:normals")) {
        out.geometry.withNormals++;
      }
      if (
        [...p.props.keys()].some((k) =>
          /^primvars:(st|uv|st0|UVMap|map1)/.test(k),
        )
      ) {
        out.geometry.withUvs++;
      }
    }
    if (p.typeName === "GeomSubset") {
      out.geometry.geomSubsets++;
    }
    if (p.typeName === "PointInstancer") {
      out.geometry.pointInstancers++;
    }
    if (
      ["Cube", "Sphere", "Cylinder", "Capsule", "Cone", "Plane"].includes(
        p.typeName,
      )
    ) {
      bump(out.geometry.implicit, p.typeName);
    }

    // Physics.
    if (p.apiSchemas.includes("PhysicsRigidBodyAPI")) {
      out.physics.rigidBodies++;
    }
    if (p.apiSchemas.includes("PhysicsCollisionAPI")) {
      out.physics.colliders++;
    }
    if (p.apiSchemas.includes("PhysicsMassAPI")) {
      out.physics.massApis++;
    }
    if (p.apiSchemas.includes("PhysicsMaterialAPI")) {
      out.physics.physicsMaterials++;
    }
    if (/Joint$/.test(p.typeName) && p.typeName.startsWith("Physics")) {
      out.physics.joints++;
    }
    const approx = p.props.get("physics:approximation")?.value;
    if (typeof approx === "string") {
      bump(out.physics.approximations, approx);
    }

    for (const c of p.children) {
      walk(c, world);
    }
  };
  walk(root, IDENTITY);

  // Second pass: which materials have which surfaces.
  for (const p of byPath.values()) {
    if (p.typeName !== "Material") {
      continue;
    }
    const shaderOf = (output: string): Prim | undefined => {
      const t = p.props.get(output)?.targets[0];
      return t ? byPath.get(t.slice(0, t.lastIndexOf("."))) : undefined;
    };
    const surface = shaderOf("outputs:surface");
    const surfaceId = surface?.props.get("info:id")?.value;
    const preview = surfaceId === "UsdPreviewSurface";
    const mtlx =
      (typeof surfaceId === "string" && surfaceId.startsWith("ND_")) ||
      !!shaderOf("outputs:mtlx:surface");
    const mdl =
      !!shaderOf("outputs:mdl:surface") ||
      !!surface?.props.get("info:mdl:sourceAsset");
    if (preview) {
      out.materials.previewSurface++;
    }
    if (mtlx) {
      out.materials.materialX++;
    }
    if (mdl) {
      out.materials.mdl++;
    }
    if (mdl && preview) {
      out.materials.mdlWithPreview++;
    }
    if (mdl && !preview && !mtlx) {
      out.materials.mdlOnly++;
    }
  }

  out.geometry.valuelessOps = valueless.n;
  out.materials.texturesFound = (await Promise.all(textureChecks)).filter(
    Boolean,
  ).length;
  if (boundsOk && Number.isFinite(lo[0]!)) {
    const mpu =
      typeof out.stage.metersPerUnit === "number"
        ? out.stage.metersPerUnit
        : 0.01;
    out.geometry.sizeMeters = [0, 1, 2].map((k) =>
      round((hi[k]! - lo[k]!) * mpu),
    ) as [number, number, number];
  }
  return out;
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000;
}
