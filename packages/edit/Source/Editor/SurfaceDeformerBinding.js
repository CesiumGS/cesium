// @ts-check

import {
  AttributeType,
  ComponentDatatype,
  Matrix4,
  destroyObject,
} from "@cesium/core";
import { GeometryAttributeDescriptor, UniformType } from "@cesium/engine";

/** @import { Buffer, DataTexture, DeformerBinding } from "@cesium/engine"; */

/**
 * A deformable's binding to a {@link SurfaceDeformer}'s mesh. Each vertex is
 * stored as its closest triangle's vertex indices, and its coordinates in that
 * triangle's frame.
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

  /**
   * @param {object} options
   * @param {Buffer} options.vertexBuffer The bound vertices, interleaved in {@link SurfaceDeformerBinding#vertexAttributes} order. The binding owns it.
   * @param {DataTexture} options.positionTexture The mesh's vertex positions.
   * @param {DataTexture} options.restPositionTexture The mesh's vertex positions when bound. The binding owns it.
   * @param {Matrix4} options.bindMatrix The transform from the mesh's local space to the deformable's.
   */
  constructor(options) {
    const { vertexBuffer, positionTexture, restPositionTexture, bindMatrix } =
      options;

    this.#vertexBuffer = vertexBuffer;
    this.#restPositionTexture = restPositionTexture;

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

  get uniforms() {
    return this.#uniforms;
  }

  /**
   * @param {Object<string, string>} names The shader identifiers, by name.
   * @returns {string[]} The lines of the function body.
   */
  getShaderLines(names) {
    const {
      triangle,
      frameCoordinates,
      positions,
      restPositions,
      bindMatrix,
      bindMatrixInverse,
    } = names;
    /**
     * @param {string} texture
     * @param {string} width
     * @param {string} index
     */
    const fetch = (texture, width, index) =>
      `texelFetch(${texture}, ivec2(${index} % ${width}, ${index} / ${width}), 0).xyz`;

    return [
      `ivec3 indices = ivec3(${triangle});`,
      `int width = textureSize(${positions}, 0).x;`,
      `vec3 p0 = ${fetch(positions, "width", "indices.x")};`,
      `vec3 e1 = ${fetch(positions, "width", "indices.y")} - p0;`,
      `vec3 e2 = ${fetch(positions, "width", "indices.z")} - p0;`,
      "vec3 normal = cross(e1, e2);",
      // An edit can collapse the triangle, which has no normal.
      "float normalLength = length(normal);",
      "normal = normalLength > 0.0 ? normal / normalLength : vec3(0.0);",
      `vec3 coordinates = ${frameCoordinates};`,
      "vec3 position = p0 + coordinates.x * e1 + coordinates.y * e2 + coordinates.z * normal;",

      // The local transform maps the triangle's frame when bound to its current frame.
      `int restWidth = textureSize(${restPositions}, 0).x;`,
      `vec3 restP0 = ${fetch(restPositions, "restWidth", "indices.x")};`,
      `vec3 restE1 = ${fetch(restPositions, "restWidth", "indices.y")} - restP0;`,
      `vec3 restE2 = ${fetch(restPositions, "restWidth", "indices.z")} - restP0;`,
      "vec3 restNormal = normalize(cross(restE1, restE2));",
      // The inverse of mat3(restE1, restE2, restNormal), whose rows are cross products of its columns.
      "mat3 restFrameInverse = transpose(mat3(cross(restE2, restNormal), cross(restNormal, restE1), cross(restE1, restE2))) / dot(restE1, cross(restE2, restNormal));",
      "jacobian = normalLength > 0.0",
      `    ? mat3(${bindMatrix}) * mat3(e1, e2, normal) * restFrameInverse * mat3(${bindMatrixInverse})`,
      "    : mat3(1.0);",

      `return (${bindMatrix} * vec4(position, 1.0)).xyz;`,
    ];
  }

  destroy() {
    this.#vertexBuffer.destroy();
    this.#restPositionTexture.destroy();
    return destroyObject(this);
  }
}

export default SurfaceDeformerBinding;
