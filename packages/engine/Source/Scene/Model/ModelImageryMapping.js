import defined from "../../Core/defined.js";
import Cartesian2 from "../../Core/Cartesian2.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Matrix4 from "../../Core/Matrix4.js";
import Rectangle from "../../Core/Rectangle.js";
import Cartographic from "../../Core/Cartographic.js";
import BoundingRectangle from "../../Core/BoundingRectangle.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import Check from "../../Core/Check.js";

import AttributeType from "../AttributeType.js";
import ModelReader from "./ModelReader.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";

/**
 * A class for computing the texture coordinates of imagery that is
 * supposed to be mapped on a <code>ModelComponents.Primitive</code>.
 *
 * @private
 */
class ModelImageryMapping {
  /**
   * Creates a typed array that contains texture coordinates for
   * the given <code>MappedPositions</code>, using the given
   * projection.
   *
   * This will be a typed array that contains the texture coordinates
   * that result from projecting the given positions with the given
   * projection, and normalizing them to their bounding rectangle.
   *
   * @param {MappedPositions} mappedPositions The positions
   * @param {MapProjection} projection The projection that should be used
   * @returns {TypedArray} The result
   */
  static createTextureCoordinatesForMappedPositions(
    mappedPositions,
    projection,
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("mappedPositions", mappedPositions);
    Check.defined("projection", projection);
    //>>includeEnd('debug');

    const cartographicPositions = mappedPositions.cartographicPositions;
    const cartographicBoundingRectangle =
      mappedPositions.cartographicBoundingRectangle;
    const numPositions = mappedPositions.numPositions;
    return ModelImageryMapping._createTextureCoordinates(
      cartographicPositions,
      numPositions,
      cartographicBoundingRectangle,
      projection,
    );
  }

  /**
   * Creates a typed array that contains texture coordinates for
   * a primitive with the given positions, using the given
   * projection.
   *
   * This will be a typed array of size <code>numPositions*2</code>
   * that contains the texture coordinates that result from
   * projecting the given positions with the given projection,
   * and normalizing them to the given bounding rectangle.
   *
   * @param {Iterable<Cartographic>} cartographicPositions The
   * cartographic positions
   * @param {number} numPositions The number of positions (vertices)
   * @param {Rectangle} cartographicBoundingRectangle The bounding
   * rectangle of the cartographic positions
   * @param {MapProjection} projection The projection that should be used
   * @returns {TypedArray} The result
   * @private
   */
  static _createTextureCoordinates(
    cartographicPositions,
    numPositions,
    cartographicBoundingRectangle,
    projection,
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("cartographicPositions", cartographicPositions);
    Check.typeOf.number.greaterThanOrEquals("numPositions", numPositions, 0);
    Check.defined(
      "cartographicBoundingRectangle",
      cartographicBoundingRectangle,
    );
    Check.defined("projection", projection);
    //>>includeEnd('debug');

    // Convert the bounding `Rectangle`(!) of the cartographic positions
    // into a `BoundingRectangle`(!) using the given projection
    const boundingRectangle = new BoundingRectangle();
    BoundingRectangle.fromRectangle(
      cartographicBoundingRectangle,
      projection,
      boundingRectangle,
    );

    // Compute the projected positions, using the given projection
    const projectedPositions = ModelImageryMapping.createProjectedPositions(
      cartographicPositions,
      projection,
    );

    // Relativize the projected positions into the bounding rectangle
    // to obtain texture coordinates
    const texCoords = ModelImageryMapping.computeTexCoords(
      projectedPositions,
      boundingRectangle,
    );

    // Convert the texture coordinates into a typed array
    const texCoordsTypedArray =
      ModelImageryMapping.createTypedArrayFromCartesians2(
        numPositions,
        texCoords,
      );

    return texCoordsTypedArray;
  }

