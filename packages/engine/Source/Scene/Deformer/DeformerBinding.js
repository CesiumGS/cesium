// @ts-check

import destroyObject from "../../Core/destroyObject";
import DeveloperError from "../../Core/DeveloperError";
import Matrix4 from "../../Core/Matrix4.js";
/** @import Context from "../../Renderer/Context"; */
/** @import Buffer from "../../Renderer/Buffer"; */
/** @import Texture from "../../Renderer/Texture"; */

/**
 * @typedef {object} VertexAttributeDescription
 * @property {string} name GLSL identifier (without per-deformer suffix).
 * @property {string} glslType e.g. "vec3".
 * @property {Buffer} buffer
 * @property {number} componentsPerAttribute
 * @property {number} componentDatatype
 * @property {number} offsetInBytes
 * @property {number} strideInBytes
 */

/**
 * @typedef {object} UniformDescription
 * @property {string} name GLSL identifier (without per-deformer suffix).
 * @property {string} glslType e.g. "sampler2D", "mat4".
 * @property {() => any} getValue
 */

/**
 * @typedef {object} ShaderNameMap
 * @property {string} controlPoints Shader identifier of the control-points sampler uniform.
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
   * @param {(result: Matrix4) => Matrix4} getBindMatrix
   */
  constructor(controlPointsTexture, getBindMatrix) {
    if (this.constructor === DeformerBinding) {
      DeveloperError.throwInstantiationError();
    }
    this._controlPointsTexture = controlPointsTexture;
    this._getBindMatrix = getBindMatrix;
    this._scratchBindMatrix = new Matrix4();
  }

  /** @returns {Texture} */
  getControlPointsTexture() {
    return this._controlPointsTexture;
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
   * Body of the per-deformer deformation function. The returned lines form
   * the body of <code>vec3 getDeformedPosition_(in vec3 positionMC)</code>
   * and must end with a <code>return</code> statement. The names map resolves
   * the binding's declared identifiers to their final, suffixed shader names.
   *
   * @param {ShaderNameMap} names
   * @returns {string[]}
   */
  getDeformerGlsl(names) {
    return ["return positionMC;"];
  }

  destroy() {
    return destroyObject(this);
  }
}

export default DeformerBinding;
