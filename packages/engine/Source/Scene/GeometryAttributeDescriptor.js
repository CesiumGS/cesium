// @ts-check

import { Check, DeveloperError, defined } from "@cesium/core";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";

/**
 * Identifies a vertex attribute of a geometry by its semantic and set index,
 * for example <code>TEXCOORD_1</code>, and describes how many values it has
 * per vertex. Two descriptors are equal when their semantic and set index
 * match.
 *
 * <p>
 * The semantic is either a {@link VertexAttributeSemantic} or a custom
 * semantic, such as <code>_TEMPERATURE</code>.
 * </p>
 *
 * @see GeometryReader
 *
 * @example
 * const texCoord1 = new Cesium.GeometryAttributeDescriptor({
 *   semantic: Cesium.VertexAttributeSemantic.TEXCOORD,
 *   setIndex: 1,
 * });
 *
 * const temperature = new Cesium.GeometryAttributeDescriptor({
 *   semantic: "_TEMPERATURE",
 *   componentCount: 1,
 * });
 */
class GeometryAttributeDescriptor {
  #semantic;
  #setIndex;
  #componentCount;

  /**
   * @param {object} options Object with the following properties:
   * @param {VertexAttributeSemantic|string} options.semantic The built-in or custom attribute semantic.
   * @param {number} [options.setIndex] The set index. For built-in semantics that have one, such as {@link VertexAttributeSemantic.TEXCOORD}, this defaults to 0; for other built-in semantics, it's ignored. For custom semantics, leave undefined if the attribute has no set index.
   * @param {number} [options.componentCount] The number of values per vertex. Required for custom semantics. Derived for built-in semantics.
   *
   * @exception {DeveloperError} options.componentCount is required for custom semantics.
   * @exception {DeveloperError} options.componentCount doesn't match the built-in semantic.
   */
  constructor(options) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("options", options);
    Check.typeOf.string("options.semantic", options.semantic);
    if (defined(options.setIndex)) {
      Check.typeOf.number.greaterThanOrEquals(
        "options.setIndex",
        options.setIndex,
        0,
      );
    }
    //>>includeEnd('debug');

    const { semantic, setIndex, componentCount } = options;
    const builtInComponentCount =
      GeometryAttributeDescriptor.#getBuiltInComponentCount(semantic);

    this.#semantic = semantic;

    if (defined(builtInComponentCount)) {
      //>>includeStart('debug', pragmas.debug);
      if (defined(componentCount) && componentCount !== builtInComponentCount) {
        throw new DeveloperError(
          `options.componentCount must be ${builtInComponentCount} for semantic ${semantic}.`,
        );
      }
      //>>includeEnd('debug');

      const hasSetIndex = /** @type {any} */ (
        VertexAttributeSemantic
      ).hasSetIndex(semantic);

      this.#setIndex = hasSetIndex ? (setIndex ?? 0) : undefined;
      this.#componentCount = builtInComponentCount;

      return;
    }

    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number.greaterThan(
      "options.componentCount",
      componentCount,
      0,
    );
    //>>includeEnd('debug');

    this.#setIndex = setIndex;
    this.#componentCount = /** @type {number} */ (componentCount);
  }

  /**
   * The built-in or custom attribute semantic.
   *
   * @type {VertexAttributeSemantic|string}
   * @readonly
   */
  get semantic() {
    return this.#semantic;
  }

  /**
   * The set index, or <code>undefined</code> if the attribute doesn't have one.
   *
   * @type {number|undefined}
   * @readonly
   */
  get setIndex() {
    return this.#setIndex;
  }

  /**
   * The number of values per vertex returned by a {@link GeometryAttributeReader}
   * for this attribute. For example, 3 for positions and 2 for texture coordinates.
   * Colors always have 4 values; RGB colors read with an alpha of 1.
   *
   * @type {number}
   * @readonly
   */
  get componentCount() {
    return this.#componentCount;
  }

  /**
   * Returns <code>true</code> if the other descriptor has the same semantic and
   * set index. The component count isn't compared, since a geometry can't
   * have two attributes with the same semantic and set index.
   *
   * @param {GeometryAttributeDescriptor} [other] The descriptor to compare against.
   * @returns {boolean} <code>true</code> if the descriptors are equal, <code>false</code> otherwise.
   */
  equals(other) {
    return (
      this === other ||
      (defined(other) &&
        this.#semantic === other.semantic &&
        this.#setIndex === other.setIndex)
    );
  }

  /**
   * @param {string} semantic
   * @returns {number|undefined} The component count, or undefined for custom semantics.
   */
  static #getBuiltInComponentCount(semantic) {
    switch (semantic) {
      case VertexAttributeSemantic.FEATURE_ID:
      case VertexAttributeSemantic.CUMULATIVE_DISTANCE:
        return 1;
      case VertexAttributeSemantic.TEXCOORD:
        return 2;
      case VertexAttributeSemantic.POSITION:
      case VertexAttributeSemantic.NORMAL:
      case VertexAttributeSemantic.SCALE:
        return 3;
      case VertexAttributeSemantic.TANGENT:
      case VertexAttributeSemantic.COLOR:
      case VertexAttributeSemantic.JOINTS:
      case VertexAttributeSemantic.WEIGHTS:
      case VertexAttributeSemantic.ROTATION:
        return 4;
    }
    return undefined;
  }
}

export default GeometryAttributeDescriptor;
