import {
  brepGeometry,
  meshGeometry,
  type BrepForm,
  type ClipFilter,
  type GeometryQueries,
  type MeshCapSurfaceHit,
  type ModelPlacement,
  type Tileset3D,
} from "@cesium/next";

/** Something a ray can hit: asked for its exact queries when a pick is made (a cap's form changes with its clip). */
export interface PickTarget {
  readonly name: string;
  queries(): GeometryQueries | undefined;
  /** A cap exists because of the clips: only a pick with them can meet it. */
  readonly clippedOnly?: boolean;
  /** Instead of `queries`, a test of its own for the segment from `from` to `to` (the mesh caps' polygons); `keeps` drops a point the clips remove. */
  segmentHit?(
    from: ArrayLike<number>,
    to: ArrayLike<number>,
    keeps: ((point: ArrayLike<number>) => boolean) | undefined,
  ):
    | {
        /** Along the segment, 0 to 1. */
        readonly t: number;
        readonly position: Float64Array;
        readonly entity: string;
        readonly uv: readonly [number, number];
        readonly accuracy: string;
      }
    | undefined;
}

/** The mesh caps of a clip set, hit exactly on their polygons (float64, in the clip's frame). */
export function meshCapTarget(
  name: string,
  caps: (
    from: ArrayLike<number>,
    to: ArrayLike<number>,
    keeps: ((point: ArrayLike<number>) => boolean) | undefined,
  ) => MeshCapSurfaceHit | undefined,
): PickTarget {
  return {
    name,
    clippedOnly: true,
    queries: () => undefined,
    segmentHit(from, to, keeps) {
      const hit = caps(from, to, keeps);
      return (
        hit && {
          t: hit.t,
          position: Float64Array.from(hit.point),
          entity: `element ${hit.feature}, plane ${hit.surface}`,
          uv: hit.uv,
          accuracy:
            "exact (the cap's polygon, on the plane a bias inside the clip's)",
        }
      );
    },
  };
}

/** A b-rep placed by a similarity matrix: its exact queries. */
export function brepTarget(
  name: string,
  form: () => BrepForm | undefined,
  matrix: Float64Array,
  origin: Float64Array,
  clippedOnly = false,
): PickTarget {
  const cache = new WeakMap<BrepForm, GeometryQueries>();
  return {
    name,
    ...(clippedOnly ? { clippedOnly } : {}),
    queries() {
      const f = form();
      if (!f) {
        return undefined;
      }
      let q = cache.get(f);
      if (!q) {
        q = brepGeometry(f, { matrix, origin });
        cache.set(f, q);
      }
      return q;
    },
  };
}

/** A placed model's triangles (loaded with `retainGeometry`), as they stand when first asked. */
export function modelTarget(
  name: string,
  placement: ModelPlacement,
): PickTarget {
  let q: GeometryQueries | undefined;
  return {
    name,
    queries() {
      if (!q) {
        const parts = (placement.geometry() ?? []).map((g) =>
          meshGeometry(g, { note: "the model's mesh (float32 positions)" }),
        );
        q = parts.length > 0 ? union(parts) : undefined;
      }
      return q;
    },
  };
}

/** The triangles a tileset has loaded (it must keep them: `retainGeometry`), one query object per tile's draw. */
export function tilesetTarget(name: string, tileset: Tileset3D): PickTarget {
  const cache = new WeakMap<object, GeometryQueries>();
  return {
    name,
    queries() {
      const parts: GeometryQueries[] = [];
      for (const tile of tileset.state.loaded) {
        for (const g of tile.geometry ?? []) {
          let q = cache.get(g);
          if (!q) {
            q = meshGeometry(g, {
              note: `the tile's mesh (geometric error ${tile.geometricError} m)`,
            });
            cache.set(g, q);
          }
          parts.push(q);
        }
      }
      return parts.length > 0 ? union(parts) : undefined;
    },
  };
}

/** Several geometries as the nearest hit of any. */
function union(parts: readonly GeometryQueries[]): GeometryQueries {
  const first = parts[0]!;
  return {
    kind: first.kind,
    version: 0,
    bounds: () => first.bounds(),
    rayHit(ray, options) {
      let best: ReturnType<GeometryQueries["rayHit"]> | undefined;
      for (const part of parts) {
        const answer = part.rayHit(ray, options);
        if (
          answer.verdict === "hit" &&
          (best?.verdict !== "hit" || answer.hit.t < best.hit.t)
        ) {
          best = answer;
        }
        best ??= answer;
      }
      return best!;
    },
    closestPoint: (p, o) => first.closestPoint(p, o),
    segmentDistance: (a, b, o) => first.segmentDistance(a, b, o),
    entity: (ref) => first.entity(ref),
    display: (t) => first.display(t),
  };
}

/** What a ray found first. */
export interface Found {
  readonly target: string;
  /** From the ray's start, m. */
  readonly distance: number;
  readonly position: Float64Array;
  readonly entity: string;
  readonly uv: readonly [number, number] | undefined;
  readonly accuracy: string;
}

/** The first thing the segment from `from` along `direction` (to `reach` m) meets among `targets`, with `clips` applied or not. */
export function firstHit(
  targets: readonly PickTarget[],
  from: ArrayLike<number>,
  direction: ArrayLike<number>,
  reach: number,
  origin: ArrayLike<number>,
  clips?: ClipFilter,
): Found | undefined {
  const to = [
    from[0]! + direction[0]! * reach,
    from[1]! + direction[1]! * reach,
    from[2]! + direction[2]! * reach,
  ];
  let best: Found | undefined;
  for (const target of targets) {
    if (target.clippedOnly && !clips) {
      continue;
    }
    if (target.segmentHit) {
      const hit = target.segmentHit(from, to, clips && ((p) => clips.keeps(p)));
      const distance = hit && hit.t * reach;
      if (hit && (!best || distance! < best.distance)) {
        best = {
          target: target.name,
          distance: distance!,
          position: hit.position,
          entity: hit.entity,
          uv: [hit.uv[0], hit.uv[1]],
          accuracy: hit.accuracy,
        };
      }
      continue;
    }
    const answer = target
      .queries()
      ?.rayHit({ from, to }, { origin, ...(clips ? { clips } : {}) });
    if (answer?.verdict !== "hit") {
      continue;
    }
    const { hit } = answer;
    const distance = hit.t * reach;
    if (!best || distance < best.distance) {
      best = {
        target: target.name,
        distance,
        position: hit.position,
        entity: `${hit.entity.kind} ${hit.entity.index}`,
        uv: hit.uv,
        accuracy: hit.accuracy.exact
          ? `exact (${hit.accuracy.route ?? hit.accuracy.note})`
          : `within ${hit.accuracy.meters.toPrecision(2)} m (${hit.accuracy.note})`,
      };
    }
  }
  return best;
}
