// @ts-check

import { DeveloperError } from "@cesium/core";
/** @import { Matrix4 } from "@cesium/core"; */
/** @import GeometryReader from "./GeometryReader.js"; */
/** @import GeometryWriter from "./GeometryWriter.js"; */

/**
 * An object that owns geometry: a {@link GeometryReader} and
 * {@link GeometryWriter} for it, and the transform that places the geometry in the scene.
 *
 * @interface
 *
 * @see GeometryReader
 * @see GeometryWriter
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
   * Writes the geometry, in its local space.
   *
   * @type {GeometryWriter}
   * @readonly
   */
  get geometryWriter() {
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
