// Generated from the glTF JSON schemas at:
//   https://github.com/CesiumGS/glTF/tree/c3fa3604e240616d021aca3ebf61d7b61379b986/extensions/2.0/Vendor/BENTLEY_materials_line_style/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace BENTLEY_materials_line_style {
  /**
   * glTF extension that specifies line width and a GPU-friendly dash pattern
   * for CAD-style visualization.
   */
  export interface Material extends Gltf2.Property {
    /**
     * The thickness of the line in screen pixels. Must be greater than 0.
     * Implementations typically render wide lines via tessellated geometry
     * extruded from the line centerline.
     *
     * @default 1
     */
    width?: number;
    /**
     * An unsigned integer whose bits encode a repeating on/off pattern along
     * the line. Bit value 1 indicates a lit (on) segment, and bit value 0
     * indicates an unlit (off) segment. The least significant bit (bit 0)
     * corresponds to the start of the pattern and represents the first segment
     * drawn along the line. The bit pattern repeats cyclically once all
     * supported bits have been consumed. If a pattern uses fewer bits than the
     * maximum supported width, unused higher bits MUST be set to zero. For
     * example, a value of 0xFFFF produces a solid line, and a value of 0xAAAA
     * produces a dotted line.
     *
     * @default 65535
     */
    pattern?: number;
  }
  export namespace Mesh {
    /**
     * Indicates that a mesh primitive supplies the BENTLEY_materials_line_style
     * cumulative distance attribute semantic.
     */
    export interface Primitive extends Gltf2.Property {}
  }
}
