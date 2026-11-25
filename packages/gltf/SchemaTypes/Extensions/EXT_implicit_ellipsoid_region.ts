// Generated from the glTF JSON schemas at:
//   https://github.com/CesiumGS/glTF/tree/e68efc9086f60743c331a2c757a1ffadcdb5d532/extensions/2.0/Vendor/EXT_implicit_ellipsoid_region/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace EXT_implicit_ellipsoid_region {
  export namespace Gltf {
    export namespace KHR_implicit_shapes {
      /**
       * Extension of `KHR_implicit_shapes.shape` to represent an implicit
       * ellipsoid region in a glTF model.
       */
      export interface Shape extends Gltf2.Property {
        /**
         * The radius along the semi-major axis of the reference ellipsoid in
         * meters. Corresponds to the radii along the X and Z axes.
         */
        semiMajorAxisRadius: number;
        /**
         * The radius along the semi-minor axis of the reference ellipsoid in
         * meters. Corresponds to the radius along the Y-axis.
         */
        semiMinorAxisRadius: number;
        /**
         * The minimum height of the region relative to the ellipsoid's surface,
         * in meters. May be negative.
         */
        minHeight: number;
        /**
         * The maximum height of the region relative to the ellipsoid's surface,
         * in meters. May be negative.
         */
        maxHeight: number;
        /**
         * The minimum latitude (a.k.a. polar angle) of the region, in radians.
         * Must be in the range [-pi/2, pi/2].
         *
         * @default -1.57079632679
         */
        minLatitude?: number;
        /**
         * The maximum latitude (a.k.a. polar angle) of the region, in radians.
         * Must be in the range [-pi/2, pi/2].
         *
         * @default 1.57079632679
         */
        maxLatitude?: number;
        /**
         * The minimum longitude (a.k.a. azimuthal angle) of the region, in
         * radians. Must be in the range [-pi, pi].
         *
         * @default -3.14159265359
         */
        minLongitude?: number;
        /**
         * The maximum longitude (a.k.a. azimuthal angle) of the region, in
         * radians. Must be in the range [-pi, pi].
         *
         * @default 3.14159265359
         */
        maxLongitude?: number;
      }
    }
  }
}
