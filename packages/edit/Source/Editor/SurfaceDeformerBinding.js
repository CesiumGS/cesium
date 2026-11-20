// @ts-check

import {
  AttributeType,
  AxisAlignedBoundingBox,
  Cartesian3,
  ComponentDatatype,
  Matrix3,
  Matrix4,
  defined,
  destroyObject,
} from "@cesium/core";
import { GeometryAttributeDescriptor, UniformType } from "@cesium/engine";

/** @import { Buffer, DataTexture, Deformer, DeformerBinding } from "@cesium/engine"; */
/** @import { DeformedBoundsCoeffs } from "@cesium/mesh-editor"; */

const scratchHalfExtent = new Cartesian3();
const scratchNormalDistance = new Cartesian3();
const scratchLinear = new Matrix3();

/**
 * A deformable's binding to a {@link SurfaceDeformer}'s mesh. Each vertex is
 * stored as its closest triangle's vertex indices, and its coordinates in that
 * triangle's frame. It moves as the point at those coordinates moves.
 *
 * @implements {DeformerBinding}
 * @private
 */
class SurfaceDeformerBinding {
  static #vertexAttributes = [
    new GeometryAttributeDescriptor({
      semantic: "triangle",
      type: AttributeType.VEC3,
      componentDatatype: ComponentDatatype.FLOAT,
    }),
    new GeometryAttributeDescriptor({
      semantic: "frameCoordinates",
      type: AttributeType.VEC3,
      componentDatatype: ComponentDatatype.FLOAT,
    }),
  ];

  /** @type {Buffer} */
  #vertexBuffer;

  /** @type {DataTexture} */
  #restPositionTexture;

  /** @type {Object<string, {type: UniformType, value: function(): *}>} */
  #uniforms;

  /** @type {Matrix4} */
  #bindMatrix;

  /** @type {DeformedBoundsCoeffs} */
  #boundsCoefficients;

  #restDisplacementBoundingBox = new AxisAlignedBoundingBox();

  /** @type {Deformer} */
  #deformer;

  /**
   * @param {object} options
   * @param {Deformer} options.deformer The deformer that created the binding.
   * @param {Buffer} options.vertexBuffer The bound vertices, interleaved in {@link SurfaceDeformerBinding#vertexAttributes} order. The binding owns it.
   * @param {DataTexture} options.positionTexture The mesh's vertex positions.
   * @param {DataTexture} options.restPositionTexture The mesh's vertex positions when bound. The binding owns it.
   * @param {Matrix4} options.bindMatrix The transform from the mesh's local space to the deformable's.
   * @param {DeformedBoundsCoeffs} options.boundsCoefficients How far deformed vertices can lie outside the mesh's bounds.
   */
  constructor(options) {
    const {
      deformer,
      vertexBuffer,
      positionTexture,
      restPositionTexture,
      bindMatrix,
      boundsCoefficients,
    } = options;

    this.#deformer = deformer;
    this.#vertexBuffer = vertexBuffer;
    this.#restPositionTexture = restPositionTexture;
    this.#bindMatrix = bindMatrix;
    this.#boundsCoefficients = boundsCoefficients;

    const bindMatrixInverse = Matrix4.inverse(bindMatrix, new Matrix4());
    this.#uniforms = {
      positions: {
        type: UniformType.SAMPLER_2D,
        value: () => positionTexture.texture,
      },
      restPositions: {
        type: UniformType.SAMPLER_2D,
        value: () => restPositionTexture.texture,
      },
      bindMatrix: { type: UniformType.MAT4, value: () => bindMatrix },
      bindMatrixInverse: {
        type: UniformType.MAT4,
        value: () => bindMatrixInverse,
      },
    };
  }

  get vertexAttributes() {
    return SurfaceDeformerBinding.#vertexAttributes;
  }

  get vertexBuffer() {
    return this.#vertexBuffer;
  }

  /**
   * The mesh's vertex positions when bound.
   *
   * @type {DataTexture}
   * @readonly
   */
  get restPositionTexture() {
    return this.#restPositionTexture;
  }

  /**
   * The transform from the mesh's local space to the deformable's.
   *
   * @type {Matrix4}
   * @readonly
   */
  get bindMatrix() {
    return this.#bindMatrix;
  }

  get uniforms() {
    return this.#uniforms;
  }

  /**
   * @param {Object<string, string>} names The shader identifiers, by name.
   * @returns {string[]} The lines of the function body.
   */
  getShaderLines(names) {
    return this.#deformer._getShaderLines(names);
  }

  get deformedBoundingBoxChanged() {
    return this.#deformer._boundsChanged;
  }

  /**
   * @param {AxisAlignedBoundingBox} result The object in which to store the result.
   * @returns {AxisAlignedBoundingBox|undefined} The box, or undefined if the mesh's bounds aren't known.
   */
  computeDeformedBoundingBox(result) {
    const bounds = this.#deformer._bounds;
    if (!defined(bounds)) {
      return undefined;
    }

    // Deformed vertices lie at most maxOvershoot * extent + maxNormalDistance
    // outside the mesh's bounds, on each axis.
    const { maxOvershoot, maxNormalDistance } = this.#boundsCoefficients;
    const extent = Cartesian3.subtract(
      bounds.maximum,
      bounds.minimum,
      scratchHalfExtent,
    );

    const halfExtent = Cartesian3.add(
      Cartesian3.multiplyByScalar(extent, 0.5 + maxOvershoot, extent),
      Cartesian3.fromElements(
        maxNormalDistance,
        maxNormalDistance,
        maxNormalDistance,
        scratchNormalDistance,
      ),
      extent,
    );

    // Bound the box in the deformable's space: its center moves with the bind
    // matrix, and its half extent grows by the matrix's absolute linear part.
    const bindMatrix = this.#bindMatrix;
    const center = Matrix4.multiplyByPoint(
      bindMatrix,
      bounds.center,
      result.center,
    );

    const linear = Matrix3.abs(
      Matrix4.getMatrix3(bindMatrix, scratchLinear),
      scratchLinear,
    );

    Matrix3.multiplyByVector(linear, halfExtent, halfExtent);
    Cartesian3.subtract(center, halfExtent, result.minimum);
    Cartesian3.add(center, halfExtent, result.maximum);

    // The mesh's bounds don't include how far the rest positions moved since binding.
    const { minimum, maximum } = this.#restDisplacementBoundingBox;
    Cartesian3.add(result.minimum, minimum, result.minimum);
    Cartesian3.add(result.maximum, maximum, result.maximum);
    Cartesian3.midpoint(result.minimum, result.maximum, result.center);
    return result;
  }

  /**
   * @param {AxisAlignedBoundingBox} displacementBoundingBox A bounding box containing each vertex's displacement.
   */
  addRestDisplacement(displacementBoundingBox) {
    const { minimum, maximum } = this.#restDisplacementBoundingBox;
    Cartesian3.add(minimum, displacementBoundingBox.minimum, minimum);
    Cartesian3.add(maximum, displacementBoundingBox.maximum, maximum);
  }

  destroy() {
    this.#vertexBuffer.destroy();
    this.#restPositionTexture.destroy();
    return destroyObject(this);
  }
}

export default SurfaceDeformerBinding;
