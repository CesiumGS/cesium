// Generated from the glTF JSON schemas at:
//   https://github.com/CesiumGS/glTF/tree/c3fa3604e240616d021aca3ebf61d7b61379b986/extensions/2.0/Khronos/KHR_implicit_shapes/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { EXT_implicit_cylinder_region } from "./EXT_implicit_cylinder_region.js";
import type { EXT_implicit_ellipsoid_region } from "./EXT_implicit_ellipsoid_region.js";
import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace KHR_implicit_shapes {
  /**
   * Top level implicit shapes.
   */
  export interface Gltf extends Gltf2.Property {
    /**
     * An array of shape descriptions.
     */
    shapes: KHR_implicit_shapes.Gltf.Shape[];
  }
  export namespace Gltf {
    /**
     * Parameters describing an implicit shape.
     */
    export interface Shape extends Gltf2.ChildOfRootProperty {
      /**
       * Specifies the shape type.
       *
       * Allowed values:
       *
       * - `"sphere"`: A sphere with a specified radius, centered at the origin
       *   in local space.
       * - `"box"`: An axis-aligned box with a size per-axis, centered at the
       *   origin in local space
       * - `"capsule"`: A capsule shape, centered at the origin in local space,
       *   equivalent to the convex hull of two spheres located along the Y axis
       *   (in local space) at a specified distance.
       * - `"cylinder"`: A cylinder shape, centered at the origin in local
       *   space, equivalent to the convex hull of two circles in the X/Z plane
       *   positioned along the Y axis at a specified distance.
       */
      type: string;
      /**
       * A set of parameter values that are used to define a sphere shape.
       */
      sphere?: KHR_implicit_shapes.Gltf.Shape.Sphere;
      /**
       * A set of parameter values that are used to define a box shape.
       */
      box?: KHR_implicit_shapes.Gltf.Shape.Box;
      /**
       * A set of parameter values that are used to define a capsule shape.
       */
      capsule?: KHR_implicit_shapes.Gltf.Shape.Capsule;
      /**
       * A set of parameter values that are used to define a cylinder shape.
       */
      cylinder?: KHR_implicit_shapes.Gltf.Shape.Cylinder;
      /**
       * JSON object with extension objects. Property names correspond to glTF
       * extension names and property values are extension-specific objects.
       */
      extensions?: KHR_implicit_shapes.Gltf.Shape.Extensions;
    }
    export namespace Shape {
      /**
       * Parameters describing a box shape.
       */
      export interface Box extends Gltf2.Property {
        /**
         * The extents of the box in each axis in local space.
         *
         * @default [1,1,1]
         */
        size?: [number, number, number];
      }
      /**
       * Parameters describing a capsule shape.
       */
      export interface Capsule extends Gltf2.Property {
        /**
         * The distance between the centers of the two capping spheres of
         * capsule.
         *
         * @default 0.5
         */
        height?: number;
        /**
         * The radius of the sphere located at the bottom of the capsule (i.e.
         * the sphere at the half-height along -Y)
         *
         * @default 0.25
         */
        radiusBottom?: number;
        /**
         * The radius of the sphere located at the top of the capsule (i.e. the
         * sphere at the half-height along +Y)
         *
         * @default 0.25
         */
        radiusTop?: number;
      }
      /**
       * Parameters describing a cylinder shape.
       */
      export interface Cylinder extends Gltf2.Property {
        /**
         * The height of the cylinder, centered along the Y axis.
         *
         * @default 0.5
         */
        height?: number;
        /**
         * The radius of the bottom of the cylinder (the disk located along -Y.)
         *
         * @default 0.25
         */
        radiusBottom?: number;
        /**
         * The radius of the top of the cylinder (the disk located along +Y.)
         *
         * @default 0.25
         */
        radiusTop?: number;
      }
      export interface Extensions extends Gltf2.Property.Extensions {
        /**
         * Extension of `KHR_implicit_shapes.shape` to represent an implicit
         * cylinder region in a glTF model.
         */
        EXT_implicit_cylinder_region?: EXT_implicit_cylinder_region.Gltf.KHR_implicit_shapes.Shape;
        /**
         * Extension of `KHR_implicit_shapes.shape` to represent an implicit
         * ellipsoid region in a glTF model.
         */
        EXT_implicit_ellipsoid_region?: EXT_implicit_ellipsoid_region.Gltf.KHR_implicit_shapes.Shape;
      }
      /**
       * Parameters describing a sphere shape.
       */
      export interface Sphere extends Gltf2.Property {
        /**
         * The radius of the sphere.
         *
         * @default 0.5
         */
        radius?: number;
      }
    }
  }
}
