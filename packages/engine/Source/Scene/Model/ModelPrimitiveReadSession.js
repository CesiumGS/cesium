// @ts-check
// TODO: Remove once the private helpers are implemented.
/* eslint-disable no-unused-private-class-members */

import { DeveloperError } from "@cesium/core";
import GeometryReader from "../GeometryReader.js";

/** @import { TypedArray } from "@cesium/core"; */
/** @import Buffer from "../../Renderer/Buffer.js"; */
/** @import { Attribute, Primitive } from "../ModelComponents.js"; */
/** @import GeometryAttributeDescriptor from "../GeometryAttributeDescriptor.js"; */
/** @import GeometryReadSession, { GeometryAttributeReader } from "../GeometryReadSession.js"; */

/**
 * Maps a primitive index to the positions of its vertices in the index stream.
 *
 * @typedef {object} PrimitiveLayout
 * @property {number} verticesPerPrimitive 1 for points, 2 for lines, 3 for triangles.
 * @property {function(number): number} getPrimitiveCount Gets the primitive count from the index count.
 * @property {function(number, function(number): number, (number[]|TypedArray), number): (number[]|TypedArray)} readPrimitive
 *   Writes a primitive's vertex indices into a result array at an offset, using a function that reads the index stream.
 * @ignore
 */

/**
 * A {@link GeometryReadSession} for a {@link Primitive} of a model.
 *
 * Copies the requested attributes from the GPU once, reading each buffer only
 * once even when attributes are interleaved. Attributes that already have a
 * CPU copy aren't read back. Indices are read on first use.
 *
 * @implements {GeometryReadSession}
 * @private
 */
class ModelPrimitiveReadSession {
  /**
   * Creates a reader for the primitive's geometry.
   *
   * @param {Primitive} primitive The primitive to read.
   * @returns {GeometryReader} The reader.
   */
  static createGeometryReader(primitive) {
    return new GeometryReader({
      availableAttributes: primitive.attributes.map((attribute) =>
        ModelPrimitiveReadSession.#getDescriptor(attribute),
      ),
      createReadSession: (requestedAttributes) =>
        new ModelPrimitiveReadSession(primitive, requestedAttributes),
    });
  }

  /**
   * @param {Primitive} primitive The primitive to read.
   * @param {GeometryAttributeDescriptor[]} requestedAttributes The attributes to stage. All must be available.
   */
  constructor(primitive, requestedAttributes) {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * @returns {number}
   */
  vertexCount() {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * @returns {number}
   */
  primitiveCount() {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * @param {number} primitiveIndex
   * @returns {number}
   */
  primitiveVertexCount(primitiveIndex) {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * @param {number} primitiveIndex
   * @param {number[]|TypedArray} result
   * @param {number} [offset=0]
   * @returns {number[]|TypedArray}
   */
  getPrimitive(primitiveIndex, result, offset) {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * @param {GeometryAttributeDescriptor} descriptor
   * @returns {GeometryAttributeReader}
   */
  vertexAttributeReader(descriptor) {
    throw new DeveloperError("Not implemented.");
  }

  destroy() {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * Gets the descriptor for a model attribute. Custom attributes have no
   * semantic, so their name is split into a semantic and set index, e.g.
   * _TEMPERATURE_0 becomes _TEMPERATURE with set index 0.
   *
   * @param {Attribute} attribute
   * @returns {GeometryAttributeDescriptor}
   */
  static #getDescriptor(attribute) {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * Gets the attribute's bytes, reading its buffer from the GPU if no other
   * requested attribute has already read it.
   *
   * @param {Attribute} attribute
   * @param {Map<Buffer, Uint8Array>} bufferData The buffers read so far in this session.
   * @returns {Uint8Array}
   */
  static #readAttributeBytes(attribute, bufferData) {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * Reads the indices, or returns undefined if the primitive isn't indexed.
   *
   * @param {Primitive} primitive
   * @returns {Uint8Array|Uint16Array|Uint32Array|undefined}
   */
  static #readIndices(primitive) {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * Creates a reader that decodes the attribute's stored components into
   * ready-to-use values. Picks one specialized reader for how the attribute
   * is stored: as is, normalized, quantized, or oct-encoded. Also handles
   * interleaving, and pads RGB colors with an alpha of 1.
   *
   * @param {Attribute} attribute
   * @param {Uint8Array} bytes
   * @returns {GeometryAttributeReader}
   */
  static #createDecodedReader(attribute, bytes) {
    throw new DeveloperError("Not implemented.");
  }

  /**
   * @param {number} primitiveType A {@link PrimitiveType}.
   * @param {number} indexCount The number of indices, or vertices if the primitive isn't indexed.
   * @returns {PrimitiveLayout}
   */
  static #getPrimitiveLayout(primitiveType, indexCount) {
    throw new DeveloperError("Not implemented.");
  }
}

export default ModelPrimitiveReadSession;
