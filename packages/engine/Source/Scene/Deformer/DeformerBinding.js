// @ts-check

import destroyObject from "../../Core/destroyObject";
import DeveloperError from "../../Core/DeveloperError";
/** @import Context from "../../Renderer/Context"; */
/** @import Texture from "../../Renderer/Texture"; */
/** @import Matrix4 from "../../Core/Matrix4.js"; */
/** @import DynamicTexture from "../../Renderer/DynamicTexture.js"; */
/** @import { GlslFunctionDefinition, VertexAttributeDescription, UniformDescription } from "../../Renderer/ShaderBuilder.js"; */

/**
 * @typedef {object} BindMatrix
 * A wrapper around the deformer-space -> deformable-space matrix that owns
 * any subscriptions needed to keep itself fresh. The binding only reads it
 * via {@link BindMatrix.get} and tears it down via {@link BindMatrix.destroy}.
 * @property {() => Matrix4} get Returns the current bind matrix.
 * @property {() => void} destroy Releases any subscriptions the producer set up.
 */

/**
 * @typedef {object} ShaderNameMap
 * @property {string} controlPoints Shader identifier of the control-points sampler uniform.
 * @property {string} indices Shader identifier of the control-point indices sampler uniform.
 * @property {string} bindMatrix Shader identifier of the bind-matrix uniform.
 * @property {Object<string, string>} attributes Declared -> shader attribute identifiers.
 * @property {Object<string, string>} uniforms Declared -> shader uniform identifiers.
 */

/**
 * Per-(deformer, deformable) binding. Declares the GPU resources and GLSL the
 * pipeline stage needs to apply one deformer's effect to one deformable.
 *
 * Every binding exposes the deformer's control-points texture and a bind
 * matrix mapping deformer-local space back into deformable-local space.
 * The pipeline stage wires these up automatically. Subclasses declare any
 * additional attributes and uniforms via {@link DeformerBinding#getVertexAttributes}
 * and {@link DeformerBinding#getUniforms}.
 *
 * @abstract
 */
class DeformerBinding {
  /**
   * The textures are passed as {@link DynamicTexture} wrappers (not raw GPU
   * textures) so that the binding can be created before the owning deformer's
   * GPU resources exist.
   *
   * @param {DynamicTexture} controlPointsTexture
   * @param {DynamicTexture} indicesTexture
   * @param {BindMatrix} bindMatrix Owns the deformer-space -> deformable-space
   *   matrix and its subscription lifecycle. Destroyed with this binding.
   */
  constructor(controlPointsTexture, indicesTexture, bindMatrix) {
    if (this.constructor === DeformerBinding) {
      DeveloperError.throwInstantiationError();
    }
    this._controlPointsTexture = controlPointsTexture;
    this._indicesTexture = indicesTexture;
    this._bindMatrix = bindMatrix;
  }

  /** @returns {Texture | undefined} */
  getControlPointsTexture() {
    return this._controlPointsTexture.texture;
  }

  /** @returns {Texture | undefined} */
  getIndicesTexture() {
    return this._indicesTexture.texture;
  }

  /** @returns {Matrix4} The bind matrix (deformer space -> deformable space). */
  getBindMatrix() {
    return this._bindMatrix.get();
  }

  /**
   * Called on prerender by the owning Deformer with the webgl context.
   * @param {Context} context
   */
  initialize(context) {
    DeveloperError.throwInstantiationError();
  }

  /** @returns {VertexAttributeDescription[]} */
  getVertexAttributes() {
    return [];
  }

  /** @returns {UniformDescription[]} */
  getUniforms() {
    return [];
  }

  /**
   * Returns the GLSL function the renderer should call to compute this
   * binding's deformed model-space position. <code>names</code> resolves the
   * binding's declared inputs to their final (deduped) shader identifiers.
   * The caller is responsible for making the function's name unique within
   * the shader.
   *
   * @param {ShaderNameMap} names
   * @returns {GlslFunctionDefinition}
   */
  getDeformerGlsl(names) {
    const name = "czm_deformerPassthrough";
    return {
      name: name,
      signature: `vec3 ${name}(in vec3 positionMC)`,
      body: ["return positionMC;"],
    };
  }

  destroy() {
    this._bindMatrix.destroy();
    return destroyObject(this);
  }
}

export default DeformerBinding;
