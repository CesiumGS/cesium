// A compiled route as a pipeline variant (plan 2026-11-12, task 4b): the WGSL
// the compiler made for a route shape (`compileRoute`) with the glue that
// reads a draw's block in the placements buffer and calls its
// `tgRoute(pLocal, c, u, &j)`. The unit defines `routeVertex`, which the
// surface shaders call (surfaceBoundary.slang) for a draw whose placement
// block holds a `WARP_ROUTE` term; the pipelines made from it (ShaderCache,
// keyed by the route's `key`) draw such draws and no others: a batch's key
// has the variant's `id` (scene/world/draws.ts).
//
// A routed draw's block, in rows of the placements buffer (`at` its first):
//   at       [1, 0, 0, 0]              one term (the buffer's header)
//   at + 1   [ROUTE_KIND, 1.0f, ROUTE_BODY, pointer row]   the term's row
//   at + 2,3 zero                      (its weight factors: none)
//   at + 4   [centre xyz, 0]           the draw's centre in model space
//   at + 5…7 the model-to-anchor linear part L, one column a row, xyz
//   at + 8…  `DrawCentre` (`perDrawLayout.floats / 4` rows), from `centreRow`
// The route's per-view uniforms (`RouteUniforms`) are blocks of their own,
// one for each view the route differs in (its matrices to the view's root,
// its parameters' values in the view): `ROUTE_POINTER_ROWS` rows at the
// pointer row hold, by view id (the position of the view's bit), the first
// row of that view's block. The eye in them is the view's, replaced in the
// shader (`routeEyeHi`, `routeEyeLo`).
import type { CompiledRoute } from "../transform/compile.ts";
import { wgslUnit, type ShaderUnit } from "../shaders/link/unit.ts";

/** The term kind of a compiled route (placement.slang `WARP_ROUTE`). */
export const ROUTE_KIND = 3;
/** Rows from a block's header to its body: the header and one term's three. */
export const ROUTE_BODY = 4;
/** Rows of a draw's own data before its `DrawCentre`: the centre and L's three columns. */
export const ROUTE_OWN_ROWS = 4;
/** Rows of a route's pointer table: a u32 for each of 32 view ids. */
export const ROUTE_POINTER_ROWS = 8;

export interface RouteVariant {
  /** A number for the variant, for batch keys and ordering. */
  readonly id: number;
  /** The compiled route's `key`: what pipelines are made for. */
  readonly key: string;
  readonly label: string;
  /** The unit that defines `routeVertex`. */
  readonly unit: ShaderUnit;
  /** The same without the Jacobian (`CompiledRoute.positionWgsl`), for the passes that draw positions only. */
  readonly positionUnit: ShaderUnit;
  readonly compiled: CompiledRoute;
}

/** Rows of a draw's block: the header, the term, the draw's data and its `DrawCentre`. */
export function routeBlockRows(compiled: CompiledRoute): number {
  return ROUTE_BODY + ROUTE_OWN_ROWS + compiled.perDrawLayout.floats / 4;
}

/** The row a draw's `DrawCentre` starts at, for its block at `at`. */
export function routeCentreRow(at: number): number {
  return at + ROUTE_BODY + ROUTE_OWN_ROWS;
}

const variants = new Map<string, RouteVariant>();
let count = 0;

/** The variant of a compiled route, made once for its key. */
export function routeVariantOf(compiled: CompiledRoute): RouteVariant {
  let variant = variants.get(compiled.key);
  if (!variant) {
    const id = ++count;
    variant = {
      id,
      key: compiled.key,
      label: `route ${id}`,
      unit: wgslUnit(`route ${id}`, routeUnitWgsl(compiled)),
      positionUnit: wgslUnit(
        `route ${id} positions`,
        routeUnitWgsl(compiled, true),
      ),
      compiled,
    };
    variants.set(compiled.key, variant);
  }
  return variant;
}

/** The unit's WGSL: the compiler's module (`positions`: without its Jacobian) and the glue. */
export function routeUnitWgsl(
  compiled: CompiledRoute,
  positions = false,
): string {
  const uniformRows = compiled.uniformsLayout.floats / 4;
  const centreRows = compiled.perDrawLayout.floats / 4;
  const { eyeHi, eyeLo } = compiled.uniformsLayout.fields;
  if (eyeHi === undefined || eyeLo === undefined) {
    throw new Error("routeUnitWgsl: the compiled route has no eye fields");
  }
  const loads = (target: string, count: number, row: string) =>
    Array.from(
      { length: count },
      (_, i) =>
        `  ${target}.v${i} = routeRow(${row}${i === 0 ? "" : ` + ${i}u`});`,
    );
  return [
    positions ? compiled.positionWgsl : compiled.wgsl,
    `fn tgLoadUniforms(row: u32) -> RouteUniforms {`,
    `  var u: RouteUniforms;`,
    ...loads("u", uniformRows, "row"),
    // The eye is the view's: the uniforms' own are for the CPU path.
    `  u.v${eyeHi >> 2} = vec4f(routeEyeHi(), 0.0);`,
    `  u.v${eyeLo >> 2} = vec4f(routeEyeLo(), 0.0);`,
    `  return u;`,
    `}`,
    ``,
    `fn tgLoadCentre(row: u32) -> DrawCentre {`,
    `  var c: DrawCentre;`,
    ...loads("c", centreRows, "row"),
    `  return c;`,
    `}`,
    ``,
    `fn tgInverse3(m: mat3x3f) -> mat3x3f {`,
    `  let a = cross(m[1], m[2]);`,
    `  let b = cross(m[2], m[0]);`,
    `  let c = cross(m[0], m[1]);`,
    `  return transpose(mat3x3f(a, b, c)) * (1.0 / dot(m[0], a));`,
    `}`,
    ``,
    `// The route's vertex: its block's data, the route evaluated at the draw's centre plus the offset, the shading axes.`,
    `fn routeVertex(placement: u32, position: vec3f, truePosition: vec3f, m0: vec3f, m1: vec3f, m2: vec3f) -> RoutedVertex {`,
    `  var out: RoutedVertex;`,
    `  let term = bitcast<vec4u>(routeRow(placement + 1u));`,
    `  if ((term.x & 255u) != ${ROUTE_KIND}u) {`,
    `    return out;`,
    `  }`,
    `  let body = placement + term.z;`,
    `  let centre = routeRow(body).xyz;`,
    `  let l = mat3x3f(routeRow(body + 1u).xyz, routeRow(body + 2u).xyz, routeRow(body + 3u).xyz);`,
    `  let viewId = countTrailingZeros(routeViewBit());`,
    `  let pointer = bitcast<vec4u>(routeRow(term.w + viewId / 4u));`,
    `  let u = tgLoadUniforms(pointer[viewId % 4u]);`,
    `  let c = tgLoadCentre(body + ${ROUTE_OWN_ROWS}u);`,
    `  var j: mat3x3f;`,
    `  let relative = tgRoute(l * (position - centre), c, u, &j);`,
    `  let axes = transpose(mat3x3f(routeAxisRow(0u), routeAxisRow(1u), routeAxisRow(2u)));`,
    `  let world = axes * relative;`,
    `  let inverse = tgInverse3(mat3x3f(m0, m1, m2));`,
    `  let model = inverse * (axes * j * l);`,
    `  out.routed = true;`,
    `  out.position = world;`,
    `  out.displacement = inverse * (world - truePosition);`,
    `  out.jx = model[0];`,
    `  out.jy = model[1];`,
    `  out.jz = model[2];`,
    `  return out;`,
    `}`,
  ].join("\n");
}
