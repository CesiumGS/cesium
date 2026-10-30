// @ts-check

import { DeveloperError } from "@cesium/core";
/** @import { Matrix4 } from "@cesium/core"; */
/** @import GeometryReader from "./GeometryReader.js"; */

/**
 * An object that owns geometry: a {@link GeometryReader} for its vertices and
 * primitives, and the transform that places them in the scene.
 * <p>
 * Implement it to let code that consumes geometry, such as a mesh editor, read
 * and place any geometry the same way, regardless of which class owns it.
 * </p>
 *
 * @interface
 *
 * @see GeometryReader
 * @see ModelPrimitive
 */
class GeometrySource {
  constructor() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Reads the geometry, in its local space.
   *
   * @type {GeometryReader}
   * @readonly
   */
  get geometryReader() {
    return DeveloperError.throwInstantiationError();
  }

  /**
   * The transform from the geometry's local coordinates to the world (ECEF)
   * coordinates of the scene.
   *
   * @type {Matrix4}
   * @readonly
   */
  get worldMatrix() {
    return DeveloperError.throwInstantiationError();
  }
}

export default GeometrySource;
