// @ts-check

import { DeveloperError } from "@cesium/core";
/** @import Buffer from "../Renderer/Buffer.js"; */
/** @import GeometryAttributeDescriptor from "./GeometryAttributeDescriptor.js"; */
/** @import UniformType from "./Model/UniformType.js"; */

/**
 * The GPU resources and shader code that deform one {@link Deformable}. The
 * binding owns its resources, and they must be ready when it's added.
 *
 * @interface
 * @internal
 */
class DeformerBinding {
  constructor() {
    DeveloperError.throwInstantiationError();
  }

  /**
   * The per-vertex inputs used for deformation, tightly interleaved in
   * {@link DeformerBinding#vertexBuffer} in this order. Each has a
   * <code>componentDatatype</code>.
   *
   * @type {GeometryAttributeDescriptor[]}
   * @readonly
   */
  get vertexAttributes() {
    return DeveloperError.throwInstantiationError();
  }

  /**
   * The buffer holding {@link DeformerBinding#vertexAttributes}, or
   * <code>undefined</code> if there are none. Its
   * <code>vertexArrayDestroyable</code> must be <code>false</code>.
   *
   * @type {Buffer|undefined}
   * @readonly
   */
  get vertexBuffer() {
    return DeveloperError.throwInstantiationError();
  }

  /**
   * The uniforms used for deformation, by name.
   *
   * @type {Object<string, {type: UniformType, value: function(): *}>}
   * @readonly
   */
  get uniforms() {
    return DeveloperError.throwInstantiationError();
  }

  /**
   * Gets the body of
   * <code>vec3 f(in vec3 positionMC, out mat3 jacobian)</code>, which returns
   * the deformed position and the deformation's local linear transform at
   * <code>positionMC</code>, used to transform normals and tangents.
   *
   * @param {Object<string, string>} names The shader identifier of each vertex attribute and uniform, by name.
   * @returns {string[]} The lines of the function body.
   */
  getShaderLines(names) {
    return DeveloperError.throwInstantiationError();
  }

  /**
   * Destroys the binding's resources. Remove it from its deformable first.
   */
  destroy() {
    DeveloperError.throwInstantiationError();
  }
}

export default DeformerBinding;
