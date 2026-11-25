// Generated from the glTF JSON schemas at:
//   https://github.com/KhronosGroup/glTF/tree/da88a3bbbe168cc728eddf71fa5e1915cc2c0629/extensions/2.0/Khronos/KHR_gaussian_splatting/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { KHR_gaussian_splatting_compression_spz_2 } from "./KHR_gaussian_splatting_compression_spz_2.js";
import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace KHR_gaussian_splatting {
  export namespace Mesh {
    /**
     * Data defining a 3D Gaussian Splat primitive.
     */
    export interface Primitive extends Gltf2.Property {
      /**
       * The kernel used to generate the Gaussians.
       *
       * Allowed values:
       *
       * - `"ellipse"`
       */
      kernel: string;
      /**
       * The color space of the reconstructed color values.
       *
       * Allowed values:
       *
       * - `"srgb_rec709_display"`
       * - `"lin_rec709_display"`
       */
      colorSpace: string;
      /**
       * The projection method for rendering the Gaussians.
       *
       * Allowed values:
       *
       * - `"perspective"`
       *
       * @default "perspective"
       */
      projection?: string;
      /**
       * The sorting method for rendering the Gaussians.
       *
       * Allowed values:
       *
       * - `"cameraDistance"`
       *
       * @default "cameraDistance"
       */
      sortingMethod?: string;
      /**
       * JSON object with extension objects. Property names correspond to glTF
       * extension names and property values are extension-specific objects.
       */
      extensions?: KHR_gaussian_splatting.Mesh.Primitive.Extensions;
    }
    export namespace Primitive {
      export interface Extensions extends Gltf2.Property.Extensions {
        /**
         * Compressed data for SPZ v2 primitive.
         */
        KHR_gaussian_splatting_compression_spz_2?: KHR_gaussian_splatting_compression_spz_2.Mesh.Primitive;
      }
    }
  }
}
