import defined from "../../Core/defined.js";
import Cartesian2 from "../../Core/Cartesian2.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Matrix4 from "../../Core/Matrix4.js";
import Rectangle from "../../Core/Rectangle.js";
import Cartographic from "../../Core/Cartographic.js";
import BoundingRectangle from "../../Core/BoundingRectangle.js";
import ComponentDatatype from "../../Core/ComponentDatatype.js";
import Check from "../../Core/Check.js";

import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";

import VertexAttributeSemantic from "../VertexAttributeSemantic.js";

/**
 * A class for computing the texture coordinates of imagery that is
 * supposed to be mapped on a `Model`/`ModelComponents.Primitive`.
 */
class ModelImageryMapping {
  /**
   * Creates the `ModelComponents.Attribute` for the texture coordinates
   * for a primitive with the given positions.
   *
   * This will create an attribute with
   * - semantic: VertexAttributeSemantic.TEXCOORD
   * - componentsPerAttribute: 2
   * - componentDatatype: ComponentDatatype.FLOAT
   * that contains the texture coordinates for the given vertex positions,
   * after they are projected using the given projection, normalized to
   * their bounding rectangle.
   *
   * NOTE: The `index` of the resulting attribute will be set to -1.
   * The receiver/caller is responsible for knowing which index this
   * attribute will have.
   *
   * @param {ModelComponents.Attribute} primitivePositionsAttribute
   * The "POSITION" attribute of the primitive.
   * @param {Matrix4} primitivePositionsTransform The full transform of the
   * primitive, including the local (scene graph) transform as well as the
   * `modelMatrix` of the model, and ... the axis correction matrix and all that...
   * @param {MapProjection} projection The projection that should be used
   * @param {Context} context The context for allocating GL resources
   * @returns {ModelComponents.Attribute} The new attribute
   */
  static createTextureCoordinatesAttribute(
    primitivePositionsAttribute,
    primitivePositionsTransform,
    projection,
    context,
  ) {
    // Extract the positions as a typed array
    const typedArray = ModelImageryMapping.createTypedArray(
      primitivePositionsAttribute,
    );

    // Create an iterable over the positions
    const numComponents = primitivePositionsAttribute.componentsPerAttribute;
    const positions =
      ModelImageryMapping.createIterableCartesian3FromTypedArray(
        typedArray,
        numComponents,
      );

    // Compute the positions after they are transformed with the given matrix
    const transformedPositions = ModelImageryMapping.transformCartesians3(
      positions,
      primitivePositionsTransform,
    );

    // Compute the cartographic positions for the given ellipsoid
    const ellipsoid = projection.ellipsoid;
    const cartographicPositions =
      ModelImageryMapping.createCartographicPositions(
        transformedPositions,
        ellipsoid,
      );

    // Compute the bounding `Rectangle`(!) of the cartographic positions
    // and convert it into a `BoundingRectangle`(!) using the given
    // projection
    const cartographicBoundingRectangle =
      ModelImageryMapping.computeCartographicBoundingRectangle(
        cartographicPositions,
      );
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
    const numVertices = primitivePositionsAttribute.count;
    const texCoordsTypedArray =
      ModelImageryMapping.createTypedArrayFromCartesians2(
        numVertices,
        texCoords,
      );

    // Create an attribute from the texture coordinates typed array
    const texCoordAttribute = ModelImageryMapping.createTexCoordAttribute(
      texCoordsTypedArray,
      context,
    );

    return texCoordAttribute;
  }

  /**
   * Creates a typed array from the data of the given attribute, by
   * reading it back from the vertex buffer.
   *
   * @param {ModelComponents.Attribute} attribute The attribute
   * @returns {TypedArray} The typed array
   */
  static createTypedArray(attribute) {
    const buffer = attribute.vertexBuffer;
    // TODO Quantization etc...? A generic "reader" would be nice...
    const typedArray = ComponentDatatype.createTypedArray(
      attribute.componentDatatype,
      attribute.count * attribute.componentsPerAttribute,
    );
    buffer.getBufferData(typedArray);
    return typedArray;
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
    if (!defined(result)) {
      result = new Rectangle();
    }
    // One could store these directly in the result, but that would
    // violate the constraint of the PI-related ranges..
    let north = Number.POSITIVE_INFINITY;
    let south = Number.NEGATIVE_INFINITY;
    let east = Number.POSITIVE_INFINITY;
    let west = Number.NEGATIVE_INFINITY;
    for (const cartographicPosition of cartographicPositions) {
      north = Math.min(north, cartographicPosition.latitude);
      south = Math.max(south, cartographicPosition.latitude);
      east = Math.min(east, cartographicPosition.longitude);
      west = Math.max(west, cartographicPosition.longitude);
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
   * The resulting iterable will always return the same `Cartesian3`
   * object. Clients should not store and modify this object.
   *
   * @param {Iterable<Cartesian3>} positions The positions
   * @param {Ellipsoid} ellipsoid The ellipsoid
   * @returns {Iterable<Cartographic>} The cartographic positions
   */
  static createCartographicPositions(positions, ellipsoid) {
    const cartographicPosition = new Cartographic();
    const cartographicPositions = ModelImageryMapping.map(positions, (p) => {
      // TODO_DRAPING Handle (0,0,0)...
      ellipsoid.cartesianToCartographic(p, cartographicPosition);
      return cartographicPosition;
    });
    return cartographicPositions;
  }

  /**
   *
   * @param {Iterable<Cartographic>} cartographicPositions The cartographic
   * positions
   * @param {MapProjection} projection The projection to use
   * @returns {Iterable<Cartesian3>} The projected positions
   */
  static createProjectedPositions(cartographicPositions, projection) {
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
   * - componentsPerAttribute: 2
   * - componentDatatype: ComponentDatatype.FLOAT
   * that contains the data from the given typed array.
   *
   * @param {TypedArray} texCoordsTypedArray The typed array
   * @param {Context} context The GL context
   * @returns {ModelComponents.Attribute} The attribute
   */
  static createTexCoordAttribute(texCoordsTypedArray, context) {
    const texCoordsBuffer = Buffer.createVertexBuffer({
      context: context,
      typedArray: texCoordsTypedArray,
      usage: BufferUsage.STATIC_DRAW,
    });
    const texCoordAttribute = {
      index: -1, // This has to be determined by the user!
      semantic: VertexAttributeSemantic.TEXCOORD,
      enabled: true,
      vertexBuffer: texCoordsBuffer,
      componentsPerAttribute: 2,
      componentDatatype: ComponentDatatype.FLOAT,
      normalize: false,
      offsetInBytes: 0,
      strideInBytes: 0,
      instanceDivisor: 0,
    };
    return texCoordAttribute;
  }
}
export default ModelImageryMapping;
