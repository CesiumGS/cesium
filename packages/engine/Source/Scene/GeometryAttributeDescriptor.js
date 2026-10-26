// @ts-check

import { AttributeType, Check, DeveloperError, defined } from "@cesium/core";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";

/**
 * Identifies a vertex attribute of a geometry by its semantic and set index,
 * for example <code>TEXCOORD_1</code>, and describes the type of its values,
 * such as {@link AttributeType.VEC2}. Two descriptors are equal when their
 * semantic and set index match.
 *
 * <p>
 * The semantic is either a {@link VertexAttributeSemantic} or a custom
 * semantic, such as <code>_TEMPERATURE</code>. Custom semantics are
 * identified by their full name and have no set index, so
 * <code>_TEMPERATURE_0</code> and <code>_TEMPERATURE_1</code> are two
 * different semantics.
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
 *   type: Cesium.AttributeType.SCALAR,
 * });
 */
class GeometryAttributeDescriptor {
  #semantic;
  #setIndex;
  #type;

  /**
   * @param {object} options Object with the following properties:
   * @param {VertexAttributeSemantic|string} options.semantic The built-in or custom attribute semantic.
   * @param {number} [options.setIndex] The set index, for built-in semantics that have one, such as {@link VertexAttributeSemantic.TEXCOORD}. Defaults to 0. Ignored for other semantics, including custom semantics.
   * @param {AttributeType} [options.type] The type of the values. Required for custom semantics. Derived for built-in semantics.
   *
   * @exception {DeveloperError} options.type is required for custom semantics.
   * @exception {DeveloperError} options.type doesn't match the built-in semantic.
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

    const { semantic, setIndex, type } = options;
    const builtInType = GeometryAttributeDescriptor.#getBuiltInType(semantic);

    this.#semantic = semantic;
    this.#setIndex = undefined;

    if (defined(builtInType)) {
      //>>includeStart('debug', pragmas.debug);
      if (defined(type) && type !== builtInType) {
        throw new DeveloperError(
          `options.type must be ${builtInType} for semantic ${semantic}.`,
        );
      }
      //>>includeEnd('debug');

      const hasSetIndex = /** @type {any} */ (
        VertexAttributeSemantic
      ).hasSetIndex(semantic);

      this.#setIndex = hasSetIndex ? (setIndex ?? 0) : undefined;
      this.#type = builtInType;

      return;
    }

    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.string("options.type", type);
    //>>includeEnd('debug');

    this.#type = /** @type {AttributeType} */ (type);
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
   * The type of the values returned by a {@link GeometryAttributeReader} for
   * this attribute. For example, {@link AttributeType.VEC3} for positions and
   * {@link AttributeType.VEC2} for texture coordinates. Colors are always
   * {@link AttributeType.VEC4}; RGB colors read with an alpha of 1.
   *
   * @type {AttributeType}
   * @readonly
   */
  get type() {
    return this.#type;
  }

  /**
   * The number of values per vertex returned by a {@link GeometryAttributeReader}
   * for this attribute, derived from {@link GeometryAttributeDescriptor#type}.
   * Matrices are read in column-major order.
   *
   * @type {number}
   * @readonly
   */
  get componentCount() {
    return /** @type {any} */ (AttributeType).getNumberOfComponents(this.#type);
  }

  /**
   * Returns <code>true</code> if the other descriptor has the same semantic and
   * set index. The type isn't compared, since a geometry can't have two
   * attributes with the same semantic and set index.
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
   * @returns {AttributeType|undefined} The type, or undefined for custom semantics.
   * @ignore
   */
  static #getBuiltInType(semantic) {
    switch (semantic) {
      case VertexAttributeSemantic.FEATURE_ID:
      case VertexAttributeSemantic.CUMULATIVE_DISTANCE:
        return AttributeType.SCALAR;
      case VertexAttributeSemantic.TEXCOORD:
        return AttributeType.VEC2;
      case VertexAttributeSemantic.POSITION:
      case VertexAttributeSemantic.NORMAL:
      case VertexAttributeSemantic.SCALE:
        return AttributeType.VEC3;
      case VertexAttributeSemantic.TANGENT:
      case VertexAttributeSemantic.COLOR:
      case VertexAttributeSemantic.JOINTS:
      case VertexAttributeSemantic.WEIGHTS:
      case VertexAttributeSemantic.ROTATION:
        return AttributeType.VEC4;
    }
    return undefined;
  }
}

export default GeometryAttributeDescriptor;
