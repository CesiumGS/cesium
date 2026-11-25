// Generated from the glTF JSON schemas at:
//   https://github.com/CesiumGS/glTF/tree/c3fa3604e240616d021aca3ebf61d7b61379b986/extensions/2.0/Vendor/BENTLEY_materials_point_style/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace BENTLEY_materials_point_style {
  /**
   * Specifies point diameter for CAD-style visualization.
   */
  export interface Material extends Gltf2.Property {
    /**
     * Diameter of the point in screen pixels. Must be > 0.
     */
    diameter: number;
  }
}
