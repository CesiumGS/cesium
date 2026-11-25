// Generated from the glTF JSON schemas at:
//   https://github.com/CesiumGS/glTF/tree/c3fa3604e240616d021aca3ebf61d7b61379b986/extensions/2.0/Vendor/BENTLEY_materials_planar_fill/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace BENTLEY_materials_planar_fill {
  /**
   * Specifies planar fill behavior for CAD-style visualization.
   */
  export interface Material extends Gltf2.Property {
    /**
     * Specifies whether and when the interior fill is displayed in wireframe
     * view mode. 0 = NONE (never drawn), 1 = ALWAYS (always drawn), 2 = TOGGLE
     * (drawn when fill display is enabled).
     *
     * Allowed values:
     *
     * - `0`: NONE - The fill is never drawn in wireframe view.
     * - `1`: ALWAYS - The fill is always drawn in wireframe view.
     * - `2`: TOGGLE - The fill is drawn only if the user or application has
     *   enabled toggleable fill display.
     *
     * @default 0
     */
    wireframeFill?: 0 | 1 | 2;
    /**
     * If true, the fill should be drawn using the view's background color,
     * creating an invisible masking polygon.
     *
     * @default false
     */
    backgroundFill?: boolean;
    /**
     * If true, the fill should be drawn behind other coplanar geometry
     * belonging to the same logical object, useful for mitigating z-fighting
     * with overlaid geometry such as hatch patterns or text.
     *
     * @default false
     */
    behind?: boolean;
  }
}
