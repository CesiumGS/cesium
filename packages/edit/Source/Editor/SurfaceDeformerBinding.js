// @ts-check

import { AttributeType, ComponentDatatype, destroyObject } from "@cesium/core";
import { GeometryAttributeDescriptor, UniformType } from "@cesium/engine";

/** @import { Matrix4 } from "@cesium/core"; */
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

  /** @type {Object<string, {type: UniformType, value: function(): *}>} */
  #uniforms;

  /**
   * @param {object} options
   * @param {Buffer} options.vertexBuffer The bound vertices, interleaved in {@link SurfaceDeformerBinding#vertexAttributes} order. The binding owns it.
   * @param {DataTexture} options.positionTexture The mesh's vertex positions.
   * @param {Matrix4} options.bindMatrix The transform from the mesh's local space to the deformable's.
   */
  constructor(options) {
    const { vertexBuffer, positionTexture, bindMatrix } = options;
    this.#vertexBuffer = vertexBuffer;
    this.#uniforms = {
      positions: {
        type: UniformType.SAMPLER_2D,
        value: () => positionTexture.texture,
      },
      bindMatrix: { type: UniformType.MAT4, value: () => bindMatrix },
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
    const { triangle, frameCoordinates, positions, bindMatrix } = names;
    /** @param {string} i */
    const fetchPosition = (i) =>
      `texelFetch(${positions}, ivec2(${i} % width, ${i} / width), 0).xyz`;

    return [
      // TODO: the deformation's local linear transform.
      "jacobian = mat3(1.0);",
      `ivec3 indices = ivec3(${triangle});`,
      `int width = textureSize(${positions}, 0).x;`,
      `vec3 p0 = ${fetchPosition("indices.x")};`,
      `vec3 e1 = ${fetchPosition("indices.y")} - p0;`,
      `vec3 e2 = ${fetchPosition("indices.z")} - p0;`,
      "vec3 normal = cross(e1, e2);",
      // An edit can collapse the triangle, which has no normal.
      "float normalLength = length(normal);",
      "normal = normalLength > 0.0 ? normal / normalLength : vec3(0.0);",
      `vec3 coordinates = ${frameCoordinates};`,
      "vec3 position = p0 + coordinates.x * e1 + coordinates.y * e2 + coordinates.z * normal;",
      `return (${bindMatrix} * vec4(position, 1.0)).xyz;`,
    ];
  }

  destroy() {
    this.#vertexBuffer.destroy();
    return destroyObject(this);
  }
}

export default SurfaceDeformerBinding;
