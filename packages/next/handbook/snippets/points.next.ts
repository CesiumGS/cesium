import type { Viewer } from "../../widgets/index.ts";
declare const viewer: Viewer;
// ---
import { EARTH, Ellipsoid, fromDegrees, PointSource, vec3 } from "@cesium/next";

// There's no Entity. For points, a typed-array
// source, updated on the GPU.
const origin = Ellipsoid.WGS84.cartographicToCartesian(
  fromDegrees(-75.6, 40.0),
  vec3.vec3(0, 0, 0),
);
const points = new PointSource(viewer.engine, viewer.world, {
  capacity: 1,
  origin,
  anchor: viewer.world.bodyAnchor(EARTH),
});
points.count = 1;
// x, y, z from the origin in metres, then heading.
points.update(0, new Float32Array([0, 0, 0, 0]));
