// What a composed USD stage holds, counted the same way for every reader
// (CS-900). Each reader's adapter turns its own composed stage into plain
// prim records; `stageFacts` counts what CS-802's answer B needs from them,
// and `coverage` compares a reader's facts with a reference reader's.
// Browser and Node alike: no imports. Spike code for CS-900; not part of
// @cesium/next.

/** One authored attribute, cut to what the facts need. */
export interface AttrRecord {
  /** The value type's name: "int[]", "token", "point3f[]". */
  readonly type: string;
  /** Elements in an array value. */
  readonly count?: number;
  /** The sum of an integer array's elements (faceVertexCounts). */
  readonly sum?: number;
  /** A scalar's value, or a short token array's. */
  readonly value?: string | number | boolean | readonly string[];
  /** Whether it has an authored connection. */
  readonly connection?: boolean;
}

/** One composed prim, as a reader's adapter reports it. */
export interface PrimRecord {
  readonly path: string;
  readonly typeName: string;
  readonly apiSchemas: readonly string[];
  readonly attrs: Readonly<Record<string, AttrRecord>>;
  /** Relationship targets, in the stage's namespace. */
  readonly rels: Readonly<Record<string, readonly string[]>>;
}

/** One reader's composed stage, as plain records. */
export interface StageRecord {
  readonly upAxis: string | null;
  readonly metersPerUnit: number | null;
  readonly defaultPrim: string | null;
  readonly prims: readonly PrimRecord[];
  /** What the reader reported while composing: missing layers and the like. */
  readonly errors: readonly string[];
}

/** What a stage holds, as CS-802's answer B needs it. */
export interface StageFacts {
  upAxis: string | null;
  metersPerUnit: number | null;
  defaultPrim: string | null;
  prims: number;
  meshes: number;
  triangles: number;
  meshesWithNormals: number;
  meshesWithExtent: number;
  meshesWithUvs: number;
  materials: number;
  previewSurfaces: number;
  textures: number;
  boundMeshes: number;
  labeledPrims: number;
  /** "taxonomy=label", sorted and unique. */
  labels: string[];
  legacyLabeledPrims: number;
  rigidBodies: number;
  colliders: number;
  massApis: number;
  joints: number;
  physicsMaterials: number;
}

export type FactName = keyof StageFacts;

/**
 * The checks for each of CS-802 B's features: Robotics-Prop 5.0.0's visual
 * features and UsdPhysics. Each check is a fact a reader must get right.
 */
export const FEATURES: Readonly<Record<string, readonly FactName[]>> = {
  "FET001 (minimal placeable visual)": [
    "upAxis",
    "metersPerUnit",
    "defaultPrim",
    "prims",
    "meshes",
    "triangles",
    "meshesWithNormals",
    "meshesWithExtent",
  ],
  "FET006 (UsdPreviewSurface materials)": [
    "materials",
    "previewSurfaces",
    "textures",
    "meshesWithUvs",
  ],
  "FET009 (material coverage)": ["boundMeshes"],
  "FET011 (semantic labels)": ["labeledPrims", "labels", "legacyLabeledPrims"],
  UsdPhysics: [
    "rigidBodies",
    "colliders",
    "massApis",
    "joints",
    "physicsMaterials",
  ],
};

const count = (a: AttrRecord | undefined): number => a?.count ?? 0;

const parentOf = (path: string): string | undefined => {
  const at = path.lastIndexOf("/");
  return at <= 0 ? undefined : path.slice(0, at);
};

