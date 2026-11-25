// Generated from the glTF JSON schemas at:
//   https://github.com/CesiumGS/glTF/tree/e68efc9086f60743c331a2c757a1ffadcdb5d532/extensions/2.1/Vendor/EXT_geospatial_crs/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/**
 * This extension declares the Coordinate Reference System (CRS) in which a glTF
 * 2.1 asset was authored.
 *
 * @internal
 */
export interface EXT_geospatial_crs extends Gltf2.Property {
  /**
   * The coordinate reference system format, whose value must be defined by
   * additional extensions.
   */
  format: string;
}
