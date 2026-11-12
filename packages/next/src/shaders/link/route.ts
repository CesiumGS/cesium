import type { Boundary } from "./boundary.ts";

/**
 * Between surface.slang and a compiled route's unit (surfaceBoundary.slang
 * `routeVertex`; scene/world/routes.ts): every surface module has one, the
 * engine's own (`NO_ROUTE_WGSL`) or one generated from a route, which reads
 * the draw's block in the placements buffer and puts the vertex where the
 * route does. What surface.slang provides for it is `routeRow` (a row of
 * the placements buffer) and the view's render-space eye and axes.
 */
export const ROUTE_BOUNDARY: Boundary = {
  name: "route",
  requires: [
    {
      name: "routeVertex",
      params: ["u32", "vec3f", "vec3f", "vec3f", "vec3f", "vec3f"],
      result: "RoutedVertex",
    },
  ],
  provides: [
    "RoutedVertex",
    "routeRow",
    "routeEyeHi",
    "routeEyeLo",
    "routeAxisRow",
    "routeViewBit",
  ],
};

/** The engine's own route unit: no draw is routed. */
export const NO_ROUTE_WGSL = `fn routeVertex(placement: u32, position: vec3f, truePosition: vec3f, m0: vec3f, m1: vec3f, m2: vec3f) -> RoutedVertex {
  var none: RoutedVertex;
  return none;
}`;