/** Counts what CS-802 B needs from one reader's records. */
export function stageFacts(stage: StageRecord): StageFacts {
  const byPath = new Map(stage.prims.map((p) => [p.path, p]));
  const has = (p: PrimRecord, schema: string): boolean =>
    p.apiSchemas.includes(schema);
  const hasPrefix = (p: PrimRecord, prefix: string): boolean =>
    p.apiSchemas.some((s) => s.startsWith(prefix));
  const shaderId = (p: PrimRecord): unknown =>
    p.typeName === "Shader" ? p.attrs["info:id"]?.value : undefined;
  /** The nearest binding, on the prim or an ancestor, to a Material prim that exists. */
  const bound = (path: string): boolean => {
    for (let at: string | undefined = path; at; at = parentOf(at)) {
      const targets = byPath.get(at)?.rels["material:binding"];
      if (targets && targets.length > 0) {
        return byPath.get(targets[0]!)?.typeName === "Material";
      }
    }
    return false;
  };
  const meshes = stage.prims.filter((p) => p.typeName === "Mesh");
  const labels = new Set<string>();
  for (const p of stage.prims) {
    for (const s of p.apiSchemas) {
      if (!s.startsWith("SemanticsLabelsAPI:")) {
        continue;
      }
      const taxonomy = s.slice("SemanticsLabelsAPI:".length);
      const value = p.attrs[`semantics:labels:${taxonomy}`]?.value;
      if (Array.isArray(value)) {
        for (const label of value as readonly string[]) {
          labels.add(`${taxonomy}=${label}`);
        }
      }
    }
  }
  return {
    upAxis: stage.upAxis,
    metersPerUnit: stage.metersPerUnit,
    defaultPrim: stage.defaultPrim,
    prims: stage.prims.length,
    meshes: meshes.length,
    triangles: meshes.reduce((n, m) => {
      const counts = m.attrs["faceVertexCounts"];
      return n + ((counts?.sum ?? 0) - 2 * (counts?.count ?? 0));
    }, 0),
    meshesWithNormals: meshes.filter(
      (m) => count(m.attrs["primvars:normals"]) + count(m.attrs["normals"]) > 0,
    ).length,
    meshesWithExtent: meshes.filter((m) => count(m.attrs["extent"]) === 2)
      .length,
    meshesWithUvs: meshes.filter((m) => count(m.attrs["primvars:st"]) > 0)
      .length,
    materials: stage.prims.filter((p) => p.typeName === "Material").length,
    previewSurfaces: stage.prims.filter(
      (p) => shaderId(p) === "UsdPreviewSurface",
    ).length,
    textures: stage.prims.filter(
      (p) =>
        shaderId(p) === "UsdUVTexture" &&
        typeof p.attrs["inputs:file"]?.value === "string",
    ).length,
    boundMeshes: meshes.filter((m) => bound(m.path)).length,
    labeledPrims: stage.prims.filter((p) => hasPrefix(p, "SemanticsLabelsAPI:"))
      .length,
    labels: [...labels].sort(),
    legacyLabeledPrims: stage.prims.filter((p) => hasPrefix(p, "SemanticsAPI:"))
      .length,
    rigidBodies: stage.prims.filter((p) => has(p, "PhysicsRigidBodyAPI"))
      .length,
    colliders: stage.prims.filter((p) => has(p, "PhysicsCollisionAPI")).length,
    massApis: stage.prims.filter((p) => has(p, "PhysicsMassAPI")).length,
    joints: stage.prims.filter(
      (p) => p.typeName.startsWith("Physics") && p.typeName.endsWith("Joint"),
    ).length,
    physicsMaterials: stage.prims.filter((p) => has(p, "PhysicsMaterialAPI"))
      .length,
  };
}

/** A check where a reader's fact and the reference's differ. */
export interface Mismatch {
  readonly sample: string;
  readonly fact: FactName;
  readonly got: unknown;
  readonly want: unknown;
}

/**
 * How many of a feature's checks a reader got right, over every sample.
 * A check where the reference's value is empty (null, 0, "" or no entries)
 * is "vacuous": a reader that ignores the feature agrees on it. `agree` and
 * `total` count every check; the `nonEmpty` pair counts only the checks that
 * can tell a reader that reads the feature from one that doesn't.
 */
export interface FeatureCoverage {
  readonly feature: string;
  readonly agree: number;
  readonly total: number;
  /** Checks where the reference's value isn't empty. */
  readonly nonEmpty: number;
  /** Of those, the ones the reader got right. */
  readonly nonEmptyAgree: number;
  readonly mismatches: readonly Mismatch[];
}

const same = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

/** Whether a fact's value says "none": null, 0, an empty string or list. */
export const isEmptyFact = (v: unknown): boolean =>
  v === null ||
  v === undefined ||
  v === 0 ||
  v === "" ||
  (Array.isArray(v) && v.length === 0);

/**
 * A reader's facts against the reference's, sample by sample. A sample the
 * reader failed to open (undefined) counts every check as a mismatch; a
 * sample the reference failed to open is left out.
 */
export function coverage(
  candidate: Readonly<Record<string, StageFacts | undefined>>,
  reference: Readonly<Record<string, StageFacts | undefined>>,
): FeatureCoverage[] {
  return Object.entries(FEATURES).map(([feature, facts]) => {
    let agree = 0;
    let total = 0;
    let nonEmpty = 0;
    let nonEmptyAgree = 0;
    const mismatches: Mismatch[] = [];
    for (const [sample, want] of Object.entries(reference)) {
      if (!want) {
        continue;
      }
      const got = candidate[sample];
      for (const fact of facts) {
        total++;
        const informative = !isEmptyFact(want[fact]);
        if (informative) {
          nonEmpty++;
        }
        if (got && same(got[fact], want[fact])) {
          agree++;
          if (informative) {
            nonEmptyAgree++;
          }
        } else {
          mismatches.push({
            sample,
            fact,
            got: got ? got[fact] : "(not opened)",
            want: want[fact],
          });
        }
      }
    }
    return { feature, agree, total, nonEmpty, nonEmptyAgree, mismatches };
  });
}

/**
 * One feature's coverage as text: agreements out of the non-empty checks
 * first, then the vacuous ones apart ("11/12 non-empty; 18/18 empty"). "n/a"
 * when there is no reference to compare with (no checks at all).
 */
export function describeCoverage(c: FeatureCoverage): string {
  if (c.total === 0) {
    return "n/a";
  }
  const empty = c.total - c.nonEmpty;
  const emptyAgree = c.agree - c.nonEmptyAgree;
  const lead =
    c.nonEmpty === 0
      ? "n/a (no non-empty checks)"
      : `${c.nonEmptyAgree}/${c.nonEmpty} non-empty`;
  return empty === 0
    ? lead
    : `${lead}; ${emptyAgree}/${empty} empty (agree trivially)`;
}
