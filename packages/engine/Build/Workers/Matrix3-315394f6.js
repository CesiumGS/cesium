define(['exports', './Check-666ab1a0', './defaultValue-0a909f67', './Math-2dbd6b93'], (function (exports, Check, defaultValue, Math$1) { 'use strict';

  /**
   * A 3D Cartesian point.
   * @alias Cartesian3
   * @constructor
   *
   * @param {Number} [x=0.0] The X component.
   * @param {Number} [y=0.0] The Y component.
   * @param {Number} [z=0.0] The Z component.
   *
   * @see Cartesian2
   * @see Cartesian4
   * @see Packable
   */
  function Cartesian3(x, y, z) {
    /**
     * The X component.
     * @type {Number}
     * @default 0.0
     */
    this.x = defaultValue.defaultValue(x, 0.0);

    /**
     * The Y component.
     * @type {Number}
     * @default 0.0
     */
    this.y = defaultValue.defaultValue(y, 0.0);

    /**
     * The Z component.
     * @type {Number}
     * @default 0.0
     */
    this.z = defaultValue.defaultValue(z, 0.0);
  }

  /**
   * Converts the provided Spherical into Cartesian3 coordinates.
   *
   * @param {Spherical} spherical The Spherical to be converted to Cartesian3.
   * @param {Cartesian3} [result] The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
   */
  Cartesian3.fromSpherical = function (spherical, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("spherical", spherical);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      result = new Cartesian3();
    }

    const clock = spherical.clock;
    const cone = spherical.cone;
    const magnitude = defaultValue.defaultValue(spherical.magnitude, 1.0);
    const radial = magnitude * Math.sin(cone);
    result.x = radial * Math.cos(clock);
    result.y = radial * Math.sin(clock);
    result.z = magnitude * Math.cos(cone);
    return result;
  };

  /**
   * Creates a Cartesian3 instance from x, y and z coordinates.
   *
   * @param {Number} x The x coordinate.
   * @param {Number} y The y coordinate.
   * @param {Number} z The z coordinate.
   * @param {Cartesian3} [result] The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
   */
  Cartesian3.fromElements = function (x, y, z, result) {
    if (!defaultValue.defined(result)) {
      return new Cartesian3(x, y, z);
    }

    result.x = x;
    result.y = y;
    result.z = z;
    return result;
  };

  /**
   * Duplicates a Cartesian3 instance.
   *
   * @param {Cartesian3} cartesian The Cartesian to duplicate.
   * @param {Cartesian3} [result] The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided. (Returns undefined if cartesian is undefined)
   */
  Cartesian3.clone = function (cartesian, result) {
    if (!defaultValue.defined(cartesian)) {
      return undefined;
    }
    if (!defaultValue.defined(result)) {
      return new Cartesian3(cartesian.x, cartesian.y, cartesian.z);
    }

    result.x = cartesian.x;
    result.y = cartesian.y;
    result.z = cartesian.z;
    return result;
  };

  /**
   * Creates a Cartesian3 instance from an existing Cartesian4.  This simply takes the
   * x, y, and z properties of the Cartesian4 and drops w.
   * @function
   *
   * @param {Cartesian4} cartesian The Cartesian4 instance to create a Cartesian3 instance from.
   * @param {Cartesian3} [result] The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
   */
  Cartesian3.fromCartesian4 = Cartesian3.clone;

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  Cartesian3.packedLength = 3;

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {Cartesian3} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  Cartesian3.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("value", value);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    array[startingIndex++] = value.x;
    array[startingIndex++] = value.y;
    array[startingIndex] = value.z;

    return array;
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {Cartesian3} [result] The object into which to store the result.
   * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
   */
  Cartesian3.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    if (!defaultValue.defined(result)) {
      result = new Cartesian3();
    }
    result.x = array[startingIndex++];
    result.y = array[startingIndex++];
    result.z = array[startingIndex];
    return result;
  };

  /**
   * Flattens an array of Cartesian3s into an array of components.
   *
   * @param {Cartesian3[]} array The array of cartesians to pack.
   * @param {Number[]} [result] The array onto which to store the result. If this is a typed array, it must have array.length * 3 components, else a {@link DeveloperError} will be thrown. If it is a regular array, it will be resized to have (array.length * 3) elements.
   * @returns {Number[]} The packed array.
   */
  Cartesian3.packArray = function (array, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    const length = array.length;
    const resultLength = length * 3;
    if (!defaultValue.defined(result)) {
      result = new Array(resultLength);
    } else if (!Array.isArray(result) && result.length !== resultLength) {
      //>>includeStart('debug', pragmas.debug);
      throw new Check.DeveloperError(
        "If result is a typed array, it must have exactly array.length * 3 elements"
      );
      //>>includeEnd('debug');
    } else if (result.length !== resultLength) {
      result.length = resultLength;
    }

    for (let i = 0; i < length; ++i) {
      Cartesian3.pack(array[i], result, i * 3);
    }
    return result;
  };

  /**
   * Unpacks an array of cartesian components into an array of Cartesian3s.
   *
   * @param {Number[]} array The array of components to unpack.
   * @param {Cartesian3[]} [result] The array onto which to store the result.
   * @returns {Cartesian3[]} The unpacked array.
   */
  Cartesian3.unpackArray = function (array, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    Check.Check.typeOf.number.greaterThanOrEquals("array.length", array.length, 3);
    if (array.length % 3 !== 0) {
      throw new Check.DeveloperError("array length must be a multiple of 3.");
    }
    //>>includeEnd('debug');

    const length = array.length;
    if (!defaultValue.defined(result)) {
      result = new Array(length / 3);
    } else {
      result.length = length / 3;
    }

    for (let i = 0; i < length; i += 3) {
      const index = i / 3;
      result[index] = Cartesian3.unpack(array, i, result[index]);
    }
    return result;
  };

  /**
   * Creates a Cartesian3 from three consecutive elements in an array.
   * @function
   *
   * @param {Number[]} array The array whose three consecutive elements correspond to the x, y, and z components, respectively.
   * @param {Number} [startingIndex=0] The offset into the array of the first element, which corresponds to the x component.
   * @param {Cartesian3} [result] The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
   *
   * @example
   * // Create a Cartesian3 with (1.0, 2.0, 3.0)
   * const v = [1.0, 2.0, 3.0];
   * const p = Cesium.Cartesian3.fromArray(v);
   *
   * // Create a Cartesian3 with (1.0, 2.0, 3.0) using an offset into an array
   * const v2 = [0.0, 0.0, 1.0, 2.0, 3.0];
   * const p2 = Cesium.Cartesian3.fromArray(v2, 2);
   */
  Cartesian3.fromArray = Cartesian3.unpack;

  /**
   * Computes the value of the maximum component for the supplied Cartesian.
   *
   * @param {Cartesian3} cartesian The cartesian to use.
   * @returns {Number} The value of the maximum component.
   */
  Cartesian3.maximumComponent = function (cartesian) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    return Math.max(cartesian.x, cartesian.y, cartesian.z);
  };

  /**
   * Computes the value of the minimum component for the supplied Cartesian.
   *
   * @param {Cartesian3} cartesian The cartesian to use.
   * @returns {Number} The value of the minimum component.
   */
  Cartesian3.minimumComponent = function (cartesian) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    return Math.min(cartesian.x, cartesian.y, cartesian.z);
  };

  /**
   * Compares two Cartesians and computes a Cartesian which contains the minimum components of the supplied Cartesians.
   *
   * @param {Cartesian3} first A cartesian to compare.
   * @param {Cartesian3} second A cartesian to compare.
   * @param {Cartesian3} result The object into which to store the result.
   * @returns {Cartesian3} A cartesian with the minimum components.
   */
  Cartesian3.minimumByComponent = function (first, second, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("first", first);
    Check.Check.typeOf.object("second", second);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Math.min(first.x, second.x);
    result.y = Math.min(first.y, second.y);
    result.z = Math.min(first.z, second.z);

    return result;
  };

  /**
   * Compares two Cartesians and computes a Cartesian which contains the maximum components of the supplied Cartesians.
   *
   * @param {Cartesian3} first A cartesian to compare.
   * @param {Cartesian3} second A cartesian to compare.
   * @param {Cartesian3} result The object into which to store the result.
   * @returns {Cartesian3} A cartesian with the maximum components.
   */
  Cartesian3.maximumByComponent = function (first, second, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("first", first);
    Check.Check.typeOf.object("second", second);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Math.max(first.x, second.x);
    result.y = Math.max(first.y, second.y);
    result.z = Math.max(first.z, second.z);
    return result;
  };

  /**
   * Constrain a value to lie between two values.
   *
   * @param {Cartesian3} cartesian The value to clamp.
   * @param {Cartesian3} min The minimum bound.
   * @param {Cartesian3} max The maximum bound.
   * @param {Cartesian3} result The object into which to store the result.
   * @returns {Cartesian3} The clamped value such that min <= value <= max.
   */
  Cartesian3.clamp = function (value, min, max, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("value", value);
    Check.Check.typeOf.object("min", min);
    Check.Check.typeOf.object("max", max);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const x = Math$1.CesiumMath.clamp(value.x, min.x, max.x);
    const y = Math$1.CesiumMath.clamp(value.y, min.y, max.y);
    const z = Math$1.CesiumMath.clamp(value.z, min.z, max.z);

    result.x = x;
    result.y = y;
    result.z = z;

    return result;
  };

  /**
   * Computes the provided Cartesian's squared magnitude.
   *
   * @param {Cartesian3} cartesian The Cartesian instance whose squared magnitude is to be computed.
   * @returns {Number} The squared magnitude.
   */
  Cartesian3.magnitudeSquared = function (cartesian) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    return (
      cartesian.x * cartesian.x +
      cartesian.y * cartesian.y +
      cartesian.z * cartesian.z
    );
  };

  /**
   * Computes the Cartesian's magnitude (length).
   *
   * @param {Cartesian3} cartesian The Cartesian instance whose magnitude is to be computed.
   * @returns {Number} The magnitude.
   */
  Cartesian3.magnitude = function (cartesian) {
    return Math.sqrt(Cartesian3.magnitudeSquared(cartesian));
  };

  const distanceScratch = new Cartesian3();

  /**
   * Computes the distance between two points.
   *
   * @param {Cartesian3} left The first point to compute the distance from.
   * @param {Cartesian3} right The second point to compute the distance to.
   * @returns {Number} The distance between two points.
   *
   * @example
   * // Returns 1.0
   * const d = Cesium.Cartesian3.distance(new Cesium.Cartesian3(1.0, 0.0, 0.0), new Cesium.Cartesian3(2.0, 0.0, 0.0));
   */
  Cartesian3.distance = function (left, right) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    Cartesian3.subtract(left, right, distanceScratch);
    return Cartesian3.magnitude(distanceScratch);
  };

  /**
   * Computes the squared distance between two points.  Comparing squared distances
   * using this function is more efficient than comparing distances using {@link Cartesian3#distance}.
   *
   * @param {Cartesian3} left The first point to compute the distance from.
   * @param {Cartesian3} right The second point to compute the distance to.
   * @returns {Number} The distance between two points.
   *
   * @example
   * // Returns 4.0, not 2.0
   * const d = Cesium.Cartesian3.distanceSquared(new Cesium.Cartesian3(1.0, 0.0, 0.0), new Cesium.Cartesian3(3.0, 0.0, 0.0));
   */
  Cartesian3.distanceSquared = function (left, right) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    Cartesian3.subtract(left, right, distanceScratch);
    return Cartesian3.magnitudeSquared(distanceScratch);
  };

  /**
   * Computes the normalized form of the supplied Cartesian.
   *
   * @param {Cartesian3} cartesian The Cartesian to be normalized.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter.
   */
  Cartesian3.normalize = function (cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const magnitude = Cartesian3.magnitude(cartesian);

    result.x = cartesian.x / magnitude;
    result.y = cartesian.y / magnitude;
    result.z = cartesian.z / magnitude;

    //>>includeStart('debug', pragmas.debug);
    if (isNaN(result.x) || isNaN(result.y) || isNaN(result.z)) {
      throw new Check.DeveloperError("normalized result is not a number");
    }
    //>>includeEnd('debug');

    return result;
  };

  /**
   * Computes the dot (scalar) product of two Cartesians.
   *
   * @param {Cartesian3} left The first Cartesian.
   * @param {Cartesian3} right The second Cartesian.
   * @returns {Number} The dot product.
   */
  Cartesian3.dot = function (left, right) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    return left.x * right.x + left.y * right.y + left.z * right.z;
  };

  /**
   * Computes the componentwise product of two Cartesians.
   *
   * @param {Cartesian3} left The first Cartesian.
   * @param {Cartesian3} right The second Cartesian.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter.
   */
  Cartesian3.multiplyComponents = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x * right.x;
    result.y = left.y * right.y;
    result.z = left.z * right.z;
    return result;
  };

  /**
   * Computes the componentwise quotient of two Cartesians.
   *
   * @param {Cartesian3} left The first Cartesian.
   * @param {Cartesian3} right The second Cartesian.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter.
   */
  Cartesian3.divideComponents = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x / right.x;
    result.y = left.y / right.y;
    result.z = left.z / right.z;
    return result;
  };

  /**
   * Computes the componentwise sum of two Cartesians.
   *
   * @param {Cartesian3} left The first Cartesian.
   * @param {Cartesian3} right The second Cartesian.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter.
   */
  Cartesian3.add = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x + right.x;
    result.y = left.y + right.y;
    result.z = left.z + right.z;
    return result;
  };

  /**
   * Computes the componentwise difference of two Cartesians.
   *
   * @param {Cartesian3} left The first Cartesian.
   * @param {Cartesian3} right The second Cartesian.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter.
   */
  Cartesian3.subtract = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x - right.x;
    result.y = left.y - right.y;
    result.z = left.z - right.z;
    return result;
  };

  /**
   * Multiplies the provided Cartesian componentwise by the provided scalar.
   *
   * @param {Cartesian3} cartesian The Cartesian to be scaled.
   * @param {Number} scalar The scalar to multiply with.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter.
   */
  Cartesian3.multiplyByScalar = function (cartesian, scalar, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.number("scalar", scalar);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = cartesian.x * scalar;
    result.y = cartesian.y * scalar;
    result.z = cartesian.z * scalar;
    return result;
  };

  /**
   * Divides the provided Cartesian componentwise by the provided scalar.
   *
   * @param {Cartesian3} cartesian The Cartesian to be divided.
   * @param {Number} scalar The scalar to divide by.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter.
   */
  Cartesian3.divideByScalar = function (cartesian, scalar, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.number("scalar", scalar);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = cartesian.x / scalar;
    result.y = cartesian.y / scalar;
    result.z = cartesian.z / scalar;
    return result;
  };

  /**
   * Negates the provided Cartesian.
   *
   * @param {Cartesian3} cartesian The Cartesian to be negated.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter.
   */
  Cartesian3.negate = function (cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = -cartesian.x;
    result.y = -cartesian.y;
    result.z = -cartesian.z;
    return result;
  };

  /**
   * Computes the absolute value of the provided Cartesian.
   *
   * @param {Cartesian3} cartesian The Cartesian whose absolute value is to be computed.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter.
   */
  Cartesian3.abs = function (cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Math.abs(cartesian.x);
    result.y = Math.abs(cartesian.y);
    result.z = Math.abs(cartesian.z);
    return result;
  };

  const lerpScratch = new Cartesian3();
  /**
   * Computes the linear interpolation or extrapolation at t using the provided cartesians.
   *
   * @param {Cartesian3} start The value corresponding to t at 0.0.
   * @param {Cartesian3} end The value corresponding to t at 1.0.
   * @param {Number} t The point along t at which to interpolate.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter.
   */
  Cartesian3.lerp = function (start, end, t, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("start", start);
    Check.Check.typeOf.object("end", end);
    Check.Check.typeOf.number("t", t);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    Cartesian3.multiplyByScalar(end, t, lerpScratch);
    result = Cartesian3.multiplyByScalar(start, 1.0 - t, result);
    return Cartesian3.add(lerpScratch, result, result);
  };

  const angleBetweenScratch = new Cartesian3();
  const angleBetweenScratch2 = new Cartesian3();
  /**
   * Returns the angle, in radians, between the provided Cartesians.
   *
   * @param {Cartesian3} left The first Cartesian.
   * @param {Cartesian3} right The second Cartesian.
   * @returns {Number} The angle between the Cartesians.
   */
  Cartesian3.angleBetween = function (left, right) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    Cartesian3.normalize(left, angleBetweenScratch);
    Cartesian3.normalize(right, angleBetweenScratch2);
    const cosine = Cartesian3.dot(angleBetweenScratch, angleBetweenScratch2);
    const sine = Cartesian3.magnitude(
      Cartesian3.cross(
        angleBetweenScratch,
        angleBetweenScratch2,
        angleBetweenScratch
      )
    );
    return Math.atan2(sine, cosine);
  };

  const mostOrthogonalAxisScratch = new Cartesian3();
  /**
   * Returns the axis that is most orthogonal to the provided Cartesian.
   *
   * @param {Cartesian3} cartesian The Cartesian on which to find the most orthogonal axis.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The most orthogonal axis.
   */
  Cartesian3.mostOrthogonalAxis = function (cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const f = Cartesian3.normalize(cartesian, mostOrthogonalAxisScratch);
    Cartesian3.abs(f, f);

    if (f.x <= f.y) {
      if (f.x <= f.z) {
        result = Cartesian3.clone(Cartesian3.UNIT_X, result);
      } else {
        result = Cartesian3.clone(Cartesian3.UNIT_Z, result);
      }
    } else if (f.y <= f.z) {
      result = Cartesian3.clone(Cartesian3.UNIT_Y, result);
    } else {
      result = Cartesian3.clone(Cartesian3.UNIT_Z, result);
    }

    return result;
  };

  /**
   * Projects vector a onto vector b
   * @param {Cartesian3} a The vector that needs projecting
   * @param {Cartesian3} b The vector to project onto
   * @param {Cartesian3} result The result cartesian
   * @returns {Cartesian3} The modified result parameter
   */
  Cartesian3.projectVector = function (a, b, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("a", a);
    Check.Check.defined("b", b);
    Check.Check.defined("result", result);
    //>>includeEnd('debug');

    const scalar = Cartesian3.dot(a, b) / Cartesian3.dot(b, b);
    return Cartesian3.multiplyByScalar(b, scalar, result);
  };

  /**
   * Compares the provided Cartesians componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {Cartesian3} [left] The first Cartesian.
   * @param {Cartesian3} [right] The second Cartesian.
   * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
   */
  Cartesian3.equals = function (left, right) {
    return (
      left === right ||
      (defaultValue.defined(left) &&
        defaultValue.defined(right) &&
        left.x === right.x &&
        left.y === right.y &&
        left.z === right.z)
    );
  };

  /**
   * @private
   */
  Cartesian3.equalsArray = function (cartesian, array, offset) {
    return (
      cartesian.x === array[offset] &&
      cartesian.y === array[offset + 1] &&
      cartesian.z === array[offset + 2]
    );
  };

  /**
   * Compares the provided Cartesians componentwise and returns
   * <code>true</code> if they pass an absolute or relative tolerance test,
   * <code>false</code> otherwise.
   *
   * @param {Cartesian3} [left] The first Cartesian.
   * @param {Cartesian3} [right] The second Cartesian.
   * @param {Number} [relativeEpsilon=0] The relative epsilon tolerance to use for equality testing.
   * @param {Number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
   * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
   */
  Cartesian3.equalsEpsilon = function (
    left,
    right,
    relativeEpsilon,
    absoluteEpsilon
  ) {
    return (
      left === right ||
      (defaultValue.defined(left) &&
        defaultValue.defined(right) &&
        Math$1.CesiumMath.equalsEpsilon(
          left.x,
          right.x,
          relativeEpsilon,
          absoluteEpsilon
        ) &&
        Math$1.CesiumMath.equalsEpsilon(
          left.y,
          right.y,
          relativeEpsilon,
          absoluteEpsilon
        ) &&
        Math$1.CesiumMath.equalsEpsilon(
          left.z,
          right.z,
          relativeEpsilon,
          absoluteEpsilon
        ))
    );
  };

  /**
   * Computes the cross (outer) product of two Cartesians.
   *
   * @param {Cartesian3} left The first Cartesian.
   * @param {Cartesian3} right The second Cartesian.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The cross product.
   */
  Cartesian3.cross = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const leftX = left.x;
    const leftY = left.y;
    const leftZ = left.z;
    const rightX = right.x;
    const rightY = right.y;
    const rightZ = right.z;

    const x = leftY * rightZ - leftZ * rightY;
    const y = leftZ * rightX - leftX * rightZ;
    const z = leftX * rightY - leftY * rightX;

    result.x = x;
    result.y = y;
    result.z = z;
    return result;
  };

  /**
   * Computes the midpoint between the right and left Cartesian.
   * @param {Cartesian3} left The first Cartesian.
   * @param {Cartesian3} right The second Cartesian.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The midpoint.
   */
  Cartesian3.midpoint = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = (left.x + right.x) * 0.5;
    result.y = (left.y + right.y) * 0.5;
    result.z = (left.z + right.z) * 0.5;

    return result;
  };

  /**
   * Returns a Cartesian3 position from longitude and latitude values given in degrees.
   *
   * @param {Number} longitude The longitude, in degrees
   * @param {Number} latitude The latitude, in degrees
   * @param {Number} [height=0.0] The height, in meters, above the ellipsoid.
   * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the position lies.
   * @param {Cartesian3} [result] The object onto which to store the result.
   * @returns {Cartesian3} The position
   *
   * @example
   * const position = Cesium.Cartesian3.fromDegrees(-115.0, 37.0);
   */
  Cartesian3.fromDegrees = function (
    longitude,
    latitude,
    height,
    ellipsoid,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("longitude", longitude);
    Check.Check.typeOf.number("latitude", latitude);
    //>>includeEnd('debug');

    longitude = Math$1.CesiumMath.toRadians(longitude);
    latitude = Math$1.CesiumMath.toRadians(latitude);
    return Cartesian3.fromRadians(longitude, latitude, height, ellipsoid, result);
  };

  let scratchN = new Cartesian3();
  let scratchK = new Cartesian3();
  const wgs84RadiiSquared = new Cartesian3(
    6378137.0 * 6378137.0,
    6378137.0 * 6378137.0,
    6356752.3142451793 * 6356752.3142451793
  );

  /**
   * Returns a Cartesian3 position from longitude and latitude values given in radians.
   *
   * @param {Number} longitude The longitude, in radians
   * @param {Number} latitude The latitude, in radians
   * @param {Number} [height=0.0] The height, in meters, above the ellipsoid.
   * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the position lies.
   * @param {Cartesian3} [result] The object onto which to store the result.
   * @returns {Cartesian3} The position
   *
   * @example
   * const position = Cesium.Cartesian3.fromRadians(-2.007, 0.645);
   */
  Cartesian3.fromRadians = function (
    longitude,
    latitude,
    height,
    ellipsoid,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("longitude", longitude);
    Check.Check.typeOf.number("latitude", latitude);
    //>>includeEnd('debug');

    height = defaultValue.defaultValue(height, 0.0);
    const radiiSquared = defaultValue.defined(ellipsoid)
      ? ellipsoid.radiiSquared
      : wgs84RadiiSquared;

    const cosLatitude = Math.cos(latitude);
    scratchN.x = cosLatitude * Math.cos(longitude);
    scratchN.y = cosLatitude * Math.sin(longitude);
    scratchN.z = Math.sin(latitude);
    scratchN = Cartesian3.normalize(scratchN, scratchN);

    Cartesian3.multiplyComponents(radiiSquared, scratchN, scratchK);
    const gamma = Math.sqrt(Cartesian3.dot(scratchN, scratchK));
    scratchK = Cartesian3.divideByScalar(scratchK, gamma, scratchK);
    scratchN = Cartesian3.multiplyByScalar(scratchN, height, scratchN);

    if (!defaultValue.defined(result)) {
      result = new Cartesian3();
    }
    return Cartesian3.add(scratchK, scratchN, result);
  };

  /**
   * Returns an array of Cartesian3 positions given an array of longitude and latitude values given in degrees.
   *
   * @param {Number[]} coordinates A list of longitude and latitude values. Values alternate [longitude, latitude, longitude, latitude...].
   * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the coordinates lie.
   * @param {Cartesian3[]} [result] An array of Cartesian3 objects to store the result.
   * @returns {Cartesian3[]} The array of positions.
   *
   * @example
   * const positions = Cesium.Cartesian3.fromDegreesArray([-115.0, 37.0, -107.0, 33.0]);
   */
  Cartesian3.fromDegreesArray = function (coordinates, ellipsoid, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("coordinates", coordinates);
    if (coordinates.length < 2 || coordinates.length % 2 !== 0) {
      throw new Check.DeveloperError(
        "the number of coordinates must be a multiple of 2 and at least 2"
      );
    }
    //>>includeEnd('debug');

    const length = coordinates.length;
    if (!defaultValue.defined(result)) {
      result = new Array(length / 2);
    } else {
      result.length = length / 2;
    }

    for (let i = 0; i < length; i += 2) {
      const longitude = coordinates[i];
      const latitude = coordinates[i + 1];
      const index = i / 2;
      result[index] = Cartesian3.fromDegrees(
        longitude,
        latitude,
        0,
        ellipsoid,
        result[index]
      );
    }

    return result;
  };

  /**
   * Returns an array of Cartesian3 positions given an array of longitude and latitude values given in radians.
   *
   * @param {Number[]} coordinates A list of longitude and latitude values. Values alternate [longitude, latitude, longitude, latitude...].
   * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the coordinates lie.
   * @param {Cartesian3[]} [result] An array of Cartesian3 objects to store the result.
   * @returns {Cartesian3[]} The array of positions.
   *
   * @example
   * const positions = Cesium.Cartesian3.fromRadiansArray([-2.007, 0.645, -1.867, .575]);
   */
  Cartesian3.fromRadiansArray = function (coordinates, ellipsoid, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("coordinates", coordinates);
    if (coordinates.length < 2 || coordinates.length % 2 !== 0) {
      throw new Check.DeveloperError(
        "the number of coordinates must be a multiple of 2 and at least 2"
      );
    }
    //>>includeEnd('debug');

    const length = coordinates.length;
    if (!defaultValue.defined(result)) {
      result = new Array(length / 2);
    } else {
      result.length = length / 2;
    }

    for (let i = 0; i < length; i += 2) {
      const longitude = coordinates[i];
      const latitude = coordinates[i + 1];
      const index = i / 2;
      result[index] = Cartesian3.fromRadians(
        longitude,
        latitude,
        0,
        ellipsoid,
        result[index]
      );
    }

    return result;
  };

  /**
   * Returns an array of Cartesian3 positions given an array of longitude, latitude and height values where longitude and latitude are given in degrees.
   *
   * @param {Number[]} coordinates A list of longitude, latitude and height values. Values alternate [longitude, latitude, height, longitude, latitude, height...].
   * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the position lies.
   * @param {Cartesian3[]} [result] An array of Cartesian3 objects to store the result.
   * @returns {Cartesian3[]} The array of positions.
   *
   * @example
   * const positions = Cesium.Cartesian3.fromDegreesArrayHeights([-115.0, 37.0, 100000.0, -107.0, 33.0, 150000.0]);
   */
  Cartesian3.fromDegreesArrayHeights = function (coordinates, ellipsoid, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("coordinates", coordinates);
    if (coordinates.length < 3 || coordinates.length % 3 !== 0) {
      throw new Check.DeveloperError(
        "the number of coordinates must be a multiple of 3 and at least 3"
      );
    }
    //>>includeEnd('debug');

    const length = coordinates.length;
    if (!defaultValue.defined(result)) {
      result = new Array(length / 3);
    } else {
      result.length = length / 3;
    }

    for (let i = 0; i < length; i += 3) {
      const longitude = coordinates[i];
      const latitude = coordinates[i + 1];
      const height = coordinates[i + 2];
      const index = i / 3;
      result[index] = Cartesian3.fromDegrees(
        longitude,
        latitude,
        height,
        ellipsoid,
        result[index]
      );
    }

    return result;
  };

  /**
   * Returns an array of Cartesian3 positions given an array of longitude, latitude and height values where longitude and latitude are given in radians.
   *
   * @param {Number[]} coordinates A list of longitude, latitude and height values. Values alternate [longitude, latitude, height, longitude, latitude, height...].
   * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the position lies.
   * @param {Cartesian3[]} [result] An array of Cartesian3 objects to store the result.
   * @returns {Cartesian3[]} The array of positions.
   *
   * @example
   * const positions = Cesium.Cartesian3.fromRadiansArrayHeights([-2.007, 0.645, 100000.0, -1.867, .575, 150000.0]);
   */
  Cartesian3.fromRadiansArrayHeights = function (coordinates, ellipsoid, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("coordinates", coordinates);
    if (coordinates.length < 3 || coordinates.length % 3 !== 0) {
      throw new Check.DeveloperError(
        "the number of coordinates must be a multiple of 3 and at least 3"
      );
    }
    //>>includeEnd('debug');

    const length = coordinates.length;
    if (!defaultValue.defined(result)) {
      result = new Array(length / 3);
    } else {
      result.length = length / 3;
    }

    for (let i = 0; i < length; i += 3) {
      const longitude = coordinates[i];
      const latitude = coordinates[i + 1];
      const height = coordinates[i + 2];
      const index = i / 3;
      result[index] = Cartesian3.fromRadians(
        longitude,
        latitude,
        height,
        ellipsoid,
        result[index]
      );
    }

    return result;
  };

  /**
   * An immutable Cartesian3 instance initialized to (0.0, 0.0, 0.0).
   *
   * @type {Cartesian3}
   * @constant
   */
  Cartesian3.ZERO = Object.freeze(new Cartesian3(0.0, 0.0, 0.0));

  /**
   * An immutable Cartesian3 instance initialized to (1.0, 1.0, 1.0).
   *
   * @type {Cartesian3}
   * @constant
   */
  Cartesian3.ONE = Object.freeze(new Cartesian3(1.0, 1.0, 1.0));

  /**
   * An immutable Cartesian3 instance initialized to (1.0, 0.0, 0.0).
   *
   * @type {Cartesian3}
   * @constant
   */
  Cartesian3.UNIT_X = Object.freeze(new Cartesian3(1.0, 0.0, 0.0));

  /**
   * An immutable Cartesian3 instance initialized to (0.0, 1.0, 0.0).
   *
   * @type {Cartesian3}
   * @constant
   */
  Cartesian3.UNIT_Y = Object.freeze(new Cartesian3(0.0, 1.0, 0.0));

  /**
   * An immutable Cartesian3 instance initialized to (0.0, 0.0, 1.0).
   *
   * @type {Cartesian3}
   * @constant
   */
  Cartesian3.UNIT_Z = Object.freeze(new Cartesian3(0.0, 0.0, 1.0));

  /**
   * Duplicates this Cartesian3 instance.
   *
   * @param {Cartesian3} [result] The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if one was not provided.
   */
  Cartesian3.prototype.clone = function (result) {
    return Cartesian3.clone(this, result);
  };

  /**
   * Compares this Cartesian against the provided Cartesian componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {Cartesian3} [right] The right hand side Cartesian.
   * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
   */
  Cartesian3.prototype.equals = function (right) {
    return Cartesian3.equals(this, right);
  };

  /**
   * Compares this Cartesian against the provided Cartesian componentwise and returns
   * <code>true</code> if they pass an absolute or relative tolerance test,
   * <code>false</code> otherwise.
   *
   * @param {Cartesian3} [right] The right hand side Cartesian.
   * @param {Number} [relativeEpsilon=0] The relative epsilon tolerance to use for equality testing.
   * @param {Number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
   * @returns {Boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
   */
  Cartesian3.prototype.equalsEpsilon = function (
    right,
    relativeEpsilon,
    absoluteEpsilon
  ) {
    return Cartesian3.equalsEpsilon(
      this,
      right,
      relativeEpsilon,
      absoluteEpsilon
    );
  };

  /**
   * Creates a string representing this Cartesian in the format '(x, y, z)'.
   *
   * @returns {String} A string representing this Cartesian in the format '(x, y, z)'.
   */
  Cartesian3.prototype.toString = function () {
    return `(${this.x}, ${this.y}, ${this.z})`;
  };

  const scaleToGeodeticSurfaceIntersection = new Cartesian3();
  const scaleToGeodeticSurfaceGradient = new Cartesian3();

  /**
   * Scales the provided Cartesian position along the geodetic surface normal
   * so that it is on the surface of this ellipsoid.  If the position is
   * at the center of the ellipsoid, this function returns undefined.
   *
   * @param {Cartesian3} cartesian The Cartesian position to scale.
   * @param {Cartesian3} oneOverRadii One over radii of the ellipsoid.
   * @param {Cartesian3} oneOverRadiiSquared One over radii squared of the ellipsoid.
   * @param {Number} centerToleranceSquared Tolerance for closeness to the center.
   * @param {Cartesian3} [result] The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter, a new Cartesian3 instance if none was provided, or undefined if the position is at the center.
   *
   * @function scaleToGeodeticSurface
   *
   * @private
   */
  function scaleToGeodeticSurface(
    cartesian,
    oneOverRadii,
    oneOverRadiiSquared,
    centerToleranceSquared,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    if (!defaultValue.defined(cartesian)) {
      throw new Check.DeveloperError("cartesian is required.");
    }
    if (!defaultValue.defined(oneOverRadii)) {
      throw new Check.DeveloperError("oneOverRadii is required.");
    }
    if (!defaultValue.defined(oneOverRadiiSquared)) {
      throw new Check.DeveloperError("oneOverRadiiSquared is required.");
    }
    if (!defaultValue.defined(centerToleranceSquared)) {
      throw new Check.DeveloperError("centerToleranceSquared is required.");
    }
    //>>includeEnd('debug');

    const positionX = cartesian.x;
    const positionY = cartesian.y;
    const positionZ = cartesian.z;

    const oneOverRadiiX = oneOverRadii.x;
    const oneOverRadiiY = oneOverRadii.y;
    const oneOverRadiiZ = oneOverRadii.z;

    const x2 = positionX * positionX * oneOverRadiiX * oneOverRadiiX;
    const y2 = positionY * positionY * oneOverRadiiY * oneOverRadiiY;
    const z2 = positionZ * positionZ * oneOverRadiiZ * oneOverRadiiZ;

    // Compute the squared ellipsoid norm.
    const squaredNorm = x2 + y2 + z2;
    const ratio = Math.sqrt(1.0 / squaredNorm);

    // As an initial approximation, assume that the radial intersection is the projection point.
    const intersection = Cartesian3.multiplyByScalar(
      cartesian,
      ratio,
      scaleToGeodeticSurfaceIntersection
    );

    // If the position is near the center, the iteration will not converge.
    if (squaredNorm < centerToleranceSquared) {
      return !isFinite(ratio)
        ? undefined
        : Cartesian3.clone(intersection, result);
    }

    const oneOverRadiiSquaredX = oneOverRadiiSquared.x;
    const oneOverRadiiSquaredY = oneOverRadiiSquared.y;
    const oneOverRadiiSquaredZ = oneOverRadiiSquared.z;

    // Use the gradient at the intersection point in place of the true unit normal.
    // The difference in magnitude will be absorbed in the multiplier.
    const gradient = scaleToGeodeticSurfaceGradient;
    gradient.x = intersection.x * oneOverRadiiSquaredX * 2.0;
    gradient.y = intersection.y * oneOverRadiiSquaredY * 2.0;
    gradient.z = intersection.z * oneOverRadiiSquaredZ * 2.0;

    // Compute the initial guess at the normal vector multiplier, lambda.
    let lambda =
      ((1.0 - ratio) * Cartesian3.magnitude(cartesian)) /
      (0.5 * Cartesian3.magnitude(gradient));
    let correction = 0.0;

    let func;
    let denominator;
    let xMultiplier;
    let yMultiplier;
    let zMultiplier;
    let xMultiplier2;
    let yMultiplier2;
    let zMultiplier2;
    let xMultiplier3;
    let yMultiplier3;
    let zMultiplier3;

    do {
      lambda -= correction;

      xMultiplier = 1.0 / (1.0 + lambda * oneOverRadiiSquaredX);
      yMultiplier = 1.0 / (1.0 + lambda * oneOverRadiiSquaredY);
      zMultiplier = 1.0 / (1.0 + lambda * oneOverRadiiSquaredZ);

      xMultiplier2 = xMultiplier * xMultiplier;
      yMultiplier2 = yMultiplier * yMultiplier;
      zMultiplier2 = zMultiplier * zMultiplier;

      xMultiplier3 = xMultiplier2 * xMultiplier;
      yMultiplier3 = yMultiplier2 * yMultiplier;
      zMultiplier3 = zMultiplier2 * zMultiplier;

      func = x2 * xMultiplier2 + y2 * yMultiplier2 + z2 * zMultiplier2 - 1.0;

      // "denominator" here refers to the use of this expression in the velocity and acceleration
      // computations in the sections to follow.
      denominator =
        x2 * xMultiplier3 * oneOverRadiiSquaredX +
        y2 * yMultiplier3 * oneOverRadiiSquaredY +
        z2 * zMultiplier3 * oneOverRadiiSquaredZ;

      const derivative = -2.0 * denominator;

      correction = func / derivative;
    } while (Math.abs(func) > Math$1.CesiumMath.EPSILON12);

    if (!defaultValue.defined(result)) {
      return new Cartesian3(
        positionX * xMultiplier,
        positionY * yMultiplier,
        positionZ * zMultiplier
      );
    }
    result.x = positionX * xMultiplier;
    result.y = positionY * yMultiplier;
    result.z = positionZ * zMultiplier;
    return result;
  }

  /**
   * A position defined by longitude, latitude, and height.
   * @alias Cartographic
   * @constructor
   *
   * @param {Number} [longitude=0.0] The longitude, in radians.
   * @param {Number} [latitude=0.0] The latitude, in radians.
   * @param {Number} [height=0.0] The height, in meters, above the ellipsoid.
   *
   * @see Ellipsoid
   */
  function Cartographic(longitude, latitude, height) {
    /**
     * The longitude, in radians.
     * @type {Number}
     * @default 0.0
     */
    this.longitude = defaultValue.defaultValue(longitude, 0.0);

    /**
     * The latitude, in radians.
     * @type {Number}
     * @default 0.0
     */
    this.latitude = defaultValue.defaultValue(latitude, 0.0);

    /**
     * The height, in meters, above the ellipsoid.
     * @type {Number}
     * @default 0.0
     */
    this.height = defaultValue.defaultValue(height, 0.0);
  }

  /**
   * Creates a new Cartographic instance from longitude and latitude
   * specified in radians.
   *
   * @param {Number} longitude The longitude, in radians.
   * @param {Number} latitude The latitude, in radians.
   * @param {Number} [height=0.0] The height, in meters, above the ellipsoid.
   * @param {Cartographic} [result] The object onto which to store the result.
   * @returns {Cartographic} The modified result parameter or a new Cartographic instance if one was not provided.
   */
  Cartographic.fromRadians = function (longitude, latitude, height, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("longitude", longitude);
    Check.Check.typeOf.number("latitude", latitude);
    //>>includeEnd('debug');

    height = defaultValue.defaultValue(height, 0.0);

    if (!defaultValue.defined(result)) {
      return new Cartographic(longitude, latitude, height);
    }

    result.longitude = longitude;
    result.latitude = latitude;
    result.height = height;
    return result;
  };

  /**
   * Creates a new Cartographic instance from longitude and latitude
   * specified in degrees.  The values in the resulting object will
   * be in radians.
   *
   * @param {Number} longitude The longitude, in degrees.
   * @param {Number} latitude The latitude, in degrees.
   * @param {Number} [height=0.0] The height, in meters, above the ellipsoid.
   * @param {Cartographic} [result] The object onto which to store the result.
   * @returns {Cartographic} The modified result parameter or a new Cartographic instance if one was not provided.
   */
  Cartographic.fromDegrees = function (longitude, latitude, height, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("longitude", longitude);
    Check.Check.typeOf.number("latitude", latitude);
    //>>includeEnd('debug');
    longitude = Math$1.CesiumMath.toRadians(longitude);
    latitude = Math$1.CesiumMath.toRadians(latitude);

    return Cartographic.fromRadians(longitude, latitude, height, result);
  };

  const cartesianToCartographicN$1 = new Cartesian3();
  const cartesianToCartographicP$1 = new Cartesian3();
  const cartesianToCartographicH$1 = new Cartesian3();
  const wgs84OneOverRadii = new Cartesian3(
    1.0 / 6378137.0,
    1.0 / 6378137.0,
    1.0 / 6356752.3142451793
  );
  const wgs84OneOverRadiiSquared = new Cartesian3(
    1.0 / (6378137.0 * 6378137.0),
    1.0 / (6378137.0 * 6378137.0),
    1.0 / (6356752.3142451793 * 6356752.3142451793)
  );
  const wgs84CenterToleranceSquared = Math$1.CesiumMath.EPSILON1;

  /**
   * Creates a new Cartographic instance from a Cartesian position. The values in the
   * resulting object will be in radians.
   *
   * @param {Cartesian3} cartesian The Cartesian position to convert to cartographic representation.
   * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the position lies.
   * @param {Cartographic} [result] The object onto which to store the result.
   * @returns {Cartographic} The modified result parameter, new Cartographic instance if none was provided, or undefined if the cartesian is at the center of the ellipsoid.
   */
  Cartographic.fromCartesian = function (cartesian, ellipsoid, result) {
    const oneOverRadii = defaultValue.defined(ellipsoid)
      ? ellipsoid.oneOverRadii
      : wgs84OneOverRadii;
    const oneOverRadiiSquared = defaultValue.defined(ellipsoid)
      ? ellipsoid.oneOverRadiiSquared
      : wgs84OneOverRadiiSquared;
    const centerToleranceSquared = defaultValue.defined(ellipsoid)
      ? ellipsoid._centerToleranceSquared
      : wgs84CenterToleranceSquared;

    //`cartesian is required.` is thrown from scaleToGeodeticSurface
    const p = scaleToGeodeticSurface(
      cartesian,
      oneOverRadii,
      oneOverRadiiSquared,
      centerToleranceSquared,
      cartesianToCartographicP$1
    );

    if (!defaultValue.defined(p)) {
      return undefined;
    }

    let n = Cartesian3.multiplyComponents(
      p,
      oneOverRadiiSquared,
      cartesianToCartographicN$1
    );
    n = Cartesian3.normalize(n, n);

    const h = Cartesian3.subtract(cartesian, p, cartesianToCartographicH$1);

    const longitude = Math.atan2(n.y, n.x);
    const latitude = Math.asin(n.z);
    const height =
      Math$1.CesiumMath.sign(Cartesian3.dot(h, cartesian)) * Cartesian3.magnitude(h);

    if (!defaultValue.defined(result)) {
      return new Cartographic(longitude, latitude, height);
    }
    result.longitude = longitude;
    result.latitude = latitude;
    result.height = height;
    return result;
  };

  /**
   * Creates a new Cartesian3 instance from a Cartographic input. The values in the inputted
   * object should be in radians.
   *
   * @param {Cartographic} cartographic Input to be converted into a Cartesian3 output.
   * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the position lies.
   * @param {Cartesian3} [result] The object onto which to store the result.
   * @returns {Cartesian3} The position
   */
  Cartographic.toCartesian = function (cartographic, ellipsoid, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("cartographic", cartographic);
    //>>includeEnd('debug');

    return Cartesian3.fromRadians(
      cartographic.longitude,
      cartographic.latitude,
      cartographic.height,
      ellipsoid,
      result
    );
  };

  /**
   * Duplicates a Cartographic instance.
   *
   * @param {Cartographic} cartographic The cartographic to duplicate.
   * @param {Cartographic} [result] The object onto which to store the result.
   * @returns {Cartographic} The modified result parameter or a new Cartographic instance if one was not provided. (Returns undefined if cartographic is undefined)
   */
  Cartographic.clone = function (cartographic, result) {
    if (!defaultValue.defined(cartographic)) {
      return undefined;
    }
    if (!defaultValue.defined(result)) {
      return new Cartographic(
        cartographic.longitude,
        cartographic.latitude,
        cartographic.height
      );
    }
    result.longitude = cartographic.longitude;
    result.latitude = cartographic.latitude;
    result.height = cartographic.height;
    return result;
  };

  /**
   * Compares the provided cartographics componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {Cartographic} [left] The first cartographic.
   * @param {Cartographic} [right] The second cartographic.
   * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
   */
  Cartographic.equals = function (left, right) {
    return (
      left === right ||
      (defaultValue.defined(left) &&
        defaultValue.defined(right) &&
        left.longitude === right.longitude &&
        left.latitude === right.latitude &&
        left.height === right.height)
    );
  };

  /**
   * Compares the provided cartographics componentwise and returns
   * <code>true</code> if they are within the provided epsilon,
   * <code>false</code> otherwise.
   *
   * @param {Cartographic} [left] The first cartographic.
   * @param {Cartographic} [right] The second cartographic.
   * @param {Number} [epsilon=0] The epsilon to use for equality testing.
   * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
   */
  Cartographic.equalsEpsilon = function (left, right, epsilon) {
    epsilon = defaultValue.defaultValue(epsilon, 0);

    return (
      left === right ||
      (defaultValue.defined(left) &&
        defaultValue.defined(right) &&
        Math.abs(left.longitude - right.longitude) <= epsilon &&
        Math.abs(left.latitude - right.latitude) <= epsilon &&
        Math.abs(left.height - right.height) <= epsilon)
    );
  };

  /**
   * An immutable Cartographic instance initialized to (0.0, 0.0, 0.0).
   *
   * @type {Cartographic}
   * @constant
   */
  Cartographic.ZERO = Object.freeze(new Cartographic(0.0, 0.0, 0.0));

  /**
   * Duplicates this instance.
   *
   * @param {Cartographic} [result] The object onto which to store the result.
   * @returns {Cartographic} The modified result parameter or a new Cartographic instance if one was not provided.
   */
  Cartographic.prototype.clone = function (result) {
    return Cartographic.clone(this, result);
  };

  /**
   * Compares the provided against this cartographic componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {Cartographic} [right] The second cartographic.
   * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
   */
  Cartographic.prototype.equals = function (right) {
    return Cartographic.equals(this, right);
  };

  /**
   * Compares the provided against this cartographic componentwise and returns
   * <code>true</code> if they are within the provided epsilon,
   * <code>false</code> otherwise.
   *
   * @param {Cartographic} [right] The second cartographic.
   * @param {Number} [epsilon=0] The epsilon to use for equality testing.
   * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
   */
  Cartographic.prototype.equalsEpsilon = function (right, epsilon) {
    return Cartographic.equalsEpsilon(this, right, epsilon);
  };

  /**
   * Creates a string representing this cartographic in the format '(longitude, latitude, height)'.
   *
   * @returns {String} A string representing the provided cartographic in the format '(longitude, latitude, height)'.
   */
  Cartographic.prototype.toString = function () {
    return `(${this.longitude}, ${this.latitude}, ${this.height})`;
  };

  function initialize(ellipsoid, x, y, z) {
    x = defaultValue.defaultValue(x, 0.0);
    y = defaultValue.defaultValue(y, 0.0);
    z = defaultValue.defaultValue(z, 0.0);

    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number.greaterThanOrEquals("x", x, 0.0);
    Check.Check.typeOf.number.greaterThanOrEquals("y", y, 0.0);
    Check.Check.typeOf.number.greaterThanOrEquals("z", z, 0.0);
    //>>includeEnd('debug');

    ellipsoid._radii = new Cartesian3(x, y, z);

    ellipsoid._radiiSquared = new Cartesian3(x * x, y * y, z * z);

    ellipsoid._radiiToTheFourth = new Cartesian3(
      x * x * x * x,
      y * y * y * y,
      z * z * z * z
    );

    ellipsoid._oneOverRadii = new Cartesian3(
      x === 0.0 ? 0.0 : 1.0 / x,
      y === 0.0 ? 0.0 : 1.0 / y,
      z === 0.0 ? 0.0 : 1.0 / z
    );

    ellipsoid._oneOverRadiiSquared = new Cartesian3(
      x === 0.0 ? 0.0 : 1.0 / (x * x),
      y === 0.0 ? 0.0 : 1.0 / (y * y),
      z === 0.0 ? 0.0 : 1.0 / (z * z)
    );

    ellipsoid._minimumRadius = Math.min(x, y, z);

    ellipsoid._maximumRadius = Math.max(x, y, z);

    ellipsoid._centerToleranceSquared = Math$1.CesiumMath.EPSILON1;

    if (ellipsoid._radiiSquared.z !== 0) {
      ellipsoid._squaredXOverSquaredZ =
        ellipsoid._radiiSquared.x / ellipsoid._radiiSquared.z;
    }
  }

  /**
   * A quadratic surface defined in Cartesian coordinates by the equation
   * <code>(x / a)^2 + (y / b)^2 + (z / c)^2 = 1</code>.  Primarily used
   * by Cesium to represent the shape of planetary bodies.
   *
   * Rather than constructing this object directly, one of the provided
   * constants is normally used.
   * @alias Ellipsoid
   * @constructor
   *
   * @param {Number} [x=0] The radius in the x direction.
   * @param {Number} [y=0] The radius in the y direction.
   * @param {Number} [z=0] The radius in the z direction.
   *
   * @exception {DeveloperError} All radii components must be greater than or equal to zero.
   *
   * @see Ellipsoid.fromCartesian3
   * @see Ellipsoid.WGS84
   * @see Ellipsoid.UNIT_SPHERE
   */
  function Ellipsoid(x, y, z) {
    this._radii = undefined;
    this._radiiSquared = undefined;
    this._radiiToTheFourth = undefined;
    this._oneOverRadii = undefined;
    this._oneOverRadiiSquared = undefined;
    this._minimumRadius = undefined;
    this._maximumRadius = undefined;
    this._centerToleranceSquared = undefined;
    this._squaredXOverSquaredZ = undefined;

    initialize(this, x, y, z);
  }

  Object.defineProperties(Ellipsoid.prototype, {
    /**
     * Gets the radii of the ellipsoid.
     * @memberof Ellipsoid.prototype
     * @type {Cartesian3}
     * @readonly
     */
    radii: {
      get: function () {
        return this._radii;
      },
    },
    /**
     * Gets the squared radii of the ellipsoid.
     * @memberof Ellipsoid.prototype
     * @type {Cartesian3}
     * @readonly
     */
    radiiSquared: {
      get: function () {
        return this._radiiSquared;
      },
    },
    /**
     * Gets the radii of the ellipsoid raise to the fourth power.
     * @memberof Ellipsoid.prototype
     * @type {Cartesian3}
     * @readonly
     */
    radiiToTheFourth: {
      get: function () {
        return this._radiiToTheFourth;
      },
    },
    /**
     * Gets one over the radii of the ellipsoid.
     * @memberof Ellipsoid.prototype
     * @type {Cartesian3}
     * @readonly
     */
    oneOverRadii: {
      get: function () {
        return this._oneOverRadii;
      },
    },
    /**
     * Gets one over the squared radii of the ellipsoid.
     * @memberof Ellipsoid.prototype
     * @type {Cartesian3}
     * @readonly
     */
    oneOverRadiiSquared: {
      get: function () {
        return this._oneOverRadiiSquared;
      },
    },
    /**
     * Gets the minimum radius of the ellipsoid.
     * @memberof Ellipsoid.prototype
     * @type {Number}
     * @readonly
     */
    minimumRadius: {
      get: function () {
        return this._minimumRadius;
      },
    },
    /**
     * Gets the maximum radius of the ellipsoid.
     * @memberof Ellipsoid.prototype
     * @type {Number}
     * @readonly
     */
    maximumRadius: {
      get: function () {
        return this._maximumRadius;
      },
    },
  });

  /**
   * Duplicates an Ellipsoid instance.
   *
   * @param {Ellipsoid} ellipsoid The ellipsoid to duplicate.
   * @param {Ellipsoid} [result] The object onto which to store the result, or undefined if a new
   *                    instance should be created.
   * @returns {Ellipsoid} The cloned Ellipsoid. (Returns undefined if ellipsoid is undefined)
   */
  Ellipsoid.clone = function (ellipsoid, result) {
    if (!defaultValue.defined(ellipsoid)) {
      return undefined;
    }
    const radii = ellipsoid._radii;

    if (!defaultValue.defined(result)) {
      return new Ellipsoid(radii.x, radii.y, radii.z);
    }

    Cartesian3.clone(radii, result._radii);
    Cartesian3.clone(ellipsoid._radiiSquared, result._radiiSquared);
    Cartesian3.clone(ellipsoid._radiiToTheFourth, result._radiiToTheFourth);
    Cartesian3.clone(ellipsoid._oneOverRadii, result._oneOverRadii);
    Cartesian3.clone(ellipsoid._oneOverRadiiSquared, result._oneOverRadiiSquared);
    result._minimumRadius = ellipsoid._minimumRadius;
    result._maximumRadius = ellipsoid._maximumRadius;
    result._centerToleranceSquared = ellipsoid._centerToleranceSquared;

    return result;
  };

  /**
   * Computes an Ellipsoid from a Cartesian specifying the radii in x, y, and z directions.
   *
   * @param {Cartesian3} [cartesian=Cartesian3.ZERO] The ellipsoid's radius in the x, y, and z directions.
   * @param {Ellipsoid} [result] The object onto which to store the result, or undefined if a new
   *                    instance should be created.
   * @returns {Ellipsoid} A new Ellipsoid instance.
   *
   * @exception {DeveloperError} All radii components must be greater than or equal to zero.
   *
   * @see Ellipsoid.WGS84
   * @see Ellipsoid.UNIT_SPHERE
   */
  Ellipsoid.fromCartesian3 = function (cartesian, result) {
    if (!defaultValue.defined(result)) {
      result = new Ellipsoid();
    }

    if (!defaultValue.defined(cartesian)) {
      return result;
    }

    initialize(result, cartesian.x, cartesian.y, cartesian.z);
    return result;
  };

  /**
   * An Ellipsoid instance initialized to the WGS84 standard.
   *
   * @type {Ellipsoid}
   * @constant
   */
  Ellipsoid.WGS84 = Object.freeze(
    new Ellipsoid(6378137.0, 6378137.0, 6356752.3142451793)
  );

  /**
   * An Ellipsoid instance initialized to radii of (1.0, 1.0, 1.0).
   *
   * @type {Ellipsoid}
   * @constant
   */
  Ellipsoid.UNIT_SPHERE = Object.freeze(new Ellipsoid(1.0, 1.0, 1.0));

  /**
   * An Ellipsoid instance initialized to a sphere with the lunar radius.
   *
   * @type {Ellipsoid}
   * @constant
   */
  Ellipsoid.MOON = Object.freeze(
    new Ellipsoid(
      Math$1.CesiumMath.LUNAR_RADIUS,
      Math$1.CesiumMath.LUNAR_RADIUS,
      Math$1.CesiumMath.LUNAR_RADIUS
    )
  );

  /**
   * Duplicates an Ellipsoid instance.
   *
   * @param {Ellipsoid} [result] The object onto which to store the result, or undefined if a new
   *                    instance should be created.
   * @returns {Ellipsoid} The cloned Ellipsoid.
   */
  Ellipsoid.prototype.clone = function (result) {
    return Ellipsoid.clone(this, result);
  };

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  Ellipsoid.packedLength = Cartesian3.packedLength;

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {Ellipsoid} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  Ellipsoid.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("value", value);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    Cartesian3.pack(value._radii, array, startingIndex);

    return array;
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {Ellipsoid} [result] The object into which to store the result.
   * @returns {Ellipsoid} The modified result parameter or a new Ellipsoid instance if one was not provided.
   */
  Ellipsoid.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    const radii = Cartesian3.unpack(array, startingIndex);
    return Ellipsoid.fromCartesian3(radii, result);
  };

  /**
   * Computes the unit vector directed from the center of this ellipsoid toward the provided Cartesian position.
   * @function
   *
   * @param {Cartesian3} cartesian The Cartesian for which to to determine the geocentric normal.
   * @param {Cartesian3} [result] The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
   */
  Ellipsoid.prototype.geocentricSurfaceNormal = Cartesian3.normalize;

  /**
   * Computes the normal of the plane tangent to the surface of the ellipsoid at the provided position.
   *
   * @param {Cartographic} cartographic The cartographic position for which to to determine the geodetic normal.
   * @param {Cartesian3} [result] The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
   */
  Ellipsoid.prototype.geodeticSurfaceNormalCartographic = function (
    cartographic,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartographic", cartographic);
    //>>includeEnd('debug');

    const longitude = cartographic.longitude;
    const latitude = cartographic.latitude;
    const cosLatitude = Math.cos(latitude);

    const x = cosLatitude * Math.cos(longitude);
    const y = cosLatitude * Math.sin(longitude);
    const z = Math.sin(latitude);

    if (!defaultValue.defined(result)) {
      result = new Cartesian3();
    }
    result.x = x;
    result.y = y;
    result.z = z;
    return Cartesian3.normalize(result, result);
  };

  /**
   * Computes the normal of the plane tangent to the surface of the ellipsoid at the provided position.
   *
   * @param {Cartesian3} cartesian The Cartesian position for which to to determine the surface normal.
   * @param {Cartesian3} [result] The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided, or undefined if a normal cannot be found.
   */
  Ellipsoid.prototype.geodeticSurfaceNormal = function (cartesian, result) {
    if (
      Cartesian3.equalsEpsilon(cartesian, Cartesian3.ZERO, Math$1.CesiumMath.EPSILON14)
    ) {
      return undefined;
    }
    if (!defaultValue.defined(result)) {
      result = new Cartesian3();
    }
    result = Cartesian3.multiplyComponents(
      cartesian,
      this._oneOverRadiiSquared,
      result
    );
    return Cartesian3.normalize(result, result);
  };

  const cartographicToCartesianNormal = new Cartesian3();
  const cartographicToCartesianK = new Cartesian3();

  /**
   * Converts the provided cartographic to Cartesian representation.
   *
   * @param {Cartographic} cartographic The cartographic position.
   * @param {Cartesian3} [result] The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
   *
   * @example
   * //Create a Cartographic and determine it's Cartesian representation on a WGS84 ellipsoid.
   * const position = new Cesium.Cartographic(Cesium.Math.toRadians(21), Cesium.Math.toRadians(78), 5000);
   * const cartesianPosition = Cesium.Ellipsoid.WGS84.cartographicToCartesian(position);
   */
  Ellipsoid.prototype.cartographicToCartesian = function (cartographic, result) {
    //`cartographic is required` is thrown from geodeticSurfaceNormalCartographic.
    const n = cartographicToCartesianNormal;
    const k = cartographicToCartesianK;
    this.geodeticSurfaceNormalCartographic(cartographic, n);
    Cartesian3.multiplyComponents(this._radiiSquared, n, k);
    const gamma = Math.sqrt(Cartesian3.dot(n, k));
    Cartesian3.divideByScalar(k, gamma, k);
    Cartesian3.multiplyByScalar(n, cartographic.height, n);

    if (!defaultValue.defined(result)) {
      result = new Cartesian3();
    }
    return Cartesian3.add(k, n, result);
  };

  /**
   * Converts the provided array of cartographics to an array of Cartesians.
   *
   * @param {Cartographic[]} cartographics An array of cartographic positions.
   * @param {Cartesian3[]} [result] The object onto which to store the result.
   * @returns {Cartesian3[]} The modified result parameter or a new Array instance if none was provided.
   *
   * @example
   * //Convert an array of Cartographics and determine their Cartesian representation on a WGS84 ellipsoid.
   * const positions = [new Cesium.Cartographic(Cesium.Math.toRadians(21), Cesium.Math.toRadians(78), 0),
   *                  new Cesium.Cartographic(Cesium.Math.toRadians(21.321), Cesium.Math.toRadians(78.123), 100),
   *                  new Cesium.Cartographic(Cesium.Math.toRadians(21.645), Cesium.Math.toRadians(78.456), 250)];
   * const cartesianPositions = Cesium.Ellipsoid.WGS84.cartographicArrayToCartesianArray(positions);
   */
  Ellipsoid.prototype.cartographicArrayToCartesianArray = function (
    cartographics,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("cartographics", cartographics);
    //>>includeEnd('debug')

    const length = cartographics.length;
    if (!defaultValue.defined(result)) {
      result = new Array(length);
    } else {
      result.length = length;
    }
    for (let i = 0; i < length; i++) {
      result[i] = this.cartographicToCartesian(cartographics[i], result[i]);
    }
    return result;
  };

  const cartesianToCartographicN = new Cartesian3();
  const cartesianToCartographicP = new Cartesian3();
  const cartesianToCartographicH = new Cartesian3();

  /**
   * Converts the provided cartesian to cartographic representation.
   * The cartesian is undefined at the center of the ellipsoid.
   *
   * @param {Cartesian3} cartesian The Cartesian position to convert to cartographic representation.
   * @param {Cartographic} [result] The object onto which to store the result.
   * @returns {Cartographic} The modified result parameter, new Cartographic instance if none was provided, or undefined if the cartesian is at the center of the ellipsoid.
   *
   * @example
   * //Create a Cartesian and determine it's Cartographic representation on a WGS84 ellipsoid.
   * const position = new Cesium.Cartesian3(17832.12, 83234.52, 952313.73);
   * const cartographicPosition = Cesium.Ellipsoid.WGS84.cartesianToCartographic(position);
   */
  Ellipsoid.prototype.cartesianToCartographic = function (cartesian, result) {
    //`cartesian is required.` is thrown from scaleToGeodeticSurface
    const p = this.scaleToGeodeticSurface(cartesian, cartesianToCartographicP);

    if (!defaultValue.defined(p)) {
      return undefined;
    }

    const n = this.geodeticSurfaceNormal(p, cartesianToCartographicN);
    const h = Cartesian3.subtract(cartesian, p, cartesianToCartographicH);

    const longitude = Math.atan2(n.y, n.x);
    const latitude = Math.asin(n.z);
    const height =
      Math$1.CesiumMath.sign(Cartesian3.dot(h, cartesian)) * Cartesian3.magnitude(h);

    if (!defaultValue.defined(result)) {
      return new Cartographic(longitude, latitude, height);
    }
    result.longitude = longitude;
    result.latitude = latitude;
    result.height = height;
    return result;
  };

  /**
   * Converts the provided array of cartesians to an array of cartographics.
   *
   * @param {Cartesian3[]} cartesians An array of Cartesian positions.
   * @param {Cartographic[]} [result] The object onto which to store the result.
   * @returns {Cartographic[]} The modified result parameter or a new Array instance if none was provided.
   *
   * @example
   * //Create an array of Cartesians and determine their Cartographic representation on a WGS84 ellipsoid.
   * const positions = [new Cesium.Cartesian3(17832.12, 83234.52, 952313.73),
   *                  new Cesium.Cartesian3(17832.13, 83234.53, 952313.73),
   *                  new Cesium.Cartesian3(17832.14, 83234.54, 952313.73)]
   * const cartographicPositions = Cesium.Ellipsoid.WGS84.cartesianArrayToCartographicArray(positions);
   */
  Ellipsoid.prototype.cartesianArrayToCartographicArray = function (
    cartesians,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("cartesians", cartesians);
    //>>includeEnd('debug');

    const length = cartesians.length;
    if (!defaultValue.defined(result)) {
      result = new Array(length);
    } else {
      result.length = length;
    }
    for (let i = 0; i < length; ++i) {
      result[i] = this.cartesianToCartographic(cartesians[i], result[i]);
    }
    return result;
  };

  /**
   * Scales the provided Cartesian position along the geodetic surface normal
   * so that it is on the surface of this ellipsoid.  If the position is
   * at the center of the ellipsoid, this function returns undefined.
   *
   * @param {Cartesian3} cartesian The Cartesian position to scale.
   * @param {Cartesian3} [result] The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter, a new Cartesian3 instance if none was provided, or undefined if the position is at the center.
   */
  Ellipsoid.prototype.scaleToGeodeticSurface = function (cartesian, result) {
    return scaleToGeodeticSurface(
      cartesian,
      this._oneOverRadii,
      this._oneOverRadiiSquared,
      this._centerToleranceSquared,
      result
    );
  };

  /**
   * Scales the provided Cartesian position along the geocentric surface normal
   * so that it is on the surface of this ellipsoid.
   *
   * @param {Cartesian3} cartesian The Cartesian position to scale.
   * @param {Cartesian3} [result] The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter or a new Cartesian3 instance if none was provided.
   */
  Ellipsoid.prototype.scaleToGeocentricSurface = function (cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      result = new Cartesian3();
    }

    const positionX = cartesian.x;
    const positionY = cartesian.y;
    const positionZ = cartesian.z;
    const oneOverRadiiSquared = this._oneOverRadiiSquared;

    const beta =
      1.0 /
      Math.sqrt(
        positionX * positionX * oneOverRadiiSquared.x +
          positionY * positionY * oneOverRadiiSquared.y +
          positionZ * positionZ * oneOverRadiiSquared.z
      );

    return Cartesian3.multiplyByScalar(cartesian, beta, result);
  };

  /**
   * Transforms a Cartesian X, Y, Z position to the ellipsoid-scaled space by multiplying
   * its components by the result of {@link Ellipsoid#oneOverRadii}.
   *
   * @param {Cartesian3} position The position to transform.
   * @param {Cartesian3} [result] The position to which to copy the result, or undefined to create and
   *        return a new instance.
   * @returns {Cartesian3} The position expressed in the scaled space.  The returned instance is the
   *          one passed as the result parameter if it is not undefined, or a new instance of it is.
   */
  Ellipsoid.prototype.transformPositionToScaledSpace = function (
    position,
    result
  ) {
    if (!defaultValue.defined(result)) {
      result = new Cartesian3();
    }

    return Cartesian3.multiplyComponents(position, this._oneOverRadii, result);
  };

  /**
   * Transforms a Cartesian X, Y, Z position from the ellipsoid-scaled space by multiplying
   * its components by the result of {@link Ellipsoid#radii}.
   *
   * @param {Cartesian3} position The position to transform.
   * @param {Cartesian3} [result] The position to which to copy the result, or undefined to create and
   *        return a new instance.
   * @returns {Cartesian3} The position expressed in the unscaled space.  The returned instance is the
   *          one passed as the result parameter if it is not undefined, or a new instance of it is.
   */
  Ellipsoid.prototype.transformPositionFromScaledSpace = function (
    position,
    result
  ) {
    if (!defaultValue.defined(result)) {
      result = new Cartesian3();
    }

    return Cartesian3.multiplyComponents(position, this._radii, result);
  };

  /**
   * Compares this Ellipsoid against the provided Ellipsoid componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {Ellipsoid} [right] The other Ellipsoid.
   * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
   */
  Ellipsoid.prototype.equals = function (right) {
    return (
      this === right ||
      (defaultValue.defined(right) && Cartesian3.equals(this._radii, right._radii))
    );
  };

  /**
   * Creates a string representing this Ellipsoid in the format '(radii.x, radii.y, radii.z)'.
   *
   * @returns {String} A string representing this ellipsoid in the format '(radii.x, radii.y, radii.z)'.
   */
  Ellipsoid.prototype.toString = function () {
    return this._radii.toString();
  };

  /**
   * Computes a point which is the intersection of the surface normal with the z-axis.
   *
   * @param {Cartesian3} position the position. must be on the surface of the ellipsoid.
   * @param {Number} [buffer = 0.0] A buffer to subtract from the ellipsoid size when checking if the point is inside the ellipsoid.
   *                                In earth case, with common earth datums, there is no need for this buffer since the intersection point is always (relatively) very close to the center.
   *                                In WGS84 datum, intersection point is at max z = +-42841.31151331382 (0.673% of z-axis).
   *                                Intersection point could be outside the ellipsoid if the ratio of MajorAxis / AxisOfRotation is bigger than the square root of 2
   * @param {Cartesian3} [result] The cartesian to which to copy the result, or undefined to create and
   *        return a new instance.
   * @returns {Cartesian3 | undefined} the intersection point if it's inside the ellipsoid, undefined otherwise
   *
   * @exception {DeveloperError} position is required.
   * @exception {DeveloperError} Ellipsoid must be an ellipsoid of revolution (radii.x == radii.y).
   * @exception {DeveloperError} Ellipsoid.radii.z must be greater than 0.
   */
  Ellipsoid.prototype.getSurfaceNormalIntersectionWithZAxis = function (
    position,
    buffer,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("position", position);

    if (
      !Math$1.CesiumMath.equalsEpsilon(
        this._radii.x,
        this._radii.y,
        Math$1.CesiumMath.EPSILON15
      )
    ) {
      throw new Check.DeveloperError(
        "Ellipsoid must be an ellipsoid of revolution (radii.x == radii.y)"
      );
    }

    Check.Check.typeOf.number.greaterThan("Ellipsoid.radii.z", this._radii.z, 0);
    //>>includeEnd('debug');

    buffer = defaultValue.defaultValue(buffer, 0.0);

    const squaredXOverSquaredZ = this._squaredXOverSquaredZ;

    if (!defaultValue.defined(result)) {
      result = new Cartesian3();
    }

    result.x = 0.0;
    result.y = 0.0;
    result.z = position.z * (1 - squaredXOverSquaredZ);

    if (Math.abs(result.z) >= this._radii.z - buffer) {
      return undefined;
    }

    return result;
  };

  const abscissas = [
    0.14887433898163,
    0.43339539412925,
    0.67940956829902,
    0.86506336668898,
    0.97390652851717,
    0.0,
  ];
  const weights = [
    0.29552422471475,
    0.26926671930999,
    0.21908636251598,
    0.14945134915058,
    0.066671344308684,
    0.0,
  ];

  /**
   * Compute the 10th order Gauss-Legendre Quadrature of the given definite integral.
   *
   * @param {Number} a The lower bound for the integration.
   * @param {Number} b The upper bound for the integration.
   * @param {Ellipsoid~RealValuedScalarFunction} func The function to integrate.
   * @returns {Number} The value of the integral of the given function over the given domain.
   *
   * @private
   */
  function gaussLegendreQuadrature(a, b, func) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("a", a);
    Check.Check.typeOf.number("b", b);
    Check.Check.typeOf.func("func", func);
    //>>includeEnd('debug');

    // The range is half of the normal range since the five weights add to one (ten weights add to two).
    // The values of the abscissas are multiplied by two to account for this.
    const xMean = 0.5 * (b + a);
    const xRange = 0.5 * (b - a);

    let sum = 0.0;
    for (let i = 0; i < 5; i++) {
      const dx = xRange * abscissas[i];
      sum += weights[i] * (func(xMean + dx) + func(xMean - dx));
    }

    // Scale the sum to the range of x.
    sum *= xRange;
    return sum;
  }

  /**
   * A real valued scalar function.
   * @callback Ellipsoid~RealValuedScalarFunction
   *
   * @param {Number} x The value used to evaluate the function.
   * @returns {Number} The value of the function at x.
   *
   * @private
   */

  /**
   * Computes an approximation of the surface area of a rectangle on the surface of an ellipsoid using
   * Gauss-Legendre 10th order quadrature.
   *
   * @param {Rectangle} rectangle The rectangle used for computing the surface area.
   * @returns {Number} The approximate area of the rectangle on the surface of this ellipsoid.
   */
  Ellipsoid.prototype.surfaceArea = function (rectangle) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("rectangle", rectangle);
    //>>includeEnd('debug');
    const minLongitude = rectangle.west;
    let maxLongitude = rectangle.east;
    const minLatitude = rectangle.south;
    const maxLatitude = rectangle.north;

    while (maxLongitude < minLongitude) {
      maxLongitude += Math$1.CesiumMath.TWO_PI;
    }

    const radiiSquared = this._radiiSquared;
    const a2 = radiiSquared.x;
    const b2 = radiiSquared.y;
    const c2 = radiiSquared.z;
    const a2b2 = a2 * b2;
    return gaussLegendreQuadrature(minLatitude, maxLatitude, function (lat) {
      // phi represents the angle measured from the north pole
      // sin(phi) = sin(pi / 2 - lat) = cos(lat), cos(phi) is similar
      const sinPhi = Math.cos(lat);
      const cosPhi = Math.sin(lat);
      return (
        Math.cos(lat) *
        gaussLegendreQuadrature(minLongitude, maxLongitude, function (lon) {
          const cosTheta = Math.cos(lon);
          const sinTheta = Math.sin(lon);
          return Math.sqrt(
            a2b2 * cosPhi * cosPhi +
              c2 *
                (b2 * cosTheta * cosTheta + a2 * sinTheta * sinTheta) *
                sinPhi *
                sinPhi
          );
        })
      );
    });
  };

  /**
   * A 3x3 matrix, indexable as a column-major order array.
   * Constructor parameters are in row-major order for code readability.
   * @alias Matrix3
   * @constructor
   * @implements {ArrayLike<number>}
   *
   * @param {Number} [column0Row0=0.0] The value for column 0, row 0.
   * @param {Number} [column1Row0=0.0] The value for column 1, row 0.
   * @param {Number} [column2Row0=0.0] The value for column 2, row 0.
   * @param {Number} [column0Row1=0.0] The value for column 0, row 1.
   * @param {Number} [column1Row1=0.0] The value for column 1, row 1.
   * @param {Number} [column2Row1=0.0] The value for column 2, row 1.
   * @param {Number} [column0Row2=0.0] The value for column 0, row 2.
   * @param {Number} [column1Row2=0.0] The value for column 1, row 2.
   * @param {Number} [column2Row2=0.0] The value for column 2, row 2.
   *
   * @see Matrix3.fromArray
   * @see Matrix3.fromColumnMajorArray
   * @see Matrix3.fromRowMajorArray
   * @see Matrix3.fromQuaternion
   * @see Matrix3.fromHeadingPitchRoll
   * @see Matrix3.fromScale
   * @see Matrix3.fromUniformScale
   * @see Matrix3.fromCrossProduct
   * @see Matrix3.fromRotationX
   * @see Matrix3.fromRotationY
   * @see Matrix3.fromRotationZ
   * @see Matrix2
   * @see Matrix4
   */
  function Matrix3(
    column0Row0,
    column1Row0,
    column2Row0,
    column0Row1,
    column1Row1,
    column2Row1,
    column0Row2,
    column1Row2,
    column2Row2
  ) {
    this[0] = defaultValue.defaultValue(column0Row0, 0.0);
    this[1] = defaultValue.defaultValue(column0Row1, 0.0);
    this[2] = defaultValue.defaultValue(column0Row2, 0.0);
    this[3] = defaultValue.defaultValue(column1Row0, 0.0);
    this[4] = defaultValue.defaultValue(column1Row1, 0.0);
    this[5] = defaultValue.defaultValue(column1Row2, 0.0);
    this[6] = defaultValue.defaultValue(column2Row0, 0.0);
    this[7] = defaultValue.defaultValue(column2Row1, 0.0);
    this[8] = defaultValue.defaultValue(column2Row2, 0.0);
  }

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  Matrix3.packedLength = 9;

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {Matrix3} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  Matrix3.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("value", value);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    array[startingIndex++] = value[0];
    array[startingIndex++] = value[1];
    array[startingIndex++] = value[2];
    array[startingIndex++] = value[3];
    array[startingIndex++] = value[4];
    array[startingIndex++] = value[5];
    array[startingIndex++] = value[6];
    array[startingIndex++] = value[7];
    array[startingIndex++] = value[8];

    return array;
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {Matrix3} [result] The object into which to store the result.
   * @returns {Matrix3} The modified result parameter or a new Matrix3 instance if one was not provided.
   */
  Matrix3.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    if (!defaultValue.defined(result)) {
      result = new Matrix3();
    }

    result[0] = array[startingIndex++];
    result[1] = array[startingIndex++];
    result[2] = array[startingIndex++];
    result[3] = array[startingIndex++];
    result[4] = array[startingIndex++];
    result[5] = array[startingIndex++];
    result[6] = array[startingIndex++];
    result[7] = array[startingIndex++];
    result[8] = array[startingIndex++];
    return result;
  };

  /**
   * Flattens an array of Matrix3s into an array of components. The components
   * are stored in column-major order.
   *
   * @param {Matrix3[]} array The array of matrices to pack.
   * @param {Number[]} [result] The array onto which to store the result. If this is a typed array, it must have array.length * 9 components, else a {@link DeveloperError} will be thrown. If it is a regular array, it will be resized to have (array.length * 9) elements.
   * @returns {Number[]} The packed array.
   */
  Matrix3.packArray = function (array, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    const length = array.length;
    const resultLength = length * 9;
    if (!defaultValue.defined(result)) {
      result = new Array(resultLength);
    } else if (!Array.isArray(result) && result.length !== resultLength) {
      //>>includeStart('debug', pragmas.debug);
      throw new Check.DeveloperError(
        "If result is a typed array, it must have exactly array.length * 9 elements"
      );
      //>>includeEnd('debug');
    } else if (result.length !== resultLength) {
      result.length = resultLength;
    }

    for (let i = 0; i < length; ++i) {
      Matrix3.pack(array[i], result, i * 9);
    }
    return result;
  };

  /**
   * Unpacks an array of column-major matrix components into an array of Matrix3s.
   *
   * @param {Number[]} array The array of components to unpack.
   * @param {Matrix3[]} [result] The array onto which to store the result.
   * @returns {Matrix3[]} The unpacked array.
   */
  Matrix3.unpackArray = function (array, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    Check.Check.typeOf.number.greaterThanOrEquals("array.length", array.length, 9);
    if (array.length % 9 !== 0) {
      throw new Check.DeveloperError("array length must be a multiple of 9.");
    }
    //>>includeEnd('debug');

    const length = array.length;
    if (!defaultValue.defined(result)) {
      result = new Array(length / 9);
    } else {
      result.length = length / 9;
    }

    for (let i = 0; i < length; i += 9) {
      const index = i / 9;
      result[index] = Matrix3.unpack(array, i, result[index]);
    }
    return result;
  };

  /**
   * Duplicates a Matrix3 instance.
   *
   * @param {Matrix3} matrix The matrix to duplicate.
   * @param {Matrix3} [result] The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter or a new Matrix3 instance if one was not provided. (Returns undefined if matrix is undefined)
   */
  Matrix3.clone = function (matrix, result) {
    if (!defaultValue.defined(matrix)) {
      return undefined;
    }
    if (!defaultValue.defined(result)) {
      return new Matrix3(
        matrix[0],
        matrix[3],
        matrix[6],
        matrix[1],
        matrix[4],
        matrix[7],
        matrix[2],
        matrix[5],
        matrix[8]
      );
    }
    result[0] = matrix[0];
    result[1] = matrix[1];
    result[2] = matrix[2];
    result[3] = matrix[3];
    result[4] = matrix[4];
    result[5] = matrix[5];
    result[6] = matrix[6];
    result[7] = matrix[7];
    result[8] = matrix[8];
    return result;
  };

  /**
   * Creates a Matrix3 from 9 consecutive elements in an array.
   *
   * @function
   * @param {Number[]} array The array whose 9 consecutive elements correspond to the positions of the matrix.  Assumes column-major order.
   * @param {Number} [startingIndex=0] The offset into the array of the first element, which corresponds to first column first row position in the matrix.
   * @param {Matrix3} [result] The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter or a new Matrix3 instance if one was not provided.
   *
   * @example
   * // Create the Matrix3:
   * // [1.0, 2.0, 3.0]
   * // [1.0, 2.0, 3.0]
   * // [1.0, 2.0, 3.0]
   *
   * const v = [1.0, 1.0, 1.0, 2.0, 2.0, 2.0, 3.0, 3.0, 3.0];
   * const m = Cesium.Matrix3.fromArray(v);
   *
   * // Create same Matrix3 with using an offset into an array
   * const v2 = [0.0, 0.0, 1.0, 1.0, 1.0, 2.0, 2.0, 2.0, 3.0, 3.0, 3.0];
   * const m2 = Cesium.Matrix3.fromArray(v2, 2);
   */
  Matrix3.fromArray = Matrix3.unpack;

  /**
   * Creates a Matrix3 instance from a column-major order array.
   *
   * @param {Number[]} values The column-major order array.
   * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix3} The modified result parameter, or a new Matrix3 instance if one was not provided.
   */
  Matrix3.fromColumnMajorArray = function (values, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("values", values);
    //>>includeEnd('debug');

    return Matrix3.clone(values, result);
  };

  /**
   * Creates a Matrix3 instance from a row-major order array.
   * The resulting matrix will be in column-major order.
   *
   * @param {Number[]} values The row-major order array.
   * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix3} The modified result parameter, or a new Matrix3 instance if one was not provided.
   */
  Matrix3.fromRowMajorArray = function (values, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("values", values);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      return new Matrix3(
        values[0],
        values[1],
        values[2],
        values[3],
        values[4],
        values[5],
        values[6],
        values[7],
        values[8]
      );
    }
    result[0] = values[0];
    result[1] = values[3];
    result[2] = values[6];
    result[3] = values[1];
    result[4] = values[4];
    result[5] = values[7];
    result[6] = values[2];
    result[7] = values[5];
    result[8] = values[8];
    return result;
  };

  /**
   * Computes a 3x3 rotation matrix from the provided quaternion.
   *
   * @param {Quaternion} quaternion the quaternion to use.
   * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix3} The 3x3 rotation matrix from this quaternion.
   */
  Matrix3.fromQuaternion = function (quaternion, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("quaternion", quaternion);
    //>>includeEnd('debug');

    const x2 = quaternion.x * quaternion.x;
    const xy = quaternion.x * quaternion.y;
    const xz = quaternion.x * quaternion.z;
    const xw = quaternion.x * quaternion.w;
    const y2 = quaternion.y * quaternion.y;
    const yz = quaternion.y * quaternion.z;
    const yw = quaternion.y * quaternion.w;
    const z2 = quaternion.z * quaternion.z;
    const zw = quaternion.z * quaternion.w;
    const w2 = quaternion.w * quaternion.w;

    const m00 = x2 - y2 - z2 + w2;
    const m01 = 2.0 * (xy - zw);
    const m02 = 2.0 * (xz + yw);

    const m10 = 2.0 * (xy + zw);
    const m11 = -x2 + y2 - z2 + w2;
    const m12 = 2.0 * (yz - xw);

    const m20 = 2.0 * (xz - yw);
    const m21 = 2.0 * (yz + xw);
    const m22 = -x2 - y2 + z2 + w2;

    if (!defaultValue.defined(result)) {
      return new Matrix3(m00, m01, m02, m10, m11, m12, m20, m21, m22);
    }
    result[0] = m00;
    result[1] = m10;
    result[2] = m20;
    result[3] = m01;
    result[4] = m11;
    result[5] = m21;
    result[6] = m02;
    result[7] = m12;
    result[8] = m22;
    return result;
  };

  /**
   * Computes a 3x3 rotation matrix from the provided headingPitchRoll. (see http://en.wikipedia.org/wiki/Conversion_between_quaternions_and_Euler_angles )
   *
   * @param {HeadingPitchRoll} headingPitchRoll the headingPitchRoll to use.
   * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix3} The 3x3 rotation matrix from this headingPitchRoll.
   */
  Matrix3.fromHeadingPitchRoll = function (headingPitchRoll, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("headingPitchRoll", headingPitchRoll);
    //>>includeEnd('debug');

    const cosTheta = Math.cos(-headingPitchRoll.pitch);
    const cosPsi = Math.cos(-headingPitchRoll.heading);
    const cosPhi = Math.cos(headingPitchRoll.roll);
    const sinTheta = Math.sin(-headingPitchRoll.pitch);
    const sinPsi = Math.sin(-headingPitchRoll.heading);
    const sinPhi = Math.sin(headingPitchRoll.roll);

    const m00 = cosTheta * cosPsi;
    const m01 = -cosPhi * sinPsi + sinPhi * sinTheta * cosPsi;
    const m02 = sinPhi * sinPsi + cosPhi * sinTheta * cosPsi;

    const m10 = cosTheta * sinPsi;
    const m11 = cosPhi * cosPsi + sinPhi * sinTheta * sinPsi;
    const m12 = -sinPhi * cosPsi + cosPhi * sinTheta * sinPsi;

    const m20 = -sinTheta;
    const m21 = sinPhi * cosTheta;
    const m22 = cosPhi * cosTheta;

    if (!defaultValue.defined(result)) {
      return new Matrix3(m00, m01, m02, m10, m11, m12, m20, m21, m22);
    }
    result[0] = m00;
    result[1] = m10;
    result[2] = m20;
    result[3] = m01;
    result[4] = m11;
    result[5] = m21;
    result[6] = m02;
    result[7] = m12;
    result[8] = m22;
    return result;
  };

  /**
   * Computes a Matrix3 instance representing a non-uniform scale.
   *
   * @param {Cartesian3} scale The x, y, and z scale factors.
   * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix3} The modified result parameter, or a new Matrix3 instance if one was not provided.
   *
   * @example
   * // Creates
   * //   [7.0, 0.0, 0.0]
   * //   [0.0, 8.0, 0.0]
   * //   [0.0, 0.0, 9.0]
   * const m = Cesium.Matrix3.fromScale(new Cesium.Cartesian3(7.0, 8.0, 9.0));
   */
  Matrix3.fromScale = function (scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("scale", scale);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      return new Matrix3(scale.x, 0.0, 0.0, 0.0, scale.y, 0.0, 0.0, 0.0, scale.z);
    }

    result[0] = scale.x;
    result[1] = 0.0;
    result[2] = 0.0;
    result[3] = 0.0;
    result[4] = scale.y;
    result[5] = 0.0;
    result[6] = 0.0;
    result[7] = 0.0;
    result[8] = scale.z;
    return result;
  };

  /**
   * Computes a Matrix3 instance representing a uniform scale.
   *
   * @param {Number} scale The uniform scale factor.
   * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix3} The modified result parameter, or a new Matrix3 instance if one was not provided.
   *
   * @example
   * // Creates
   * //   [2.0, 0.0, 0.0]
   * //   [0.0, 2.0, 0.0]
   * //   [0.0, 0.0, 2.0]
   * const m = Cesium.Matrix3.fromUniformScale(2.0);
   */
  Matrix3.fromUniformScale = function (scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("scale", scale);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      return new Matrix3(scale, 0.0, 0.0, 0.0, scale, 0.0, 0.0, 0.0, scale);
    }

    result[0] = scale;
    result[1] = 0.0;
    result[2] = 0.0;
    result[3] = 0.0;
    result[4] = scale;
    result[5] = 0.0;
    result[6] = 0.0;
    result[7] = 0.0;
    result[8] = scale;
    return result;
  };

  /**
   * Computes a Matrix3 instance representing the cross product equivalent matrix of a Cartesian3 vector.
   *
   * @param {Cartesian3} vector the vector on the left hand side of the cross product operation.
   * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix3} The modified result parameter, or a new Matrix3 instance if one was not provided.
   *
   * @example
   * // Creates
   * //   [0.0, -9.0,  8.0]
   * //   [9.0,  0.0, -7.0]
   * //   [-8.0, 7.0,  0.0]
   * const m = Cesium.Matrix3.fromCrossProduct(new Cesium.Cartesian3(7.0, 8.0, 9.0));
   */
  Matrix3.fromCrossProduct = function (vector, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("vector", vector);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      return new Matrix3(
        0.0,
        -vector.z,
        vector.y,
        vector.z,
        0.0,
        -vector.x,
        -vector.y,
        vector.x,
        0.0
      );
    }

    result[0] = 0.0;
    result[1] = vector.z;
    result[2] = -vector.y;
    result[3] = -vector.z;
    result[4] = 0.0;
    result[5] = vector.x;
    result[6] = vector.y;
    result[7] = -vector.x;
    result[8] = 0.0;
    return result;
  };

  /**
   * Creates a rotation matrix around the x-axis.
   *
   * @param {Number} angle The angle, in radians, of the rotation.  Positive angles are counterclockwise.
   * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix3} The modified result parameter, or a new Matrix3 instance if one was not provided.
   *
   * @example
   * // Rotate a point 45 degrees counterclockwise around the x-axis.
   * const p = new Cesium.Cartesian3(5, 6, 7);
   * const m = Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(45.0));
   * const rotated = Cesium.Matrix3.multiplyByVector(m, p, new Cesium.Cartesian3());
   */
  Matrix3.fromRotationX = function (angle, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("angle", angle);
    //>>includeEnd('debug');

    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);

    if (!defaultValue.defined(result)) {
      return new Matrix3(
        1.0,
        0.0,
        0.0,
        0.0,
        cosAngle,
        -sinAngle,
        0.0,
        sinAngle,
        cosAngle
      );
    }

    result[0] = 1.0;
    result[1] = 0.0;
    result[2] = 0.0;
    result[3] = 0.0;
    result[4] = cosAngle;
    result[5] = sinAngle;
    result[6] = 0.0;
    result[7] = -sinAngle;
    result[8] = cosAngle;

    return result;
  };

  /**
   * Creates a rotation matrix around the y-axis.
   *
   * @param {Number} angle The angle, in radians, of the rotation.  Positive angles are counterclockwise.
   * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix3} The modified result parameter, or a new Matrix3 instance if one was not provided.
   *
   * @example
   * // Rotate a point 45 degrees counterclockwise around the y-axis.
   * const p = new Cesium.Cartesian3(5, 6, 7);
   * const m = Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(45.0));
   * const rotated = Cesium.Matrix3.multiplyByVector(m, p, new Cesium.Cartesian3());
   */
  Matrix3.fromRotationY = function (angle, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("angle", angle);
    //>>includeEnd('debug');

    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);

    if (!defaultValue.defined(result)) {
      return new Matrix3(
        cosAngle,
        0.0,
        sinAngle,
        0.0,
        1.0,
        0.0,
        -sinAngle,
        0.0,
        cosAngle
      );
    }

    result[0] = cosAngle;
    result[1] = 0.0;
    result[2] = -sinAngle;
    result[3] = 0.0;
    result[4] = 1.0;
    result[5] = 0.0;
    result[6] = sinAngle;
    result[7] = 0.0;
    result[8] = cosAngle;

    return result;
  };

  /**
   * Creates a rotation matrix around the z-axis.
   *
   * @param {Number} angle The angle, in radians, of the rotation.  Positive angles are counterclockwise.
   * @param {Matrix3} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix3} The modified result parameter, or a new Matrix3 instance if one was not provided.
   *
   * @example
   * // Rotate a point 45 degrees counterclockwise around the z-axis.
   * const p = new Cesium.Cartesian3(5, 6, 7);
   * const m = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(45.0));
   * const rotated = Cesium.Matrix3.multiplyByVector(m, p, new Cesium.Cartesian3());
   */
  Matrix3.fromRotationZ = function (angle, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("angle", angle);
    //>>includeEnd('debug');

    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);

    if (!defaultValue.defined(result)) {
      return new Matrix3(
        cosAngle,
        -sinAngle,
        0.0,
        sinAngle,
        cosAngle,
        0.0,
        0.0,
        0.0,
        1.0
      );
    }

    result[0] = cosAngle;
    result[1] = sinAngle;
    result[2] = 0.0;
    result[3] = -sinAngle;
    result[4] = cosAngle;
    result[5] = 0.0;
    result[6] = 0.0;
    result[7] = 0.0;
    result[8] = 1.0;

    return result;
  };

  /**
   * Creates an Array from the provided Matrix3 instance.
   * The array will be in column-major order.
   *
   * @param {Matrix3} matrix The matrix to use..
   * @param {Number[]} [result] The Array onto which to store the result.
   * @returns {Number[]} The modified Array parameter or a new Array instance if one was not provided.
   */
  Matrix3.toArray = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      return [
        matrix[0],
        matrix[1],
        matrix[2],
        matrix[3],
        matrix[4],
        matrix[5],
        matrix[6],
        matrix[7],
        matrix[8],
      ];
    }
    result[0] = matrix[0];
    result[1] = matrix[1];
    result[2] = matrix[2];
    result[3] = matrix[3];
    result[4] = matrix[4];
    result[5] = matrix[5];
    result[6] = matrix[6];
    result[7] = matrix[7];
    result[8] = matrix[8];
    return result;
  };

  /**
   * Computes the array index of the element at the provided row and column.
   *
   * @param {Number} column The zero-based index of the column.
   * @param {Number} row The zero-based index of the row.
   * @returns {Number} The index of the element at the provided row and column.
   *
   * @exception {DeveloperError} row must be 0, 1, or 2.
   * @exception {DeveloperError} column must be 0, 1, or 2.
   *
   * @example
   * const myMatrix = new Cesium.Matrix3();
   * const column1Row0Index = Cesium.Matrix3.getElementIndex(1, 0);
   * const column1Row0 = myMatrix[column1Row0Index]
   * myMatrix[column1Row0Index] = 10.0;
   */
  Matrix3.getElementIndex = function (column, row) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number.greaterThanOrEquals("row", row, 0);
    Check.Check.typeOf.number.lessThanOrEquals("row", row, 2);
    Check.Check.typeOf.number.greaterThanOrEquals("column", column, 0);
    Check.Check.typeOf.number.lessThanOrEquals("column", column, 2);
    //>>includeEnd('debug');

    return column * 3 + row;
  };

  /**
   * Retrieves a copy of the matrix column at the provided index as a Cartesian3 instance.
   *
   * @param {Matrix3} matrix The matrix to use.
   * @param {Number} index The zero-based index of the column to retrieve.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter.
   *
   * @exception {DeveloperError} index must be 0, 1, or 2.
   */
  Matrix3.getColumn = function (matrix, index, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.Check.typeOf.number.lessThanOrEquals("index", index, 2);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const startIndex = index * 3;
    const x = matrix[startIndex];
    const y = matrix[startIndex + 1];
    const z = matrix[startIndex + 2];

    result.x = x;
    result.y = y;
    result.z = z;
    return result;
  };

  /**
   * Computes a new matrix that replaces the specified column in the provided matrix with the provided Cartesian3 instance.
   *
   * @param {Matrix3} matrix The matrix to use.
   * @param {Number} index The zero-based index of the column to set.
   * @param {Cartesian3} cartesian The Cartesian whose values will be assigned to the specified column.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   *
   * @exception {DeveloperError} index must be 0, 1, or 2.
   */
  Matrix3.setColumn = function (matrix, index, cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.Check.typeOf.number.lessThanOrEquals("index", index, 2);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result = Matrix3.clone(matrix, result);
    const startIndex = index * 3;
    result[startIndex] = cartesian.x;
    result[startIndex + 1] = cartesian.y;
    result[startIndex + 2] = cartesian.z;
    return result;
  };

  /**
   * Retrieves a copy of the matrix row at the provided index as a Cartesian3 instance.
   *
   * @param {Matrix3} matrix The matrix to use.
   * @param {Number} index The zero-based index of the row to retrieve.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter.
   *
   * @exception {DeveloperError} index must be 0, 1, or 2.
   */
  Matrix3.getRow = function (matrix, index, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.Check.typeOf.number.lessThanOrEquals("index", index, 2);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const x = matrix[index];
    const y = matrix[index + 3];
    const z = matrix[index + 6];

    result.x = x;
    result.y = y;
    result.z = z;
    return result;
  };

  /**
   * Computes a new matrix that replaces the specified row in the provided matrix with the provided Cartesian3 instance.
   *
   * @param {Matrix3} matrix The matrix to use.
   * @param {Number} index The zero-based index of the row to set.
   * @param {Cartesian3} cartesian The Cartesian whose values will be assigned to the specified row.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   *
   * @exception {DeveloperError} index must be 0, 1, or 2.
   */
  Matrix3.setRow = function (matrix, index, cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.Check.typeOf.number.lessThanOrEquals("index", index, 2);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result = Matrix3.clone(matrix, result);
    result[index] = cartesian.x;
    result[index + 3] = cartesian.y;
    result[index + 6] = cartesian.z;
    return result;
  };

  const scaleScratch1 = new Cartesian3();

  /**
   * Computes a new matrix that replaces the scale with the provided scale.
   * This assumes the matrix is an affine transformation.
   *
   * @param {Matrix3} matrix The matrix to use.
   * @param {Cartesian3} scale The scale that replaces the scale of the provided matrix.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   *
   * @see Matrix3.setUniformScale
   * @see Matrix3.fromScale
   * @see Matrix3.fromUniformScale
   * @see Matrix3.multiplyByScale
   * @see Matrix3.multiplyByUniformScale
   * @see Matrix3.getScale
   */
  Matrix3.setScale = function (matrix, scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("scale", scale);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const existingScale = Matrix3.getScale(matrix, scaleScratch1);
    const scaleRatioX = scale.x / existingScale.x;
    const scaleRatioY = scale.y / existingScale.y;
    const scaleRatioZ = scale.z / existingScale.z;

    result[0] = matrix[0] * scaleRatioX;
    result[1] = matrix[1] * scaleRatioX;
    result[2] = matrix[2] * scaleRatioX;
    result[3] = matrix[3] * scaleRatioY;
    result[4] = matrix[4] * scaleRatioY;
    result[5] = matrix[5] * scaleRatioY;
    result[6] = matrix[6] * scaleRatioZ;
    result[7] = matrix[7] * scaleRatioZ;
    result[8] = matrix[8] * scaleRatioZ;

    return result;
  };

  const scaleScratch2 = new Cartesian3();

  /**
   * Computes a new matrix that replaces the scale with the provided uniform scale.
   * This assumes the matrix is an affine transformation.
   *
   * @param {Matrix3} matrix The matrix to use.
   * @param {Number} scale The uniform scale that replaces the scale of the provided matrix.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   *
   * @see Matrix3.setScale
   * @see Matrix3.fromScale
   * @see Matrix3.fromUniformScale
   * @see Matrix3.multiplyByScale
   * @see Matrix3.multiplyByUniformScale
   * @see Matrix3.getScale
   */
  Matrix3.setUniformScale = function (matrix, scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.number("scale", scale);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const existingScale = Matrix3.getScale(matrix, scaleScratch2);
    const scaleRatioX = scale / existingScale.x;
    const scaleRatioY = scale / existingScale.y;
    const scaleRatioZ = scale / existingScale.z;

    result[0] = matrix[0] * scaleRatioX;
    result[1] = matrix[1] * scaleRatioX;
    result[2] = matrix[2] * scaleRatioX;
    result[3] = matrix[3] * scaleRatioY;
    result[4] = matrix[4] * scaleRatioY;
    result[5] = matrix[5] * scaleRatioY;
    result[6] = matrix[6] * scaleRatioZ;
    result[7] = matrix[7] * scaleRatioZ;
    result[8] = matrix[8] * scaleRatioZ;

    return result;
  };

  const scratchColumn = new Cartesian3();

  /**
   * Extracts the non-uniform scale assuming the matrix is an affine transformation.
   *
   * @param {Matrix3} matrix The matrix.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter.
   *
   * @see Matrix3.multiplyByScale
   * @see Matrix3.multiplyByUniformScale
   * @see Matrix3.fromScale
   * @see Matrix3.fromUniformScale
   * @see Matrix3.setScale
   * @see Matrix3.setUniformScale
   */
  Matrix3.getScale = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Cartesian3.magnitude(
      Cartesian3.fromElements(matrix[0], matrix[1], matrix[2], scratchColumn)
    );
    result.y = Cartesian3.magnitude(
      Cartesian3.fromElements(matrix[3], matrix[4], matrix[5], scratchColumn)
    );
    result.z = Cartesian3.magnitude(
      Cartesian3.fromElements(matrix[6], matrix[7], matrix[8], scratchColumn)
    );
    return result;
  };

  const scaleScratch3 = new Cartesian3();

  /**
   * Computes the maximum scale assuming the matrix is an affine transformation.
   * The maximum scale is the maximum length of the column vectors.
   *
   * @param {Matrix3} matrix The matrix.
   * @returns {Number} The maximum scale.
   */
  Matrix3.getMaximumScale = function (matrix) {
    Matrix3.getScale(matrix, scaleScratch3);
    return Cartesian3.maximumComponent(scaleScratch3);
  };

  const scaleScratch4 = new Cartesian3();

  /**
   * Sets the rotation assuming the matrix is an affine transformation.
   *
   * @param {Matrix3} matrix The matrix.
   * @param {Matrix3} rotation The rotation matrix.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   *
   * @see Matrix3.getRotation
   */
  Matrix3.setRotation = function (matrix, rotation, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const scale = Matrix3.getScale(matrix, scaleScratch4);

    result[0] = rotation[0] * scale.x;
    result[1] = rotation[1] * scale.x;
    result[2] = rotation[2] * scale.x;
    result[3] = rotation[3] * scale.y;
    result[4] = rotation[4] * scale.y;
    result[5] = rotation[5] * scale.y;
    result[6] = rotation[6] * scale.z;
    result[7] = rotation[7] * scale.z;
    result[8] = rotation[8] * scale.z;

    return result;
  };

  const scaleScratch5 = new Cartesian3();

  /**
   * Extracts the rotation matrix assuming the matrix is an affine transformation.
   *
   * @param {Matrix3} matrix The matrix.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   *
   * @see Matrix3.setRotation
   */
  Matrix3.getRotation = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const scale = Matrix3.getScale(matrix, scaleScratch5);

    result[0] = matrix[0] / scale.x;
    result[1] = matrix[1] / scale.x;
    result[2] = matrix[2] / scale.x;
    result[3] = matrix[3] / scale.y;
    result[4] = matrix[4] / scale.y;
    result[5] = matrix[5] / scale.y;
    result[6] = matrix[6] / scale.z;
    result[7] = matrix[7] / scale.z;
    result[8] = matrix[8] / scale.z;

    return result;
  };

  /**
   * Computes the product of two matrices.
   *
   * @param {Matrix3} left The first matrix.
   * @param {Matrix3} right The second matrix.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   */
  Matrix3.multiply = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const column0Row0 =
      left[0] * right[0] + left[3] * right[1] + left[6] * right[2];
    const column0Row1 =
      left[1] * right[0] + left[4] * right[1] + left[7] * right[2];
    const column0Row2 =
      left[2] * right[0] + left[5] * right[1] + left[8] * right[2];

    const column1Row0 =
      left[0] * right[3] + left[3] * right[4] + left[6] * right[5];
    const column1Row1 =
      left[1] * right[3] + left[4] * right[4] + left[7] * right[5];
    const column1Row2 =
      left[2] * right[3] + left[5] * right[4] + left[8] * right[5];

    const column2Row0 =
      left[0] * right[6] + left[3] * right[7] + left[6] * right[8];
    const column2Row1 =
      left[1] * right[6] + left[4] * right[7] + left[7] * right[8];
    const column2Row2 =
      left[2] * right[6] + left[5] * right[7] + left[8] * right[8];

    result[0] = column0Row0;
    result[1] = column0Row1;
    result[2] = column0Row2;
    result[3] = column1Row0;
    result[4] = column1Row1;
    result[5] = column1Row2;
    result[6] = column2Row0;
    result[7] = column2Row1;
    result[8] = column2Row2;
    return result;
  };

  /**
   * Computes the sum of two matrices.
   *
   * @param {Matrix3} left The first matrix.
   * @param {Matrix3} right The second matrix.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   */
  Matrix3.add = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result[0] = left[0] + right[0];
    result[1] = left[1] + right[1];
    result[2] = left[2] + right[2];
    result[3] = left[3] + right[3];
    result[4] = left[4] + right[4];
    result[5] = left[5] + right[5];
    result[6] = left[6] + right[6];
    result[7] = left[7] + right[7];
    result[8] = left[8] + right[8];
    return result;
  };

  /**
   * Computes the difference of two matrices.
   *
   * @param {Matrix3} left The first matrix.
   * @param {Matrix3} right The second matrix.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   */
  Matrix3.subtract = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result[0] = left[0] - right[0];
    result[1] = left[1] - right[1];
    result[2] = left[2] - right[2];
    result[3] = left[3] - right[3];
    result[4] = left[4] - right[4];
    result[5] = left[5] - right[5];
    result[6] = left[6] - right[6];
    result[7] = left[7] - right[7];
    result[8] = left[8] - right[8];
    return result;
  };

  /**
   * Computes the product of a matrix and a column vector.
   *
   * @param {Matrix3} matrix The matrix.
   * @param {Cartesian3} cartesian The column.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter.
   */
  Matrix3.multiplyByVector = function (matrix, cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const vX = cartesian.x;
    const vY = cartesian.y;
    const vZ = cartesian.z;

    const x = matrix[0] * vX + matrix[3] * vY + matrix[6] * vZ;
    const y = matrix[1] * vX + matrix[4] * vY + matrix[7] * vZ;
    const z = matrix[2] * vX + matrix[5] * vY + matrix[8] * vZ;

    result.x = x;
    result.y = y;
    result.z = z;
    return result;
  };

  /**
   * Computes the product of a matrix and a scalar.
   *
   * @param {Matrix3} matrix The matrix.
   * @param {Number} scalar The number to multiply by.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   */
  Matrix3.multiplyByScalar = function (matrix, scalar, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.number("scalar", scalar);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result[0] = matrix[0] * scalar;
    result[1] = matrix[1] * scalar;
    result[2] = matrix[2] * scalar;
    result[3] = matrix[3] * scalar;
    result[4] = matrix[4] * scalar;
    result[5] = matrix[5] * scalar;
    result[6] = matrix[6] * scalar;
    result[7] = matrix[7] * scalar;
    result[8] = matrix[8] * scalar;
    return result;
  };

  /**
   * Computes the product of a matrix times a (non-uniform) scale, as if the scale were a scale matrix.
   *
   * @param {Matrix3} matrix The matrix on the left-hand side.
   * @param {Cartesian3} scale The non-uniform scale on the right-hand side.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   *
   *
   * @example
   * // Instead of Cesium.Matrix3.multiply(m, Cesium.Matrix3.fromScale(scale), m);
   * Cesium.Matrix3.multiplyByScale(m, scale, m);
   *
   * @see Matrix3.multiplyByUniformScale
   * @see Matrix3.fromScale
   * @see Matrix3.fromUniformScale
   * @see Matrix3.setScale
   * @see Matrix3.setUniformScale
   * @see Matrix3.getScale
   */
  Matrix3.multiplyByScale = function (matrix, scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("scale", scale);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result[0] = matrix[0] * scale.x;
    result[1] = matrix[1] * scale.x;
    result[2] = matrix[2] * scale.x;
    result[3] = matrix[3] * scale.y;
    result[4] = matrix[4] * scale.y;
    result[5] = matrix[5] * scale.y;
    result[6] = matrix[6] * scale.z;
    result[7] = matrix[7] * scale.z;
    result[8] = matrix[8] * scale.z;

    return result;
  };

  /**
   * Computes the product of a matrix times a uniform scale, as if the scale were a scale matrix.
   *
   * @param {Matrix3} matrix The matrix on the left-hand side.
   * @param {Number} scale The uniform scale on the right-hand side.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   *
   * @example
   * // Instead of Cesium.Matrix3.multiply(m, Cesium.Matrix3.fromUniformScale(scale), m);
   * Cesium.Matrix3.multiplyByUniformScale(m, scale, m);
   *
   * @see Matrix3.multiplyByScale
   * @see Matrix3.fromScale
   * @see Matrix3.fromUniformScale
   * @see Matrix3.setScale
   * @see Matrix3.setUniformScale
   * @see Matrix3.getScale
   */
  Matrix3.multiplyByUniformScale = function (matrix, scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.number("scale", scale);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result[0] = matrix[0] * scale;
    result[1] = matrix[1] * scale;
    result[2] = matrix[2] * scale;
    result[3] = matrix[3] * scale;
    result[4] = matrix[4] * scale;
    result[5] = matrix[5] * scale;
    result[6] = matrix[6] * scale;
    result[7] = matrix[7] * scale;
    result[8] = matrix[8] * scale;

    return result;
  };

  /**
   * Creates a negated copy of the provided matrix.
   *
   * @param {Matrix3} matrix The matrix to negate.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   */
  Matrix3.negate = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result[0] = -matrix[0];
    result[1] = -matrix[1];
    result[2] = -matrix[2];
    result[3] = -matrix[3];
    result[4] = -matrix[4];
    result[5] = -matrix[5];
    result[6] = -matrix[6];
    result[7] = -matrix[7];
    result[8] = -matrix[8];
    return result;
  };

  /**
   * Computes the transpose of the provided matrix.
   *
   * @param {Matrix3} matrix The matrix to transpose.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   */
  Matrix3.transpose = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const column0Row0 = matrix[0];
    const column0Row1 = matrix[3];
    const column0Row2 = matrix[6];
    const column1Row0 = matrix[1];
    const column1Row1 = matrix[4];
    const column1Row2 = matrix[7];
    const column2Row0 = matrix[2];
    const column2Row1 = matrix[5];
    const column2Row2 = matrix[8];

    result[0] = column0Row0;
    result[1] = column0Row1;
    result[2] = column0Row2;
    result[3] = column1Row0;
    result[4] = column1Row1;
    result[5] = column1Row2;
    result[6] = column2Row0;
    result[7] = column2Row1;
    result[8] = column2Row2;
    return result;
  };

  function computeFrobeniusNorm(matrix) {
    let norm = 0.0;
    for (let i = 0; i < 9; ++i) {
      const temp = matrix[i];
      norm += temp * temp;
    }

    return Math.sqrt(norm);
  }

  const rowVal = [1, 0, 0];
  const colVal = [2, 2, 1];

  function offDiagonalFrobeniusNorm(matrix) {
    // Computes the "off-diagonal" Frobenius norm.
    // Assumes matrix is symmetric.

    let norm = 0.0;
    for (let i = 0; i < 3; ++i) {
      const temp = matrix[Matrix3.getElementIndex(colVal[i], rowVal[i])];
      norm += 2.0 * temp * temp;
    }

    return Math.sqrt(norm);
  }

  function shurDecomposition(matrix, result) {
    // This routine was created based upon Matrix Computations, 3rd ed., by Golub and Van Loan,
    // section 8.4.2 The 2by2 Symmetric Schur Decomposition.
    //
    // The routine takes a matrix, which is assumed to be symmetric, and
    // finds the largest off-diagonal term, and then creates
    // a matrix (result) which can be used to help reduce it

    const tolerance = Math$1.CesiumMath.EPSILON15;

    let maxDiagonal = 0.0;
    let rotAxis = 1;

    // find pivot (rotAxis) based on max diagonal of matrix
    for (let i = 0; i < 3; ++i) {
      const temp = Math.abs(
        matrix[Matrix3.getElementIndex(colVal[i], rowVal[i])]
      );
      if (temp > maxDiagonal) {
        rotAxis = i;
        maxDiagonal = temp;
      }
    }

    let c = 1.0;
    let s = 0.0;

    const p = rowVal[rotAxis];
    const q = colVal[rotAxis];

    if (Math.abs(matrix[Matrix3.getElementIndex(q, p)]) > tolerance) {
      const qq = matrix[Matrix3.getElementIndex(q, q)];
      const pp = matrix[Matrix3.getElementIndex(p, p)];
      const qp = matrix[Matrix3.getElementIndex(q, p)];

      const tau = (qq - pp) / 2.0 / qp;
      let t;

      if (tau < 0.0) {
        t = -1.0 / (-tau + Math.sqrt(1.0 + tau * tau));
      } else {
        t = 1.0 / (tau + Math.sqrt(1.0 + tau * tau));
      }

      c = 1.0 / Math.sqrt(1.0 + t * t);
      s = t * c;
    }

    result = Matrix3.clone(Matrix3.IDENTITY, result);

    result[Matrix3.getElementIndex(p, p)] = result[
      Matrix3.getElementIndex(q, q)
    ] = c;
    result[Matrix3.getElementIndex(q, p)] = s;
    result[Matrix3.getElementIndex(p, q)] = -s;

    return result;
  }

  const jMatrix = new Matrix3();
  const jMatrixTranspose = new Matrix3();

  /**
   * Computes the eigenvectors and eigenvalues of a symmetric matrix.
   * <p>
   * Returns a diagonal matrix and unitary matrix such that:
   * <code>matrix = unitary matrix * diagonal matrix * transpose(unitary matrix)</code>
   * </p>
   * <p>
   * The values along the diagonal of the diagonal matrix are the eigenvalues. The columns
   * of the unitary matrix are the corresponding eigenvectors.
   * </p>
   *
   * @param {Matrix3} matrix The matrix to decompose into diagonal and unitary matrix. Expected to be symmetric.
   * @param {Object} [result] An object with unitary and diagonal properties which are matrices onto which to store the result.
   * @returns {Object} An object with unitary and diagonal properties which are the unitary and diagonal matrices, respectively.
   *
   * @example
   * const a = //... symetric matrix
   * const result = {
   *     unitary : new Cesium.Matrix3(),
   *     diagonal : new Cesium.Matrix3()
   * };
   * Cesium.Matrix3.computeEigenDecomposition(a, result);
   *
   * const unitaryTranspose = Cesium.Matrix3.transpose(result.unitary, new Cesium.Matrix3());
   * const b = Cesium.Matrix3.multiply(result.unitary, result.diagonal, new Cesium.Matrix3());
   * Cesium.Matrix3.multiply(b, unitaryTranspose, b); // b is now equal to a
   *
   * const lambda = Cesium.Matrix3.getColumn(result.diagonal, 0, new Cesium.Cartesian3()).x;  // first eigenvalue
   * const v = Cesium.Matrix3.getColumn(result.unitary, 0, new Cesium.Cartesian3());          // first eigenvector
   * const c = Cesium.Cartesian3.multiplyByScalar(v, lambda, new Cesium.Cartesian3());        // equal to Cesium.Matrix3.multiplyByVector(a, v)
   */
  Matrix3.computeEigenDecomposition = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    //>>includeEnd('debug');

    // This routine was created based upon Matrix Computations, 3rd ed., by Golub and Van Loan,
    // section 8.4.3 The Classical Jacobi Algorithm

    const tolerance = Math$1.CesiumMath.EPSILON20;
    const maxSweeps = 10;

    let count = 0;
    let sweep = 0;

    if (!defaultValue.defined(result)) {
      result = {};
    }

    const unitaryMatrix = (result.unitary = Matrix3.clone(
      Matrix3.IDENTITY,
      result.unitary
    ));
    const diagMatrix = (result.diagonal = Matrix3.clone(matrix, result.diagonal));

    const epsilon = tolerance * computeFrobeniusNorm(diagMatrix);

    while (sweep < maxSweeps && offDiagonalFrobeniusNorm(diagMatrix) > epsilon) {
      shurDecomposition(diagMatrix, jMatrix);
      Matrix3.transpose(jMatrix, jMatrixTranspose);
      Matrix3.multiply(diagMatrix, jMatrix, diagMatrix);
      Matrix3.multiply(jMatrixTranspose, diagMatrix, diagMatrix);
      Matrix3.multiply(unitaryMatrix, jMatrix, unitaryMatrix);

      if (++count > 2) {
        ++sweep;
        count = 0;
      }
    }

    return result;
  };

  /**
   * Computes a matrix, which contains the absolute (unsigned) values of the provided matrix's elements.
   *
   * @param {Matrix3} matrix The matrix with signed elements.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   */
  Matrix3.abs = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result[0] = Math.abs(matrix[0]);
    result[1] = Math.abs(matrix[1]);
    result[2] = Math.abs(matrix[2]);
    result[3] = Math.abs(matrix[3]);
    result[4] = Math.abs(matrix[4]);
    result[5] = Math.abs(matrix[5]);
    result[6] = Math.abs(matrix[6]);
    result[7] = Math.abs(matrix[7]);
    result[8] = Math.abs(matrix[8]);

    return result;
  };

  /**
   * Computes the determinant of the provided matrix.
   *
   * @param {Matrix3} matrix The matrix to use.
   * @returns {Number} The value of the determinant of the matrix.
   */
  Matrix3.determinant = function (matrix) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    //>>includeEnd('debug');

    const m11 = matrix[0];
    const m21 = matrix[3];
    const m31 = matrix[6];
    const m12 = matrix[1];
    const m22 = matrix[4];
    const m32 = matrix[7];
    const m13 = matrix[2];
    const m23 = matrix[5];
    const m33 = matrix[8];

    return (
      m11 * (m22 * m33 - m23 * m32) +
      m12 * (m23 * m31 - m21 * m33) +
      m13 * (m21 * m32 - m22 * m31)
    );
  };

  /**
   * Computes the inverse of the provided matrix.
   *
   * @param {Matrix3} matrix The matrix to invert.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   *
   * @exception {DeveloperError} matrix is not invertible.
   */
  Matrix3.inverse = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const m11 = matrix[0];
    const m21 = matrix[1];
    const m31 = matrix[2];
    const m12 = matrix[3];
    const m22 = matrix[4];
    const m32 = matrix[5];
    const m13 = matrix[6];
    const m23 = matrix[7];
    const m33 = matrix[8];

    const determinant = Matrix3.determinant(matrix);

    //>>includeStart('debug', pragmas.debug);
    if (Math.abs(determinant) <= Math$1.CesiumMath.EPSILON15) {
      throw new Check.DeveloperError("matrix is not invertible");
    }
    //>>includeEnd('debug');

    result[0] = m22 * m33 - m23 * m32;
    result[1] = m23 * m31 - m21 * m33;
    result[2] = m21 * m32 - m22 * m31;
    result[3] = m13 * m32 - m12 * m33;
    result[4] = m11 * m33 - m13 * m31;
    result[5] = m12 * m31 - m11 * m32;
    result[6] = m12 * m23 - m13 * m22;
    result[7] = m13 * m21 - m11 * m23;
    result[8] = m11 * m22 - m12 * m21;

    const scale = 1.0 / determinant;
    return Matrix3.multiplyByScalar(result, scale, result);
  };

  const scratchTransposeMatrix = new Matrix3();

  /**
   * Computes the inverse transpose of a matrix.
   *
   * @param {Matrix3} matrix The matrix to transpose and invert.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   */
  Matrix3.inverseTranspose = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    return Matrix3.inverse(
      Matrix3.transpose(matrix, scratchTransposeMatrix),
      result
    );
  };

  /**
   * Compares the provided matrices componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {Matrix3} [left] The first matrix.
   * @param {Matrix3} [right] The second matrix.
   * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
   */
  Matrix3.equals = function (left, right) {
    return (
      left === right ||
      (defaultValue.defined(left) &&
        defaultValue.defined(right) &&
        left[0] === right[0] &&
        left[1] === right[1] &&
        left[2] === right[2] &&
        left[3] === right[3] &&
        left[4] === right[4] &&
        left[5] === right[5] &&
        left[6] === right[6] &&
        left[7] === right[7] &&
        left[8] === right[8])
    );
  };

  /**
   * Compares the provided matrices componentwise and returns
   * <code>true</code> if they are within the provided epsilon,
   * <code>false</code> otherwise.
   *
   * @param {Matrix3} [left] The first matrix.
   * @param {Matrix3} [right] The second matrix.
   * @param {Number} [epsilon=0] The epsilon to use for equality testing.
   * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
   */
  Matrix3.equalsEpsilon = function (left, right, epsilon) {
    epsilon = defaultValue.defaultValue(epsilon, 0);

    return (
      left === right ||
      (defaultValue.defined(left) &&
        defaultValue.defined(right) &&
        Math.abs(left[0] - right[0]) <= epsilon &&
        Math.abs(left[1] - right[1]) <= epsilon &&
        Math.abs(left[2] - right[2]) <= epsilon &&
        Math.abs(left[3] - right[3]) <= epsilon &&
        Math.abs(left[4] - right[4]) <= epsilon &&
        Math.abs(left[5] - right[5]) <= epsilon &&
        Math.abs(left[6] - right[6]) <= epsilon &&
        Math.abs(left[7] - right[7]) <= epsilon &&
        Math.abs(left[8] - right[8]) <= epsilon)
    );
  };

  /**
   * An immutable Matrix3 instance initialized to the identity matrix.
   *
   * @type {Matrix3}
   * @constant
   */
  Matrix3.IDENTITY = Object.freeze(
    new Matrix3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0)
  );

  /**
   * An immutable Matrix3 instance initialized to the zero matrix.
   *
   * @type {Matrix3}
   * @constant
   */
  Matrix3.ZERO = Object.freeze(
    new Matrix3(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0)
  );

  /**
   * The index into Matrix3 for column 0, row 0.
   *
   * @type {Number}
   * @constant
   */
  Matrix3.COLUMN0ROW0 = 0;

  /**
   * The index into Matrix3 for column 0, row 1.
   *
   * @type {Number}
   * @constant
   */
  Matrix3.COLUMN0ROW1 = 1;

  /**
   * The index into Matrix3 for column 0, row 2.
   *
   * @type {Number}
   * @constant
   */
  Matrix3.COLUMN0ROW2 = 2;

  /**
   * The index into Matrix3 for column 1, row 0.
   *
   * @type {Number}
   * @constant
   */
  Matrix3.COLUMN1ROW0 = 3;

  /**
   * The index into Matrix3 for column 1, row 1.
   *
   * @type {Number}
   * @constant
   */
  Matrix3.COLUMN1ROW1 = 4;

  /**
   * The index into Matrix3 for column 1, row 2.
   *
   * @type {Number}
   * @constant
   */
  Matrix3.COLUMN1ROW2 = 5;

  /**
   * The index into Matrix3 for column 2, row 0.
   *
   * @type {Number}
   * @constant
   */
  Matrix3.COLUMN2ROW0 = 6;

  /**
   * The index into Matrix3 for column 2, row 1.
   *
   * @type {Number}
   * @constant
   */
  Matrix3.COLUMN2ROW1 = 7;

  /**
   * The index into Matrix3 for column 2, row 2.
   *
   * @type {Number}
   * @constant
   */
  Matrix3.COLUMN2ROW2 = 8;

  Object.defineProperties(Matrix3.prototype, {
    /**
     * Gets the number of items in the collection.
     * @memberof Matrix3.prototype
     *
     * @type {Number}
     */
    length: {
      get: function () {
        return Matrix3.packedLength;
      },
    },
  });

  /**
   * Duplicates the provided Matrix3 instance.
   *
   * @param {Matrix3} [result] The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter or a new Matrix3 instance if one was not provided.
   */
  Matrix3.prototype.clone = function (result) {
    return Matrix3.clone(this, result);
  };

  /**
   * Compares this matrix to the provided matrix componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {Matrix3} [right] The right hand side matrix.
   * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
   */
  Matrix3.prototype.equals = function (right) {
    return Matrix3.equals(this, right);
  };

  /**
   * @private
   */
  Matrix3.equalsArray = function (matrix, array, offset) {
    return (
      matrix[0] === array[offset] &&
      matrix[1] === array[offset + 1] &&
      matrix[2] === array[offset + 2] &&
      matrix[3] === array[offset + 3] &&
      matrix[4] === array[offset + 4] &&
      matrix[5] === array[offset + 5] &&
      matrix[6] === array[offset + 6] &&
      matrix[7] === array[offset + 7] &&
      matrix[8] === array[offset + 8]
    );
  };

  /**
   * Compares this matrix to the provided matrix componentwise and returns
   * <code>true</code> if they are within the provided epsilon,
   * <code>false</code> otherwise.
   *
   * @param {Matrix3} [right] The right hand side matrix.
   * @param {Number} [epsilon=0] The epsilon to use for equality testing.
   * @returns {Boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
   */
  Matrix3.prototype.equalsEpsilon = function (right, epsilon) {
    return Matrix3.equalsEpsilon(this, right, epsilon);
  };

  /**
   * Creates a string representing this Matrix with each row being
   * on a separate line and in the format '(column0, column1, column2)'.
   *
   * @returns {String} A string representing the provided Matrix with each row being on a separate line and in the format '(column0, column1, column2)'.
   */
  Matrix3.prototype.toString = function () {
    return (
      `(${this[0]}, ${this[3]}, ${this[6]})\n` +
      `(${this[1]}, ${this[4]}, ${this[7]})\n` +
      `(${this[2]}, ${this[5]}, ${this[8]})`
    );
  };

  exports.Cartesian3 = Cartesian3;
  exports.Cartographic = Cartographic;
  exports.Ellipsoid = Ellipsoid;
  exports.Matrix3 = Matrix3;

}));
