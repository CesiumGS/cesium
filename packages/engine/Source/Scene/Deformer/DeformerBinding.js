// @ts-check

import destroyObject from "../../Core/destroyObject";
import DeveloperError from "../../Core/DeveloperError";
import Matrix4 from "../../Core/Matrix4.js";
/** @import Context from "../../Renderer/Context"; */
/** @import Texture from "../../Renderer/Texture"; */
/** @import { GlslFunctionDefinition, VertexAttributeDescription, UniformDescription } from "../../Renderer/ShaderBuilder.js"; */

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
   * @param {Texture} controlPointsTexture
   * @param {Texture} indicesTexture
   * @param {(result: Matrix4) => Matrix4} getBindMatrix
   */
  constructor(controlPointsTexture, indicesTexture, getBindMatrix) {
    if (this.constructor === DeformerBinding) {
      DeveloperError.throwInstantiationError();
    }
    this._controlPointsTexture = controlPointsTexture;
    this._indicesTexture = indicesTexture;
    this._getBindMatrix = getBindMatrix;
    this._scratchBindMatrix = new Matrix4();
  }

  /** @returns {Texture} */
  getControlPointsTexture() {
    return this._controlPointsTexture;
  }

  /** @returns {Texture} */
  getIndicesTexture() {
    return this._indicesTexture;
  }

  /** @returns {Matrix4} The bind matrix (deformer space -> deformable space). */
  getBindMatrix() {
    return this._getBindMatrix(this._scratchBindMatrix);
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
    return destroyObject(this);
  }
}

export default DeformerBinding;