  /**
   * Creates the `ModelComponents.Attribute` for the texture coordinates
   * for a primitive
   *
   * This will create an attribute with
   * - semantic: VertexAttributeSemantic.TEXCOORD
   * - type: AttributeType.VEC2
   * - count: mappedPositions.numPositions
   * that contains the texture coordinates for the given vertex positions,
   * after they are projected using the given projection, normalized to
   * their bounding rectangle.
   *
   * @param {Iterable<Cartographic>} cartographicPositions The
   * cartographic positions
   * @param {number} numPositions The number of positions (vertices)
   * @param {Rectangle} cartographicBoundingRectangle The bounding
   * rectangle of the cartographic positions
   * @param {MapProjection} projection The projection that should be used
   * @returns {ModelComponents.Attribute} The new attribute
   */
  static createTextureCoordinatesAttributeForMappedPositions(
    mappedPositions,
    projection,
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("mappedPositions", mappedPositions);
    Check.defined("projection", projection);
    //>>includeEnd('debug');

    // Create the typed array that contains the texture coordinates
    const texCoordsTypedArray =
      ModelImageryMapping.createTextureCoordinatesForMappedPositions(
        mappedPositions,
        projection,
      );

    // Create an attribute from the texture coordinates typed array
    const texCoordAttribute =
      ModelImageryMapping.createTexCoordAttribute(texCoordsTypedArray);

    return texCoordAttribute;
  }

  /**
   * Create an iterable that provides the cartographic positions
   * of the given POSITION attribute, based on the given ellipsoid
   *
   * @param {ModelComponents.Attribute} primitivePositionAttribute
   * The "POSITION" attribute of the primitive.
   * @param {Matrix4} primitivePositionTransform The full transform of the primitive
   * @param {Elliposid} ellipsoid The ellipsoid that should be used
   * @returns {Iterable<Cartographic>} The iterable over `Cartographic` objects
   */
  static createCartographicPositions(
    primitivePositionAttribute,
    primitivePositionTransform,
    ellipsoid,
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("primitivePositionAttribute", primitivePositionAttribute);
    Check.defined("primitivePositionTransform", primitivePositionTransform);
    Check.defined("ellipsoid", ellipsoid);
    //>>includeEnd('debug');

    // Extract the positions as a typed array
    const typedArray = ModelReader.readAttributeAsTypedArray(
      primitivePositionAttribute,
    );

    // Create an iterable over the positions
    const type = primitivePositionAttribute.type;
    const numComponents = AttributeType.getNumberOfComponents(type);
    const positions =
      ModelImageryMapping.createIterableCartesian3FromTypedArray(
        typedArray,
        numComponents,
      );

    // Compute the positions after they are transformed with the given matrix
    const transformedPositions = ModelImageryMapping.transformCartesians3(
      positions,
      primitivePositionTransform,
    );

    // Compute the cartographic positions for the given ellipsoid
    const cartographicPositions = ModelImageryMapping.transformToCartographic(
      transformedPositions,
      ellipsoid,
    );
    return cartographicPositions;
  }

  /**
   * Creates an iterable over `Cartesian3` objects from the given
   * typed array.
   *
   * The resulting iterable will always return the same `Cartesian3`
   * object. Clients should not store and modify this object.
   *
   * @param {TypedArray} typedArray The typed array
   * @param {number} stride The stride between to consecutive
   * `Cartesian3` elements in the given array. Must be at least 3.
   * @returns {Iterable<Cartesian3>} The iterable
   */
  static createIterableCartesian3FromTypedArray(typedArray, stride) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("typedArray", typedArray);
    Check.typeOf.number.greaterThanOrEquals("stride", stride, 3);
    //>>includeEnd('debug');

