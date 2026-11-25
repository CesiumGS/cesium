// Generated from the glTF JSON schemas at:
//   https://github.com/CesiumGS/glTF/tree/e68efc9086f60743c331a2c757a1ffadcdb5d532/extensions/2.0/Vendor/EXT_implicit_cylinder_region/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace EXT_implicit_cylinder_region {
  export namespace Gltf {
    export namespace KHR_implicit_shapes {
      /**
       * Extension of `KHR_implicit_shapes.shape` to represent an implicit
       * cylinder region in a glTF model.
       */
      export interface Shape extends Gltf2.Property {
        /**
         * The inner radius of the cylinder region along the X and Z axes, in
         * meters.
         */
        minRadius: number;
        /**
         * The outer radius of the cylinder region along the X and Z axes, in
         * meters.
         */
        maxRadius: number;
        /**
         * The height of the cylinder in meters along the Y-axis, in meters.
         */
        height: number;
        /**
         * The minimum angle of the cylinder region in radians. In other words,
         * this is the angle where the cylinder region starts. Must be in the
         * range [-pi, pi].
         *
         * @default -3.14159265359
         */
        minAngle?: number;
        /**
         * The maximum angle of the cylinder region in radians. In other words,
         * this is the angle where the cylinder region ends. Must be in the
         * range [-pi, pi].
         *
         * @default 3.14159265359
         */
        maxAngle?: number;
      }
    }
  }
}