    const cartesian = new Cartesian3();
    const numElements = typedArray.length / stride;
    const result = {
      [Symbol.iterator]: function* () {
        for (let i = 0; i < numElements; i++) {
          cartesian.x = typedArray[i * stride + 0];
          cartesian.y = typedArray[i * stride + 1];
          cartesian.z = typedArray[i * stride + 2];
          yield cartesian;
        }
      },
    };
    return result;
  }

  /**
   * Creates a new iterable that applies the given mapper to the given iterable.
   *
   * @param {Iterable} iterable The input iterable
   * @param {Function} mapper The mapper
   * @returns {Iterable} The mapped iterable
   */
  static map(iterable, mapper) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("iterable", iterable);
    Check.defined("mapper", mapper);
    //>>includeEnd('debug');

    const result = {
      [Symbol.iterator]: function* () {
        for (const element of iterable) {
          yield mapper(element);
        }
      },
    };
    return result;
  }

  /**
   * Computes the bounding rectangle of the given cartographic positions,
   * stores it in the given result, and returns it.
   *
   * If the given result is `undefined`, a new rectangle will be created
   * and returned.
   *
   * @param {Iterable<Cartographic>} cartographicPositions The cartographics
   * @param {Rectangle} [result] The result
   * @returns {Rectangle} The result
   */
  static computeCartographicBoundingRectangle(cartographicPositions, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("cartographicPositions", cartographicPositions);
    //>>includeEnd('debug');

    if (!defined(result)) {
      result = new Rectangle();
    }
    // One could store these directly in the result, but that would
    // violate the constraint of the PI-related ranges..
    let north = Number.NEGATIVE_INFINITY;
    let south = Number.POSITIVE_INFINITY;
    let east = Number.NEGATIVE_INFINITY;
    let west = Number.POSITIVE_INFINITY;
    for (const cartographicPosition of cartographicPositions) {
      north = Math.max(north, cartographicPosition.latitude);
      south = Math.min(south, cartographicPosition.latitude);
      east = Math.max(east, cartographicPosition.longitude);
      west = Math.min(west, cartographicPosition.longitude);
    }
    result.north = north;
    result.south = south;
    result.east = east;
    result.west = west;
    return result;
  }

  /**
   * Creates a new iterable that provides `Cartesian3` objects that
   * are created by transforming the `Cartesian3` objects of the
   * given iterable with the given matrix.
   *
   * The resulting iterable will always return the same `Cartesian3`
   * object. Clients should not store and modify this object.
   *
   * @param {Iterable<Cartesian3>} positions The positions
   * @param {Matrix4} matrix The matrix
   * @returns {Iterable<Cartesian3>} The transformed cartesians
   */
  static transformCartesians3(positions, matrix) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("positions", positions);
    Check.defined("matrix", matrix);
    //>>includeEnd('debug');

    const transformedPosition = new Cartesian3();
    const transformedPositions = ModelImageryMapping.map(positions, (p) => {
      Matrix4.multiplyByPoint(matrix, p, transformedPosition);
      return transformedPosition;
    });
    return transformedPositions;
  }

  /**
   * Creates a new iterable that provides `Cartographic` objects that
   * are created by converting the given `Cartesian3` objects to
   * cartographics, based on the given ellipsoid.
   *
   * The resulting iterable will always return the same `Cartographic`
   * object. Clients should not store and modify this object.
   *
   * @param {Iterable<Cartesian3>} positions The positions
   * @param {Ellipsoid} ellipsoid The ellipsoid
   * @returns {Iterable<Cartographic>} The cartographic positions
   */
  static transformToCartographic(positions, ellipsoid) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("positions", positions);
    Check.defined("ellipsoid", ellipsoid);
    //>>includeEnd('debug');

    const cartographicPosition = new Cartographic();
    const cartographicPositions = ModelImageryMapping.map(positions, (p) => {
      // Note: This will not yield valid results for p=(0,0,0).
      // But there is no sensible cartographic position for
      // that, so simply accept the unspecified output here.
      ellipsoid.cartesianToCartographic(p, cartographicPosition);
      return cartographicPosition;
    });
    return cartographicPositions;
  }

  /**
   * Creates an iterable over the results of applying the given projection
   * to the given cartographic positions.
   *
   * The resulting iterable will always return the same `Cartesian3`
   * object. Clients should not store and modify this object.
   *
   * @param {Iterable<Cartographic>} cartographicPositions The cartographic
   * positions
   * @param {MapProjection} projection The projection to use
   * @returns {Iterable<Cartesian3>} The projected positions
   */
  static createProjectedPositions(cartographicPositions, projection) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("cartographicPositions", cartographicPositions);
    Check.defined("projection", projection);
    //>>includeEnd('debug');

    const projectedPosition = new Cartesian3();
    const projectedPositions = ModelImageryMapping.map(
      cartographicPositions,
      (c) => {
        projection.project(c, projectedPosition);
        return projectedPosition;
      },
    );
    return projectedPositions;
  }

  /**
   * Computes the texture coordinates for the given positions, relative
   * to the given bounding rectangle.
   *
   * This will make the x/y coordinates of the given cartesians relative
   * to the given bounding rectangle and clamp them to [0,0]-[1,1].
   *
   * NOTE: This could be broken down into
   * 1. mapping to 2D
   * 2. relativizing for the bounding recangle
   * 3. clamping to [0,0]-[1,1]
   *
   * @param {Iterable<Cartesian3>} positions The positions
   * @param {BoundingRectangle} boundingRectangle The rectangle
   * @returns {Iterable<Cartesian2>} The texture coordinates
   */
  static computeTexCoords(positions, boundingRectangle) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("positions", positions);
    Check.defined("boundingRectangle", boundingRectangle);
    //>>includeEnd('debug');

    const texCoord = new Cartesian2();
    const invSizeX = 1.0 / boundingRectangle.width;
    const invSizeY = 1.0 / boundingRectangle.height;
    const texCoords = ModelImageryMapping.map(positions, (p) => {
      const uRaw = (p.x - boundingRectangle.x) * invSizeX;
      const vRaw = (p.y - boundingRectangle.y) * invSizeY;
      const u = Math.min(Math.max(uRaw, 0.0), 1.0);
      const v = Math.min(Math.max(vRaw, 0.0), 1.0);
      texCoord.x = u;
      texCoord.y = v;
      return texCoord;
    });
    return texCoords;
  }

  /**
   * Creates a new typed array from the given `Cartesian2` objects.
   *
   * @param {number} numElements The number of elements
   * @param {Iterable<Cartesian2>} elements The elements
   * @returns {TypedArray} The typed array
   */
  static createTypedArrayFromCartesians2(numElements, elements) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number.greaterThanOrEquals("numElements", numElements, 0);
    Check.defined("elements", elements);
    //>>includeEnd('debug');

    const typedArray = new Float32Array(numElements * 2);
    let index = 0;
    for (const element of elements) {
      typedArray[index * 2 + 0] = element.x;
      typedArray[index * 2 + 1] = element.y;
      index++;
    }
    return typedArray;
  }

  /**
   * Create a new texture coordinates attribute from the given data.
   *
   * This will create an attribute with
   * - semantic: VertexAttributeSemantic.TEXCOORD
   * - type: AttributeType.VEC2
   * - count: texCoordsTypedArray.length / 2
   * that contains the data from the given typed array.
   *
   * @param {TypedArray} texCoordsTypedArray The typed array
   * @returns {ModelComponents.Attribute} The attribute
   */
  static createTexCoordAttribute(texCoordsTypedArray) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("texCoordsTypedArray", texCoordsTypedArray);
    //>>includeEnd('debug');

    const texCoordAttribute = {
      name: "Imagery Texture Coordinates",
      semantic: VertexAttributeSemantic.TEXCOORD,
      setIndex: 0,
      componentDatatype: ComponentDatatype.FLOAT,
      type: AttributeType.VEC2,
      normalized: false,
      count: texCoordsTypedArray.length / 2,
      min: undefined,
      max: undefined,
      constant: new Cartesian2(0, 0),
      quantization: undefined,
      typedArray: texCoordsTypedArray,
      byteOffset: 0,
      byteStride: undefined,
    };
    return texCoordAttribute;
  }
}
export default ModelImageryMapping;
