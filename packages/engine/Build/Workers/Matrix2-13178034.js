define(['exports', './Matrix3-315394f6', './Check-666ab1a0', './defaultValue-0a909f67', './Math-2dbd6b93', './RuntimeError-06c93819'], (function (exports, Matrix3, Check, defaultValue, Math$1, RuntimeError) { 'use strict';

  /**
   * A 4D Cartesian point.
   * @alias Cartesian4
   * @constructor
   *
   * @param {Number} [x=0.0] The X component.
   * @param {Number} [y=0.0] The Y component.
   * @param {Number} [z=0.0] The Z component.
   * @param {Number} [w=0.0] The W component.
   *
   * @see Cartesian2
   * @see Cartesian3
   * @see Packable
   */
  function Cartesian4(x, y, z, w) {
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

    /**
     * The W component.
     * @type {Number}
     * @default 0.0
     */
    this.w = defaultValue.defaultValue(w, 0.0);
  }

  /**
   * Creates a Cartesian4 instance from x, y, z and w coordinates.
   *
   * @param {Number} x The x coordinate.
   * @param {Number} y The y coordinate.
   * @param {Number} z The z coordinate.
   * @param {Number} w The w coordinate.
   * @param {Cartesian4} [result] The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter or a new Cartesian4 instance if one was not provided.
   */
  Cartesian4.fromElements = function (x, y, z, w, result) {
    if (!defaultValue.defined(result)) {
      return new Cartesian4(x, y, z, w);
    }

    result.x = x;
    result.y = y;
    result.z = z;
    result.w = w;
    return result;
  };

  /**
   * Creates a Cartesian4 instance from a {@link Color}. <code>red</code>, <code>green</code>, <code>blue</code>,
   * and <code>alpha</code> map to <code>x</code>, <code>y</code>, <code>z</code>, and <code>w</code>, respectively.
   *
   * @param {Color} color The source color.
   * @param {Cartesian4} [result] The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter or a new Cartesian4 instance if one was not provided.
   */
  Cartesian4.fromColor = function (color, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("color", color);
    //>>includeEnd('debug');
    if (!defaultValue.defined(result)) {
      return new Cartesian4(color.red, color.green, color.blue, color.alpha);
    }

    result.x = color.red;
    result.y = color.green;
    result.z = color.blue;
    result.w = color.alpha;
    return result;
  };

  /**
   * Duplicates a Cartesian4 instance.
   *
   * @param {Cartesian4} cartesian The Cartesian to duplicate.
   * @param {Cartesian4} [result] The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter or a new Cartesian4 instance if one was not provided. (Returns undefined if cartesian is undefined)
   */
  Cartesian4.clone = function (cartesian, result) {
    if (!defaultValue.defined(cartesian)) {
      return undefined;
    }

    if (!defaultValue.defined(result)) {
      return new Cartesian4(cartesian.x, cartesian.y, cartesian.z, cartesian.w);
    }

    result.x = cartesian.x;
    result.y = cartesian.y;
    result.z = cartesian.z;
    result.w = cartesian.w;
    return result;
  };

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  Cartesian4.packedLength = 4;

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {Cartesian4} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  Cartesian4.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("value", value);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    array[startingIndex++] = value.x;
    array[startingIndex++] = value.y;
    array[startingIndex++] = value.z;
    array[startingIndex] = value.w;

    return array;
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {Cartesian4} [result] The object into which to store the result.
   * @returns {Cartesian4}  The modified result parameter or a new Cartesian4 instance if one was not provided.
   */
  Cartesian4.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    if (!defaultValue.defined(result)) {
      result = new Cartesian4();
    }
    result.x = array[startingIndex++];
    result.y = array[startingIndex++];
    result.z = array[startingIndex++];
    result.w = array[startingIndex];
    return result;
  };

  /**
   * Flattens an array of Cartesian4s into an array of components.
   *
   * @param {Cartesian4[]} array The array of cartesians to pack.
   * @param {Number[]} [result] The array onto which to store the result. If this is a typed array, it must have array.length * 4 components, else a {@link DeveloperError} will be thrown. If it is a regular array, it will be resized to have (array.length * 4) elements.
   * @returns {Number[]} The packed array.
   */
  Cartesian4.packArray = function (array, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    const length = array.length;
    const resultLength = length * 4;
    if (!defaultValue.defined(result)) {
      result = new Array(resultLength);
    } else if (!Array.isArray(result) && result.length !== resultLength) {
      //>>includeStart('debug', pragmas.debug);
      throw new Check.DeveloperError(
        "If result is a typed array, it must have exactly array.length * 4 elements"
      );
      //>>includeEnd('debug');
    } else if (result.length !== resultLength) {
      result.length = resultLength;
    }

    for (let i = 0; i < length; ++i) {
      Cartesian4.pack(array[i], result, i * 4);
    }
    return result;
  };

  /**
   * Unpacks an array of cartesian components into an array of Cartesian4s.
   *
   * @param {Number[]} array The array of components to unpack.
   * @param {Cartesian4[]} [result] The array onto which to store the result.
   * @returns {Cartesian4[]} The unpacked array.
   */
  Cartesian4.unpackArray = function (array, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    Check.Check.typeOf.number.greaterThanOrEquals("array.length", array.length, 4);
    if (array.length % 4 !== 0) {
      throw new Check.DeveloperError("array length must be a multiple of 4.");
    }
    //>>includeEnd('debug');

    const length = array.length;
    if (!defaultValue.defined(result)) {
      result = new Array(length / 4);
    } else {
      result.length = length / 4;
    }

    for (let i = 0; i < length; i += 4) {
      const index = i / 4;
      result[index] = Cartesian4.unpack(array, i, result[index]);
    }
    return result;
  };

  /**
   * Creates a Cartesian4 from four consecutive elements in an array.
   * @function
   *
   * @param {Number[]} array The array whose four consecutive elements correspond to the x, y, z, and w components, respectively.
   * @param {Number} [startingIndex=0] The offset into the array of the first element, which corresponds to the x component.
   * @param {Cartesian4} [result] The object onto which to store the result.
   * @returns {Cartesian4}  The modified result parameter or a new Cartesian4 instance if one was not provided.
   *
   * @example
   * // Create a Cartesian4 with (1.0, 2.0, 3.0, 4.0)
   * const v = [1.0, 2.0, 3.0, 4.0];
   * const p = Cesium.Cartesian4.fromArray(v);
   *
   * // Create a Cartesian4 with (1.0, 2.0, 3.0, 4.0) using an offset into an array
   * const v2 = [0.0, 0.0, 1.0, 2.0, 3.0, 4.0];
   * const p2 = Cesium.Cartesian4.fromArray(v2, 2);
   */
  Cartesian4.fromArray = Cartesian4.unpack;

  /**
   * Computes the value of the maximum component for the supplied Cartesian.
   *
   * @param {Cartesian4} cartesian The cartesian to use.
   * @returns {Number} The value of the maximum component.
   */
  Cartesian4.maximumComponent = function (cartesian) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    return Math.max(cartesian.x, cartesian.y, cartesian.z, cartesian.w);
  };

  /**
   * Computes the value of the minimum component for the supplied Cartesian.
   *
   * @param {Cartesian4} cartesian The cartesian to use.
   * @returns {Number} The value of the minimum component.
   */
  Cartesian4.minimumComponent = function (cartesian) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    return Math.min(cartesian.x, cartesian.y, cartesian.z, cartesian.w);
  };

  /**
   * Compares two Cartesians and computes a Cartesian which contains the minimum components of the supplied Cartesians.
   *
   * @param {Cartesian4} first A cartesian to compare.
   * @param {Cartesian4} second A cartesian to compare.
   * @param {Cartesian4} result The object into which to store the result.
   * @returns {Cartesian4} A cartesian with the minimum components.
   */
  Cartesian4.minimumByComponent = function (first, second, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("first", first);
    Check.Check.typeOf.object("second", second);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Math.min(first.x, second.x);
    result.y = Math.min(first.y, second.y);
    result.z = Math.min(first.z, second.z);
    result.w = Math.min(first.w, second.w);

    return result;
  };

  /**
   * Compares two Cartesians and computes a Cartesian which contains the maximum components of the supplied Cartesians.
   *
   * @param {Cartesian4} first A cartesian to compare.
   * @param {Cartesian4} second A cartesian to compare.
   * @param {Cartesian4} result The object into which to store the result.
   * @returns {Cartesian4} A cartesian with the maximum components.
   */
  Cartesian4.maximumByComponent = function (first, second, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("first", first);
    Check.Check.typeOf.object("second", second);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Math.max(first.x, second.x);
    result.y = Math.max(first.y, second.y);
    result.z = Math.max(first.z, second.z);
    result.w = Math.max(first.w, second.w);

    return result;
  };

  /**
   * Constrain a value to lie between two values.
   *
   * @param {Cartesian4} value The value to clamp.
   * @param {Cartesian4} min The minimum bound.
   * @param {Cartesian4} max The maximum bound.
   * @param {Cartesian4} result The object into which to store the result.
   * @returns {Cartesian4} The clamped value such that min <= result <= max.
   */
  Cartesian4.clamp = function (value, min, max, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("value", value);
    Check.Check.typeOf.object("min", min);
    Check.Check.typeOf.object("max", max);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const x = Math$1.CesiumMath.clamp(value.x, min.x, max.x);
    const y = Math$1.CesiumMath.clamp(value.y, min.y, max.y);
    const z = Math$1.CesiumMath.clamp(value.z, min.z, max.z);
    const w = Math$1.CesiumMath.clamp(value.w, min.w, max.w);

    result.x = x;
    result.y = y;
    result.z = z;
    result.w = w;

    return result;
  };

  /**
   * Computes the provided Cartesian's squared magnitude.
   *
   * @param {Cartesian4} cartesian The Cartesian instance whose squared magnitude is to be computed.
   * @returns {Number} The squared magnitude.
   */
  Cartesian4.magnitudeSquared = function (cartesian) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    return (
      cartesian.x * cartesian.x +
      cartesian.y * cartesian.y +
      cartesian.z * cartesian.z +
      cartesian.w * cartesian.w
    );
  };

  /**
   * Computes the Cartesian's magnitude (length).
   *
   * @param {Cartesian4} cartesian The Cartesian instance whose magnitude is to be computed.
   * @returns {Number} The magnitude.
   */
  Cartesian4.magnitude = function (cartesian) {
    return Math.sqrt(Cartesian4.magnitudeSquared(cartesian));
  };

  const distanceScratch$1 = new Cartesian4();

  /**
   * Computes the 4-space distance between two points.
   *
   * @param {Cartesian4} left The first point to compute the distance from.
   * @param {Cartesian4} right The second point to compute the distance to.
   * @returns {Number} The distance between two points.
   *
   * @example
   * // Returns 1.0
   * const d = Cesium.Cartesian4.distance(
   *   new Cesium.Cartesian4(1.0, 0.0, 0.0, 0.0),
   *   new Cesium.Cartesian4(2.0, 0.0, 0.0, 0.0));
   */
  Cartesian4.distance = function (left, right) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    Cartesian4.subtract(left, right, distanceScratch$1);
    return Cartesian4.magnitude(distanceScratch$1);
  };

  /**
   * Computes the squared distance between two points.  Comparing squared distances
   * using this function is more efficient than comparing distances using {@link Cartesian4#distance}.
   *
   * @param {Cartesian4} left The first point to compute the distance from.
   * @param {Cartesian4} right The second point to compute the distance to.
   * @returns {Number} The distance between two points.
   *
   * @example
   * // Returns 4.0, not 2.0
   * const d = Cesium.Cartesian4.distance(
   *   new Cesium.Cartesian4(1.0, 0.0, 0.0, 0.0),
   *   new Cesium.Cartesian4(3.0, 0.0, 0.0, 0.0));
   */
  Cartesian4.distanceSquared = function (left, right) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    Cartesian4.subtract(left, right, distanceScratch$1);
    return Cartesian4.magnitudeSquared(distanceScratch$1);
  };

  /**
   * Computes the normalized form of the supplied Cartesian.
   *
   * @param {Cartesian4} cartesian The Cartesian to be normalized.
   * @param {Cartesian4} result The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter.
   */
  Cartesian4.normalize = function (cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const magnitude = Cartesian4.magnitude(cartesian);

    result.x = cartesian.x / magnitude;
    result.y = cartesian.y / magnitude;
    result.z = cartesian.z / magnitude;
    result.w = cartesian.w / magnitude;

    //>>includeStart('debug', pragmas.debug);
    if (
      isNaN(result.x) ||
      isNaN(result.y) ||
      isNaN(result.z) ||
      isNaN(result.w)
    ) {
      throw new Check.DeveloperError("normalized result is not a number");
    }
    //>>includeEnd('debug');

    return result;
  };

  /**
   * Computes the dot (scalar) product of two Cartesians.
   *
   * @param {Cartesian4} left The first Cartesian.
   * @param {Cartesian4} right The second Cartesian.
   * @returns {Number} The dot product.
   */
  Cartesian4.dot = function (left, right) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    return (
      left.x * right.x + left.y * right.y + left.z * right.z + left.w * right.w
    );
  };

  /**
   * Computes the componentwise product of two Cartesians.
   *
   * @param {Cartesian4} left The first Cartesian.
   * @param {Cartesian4} right The second Cartesian.
   * @param {Cartesian4} result The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter.
   */
  Cartesian4.multiplyComponents = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x * right.x;
    result.y = left.y * right.y;
    result.z = left.z * right.z;
    result.w = left.w * right.w;
    return result;
  };

  /**
   * Computes the componentwise quotient of two Cartesians.
   *
   * @param {Cartesian4} left The first Cartesian.
   * @param {Cartesian4} right The second Cartesian.
   * @param {Cartesian4} result The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter.
   */
  Cartesian4.divideComponents = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x / right.x;
    result.y = left.y / right.y;
    result.z = left.z / right.z;
    result.w = left.w / right.w;
    return result;
  };

  /**
   * Computes the componentwise sum of two Cartesians.
   *
   * @param {Cartesian4} left The first Cartesian.
   * @param {Cartesian4} right The second Cartesian.
   * @param {Cartesian4} result The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter.
   */
  Cartesian4.add = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x + right.x;
    result.y = left.y + right.y;
    result.z = left.z + right.z;
    result.w = left.w + right.w;
    return result;
  };

  /**
   * Computes the componentwise difference of two Cartesians.
   *
   * @param {Cartesian4} left The first Cartesian.
   * @param {Cartesian4} right The second Cartesian.
   * @param {Cartesian4} result The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter.
   */
  Cartesian4.subtract = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x - right.x;
    result.y = left.y - right.y;
    result.z = left.z - right.z;
    result.w = left.w - right.w;
    return result;
  };

  /**
   * Multiplies the provided Cartesian componentwise by the provided scalar.
   *
   * @param {Cartesian4} cartesian The Cartesian to be scaled.
   * @param {Number} scalar The scalar to multiply with.
   * @param {Cartesian4} result The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter.
   */
  Cartesian4.multiplyByScalar = function (cartesian, scalar, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.number("scalar", scalar);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = cartesian.x * scalar;
    result.y = cartesian.y * scalar;
    result.z = cartesian.z * scalar;
    result.w = cartesian.w * scalar;
    return result;
  };

  /**
   * Divides the provided Cartesian componentwise by the provided scalar.
   *
   * @param {Cartesian4} cartesian The Cartesian to be divided.
   * @param {Number} scalar The scalar to divide by.
   * @param {Cartesian4} result The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter.
   */
  Cartesian4.divideByScalar = function (cartesian, scalar, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.number("scalar", scalar);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = cartesian.x / scalar;
    result.y = cartesian.y / scalar;
    result.z = cartesian.z / scalar;
    result.w = cartesian.w / scalar;
    return result;
  };

  /**
   * Negates the provided Cartesian.
   *
   * @param {Cartesian4} cartesian The Cartesian to be negated.
   * @param {Cartesian4} result The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter.
   */
  Cartesian4.negate = function (cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = -cartesian.x;
    result.y = -cartesian.y;
    result.z = -cartesian.z;
    result.w = -cartesian.w;
    return result;
  };

  /**
   * Computes the absolute value of the provided Cartesian.
   *
   * @param {Cartesian4} cartesian The Cartesian whose absolute value is to be computed.
   * @param {Cartesian4} result The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter.
   */
  Cartesian4.abs = function (cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Math.abs(cartesian.x);
    result.y = Math.abs(cartesian.y);
    result.z = Math.abs(cartesian.z);
    result.w = Math.abs(cartesian.w);
    return result;
  };

  const lerpScratch$1 = new Cartesian4();
  /**
   * Computes the linear interpolation or extrapolation at t using the provided cartesians.
   *
   * @param {Cartesian4} start The value corresponding to t at 0.0.
   * @param {Cartesian4}end The value corresponding to t at 1.0.
   * @param {Number} t The point along t at which to interpolate.
   * @param {Cartesian4} result The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter.
   */
  Cartesian4.lerp = function (start, end, t, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("start", start);
    Check.Check.typeOf.object("end", end);
    Check.Check.typeOf.number("t", t);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    Cartesian4.multiplyByScalar(end, t, lerpScratch$1);
    result = Cartesian4.multiplyByScalar(start, 1.0 - t, result);
    return Cartesian4.add(lerpScratch$1, result, result);
  };

  const mostOrthogonalAxisScratch$1 = new Cartesian4();
  /**
   * Returns the axis that is most orthogonal to the provided Cartesian.
   *
   * @param {Cartesian4} cartesian The Cartesian on which to find the most orthogonal axis.
   * @param {Cartesian4} result The object onto which to store the result.
   * @returns {Cartesian4} The most orthogonal axis.
   */
  Cartesian4.mostOrthogonalAxis = function (cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const f = Cartesian4.normalize(cartesian, mostOrthogonalAxisScratch$1);
    Cartesian4.abs(f, f);

    if (f.x <= f.y) {
      if (f.x <= f.z) {
        if (f.x <= f.w) {
          result = Cartesian4.clone(Cartesian4.UNIT_X, result);
        } else {
          result = Cartesian4.clone(Cartesian4.UNIT_W, result);
        }
      } else if (f.z <= f.w) {
        result = Cartesian4.clone(Cartesian4.UNIT_Z, result);
      } else {
        result = Cartesian4.clone(Cartesian4.UNIT_W, result);
      }
    } else if (f.y <= f.z) {
      if (f.y <= f.w) {
        result = Cartesian4.clone(Cartesian4.UNIT_Y, result);
      } else {
        result = Cartesian4.clone(Cartesian4.UNIT_W, result);
      }
    } else if (f.z <= f.w) {
      result = Cartesian4.clone(Cartesian4.UNIT_Z, result);
    } else {
      result = Cartesian4.clone(Cartesian4.UNIT_W, result);
    }

    return result;
  };

  /**
   * Compares the provided Cartesians componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {Cartesian4} [left] The first Cartesian.
   * @param {Cartesian4} [right] The second Cartesian.
   * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
   */
  Cartesian4.equals = function (left, right) {
    return (
      left === right ||
      (defaultValue.defined(left) &&
        defaultValue.defined(right) &&
        left.x === right.x &&
        left.y === right.y &&
        left.z === right.z &&
        left.w === right.w)
    );
  };

  /**
   * @private
   */
  Cartesian4.equalsArray = function (cartesian, array, offset) {
    return (
      cartesian.x === array[offset] &&
      cartesian.y === array[offset + 1] &&
      cartesian.z === array[offset + 2] &&
      cartesian.w === array[offset + 3]
    );
  };

  /**
   * Compares the provided Cartesians componentwise and returns
   * <code>true</code> if they pass an absolute or relative tolerance test,
   * <code>false</code> otherwise.
   *
   * @param {Cartesian4} [left] The first Cartesian.
   * @param {Cartesian4} [right] The second Cartesian.
   * @param {Number} [relativeEpsilon=0] The relative epsilon tolerance to use for equality testing.
   * @param {Number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
   * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
   */
  Cartesian4.equalsEpsilon = function (
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
        ) &&
        Math$1.CesiumMath.equalsEpsilon(
          left.w,
          right.w,
          relativeEpsilon,
          absoluteEpsilon
        ))
    );
  };

  /**
   * An immutable Cartesian4 instance initialized to (0.0, 0.0, 0.0, 0.0).
   *
   * @type {Cartesian4}
   * @constant
   */
  Cartesian4.ZERO = Object.freeze(new Cartesian4(0.0, 0.0, 0.0, 0.0));

  /**
   * An immutable Cartesian4 instance initialized to (1.0, 1.0, 1.0, 1.0).
   *
   * @type {Cartesian4}
   * @constant
   */
  Cartesian4.ONE = Object.freeze(new Cartesian4(1.0, 1.0, 1.0, 1.0));

  /**
   * An immutable Cartesian4 instance initialized to (1.0, 0.0, 0.0, 0.0).
   *
   * @type {Cartesian4}
   * @constant
   */
  Cartesian4.UNIT_X = Object.freeze(new Cartesian4(1.0, 0.0, 0.0, 0.0));

  /**
   * An immutable Cartesian4 instance initialized to (0.0, 1.0, 0.0, 0.0).
   *
   * @type {Cartesian4}
   * @constant
   */
  Cartesian4.UNIT_Y = Object.freeze(new Cartesian4(0.0, 1.0, 0.0, 0.0));

  /**
   * An immutable Cartesian4 instance initialized to (0.0, 0.0, 1.0, 0.0).
   *
   * @type {Cartesian4}
   * @constant
   */
  Cartesian4.UNIT_Z = Object.freeze(new Cartesian4(0.0, 0.0, 1.0, 0.0));

  /**
   * An immutable Cartesian4 instance initialized to (0.0, 0.0, 0.0, 1.0).
   *
   * @type {Cartesian4}
   * @constant
   */
  Cartesian4.UNIT_W = Object.freeze(new Cartesian4(0.0, 0.0, 0.0, 1.0));

  /**
   * Duplicates this Cartesian4 instance.
   *
   * @param {Cartesian4} [result] The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter or a new Cartesian4 instance if one was not provided.
   */
  Cartesian4.prototype.clone = function (result) {
    return Cartesian4.clone(this, result);
  };

  /**
   * Compares this Cartesian against the provided Cartesian componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {Cartesian4} [right] The right hand side Cartesian.
   * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
   */
  Cartesian4.prototype.equals = function (right) {
    return Cartesian4.equals(this, right);
  };

  /**
   * Compares this Cartesian against the provided Cartesian componentwise and returns
   * <code>true</code> if they pass an absolute or relative tolerance test,
   * <code>false</code> otherwise.
   *
   * @param {Cartesian4} [right] The right hand side Cartesian.
   * @param {Number} [relativeEpsilon=0] The relative epsilon tolerance to use for equality testing.
   * @param {Number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
   * @returns {Boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
   */
  Cartesian4.prototype.equalsEpsilon = function (
    right,
    relativeEpsilon,
    absoluteEpsilon
  ) {
    return Cartesian4.equalsEpsilon(
      this,
      right,
      relativeEpsilon,
      absoluteEpsilon
    );
  };

  /**
   * Creates a string representing this Cartesian in the format '(x, y, z, w)'.
   *
   * @returns {String} A string representing the provided Cartesian in the format '(x, y, z, w)'.
   */
  Cartesian4.prototype.toString = function () {
    return `(${this.x}, ${this.y}, ${this.z}, ${this.w})`;
  };

  // scratchU8Array and scratchF32Array are views into the same buffer
  const scratchF32Array = new Float32Array(1);
  const scratchU8Array = new Uint8Array(scratchF32Array.buffer);

  const testU32 = new Uint32Array([0x11223344]);
  const testU8 = new Uint8Array(testU32.buffer);
  const littleEndian = testU8[0] === 0x44;

  /**
   * Packs an arbitrary floating point value to 4 values representable using uint8.
   *
   * @param {Number} value A floating point number.
   * @param {Cartesian4} [result] The Cartesian4 that will contain the packed float.
   * @returns {Cartesian4} A Cartesian4 representing the float packed to values in x, y, z, and w.
   */
  Cartesian4.packFloat = function (value, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("value", value);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      result = new Cartesian4();
    }

    // scratchU8Array and scratchF32Array are views into the same buffer
    scratchF32Array[0] = value;

    if (littleEndian) {
      result.x = scratchU8Array[0];
      result.y = scratchU8Array[1];
      result.z = scratchU8Array[2];
      result.w = scratchU8Array[3];
    } else {
      // convert from big-endian to little-endian
      result.x = scratchU8Array[3];
      result.y = scratchU8Array[2];
      result.z = scratchU8Array[1];
      result.w = scratchU8Array[0];
    }
    return result;
  };

  /**
   * Unpacks a float packed using Cartesian4.packFloat.
   *
   * @param {Cartesian4} packedFloat A Cartesian4 containing a float packed to 4 values representable using uint8.
   * @returns {Number} The unpacked float.
   * @private
   */
  Cartesian4.unpackFloat = function (packedFloat) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("packedFloat", packedFloat);
    //>>includeEnd('debug');

    // scratchU8Array and scratchF32Array are views into the same buffer
    if (littleEndian) {
      scratchU8Array[0] = packedFloat.x;
      scratchU8Array[1] = packedFloat.y;
      scratchU8Array[2] = packedFloat.z;
      scratchU8Array[3] = packedFloat.w;
    } else {
      // convert from little-endian to big-endian
      scratchU8Array[0] = packedFloat.w;
      scratchU8Array[1] = packedFloat.z;
      scratchU8Array[2] = packedFloat.y;
      scratchU8Array[3] = packedFloat.x;
    }
    return scratchF32Array[0];
  };

  /**
   * A 4x4 matrix, indexable as a column-major order array.
   * Constructor parameters are in row-major order for code readability.
   * @alias Matrix4
   * @constructor
   * @implements {ArrayLike<number>}
   *
   * @param {Number} [column0Row0=0.0] The value for column 0, row 0.
   * @param {Number} [column1Row0=0.0] The value for column 1, row 0.
   * @param {Number} [column2Row0=0.0] The value for column 2, row 0.
   * @param {Number} [column3Row0=0.0] The value for column 3, row 0.
   * @param {Number} [column0Row1=0.0] The value for column 0, row 1.
   * @param {Number} [column1Row1=0.0] The value for column 1, row 1.
   * @param {Number} [column2Row1=0.0] The value for column 2, row 1.
   * @param {Number} [column3Row1=0.0] The value for column 3, row 1.
   * @param {Number} [column0Row2=0.0] The value for column 0, row 2.
   * @param {Number} [column1Row2=0.0] The value for column 1, row 2.
   * @param {Number} [column2Row2=0.0] The value for column 2, row 2.
   * @param {Number} [column3Row2=0.0] The value for column 3, row 2.
   * @param {Number} [column0Row3=0.0] The value for column 0, row 3.
   * @param {Number} [column1Row3=0.0] The value for column 1, row 3.
   * @param {Number} [column2Row3=0.0] The value for column 2, row 3.
   * @param {Number} [column3Row3=0.0] The value for column 3, row 3.
   *
   * @see Matrix4.fromArray
   * @see Matrix4.fromColumnMajorArray
   * @see Matrix4.fromRowMajorArray
   * @see Matrix4.fromRotationTranslation
   * @see Matrix4.fromTranslationQuaternionRotationScale
   * @see Matrix4.fromTranslationRotationScale
   * @see Matrix4.fromTranslation
   * @see Matrix4.fromScale
   * @see Matrix4.fromUniformScale
   * @see Matrix4.fromRotation
   * @see Matrix4.fromCamera
   * @see Matrix4.computePerspectiveFieldOfView
   * @see Matrix4.computeOrthographicOffCenter
   * @see Matrix4.computePerspectiveOffCenter
   * @see Matrix4.computeInfinitePerspectiveOffCenter
   * @see Matrix4.computeViewportTransformation
   * @see Matrix4.computeView
   * @see Matrix2
   * @see Matrix3
   * @see Packable
   */
  function Matrix4(
    column0Row0,
    column1Row0,
    column2Row0,
    column3Row0,
    column0Row1,
    column1Row1,
    column2Row1,
    column3Row1,
    column0Row2,
    column1Row2,
    column2Row2,
    column3Row2,
    column0Row3,
    column1Row3,
    column2Row3,
    column3Row3
  ) {
    this[0] = defaultValue.defaultValue(column0Row0, 0.0);
    this[1] = defaultValue.defaultValue(column0Row1, 0.0);
    this[2] = defaultValue.defaultValue(column0Row2, 0.0);
    this[3] = defaultValue.defaultValue(column0Row3, 0.0);
    this[4] = defaultValue.defaultValue(column1Row0, 0.0);
    this[5] = defaultValue.defaultValue(column1Row1, 0.0);
    this[6] = defaultValue.defaultValue(column1Row2, 0.0);
    this[7] = defaultValue.defaultValue(column1Row3, 0.0);
    this[8] = defaultValue.defaultValue(column2Row0, 0.0);
    this[9] = defaultValue.defaultValue(column2Row1, 0.0);
    this[10] = defaultValue.defaultValue(column2Row2, 0.0);
    this[11] = defaultValue.defaultValue(column2Row3, 0.0);
    this[12] = defaultValue.defaultValue(column3Row0, 0.0);
    this[13] = defaultValue.defaultValue(column3Row1, 0.0);
    this[14] = defaultValue.defaultValue(column3Row2, 0.0);
    this[15] = defaultValue.defaultValue(column3Row3, 0.0);
  }

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  Matrix4.packedLength = 16;

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {Matrix4} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  Matrix4.pack = function (value, array, startingIndex) {
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
    array[startingIndex++] = value[9];
    array[startingIndex++] = value[10];
    array[startingIndex++] = value[11];
    array[startingIndex++] = value[12];
    array[startingIndex++] = value[13];
    array[startingIndex++] = value[14];
    array[startingIndex] = value[15];

    return array;
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {Matrix4} [result] The object into which to store the result.
   * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided.
   */
  Matrix4.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    if (!defaultValue.defined(result)) {
      result = new Matrix4();
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
    result[9] = array[startingIndex++];
    result[10] = array[startingIndex++];
    result[11] = array[startingIndex++];
    result[12] = array[startingIndex++];
    result[13] = array[startingIndex++];
    result[14] = array[startingIndex++];
    result[15] = array[startingIndex];
    return result;
  };

  /**
   * Flattens an array of Matrix4s into an array of components. The components
   * are stored in column-major order.
   *
   * @param {Matrix4[]} array The array of matrices to pack.
   * @param {Number[]} [result] The array onto which to store the result. If this is a typed array, it must have array.length * 16 components, else a {@link DeveloperError} will be thrown. If it is a regular array, it will be resized to have (array.length * 16) elements.
   * @returns {Number[]} The packed array.
   */
  Matrix4.packArray = function (array, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    const length = array.length;
    const resultLength = length * 16;
    if (!defaultValue.defined(result)) {
      result = new Array(resultLength);
    } else if (!Array.isArray(result) && result.length !== resultLength) {
      //>>includeStart('debug', pragmas.debug);
      throw new Check.DeveloperError(
        "If result is a typed array, it must have exactly array.length * 16 elements"
      );
      //>>includeEnd('debug');
    } else if (result.length !== resultLength) {
      result.length = resultLength;
    }

    for (let i = 0; i < length; ++i) {
      Matrix4.pack(array[i], result, i * 16);
    }
    return result;
  };

  /**
   * Unpacks an array of column-major matrix components into an array of Matrix4s.
   *
   * @param {Number[]} array The array of components to unpack.
   * @param {Matrix4[]} [result] The array onto which to store the result.
   * @returns {Matrix4[]} The unpacked array.
   */
  Matrix4.unpackArray = function (array, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    Check.Check.typeOf.number.greaterThanOrEquals("array.length", array.length, 16);
    if (array.length % 16 !== 0) {
      throw new Check.DeveloperError("array length must be a multiple of 16.");
    }
    //>>includeEnd('debug');

    const length = array.length;
    if (!defaultValue.defined(result)) {
      result = new Array(length / 16);
    } else {
      result.length = length / 16;
    }

    for (let i = 0; i < length; i += 16) {
      const index = i / 16;
      result[index] = Matrix4.unpack(array, i, result[index]);
    }
    return result;
  };

  /**
   * Duplicates a Matrix4 instance.
   *
   * @param {Matrix4} matrix The matrix to duplicate.
   * @param {Matrix4} [result] The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided. (Returns undefined if matrix is undefined)
   */
  Matrix4.clone = function (matrix, result) {
    if (!defaultValue.defined(matrix)) {
      return undefined;
    }
    if (!defaultValue.defined(result)) {
      return new Matrix4(
        matrix[0],
        matrix[4],
        matrix[8],
        matrix[12],
        matrix[1],
        matrix[5],
        matrix[9],
        matrix[13],
        matrix[2],
        matrix[6],
        matrix[10],
        matrix[14],
        matrix[3],
        matrix[7],
        matrix[11],
        matrix[15]
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
    result[9] = matrix[9];
    result[10] = matrix[10];
    result[11] = matrix[11];
    result[12] = matrix[12];
    result[13] = matrix[13];
    result[14] = matrix[14];
    result[15] = matrix[15];
    return result;
  };

  /**
   * Creates a Matrix4 from 16 consecutive elements in an array.
   * @function
   *
   * @param {Number[]} array The array whose 16 consecutive elements correspond to the positions of the matrix.  Assumes column-major order.
   * @param {Number} [startingIndex=0] The offset into the array of the first element, which corresponds to first column first row position in the matrix.
   * @param {Matrix4} [result] The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided.
   *
   * @example
   * // Create the Matrix4:
   * // [1.0, 2.0, 3.0, 4.0]
   * // [1.0, 2.0, 3.0, 4.0]
   * // [1.0, 2.0, 3.0, 4.0]
   * // [1.0, 2.0, 3.0, 4.0]
   *
   * const v = [1.0, 1.0, 1.0, 1.0, 2.0, 2.0, 2.0, 2.0, 3.0, 3.0, 3.0, 3.0, 4.0, 4.0, 4.0, 4.0];
   * const m = Cesium.Matrix4.fromArray(v);
   *
   * // Create same Matrix4 with using an offset into an array
   * const v2 = [0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 2.0, 2.0, 2.0, 2.0, 3.0, 3.0, 3.0, 3.0, 4.0, 4.0, 4.0, 4.0];
   * const m2 = Cesium.Matrix4.fromArray(v2, 2);
   */
  Matrix4.fromArray = Matrix4.unpack;

  /**
   * Computes a Matrix4 instance from a column-major order array.
   *
   * @param {Number[]} values The column-major order array.
   * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
   */
  Matrix4.fromColumnMajorArray = function (values, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("values", values);
    //>>includeEnd('debug');

    return Matrix4.clone(values, result);
  };

  /**
   * Computes a Matrix4 instance from a row-major order array.
   * The resulting matrix will be in column-major order.
   *
   * @param {Number[]} values The row-major order array.
   * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
   */
  Matrix4.fromRowMajorArray = function (values, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("values", values);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      return new Matrix4(
        values[0],
        values[1],
        values[2],
        values[3],
        values[4],
        values[5],
        values[6],
        values[7],
        values[8],
        values[9],
        values[10],
        values[11],
        values[12],
        values[13],
        values[14],
        values[15]
      );
    }
    result[0] = values[0];
    result[1] = values[4];
    result[2] = values[8];
    result[3] = values[12];
    result[4] = values[1];
    result[5] = values[5];
    result[6] = values[9];
    result[7] = values[13];
    result[8] = values[2];
    result[9] = values[6];
    result[10] = values[10];
    result[11] = values[14];
    result[12] = values[3];
    result[13] = values[7];
    result[14] = values[11];
    result[15] = values[15];
    return result;
  };

  /**
   * Computes a Matrix4 instance from a Matrix3 representing the rotation
   * and a Cartesian3 representing the translation.
   *
   * @param {Matrix3} rotation The upper left portion of the matrix representing the rotation.
   * @param {Cartesian3} [translation=Cartesian3.ZERO] The upper right portion of the matrix representing the translation.
   * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
   */
  Matrix4.fromRotationTranslation = function (rotation, translation, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("rotation", rotation);
    //>>includeEnd('debug');

    translation = defaultValue.defaultValue(translation, Matrix3.Cartesian3.ZERO);

    if (!defaultValue.defined(result)) {
      return new Matrix4(
        rotation[0],
        rotation[3],
        rotation[6],
        translation.x,
        rotation[1],
        rotation[4],
        rotation[7],
        translation.y,
        rotation[2],
        rotation[5],
        rotation[8],
        translation.z,
        0.0,
        0.0,
        0.0,
        1.0
      );
    }

    result[0] = rotation[0];
    result[1] = rotation[1];
    result[2] = rotation[2];
    result[3] = 0.0;
    result[4] = rotation[3];
    result[5] = rotation[4];
    result[6] = rotation[5];
    result[7] = 0.0;
    result[8] = rotation[6];
    result[9] = rotation[7];
    result[10] = rotation[8];
    result[11] = 0.0;
    result[12] = translation.x;
    result[13] = translation.y;
    result[14] = translation.z;
    result[15] = 1.0;
    return result;
  };

  /**
   * Computes a Matrix4 instance from a translation, rotation, and scale (TRS)
   * representation with the rotation represented as a quaternion.
   *
   * @param {Cartesian3} translation The translation transformation.
   * @param {Quaternion} rotation The rotation transformation.
   * @param {Cartesian3} scale The non-uniform scale transformation.
   * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
   *
   * @example
   * const result = Cesium.Matrix4.fromTranslationQuaternionRotationScale(
   *   new Cesium.Cartesian3(1.0, 2.0, 3.0), // translation
   *   Cesium.Quaternion.IDENTITY,           // rotation
   *   new Cesium.Cartesian3(7.0, 8.0, 9.0), // scale
   *   result);
   */
  Matrix4.fromTranslationQuaternionRotationScale = function (
    translation,
    rotation,
    scale,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("translation", translation);
    Check.Check.typeOf.object("rotation", rotation);
    Check.Check.typeOf.object("scale", scale);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      result = new Matrix4();
    }

    const scaleX = scale.x;
    const scaleY = scale.y;
    const scaleZ = scale.z;

    const x2 = rotation.x * rotation.x;
    const xy = rotation.x * rotation.y;
    const xz = rotation.x * rotation.z;
    const xw = rotation.x * rotation.w;
    const y2 = rotation.y * rotation.y;
    const yz = rotation.y * rotation.z;
    const yw = rotation.y * rotation.w;
    const z2 = rotation.z * rotation.z;
    const zw = rotation.z * rotation.w;
    const w2 = rotation.w * rotation.w;

    const m00 = x2 - y2 - z2 + w2;
    const m01 = 2.0 * (xy - zw);
    const m02 = 2.0 * (xz + yw);

    const m10 = 2.0 * (xy + zw);
    const m11 = -x2 + y2 - z2 + w2;
    const m12 = 2.0 * (yz - xw);

    const m20 = 2.0 * (xz - yw);
    const m21 = 2.0 * (yz + xw);
    const m22 = -x2 - y2 + z2 + w2;

    result[0] = m00 * scaleX;
    result[1] = m10 * scaleX;
    result[2] = m20 * scaleX;
    result[3] = 0.0;
    result[4] = m01 * scaleY;
    result[5] = m11 * scaleY;
    result[6] = m21 * scaleY;
    result[7] = 0.0;
    result[8] = m02 * scaleZ;
    result[9] = m12 * scaleZ;
    result[10] = m22 * scaleZ;
    result[11] = 0.0;
    result[12] = translation.x;
    result[13] = translation.y;
    result[14] = translation.z;
    result[15] = 1.0;

    return result;
  };

  /**
   * Creates a Matrix4 instance from a {@link TranslationRotationScale} instance.
   *
   * @param {TranslationRotationScale} translationRotationScale The instance.
   * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
   */
  Matrix4.fromTranslationRotationScale = function (
    translationRotationScale,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("translationRotationScale", translationRotationScale);
    //>>includeEnd('debug');

    return Matrix4.fromTranslationQuaternionRotationScale(
      translationRotationScale.translation,
      translationRotationScale.rotation,
      translationRotationScale.scale,
      result
    );
  };

  /**
   * Creates a Matrix4 instance from a Cartesian3 representing the translation.
   *
   * @param {Cartesian3} translation The upper right portion of the matrix representing the translation.
   * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
   *
   * @see Matrix4.multiplyByTranslation
   */
  Matrix4.fromTranslation = function (translation, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("translation", translation);
    //>>includeEnd('debug');

    return Matrix4.fromRotationTranslation(Matrix3.Matrix3.IDENTITY, translation, result);
  };

  /**
   * Computes a Matrix4 instance representing a non-uniform scale.
   *
   * @param {Cartesian3} scale The x, y, and z scale factors.
   * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
   *
   * @example
   * // Creates
   * //   [7.0, 0.0, 0.0, 0.0]
   * //   [0.0, 8.0, 0.0, 0.0]
   * //   [0.0, 0.0, 9.0, 0.0]
   * //   [0.0, 0.0, 0.0, 1.0]
   * const m = Cesium.Matrix4.fromScale(new Cesium.Cartesian3(7.0, 8.0, 9.0));
   */
  Matrix4.fromScale = function (scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("scale", scale);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      return new Matrix4(
        scale.x,
        0.0,
        0.0,
        0.0,
        0.0,
        scale.y,
        0.0,
        0.0,
        0.0,
        0.0,
        scale.z,
        0.0,
        0.0,
        0.0,
        0.0,
        1.0
      );
    }

    result[0] = scale.x;
    result[1] = 0.0;
    result[2] = 0.0;
    result[3] = 0.0;
    result[4] = 0.0;
    result[5] = scale.y;
    result[6] = 0.0;
    result[7] = 0.0;
    result[8] = 0.0;
    result[9] = 0.0;
    result[10] = scale.z;
    result[11] = 0.0;
    result[12] = 0.0;
    result[13] = 0.0;
    result[14] = 0.0;
    result[15] = 1.0;
    return result;
  };

  /**
   * Computes a Matrix4 instance representing a uniform scale.
   *
   * @param {Number} scale The uniform scale factor.
   * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
   *
   * @example
   * // Creates
   * //   [2.0, 0.0, 0.0, 0.0]
   * //   [0.0, 2.0, 0.0, 0.0]
   * //   [0.0, 0.0, 2.0, 0.0]
   * //   [0.0, 0.0, 0.0, 1.0]
   * const m = Cesium.Matrix4.fromUniformScale(2.0);
   */
  Matrix4.fromUniformScale = function (scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("scale", scale);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      return new Matrix4(
        scale,
        0.0,
        0.0,
        0.0,
        0.0,
        scale,
        0.0,
        0.0,
        0.0,
        0.0,
        scale,
        0.0,
        0.0,
        0.0,
        0.0,
        1.0
      );
    }

    result[0] = scale;
    result[1] = 0.0;
    result[2] = 0.0;
    result[3] = 0.0;
    result[4] = 0.0;
    result[5] = scale;
    result[6] = 0.0;
    result[7] = 0.0;
    result[8] = 0.0;
    result[9] = 0.0;
    result[10] = scale;
    result[11] = 0.0;
    result[12] = 0.0;
    result[13] = 0.0;
    result[14] = 0.0;
    result[15] = 1.0;
    return result;
  };

  /**
   * Creates a rotation matrix.
   *
   * @param {Matrix3} rotation The rotation matrix.
   * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
   */
  Matrix4.fromRotation = function (rotation, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("rotation", rotation);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      result = new Matrix4();
    }
    result[0] = rotation[0];
    result[1] = rotation[1];
    result[2] = rotation[2];
    result[3] = 0.0;

    result[4] = rotation[3];
    result[5] = rotation[4];
    result[6] = rotation[5];
    result[7] = 0.0;

    result[8] = rotation[6];
    result[9] = rotation[7];
    result[10] = rotation[8];
    result[11] = 0.0;

    result[12] = 0.0;
    result[13] = 0.0;
    result[14] = 0.0;
    result[15] = 1.0;

    return result;
  };

  const fromCameraF = new Matrix3.Cartesian3();
  const fromCameraR = new Matrix3.Cartesian3();
  const fromCameraU = new Matrix3.Cartesian3();

  /**
   * Computes a Matrix4 instance from a Camera.
   *
   * @param {Camera} camera The camera to use.
   * @param {Matrix4} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix4} The modified result parameter, or a new Matrix4 instance if one was not provided.
   */
  Matrix4.fromCamera = function (camera, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("camera", camera);
    //>>includeEnd('debug');

    const position = camera.position;
    const direction = camera.direction;
    const up = camera.up;

    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("camera.position", position);
    Check.Check.typeOf.object("camera.direction", direction);
    Check.Check.typeOf.object("camera.up", up);
    //>>includeEnd('debug');

    Matrix3.Cartesian3.normalize(direction, fromCameraF);
    Matrix3.Cartesian3.normalize(
      Matrix3.Cartesian3.cross(fromCameraF, up, fromCameraR),
      fromCameraR
    );
    Matrix3.Cartesian3.normalize(
      Matrix3.Cartesian3.cross(fromCameraR, fromCameraF, fromCameraU),
      fromCameraU
    );

    const sX = fromCameraR.x;
    const sY = fromCameraR.y;
    const sZ = fromCameraR.z;
    const fX = fromCameraF.x;
    const fY = fromCameraF.y;
    const fZ = fromCameraF.z;
    const uX = fromCameraU.x;
    const uY = fromCameraU.y;
    const uZ = fromCameraU.z;
    const positionX = position.x;
    const positionY = position.y;
    const positionZ = position.z;
    const t0 = sX * -positionX + sY * -positionY + sZ * -positionZ;
    const t1 = uX * -positionX + uY * -positionY + uZ * -positionZ;
    const t2 = fX * positionX + fY * positionY + fZ * positionZ;

    // The code below this comment is an optimized
    // version of the commented lines.
    // Rather that create two matrices and then multiply,
    // we just bake in the multiplcation as part of creation.
    // const rotation = new Matrix4(
    //                 sX,  sY,  sZ, 0.0,
    //                 uX,  uY,  uZ, 0.0,
    //                -fX, -fY, -fZ, 0.0,
    //                 0.0,  0.0,  0.0, 1.0);
    // const translation = new Matrix4(
    //                 1.0, 0.0, 0.0, -position.x,
    //                 0.0, 1.0, 0.0, -position.y,
    //                 0.0, 0.0, 1.0, -position.z,
    //                 0.0, 0.0, 0.0, 1.0);
    // return rotation.multiply(translation);
    if (!defaultValue.defined(result)) {
      return new Matrix4(
        sX,
        sY,
        sZ,
        t0,
        uX,
        uY,
        uZ,
        t1,
        -fX,
        -fY,
        -fZ,
        t2,
        0.0,
        0.0,
        0.0,
        1.0
      );
    }
    result[0] = sX;
    result[1] = uX;
    result[2] = -fX;
    result[3] = 0.0;
    result[4] = sY;
    result[5] = uY;
    result[6] = -fY;
    result[7] = 0.0;
    result[8] = sZ;
    result[9] = uZ;
    result[10] = -fZ;
    result[11] = 0.0;
    result[12] = t0;
    result[13] = t1;
    result[14] = t2;
    result[15] = 1.0;
    return result;
  };

  /**
   * Computes a Matrix4 instance representing a perspective transformation matrix.
   *
   * @param {Number} fovY The field of view along the Y axis in radians.
   * @param {Number} aspectRatio The aspect ratio.
   * @param {Number} near The distance to the near plane in meters.
   * @param {Number} far The distance to the far plane in meters.
   * @param {Matrix4} result The object in which the result will be stored.
   * @returns {Matrix4} The modified result parameter.
   *
   * @exception {DeveloperError} fovY must be in (0, PI].
   * @exception {DeveloperError} aspectRatio must be greater than zero.
   * @exception {DeveloperError} near must be greater than zero.
   * @exception {DeveloperError} far must be greater than zero.
   */
  Matrix4.computePerspectiveFieldOfView = function (
    fovY,
    aspectRatio,
    near,
    far,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number.greaterThan("fovY", fovY, 0.0);
    Check.Check.typeOf.number.lessThan("fovY", fovY, Math.PI);
    Check.Check.typeOf.number.greaterThan("near", near, 0.0);
    Check.Check.typeOf.number.greaterThan("far", far, 0.0);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const bottom = Math.tan(fovY * 0.5);

    const column1Row1 = 1.0 / bottom;
    const column0Row0 = column1Row1 / aspectRatio;
    const column2Row2 = (far + near) / (near - far);
    const column3Row2 = (2.0 * far * near) / (near - far);

    result[0] = column0Row0;
    result[1] = 0.0;
    result[2] = 0.0;
    result[3] = 0.0;
    result[4] = 0.0;
    result[5] = column1Row1;
    result[6] = 0.0;
    result[7] = 0.0;
    result[8] = 0.0;
    result[9] = 0.0;
    result[10] = column2Row2;
    result[11] = -1.0;
    result[12] = 0.0;
    result[13] = 0.0;
    result[14] = column3Row2;
    result[15] = 0.0;
    return result;
  };

  /**
   * Computes a Matrix4 instance representing an orthographic transformation matrix.
   *
   * @param {Number} left The number of meters to the left of the camera that will be in view.
   * @param {Number} right The number of meters to the right of the camera that will be in view.
   * @param {Number} bottom The number of meters below of the camera that will be in view.
   * @param {Number} top The number of meters above of the camera that will be in view.
   * @param {Number} near The distance to the near plane in meters.
   * @param {Number} far The distance to the far plane in meters.
   * @param {Matrix4} result The object in which the result will be stored.
   * @returns {Matrix4} The modified result parameter.
   */
  Matrix4.computeOrthographicOffCenter = function (
    left,
    right,
    bottom,
    top,
    near,
    far,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("left", left);
    Check.Check.typeOf.number("right", right);
    Check.Check.typeOf.number("bottom", bottom);
    Check.Check.typeOf.number("top", top);
    Check.Check.typeOf.number("near", near);
    Check.Check.typeOf.number("far", far);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    let a = 1.0 / (right - left);
    let b = 1.0 / (top - bottom);
    let c = 1.0 / (far - near);

    const tx = -(right + left) * a;
    const ty = -(top + bottom) * b;
    const tz = -(far + near) * c;
    a *= 2.0;
    b *= 2.0;
    c *= -2.0;

    result[0] = a;
    result[1] = 0.0;
    result[2] = 0.0;
    result[3] = 0.0;
    result[4] = 0.0;
    result[5] = b;
    result[6] = 0.0;
    result[7] = 0.0;
    result[8] = 0.0;
    result[9] = 0.0;
    result[10] = c;
    result[11] = 0.0;
    result[12] = tx;
    result[13] = ty;
    result[14] = tz;
    result[15] = 1.0;
    return result;
  };

  /**
   * Computes a Matrix4 instance representing an off center perspective transformation.
   *
   * @param {Number} left The number of meters to the left of the camera that will be in view.
   * @param {Number} right The number of meters to the right of the camera that will be in view.
   * @param {Number} bottom The number of meters below of the camera that will be in view.
   * @param {Number} top The number of meters above of the camera that will be in view.
   * @param {Number} near The distance to the near plane in meters.
   * @param {Number} far The distance to the far plane in meters.
   * @param {Matrix4} result The object in which the result will be stored.
   * @returns {Matrix4} The modified result parameter.
   */
  Matrix4.computePerspectiveOffCenter = function (
    left,
    right,
    bottom,
    top,
    near,
    far,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("left", left);
    Check.Check.typeOf.number("right", right);
    Check.Check.typeOf.number("bottom", bottom);
    Check.Check.typeOf.number("top", top);
    Check.Check.typeOf.number("near", near);
    Check.Check.typeOf.number("far", far);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const column0Row0 = (2.0 * near) / (right - left);
    const column1Row1 = (2.0 * near) / (top - bottom);
    const column2Row0 = (right + left) / (right - left);
    const column2Row1 = (top + bottom) / (top - bottom);
    const column2Row2 = -(far + near) / (far - near);
    const column2Row3 = -1.0;
    const column3Row2 = (-2.0 * far * near) / (far - near);

    result[0] = column0Row0;
    result[1] = 0.0;
    result[2] = 0.0;
    result[3] = 0.0;
    result[4] = 0.0;
    result[5] = column1Row1;
    result[6] = 0.0;
    result[7] = 0.0;
    result[8] = column2Row0;
    result[9] = column2Row1;
    result[10] = column2Row2;
    result[11] = column2Row3;
    result[12] = 0.0;
    result[13] = 0.0;
    result[14] = column3Row2;
    result[15] = 0.0;
    return result;
  };

  /**
   * Computes a Matrix4 instance representing an infinite off center perspective transformation.
   *
   * @param {Number} left The number of meters to the left of the camera that will be in view.
   * @param {Number} right The number of meters to the right of the camera that will be in view.
   * @param {Number} bottom The number of meters below of the camera that will be in view.
   * @param {Number} top The number of meters above of the camera that will be in view.
   * @param {Number} near The distance to the near plane in meters.
   * @param {Matrix4} result The object in which the result will be stored.
   * @returns {Matrix4} The modified result parameter.
   */
  Matrix4.computeInfinitePerspectiveOffCenter = function (
    left,
    right,
    bottom,
    top,
    near,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("left", left);
    Check.Check.typeOf.number("right", right);
    Check.Check.typeOf.number("bottom", bottom);
    Check.Check.typeOf.number("top", top);
    Check.Check.typeOf.number("near", near);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const column0Row0 = (2.0 * near) / (right - left);
    const column1Row1 = (2.0 * near) / (top - bottom);
    const column2Row0 = (right + left) / (right - left);
    const column2Row1 = (top + bottom) / (top - bottom);
    const column2Row2 = -1.0;
    const column2Row3 = -1.0;
    const column3Row2 = -2.0 * near;

    result[0] = column0Row0;
    result[1] = 0.0;
    result[2] = 0.0;
    result[3] = 0.0;
    result[4] = 0.0;
    result[5] = column1Row1;
    result[6] = 0.0;
    result[7] = 0.0;
    result[8] = column2Row0;
    result[9] = column2Row1;
    result[10] = column2Row2;
    result[11] = column2Row3;
    result[12] = 0.0;
    result[13] = 0.0;
    result[14] = column3Row2;
    result[15] = 0.0;
    return result;
  };

  /**
   * Computes a Matrix4 instance that transforms from normalized device coordinates to window coordinates.
   *
   * @param {Object} [viewport = { x : 0.0, y : 0.0, width : 0.0, height : 0.0 }] The viewport's corners as shown in Example 1.
   * @param {Number} [nearDepthRange=0.0] The near plane distance in window coordinates.
   * @param {Number} [farDepthRange=1.0] The far plane distance in window coordinates.
   * @param {Matrix4} [result] The object in which the result will be stored.
   * @returns {Matrix4} The modified result parameter.
   *
   * @example
   * // Create viewport transformation using an explicit viewport and depth range.
   * const m = Cesium.Matrix4.computeViewportTransformation({
   *     x : 0.0,
   *     y : 0.0,
   *     width : 1024.0,
   *     height : 768.0
   * }, 0.0, 1.0, new Cesium.Matrix4());
   */
  Matrix4.computeViewportTransformation = function (
    viewport,
    nearDepthRange,
    farDepthRange,
    result
  ) {
    if (!defaultValue.defined(result)) {
      result = new Matrix4();
    }

    viewport = defaultValue.defaultValue(viewport, defaultValue.defaultValue.EMPTY_OBJECT);
    const x = defaultValue.defaultValue(viewport.x, 0.0);
    const y = defaultValue.defaultValue(viewport.y, 0.0);
    const width = defaultValue.defaultValue(viewport.width, 0.0);
    const height = defaultValue.defaultValue(viewport.height, 0.0);
    nearDepthRange = defaultValue.defaultValue(nearDepthRange, 0.0);
    farDepthRange = defaultValue.defaultValue(farDepthRange, 1.0);

    const halfWidth = width * 0.5;
    const halfHeight = height * 0.5;
    const halfDepth = (farDepthRange - nearDepthRange) * 0.5;

    const column0Row0 = halfWidth;
    const column1Row1 = halfHeight;
    const column2Row2 = halfDepth;
    const column3Row0 = x + halfWidth;
    const column3Row1 = y + halfHeight;
    const column3Row2 = nearDepthRange + halfDepth;
    const column3Row3 = 1.0;

    result[0] = column0Row0;
    result[1] = 0.0;
    result[2] = 0.0;
    result[3] = 0.0;
    result[4] = 0.0;
    result[5] = column1Row1;
    result[6] = 0.0;
    result[7] = 0.0;
    result[8] = 0.0;
    result[9] = 0.0;
    result[10] = column2Row2;
    result[11] = 0.0;
    result[12] = column3Row0;
    result[13] = column3Row1;
    result[14] = column3Row2;
    result[15] = column3Row3;

    return result;
  };

  /**
   * Computes a Matrix4 instance that transforms from world space to view space.
   *
   * @param {Cartesian3} position The position of the camera.
   * @param {Cartesian3} direction The forward direction.
   * @param {Cartesian3} up The up direction.
   * @param {Cartesian3} right The right direction.
   * @param {Matrix4} result The object in which the result will be stored.
   * @returns {Matrix4} The modified result parameter.
   */
  Matrix4.computeView = function (position, direction, up, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("position", position);
    Check.Check.typeOf.object("direction", direction);
    Check.Check.typeOf.object("up", up);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result[0] = right.x;
    result[1] = up.x;
    result[2] = -direction.x;
    result[3] = 0.0;
    result[4] = right.y;
    result[5] = up.y;
    result[6] = -direction.y;
    result[7] = 0.0;
    result[8] = right.z;
    result[9] = up.z;
    result[10] = -direction.z;
    result[11] = 0.0;
    result[12] = -Matrix3.Cartesian3.dot(right, position);
    result[13] = -Matrix3.Cartesian3.dot(up, position);
    result[14] = Matrix3.Cartesian3.dot(direction, position);
    result[15] = 1.0;
    return result;
  };

  /**
   * Computes an Array from the provided Matrix4 instance.
   * The array will be in column-major order.
   *
   * @param {Matrix4} matrix The matrix to use..
   * @param {Number[]} [result] The Array onto which to store the result.
   * @returns {Number[]} The modified Array parameter or a new Array instance if one was not provided.
   *
   * @example
   * //create an array from an instance of Matrix4
   * // m = [10.0, 14.0, 18.0, 22.0]
   * //     [11.0, 15.0, 19.0, 23.0]
   * //     [12.0, 16.0, 20.0, 24.0]
   * //     [13.0, 17.0, 21.0, 25.0]
   * const a = Cesium.Matrix4.toArray(m);
   *
   * // m remains the same
   * //creates a = [10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0, 19.0, 20.0, 21.0, 22.0, 23.0, 24.0, 25.0]
   */
  Matrix4.toArray = function (matrix, result) {
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
        matrix[9],
        matrix[10],
        matrix[11],
        matrix[12],
        matrix[13],
        matrix[14],
        matrix[15],
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
    result[9] = matrix[9];
    result[10] = matrix[10];
    result[11] = matrix[11];
    result[12] = matrix[12];
    result[13] = matrix[13];
    result[14] = matrix[14];
    result[15] = matrix[15];
    return result;
  };

  /**
   * Computes the array index of the element at the provided row and column.
   *
   * @param {Number} row The zero-based index of the row.
   * @param {Number} column The zero-based index of the column.
   * @returns {Number} The index of the element at the provided row and column.
   *
   * @exception {DeveloperError} row must be 0, 1, 2, or 3.
   * @exception {DeveloperError} column must be 0, 1, 2, or 3.
   *
   * @example
   * const myMatrix = new Cesium.Matrix4();
   * const column1Row0Index = Cesium.Matrix4.getElementIndex(1, 0);
   * const column1Row0 = myMatrix[column1Row0Index];
   * myMatrix[column1Row0Index] = 10.0;
   */
  Matrix4.getElementIndex = function (column, row) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number.greaterThanOrEquals("row", row, 0);
    Check.Check.typeOf.number.lessThanOrEquals("row", row, 3);

    Check.Check.typeOf.number.greaterThanOrEquals("column", column, 0);
    Check.Check.typeOf.number.lessThanOrEquals("column", column, 3);
    //>>includeEnd('debug');

    return column * 4 + row;
  };

  /**
   * Retrieves a copy of the matrix column at the provided index as a Cartesian4 instance.
   *
   * @param {Matrix4} matrix The matrix to use.
   * @param {Number} index The zero-based index of the column to retrieve.
   * @param {Cartesian4} result The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter.
   *
   * @exception {DeveloperError} index must be 0, 1, 2, or 3.
   *
   * @example
   * //returns a Cartesian4 instance with values from the specified column
   * // m = [10.0, 11.0, 12.0, 13.0]
   * //     [14.0, 15.0, 16.0, 17.0]
   * //     [18.0, 19.0, 20.0, 21.0]
   * //     [22.0, 23.0, 24.0, 25.0]
   *
   * //Example 1: Creates an instance of Cartesian
   * const a = Cesium.Matrix4.getColumn(m, 2, new Cesium.Cartesian4());
   *
   * @example
   * //Example 2: Sets values for Cartesian instance
   * const a = new Cesium.Cartesian4();
   * Cesium.Matrix4.getColumn(m, 2, a);
   *
   * // a.x = 12.0; a.y = 16.0; a.z = 20.0; a.w = 24.0;
   */
  Matrix4.getColumn = function (matrix, index, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);

    Check.Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.Check.typeOf.number.lessThanOrEquals("index", index, 3);

    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const startIndex = index * 4;
    const x = matrix[startIndex];
    const y = matrix[startIndex + 1];
    const z = matrix[startIndex + 2];
    const w = matrix[startIndex + 3];

    result.x = x;
    result.y = y;
    result.z = z;
    result.w = w;
    return result;
  };

  /**
   * Computes a new matrix that replaces the specified column in the provided matrix with the provided Cartesian4 instance.
   *
   * @param {Matrix4} matrix The matrix to use.
   * @param {Number} index The zero-based index of the column to set.
   * @param {Cartesian4} cartesian The Cartesian whose values will be assigned to the specified column.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter.
   *
   * @exception {DeveloperError} index must be 0, 1, 2, or 3.
   *
   * @example
   * //creates a new Matrix4 instance with new column values from the Cartesian4 instance
   * // m = [10.0, 11.0, 12.0, 13.0]
   * //     [14.0, 15.0, 16.0, 17.0]
   * //     [18.0, 19.0, 20.0, 21.0]
   * //     [22.0, 23.0, 24.0, 25.0]
   *
   * const a = Cesium.Matrix4.setColumn(m, 2, new Cesium.Cartesian4(99.0, 98.0, 97.0, 96.0), new Cesium.Matrix4());
   *
   * // m remains the same
   * // a = [10.0, 11.0, 99.0, 13.0]
   * //     [14.0, 15.0, 98.0, 17.0]
   * //     [18.0, 19.0, 97.0, 21.0]
   * //     [22.0, 23.0, 96.0, 25.0]
   */
  Matrix4.setColumn = function (matrix, index, cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);

    Check.Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.Check.typeOf.number.lessThanOrEquals("index", index, 3);

    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result = Matrix4.clone(matrix, result);
    const startIndex = index * 4;
    result[startIndex] = cartesian.x;
    result[startIndex + 1] = cartesian.y;
    result[startIndex + 2] = cartesian.z;
    result[startIndex + 3] = cartesian.w;
    return result;
  };

  /**
   * Retrieves a copy of the matrix row at the provided index as a Cartesian4 instance.
   *
   * @param {Matrix4} matrix The matrix to use.
   * @param {Number} index The zero-based index of the row to retrieve.
   * @param {Cartesian4} result The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter.
   *
   * @exception {DeveloperError} index must be 0, 1, 2, or 3.
   *
   * @example
   * //returns a Cartesian4 instance with values from the specified column
   * // m = [10.0, 11.0, 12.0, 13.0]
   * //     [14.0, 15.0, 16.0, 17.0]
   * //     [18.0, 19.0, 20.0, 21.0]
   * //     [22.0, 23.0, 24.0, 25.0]
   *
   * //Example 1: Returns an instance of Cartesian
   * const a = Cesium.Matrix4.getRow(m, 2, new Cesium.Cartesian4());
   *
   * @example
   * //Example 2: Sets values for a Cartesian instance
   * const a = new Cesium.Cartesian4();
   * Cesium.Matrix4.getRow(m, 2, a);
   *
   * // a.x = 18.0; a.y = 19.0; a.z = 20.0; a.w = 21.0;
   */
  Matrix4.getRow = function (matrix, index, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);

    Check.Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.Check.typeOf.number.lessThanOrEquals("index", index, 3);

    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const x = matrix[index];
    const y = matrix[index + 4];
    const z = matrix[index + 8];
    const w = matrix[index + 12];

    result.x = x;
    result.y = y;
    result.z = z;
    result.w = w;
    return result;
  };

  /**
   * Computes a new matrix that replaces the specified row in the provided matrix with the provided Cartesian4 instance.
   *
   * @param {Matrix4} matrix The matrix to use.
   * @param {Number} index The zero-based index of the row to set.
   * @param {Cartesian4} cartesian The Cartesian whose values will be assigned to the specified row.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter.
   *
   * @exception {DeveloperError} index must be 0, 1, 2, or 3.
   *
   * @example
   * //create a new Matrix4 instance with new row values from the Cartesian4 instance
   * // m = [10.0, 11.0, 12.0, 13.0]
   * //     [14.0, 15.0, 16.0, 17.0]
   * //     [18.0, 19.0, 20.0, 21.0]
   * //     [22.0, 23.0, 24.0, 25.0]
   *
   * const a = Cesium.Matrix4.setRow(m, 2, new Cesium.Cartesian4(99.0, 98.0, 97.0, 96.0), new Cesium.Matrix4());
   *
   * // m remains the same
   * // a = [10.0, 11.0, 12.0, 13.0]
   * //     [14.0, 15.0, 16.0, 17.0]
   * //     [99.0, 98.0, 97.0, 96.0]
   * //     [22.0, 23.0, 24.0, 25.0]
   */
  Matrix4.setRow = function (matrix, index, cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);

    Check.Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.Check.typeOf.number.lessThanOrEquals("index", index, 3);

    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result = Matrix4.clone(matrix, result);
    result[index] = cartesian.x;
    result[index + 4] = cartesian.y;
    result[index + 8] = cartesian.z;
    result[index + 12] = cartesian.w;
    return result;
  };

  /**
   * Computes a new matrix that replaces the translation in the rightmost column of the provided
   * matrix with the provided translation. This assumes the matrix is an affine transformation.
   *
   * @param {Matrix4} matrix The matrix to use.
   * @param {Cartesian3} translation The translation that replaces the translation of the provided matrix.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter.
   */
  Matrix4.setTranslation = function (matrix, translation, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("translation", translation);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result[0] = matrix[0];
    result[1] = matrix[1];
    result[2] = matrix[2];
    result[3] = matrix[3];

    result[4] = matrix[4];
    result[5] = matrix[5];
    result[6] = matrix[6];
    result[7] = matrix[7];

    result[8] = matrix[8];
    result[9] = matrix[9];
    result[10] = matrix[10];
    result[11] = matrix[11];

    result[12] = translation.x;
    result[13] = translation.y;
    result[14] = translation.z;
    result[15] = matrix[15];

    return result;
  };

  const scaleScratch1$1 = new Matrix3.Cartesian3();

  /**
   * Computes a new matrix that replaces the scale with the provided scale.
   * This assumes the matrix is an affine transformation.
   *
   * @param {Matrix4} matrix The matrix to use.
   * @param {Cartesian3} scale The scale that replaces the scale of the provided matrix.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter.
   *
   * @see Matrix4.setUniformScale
   * @see Matrix4.fromScale
   * @see Matrix4.fromUniformScale
   * @see Matrix4.multiplyByScale
   * @see Matrix4.multiplyByUniformScale
   * @see Matrix4.getScale
   */
  Matrix4.setScale = function (matrix, scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("scale", scale);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const existingScale = Matrix4.getScale(matrix, scaleScratch1$1);
    const scaleRatioX = scale.x / existingScale.x;
    const scaleRatioY = scale.y / existingScale.y;
    const scaleRatioZ = scale.z / existingScale.z;

    result[0] = matrix[0] * scaleRatioX;
    result[1] = matrix[1] * scaleRatioX;
    result[2] = matrix[2] * scaleRatioX;
    result[3] = matrix[3];

    result[4] = matrix[4] * scaleRatioY;
    result[5] = matrix[5] * scaleRatioY;
    result[6] = matrix[6] * scaleRatioY;
    result[7] = matrix[7];

    result[8] = matrix[8] * scaleRatioZ;
    result[9] = matrix[9] * scaleRatioZ;
    result[10] = matrix[10] * scaleRatioZ;
    result[11] = matrix[11];

    result[12] = matrix[12];
    result[13] = matrix[13];
    result[14] = matrix[14];
    result[15] = matrix[15];

    return result;
  };

  const scaleScratch2$1 = new Matrix3.Cartesian3();

  /**
   * Computes a new matrix that replaces the scale with the provided uniform scale.
   * This assumes the matrix is an affine transformation.
   *
   * @param {Matrix4} matrix The matrix to use.
   * @param {Number} scale The uniform scale that replaces the scale of the provided matrix.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter.
   *
   * @see Matrix4.setScale
   * @see Matrix4.fromScale
   * @see Matrix4.fromUniformScale
   * @see Matrix4.multiplyByScale
   * @see Matrix4.multiplyByUniformScale
   * @see Matrix4.getScale
   */
  Matrix4.setUniformScale = function (matrix, scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.number("scale", scale);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const existingScale = Matrix4.getScale(matrix, scaleScratch2$1);
    const scaleRatioX = scale / existingScale.x;
    const scaleRatioY = scale / existingScale.y;
    const scaleRatioZ = scale / existingScale.z;

    result[0] = matrix[0] * scaleRatioX;
    result[1] = matrix[1] * scaleRatioX;
    result[2] = matrix[2] * scaleRatioX;
    result[3] = matrix[3];

    result[4] = matrix[4] * scaleRatioY;
    result[5] = matrix[5] * scaleRatioY;
    result[6] = matrix[6] * scaleRatioY;
    result[7] = matrix[7];

    result[8] = matrix[8] * scaleRatioZ;
    result[9] = matrix[9] * scaleRatioZ;
    result[10] = matrix[10] * scaleRatioZ;
    result[11] = matrix[11];

    result[12] = matrix[12];
    result[13] = matrix[13];
    result[14] = matrix[14];
    result[15] = matrix[15];

    return result;
  };

  const scratchColumn$1 = new Matrix3.Cartesian3();

  /**
   * Extracts the non-uniform scale assuming the matrix is an affine transformation.
   *
   * @param {Matrix4} matrix The matrix.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter
   *
   * @see Matrix4.multiplyByScale
   * @see Matrix4.multiplyByUniformScale
   * @see Matrix4.fromScale
   * @see Matrix4.fromUniformScale
   * @see Matrix4.setScale
   * @see Matrix4.setUniformScale
   */
  Matrix4.getScale = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Matrix3.Cartesian3.magnitude(
      Matrix3.Cartesian3.fromElements(matrix[0], matrix[1], matrix[2], scratchColumn$1)
    );
    result.y = Matrix3.Cartesian3.magnitude(
      Matrix3.Cartesian3.fromElements(matrix[4], matrix[5], matrix[6], scratchColumn$1)
    );
    result.z = Matrix3.Cartesian3.magnitude(
      Matrix3.Cartesian3.fromElements(matrix[8], matrix[9], matrix[10], scratchColumn$1)
    );
    return result;
  };

  const scaleScratch3$1 = new Matrix3.Cartesian3();

  /**
   * Computes the maximum scale assuming the matrix is an affine transformation.
   * The maximum scale is the maximum length of the column vectors in the upper-left
   * 3x3 matrix.
   *
   * @param {Matrix4} matrix The matrix.
   * @returns {Number} The maximum scale.
   */
  Matrix4.getMaximumScale = function (matrix) {
    Matrix4.getScale(matrix, scaleScratch3$1);
    return Matrix3.Cartesian3.maximumComponent(scaleScratch3$1);
  };

  const scaleScratch4$1 = new Matrix3.Cartesian3();

  /**
   * Sets the rotation assuming the matrix is an affine transformation.
   *
   * @param {Matrix4} matrix The matrix.
   * @param {Matrix3} rotation The rotation matrix.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter.
   *
   * @see Matrix4.fromRotation
   * @see Matrix4.getRotation
   */
  Matrix4.setRotation = function (matrix, rotation, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const scale = Matrix4.getScale(matrix, scaleScratch4$1);

    result[0] = rotation[0] * scale.x;
    result[1] = rotation[1] * scale.x;
    result[2] = rotation[2] * scale.x;
    result[3] = matrix[3];

    result[4] = rotation[3] * scale.y;
    result[5] = rotation[4] * scale.y;
    result[6] = rotation[5] * scale.y;
    result[7] = matrix[7];

    result[8] = rotation[6] * scale.z;
    result[9] = rotation[7] * scale.z;
    result[10] = rotation[8] * scale.z;
    result[11] = matrix[11];

    result[12] = matrix[12];
    result[13] = matrix[13];
    result[14] = matrix[14];
    result[15] = matrix[15];

    return result;
  };

  const scaleScratch5$1 = new Matrix3.Cartesian3();

  /**
   * Extracts the rotation matrix assuming the matrix is an affine transformation.
   *
   * @param {Matrix4} matrix The matrix.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   *
   * @see Matrix4.setRotation
   * @see Matrix4.fromRotation
   */
  Matrix4.getRotation = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const scale = Matrix4.getScale(matrix, scaleScratch5$1);

    result[0] = matrix[0] / scale.x;
    result[1] = matrix[1] / scale.x;
    result[2] = matrix[2] / scale.x;

    result[3] = matrix[4] / scale.y;
    result[4] = matrix[5] / scale.y;
    result[5] = matrix[6] / scale.y;

    result[6] = matrix[8] / scale.z;
    result[7] = matrix[9] / scale.z;
    result[8] = matrix[10] / scale.z;

    return result;
  };

  /**
   * Computes the product of two matrices.
   *
   * @param {Matrix4} left The first matrix.
   * @param {Matrix4} right The second matrix.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter.
   */
  Matrix4.multiply = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const left0 = left[0];
    const left1 = left[1];
    const left2 = left[2];
    const left3 = left[3];
    const left4 = left[4];
    const left5 = left[5];
    const left6 = left[6];
    const left7 = left[7];
    const left8 = left[8];
    const left9 = left[9];
    const left10 = left[10];
    const left11 = left[11];
    const left12 = left[12];
    const left13 = left[13];
    const left14 = left[14];
    const left15 = left[15];

    const right0 = right[0];
    const right1 = right[1];
    const right2 = right[2];
    const right3 = right[3];
    const right4 = right[4];
    const right5 = right[5];
    const right6 = right[6];
    const right7 = right[7];
    const right8 = right[8];
    const right9 = right[9];
    const right10 = right[10];
    const right11 = right[11];
    const right12 = right[12];
    const right13 = right[13];
    const right14 = right[14];
    const right15 = right[15];

    const column0Row0 =
      left0 * right0 + left4 * right1 + left8 * right2 + left12 * right3;
    const column0Row1 =
      left1 * right0 + left5 * right1 + left9 * right2 + left13 * right3;
    const column0Row2 =
      left2 * right0 + left6 * right1 + left10 * right2 + left14 * right3;
    const column0Row3 =
      left3 * right0 + left7 * right1 + left11 * right2 + left15 * right3;

    const column1Row0 =
      left0 * right4 + left4 * right5 + left8 * right6 + left12 * right7;
    const column1Row1 =
      left1 * right4 + left5 * right5 + left9 * right6 + left13 * right7;
    const column1Row2 =
      left2 * right4 + left6 * right5 + left10 * right6 + left14 * right7;
    const column1Row3 =
      left3 * right4 + left7 * right5 + left11 * right6 + left15 * right7;

    const column2Row0 =
      left0 * right8 + left4 * right9 + left8 * right10 + left12 * right11;
    const column2Row1 =
      left1 * right8 + left5 * right9 + left9 * right10 + left13 * right11;
    const column2Row2 =
      left2 * right8 + left6 * right9 + left10 * right10 + left14 * right11;
    const column2Row3 =
      left3 * right8 + left7 * right9 + left11 * right10 + left15 * right11;

    const column3Row0 =
      left0 * right12 + left4 * right13 + left8 * right14 + left12 * right15;
    const column3Row1 =
      left1 * right12 + left5 * right13 + left9 * right14 + left13 * right15;
    const column3Row2 =
      left2 * right12 + left6 * right13 + left10 * right14 + left14 * right15;
    const column3Row3 =
      left3 * right12 + left7 * right13 + left11 * right14 + left15 * right15;

    result[0] = column0Row0;
    result[1] = column0Row1;
    result[2] = column0Row2;
    result[3] = column0Row3;
    result[4] = column1Row0;
    result[5] = column1Row1;
    result[6] = column1Row2;
    result[7] = column1Row3;
    result[8] = column2Row0;
    result[9] = column2Row1;
    result[10] = column2Row2;
    result[11] = column2Row3;
    result[12] = column3Row0;
    result[13] = column3Row1;
    result[14] = column3Row2;
    result[15] = column3Row3;
    return result;
  };

  /**
   * Computes the sum of two matrices.
   *
   * @param {Matrix4} left The first matrix.
   * @param {Matrix4} right The second matrix.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter.
   */
  Matrix4.add = function (left, right, result) {
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
    result[9] = left[9] + right[9];
    result[10] = left[10] + right[10];
    result[11] = left[11] + right[11];
    result[12] = left[12] + right[12];
    result[13] = left[13] + right[13];
    result[14] = left[14] + right[14];
    result[15] = left[15] + right[15];
    return result;
  };

  /**
   * Computes the difference of two matrices.
   *
   * @param {Matrix4} left The first matrix.
   * @param {Matrix4} right The second matrix.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter.
   */
  Matrix4.subtract = function (left, right, result) {
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
    result[9] = left[9] - right[9];
    result[10] = left[10] - right[10];
    result[11] = left[11] - right[11];
    result[12] = left[12] - right[12];
    result[13] = left[13] - right[13];
    result[14] = left[14] - right[14];
    result[15] = left[15] - right[15];
    return result;
  };

  /**
   * Computes the product of two matrices assuming the matrices are affine transformation matrices,
   * where the upper left 3x3 elements are any matrix, and
   * the upper three elements in the fourth column are the translation.
   * The bottom row is assumed to be [0, 0, 0, 1].
   * The matrix is not verified to be in the proper form.
   * This method is faster than computing the product for general 4x4
   * matrices using {@link Matrix4.multiply}.
   *
   * @param {Matrix4} left The first matrix.
   * @param {Matrix4} right The second matrix.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter.
   *
   * @example
   * const m1 = new Cesium.Matrix4(1.0, 6.0, 7.0, 0.0, 2.0, 5.0, 8.0, 0.0, 3.0, 4.0, 9.0, 0.0, 0.0, 0.0, 0.0, 1.0);
   * const m2 = Cesium.Transforms.eastNorthUpToFixedFrame(new Cesium.Cartesian3(1.0, 1.0, 1.0));
   * const m3 = Cesium.Matrix4.multiplyTransformation(m1, m2, new Cesium.Matrix4());
   */
  Matrix4.multiplyTransformation = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const left0 = left[0];
    const left1 = left[1];
    const left2 = left[2];
    const left4 = left[4];
    const left5 = left[5];
    const left6 = left[6];
    const left8 = left[8];
    const left9 = left[9];
    const left10 = left[10];
    const left12 = left[12];
    const left13 = left[13];
    const left14 = left[14];

    const right0 = right[0];
    const right1 = right[1];
    const right2 = right[2];
    const right4 = right[4];
    const right5 = right[5];
    const right6 = right[6];
    const right8 = right[8];
    const right9 = right[9];
    const right10 = right[10];
    const right12 = right[12];
    const right13 = right[13];
    const right14 = right[14];

    const column0Row0 = left0 * right0 + left4 * right1 + left8 * right2;
    const column0Row1 = left1 * right0 + left5 * right1 + left9 * right2;
    const column0Row2 = left2 * right0 + left6 * right1 + left10 * right2;

    const column1Row0 = left0 * right4 + left4 * right5 + left8 * right6;
    const column1Row1 = left1 * right4 + left5 * right5 + left9 * right6;
    const column1Row2 = left2 * right4 + left6 * right5 + left10 * right6;

    const column2Row0 = left0 * right8 + left4 * right9 + left8 * right10;
    const column2Row1 = left1 * right8 + left5 * right9 + left9 * right10;
    const column2Row2 = left2 * right8 + left6 * right9 + left10 * right10;

    const column3Row0 =
      left0 * right12 + left4 * right13 + left8 * right14 + left12;
    const column3Row1 =
      left1 * right12 + left5 * right13 + left9 * right14 + left13;
    const column3Row2 =
      left2 * right12 + left6 * right13 + left10 * right14 + left14;

    result[0] = column0Row0;
    result[1] = column0Row1;
    result[2] = column0Row2;
    result[3] = 0.0;
    result[4] = column1Row0;
    result[5] = column1Row1;
    result[6] = column1Row2;
    result[7] = 0.0;
    result[8] = column2Row0;
    result[9] = column2Row1;
    result[10] = column2Row2;
    result[11] = 0.0;
    result[12] = column3Row0;
    result[13] = column3Row1;
    result[14] = column3Row2;
    result[15] = 1.0;
    return result;
  };

  /**
   * Multiplies a transformation matrix (with a bottom row of <code>[0.0, 0.0, 0.0, 1.0]</code>)
   * by a 3x3 rotation matrix.  This is an optimization
   * for <code>Matrix4.multiply(m, Matrix4.fromRotationTranslation(rotation), m);</code> with less allocations and arithmetic operations.
   *
   * @param {Matrix4} matrix The matrix on the left-hand side.
   * @param {Matrix3} rotation The 3x3 rotation matrix on the right-hand side.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter.
   *
   * @example
   * // Instead of Cesium.Matrix4.multiply(m, Cesium.Matrix4.fromRotationTranslation(rotation), m);
   * Cesium.Matrix4.multiplyByMatrix3(m, rotation, m);
   */
  Matrix4.multiplyByMatrix3 = function (matrix, rotation, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("rotation", rotation);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const left0 = matrix[0];
    const left1 = matrix[1];
    const left2 = matrix[2];
    const left4 = matrix[4];
    const left5 = matrix[5];
    const left6 = matrix[6];
    const left8 = matrix[8];
    const left9 = matrix[9];
    const left10 = matrix[10];

    const right0 = rotation[0];
    const right1 = rotation[1];
    const right2 = rotation[2];
    const right4 = rotation[3];
    const right5 = rotation[4];
    const right6 = rotation[5];
    const right8 = rotation[6];
    const right9 = rotation[7];
    const right10 = rotation[8];

    const column0Row0 = left0 * right0 + left4 * right1 + left8 * right2;
    const column0Row1 = left1 * right0 + left5 * right1 + left9 * right2;
    const column0Row2 = left2 * right0 + left6 * right1 + left10 * right2;

    const column1Row0 = left0 * right4 + left4 * right5 + left8 * right6;
    const column1Row1 = left1 * right4 + left5 * right5 + left9 * right6;
    const column1Row2 = left2 * right4 + left6 * right5 + left10 * right6;

    const column2Row0 = left0 * right8 + left4 * right9 + left8 * right10;
    const column2Row1 = left1 * right8 + left5 * right9 + left9 * right10;
    const column2Row2 = left2 * right8 + left6 * right9 + left10 * right10;

    result[0] = column0Row0;
    result[1] = column0Row1;
    result[2] = column0Row2;
    result[3] = 0.0;
    result[4] = column1Row0;
    result[5] = column1Row1;
    result[6] = column1Row2;
    result[7] = 0.0;
    result[8] = column2Row0;
    result[9] = column2Row1;
    result[10] = column2Row2;
    result[11] = 0.0;
    result[12] = matrix[12];
    result[13] = matrix[13];
    result[14] = matrix[14];
    result[15] = matrix[15];
    return result;
  };

  /**
   * Multiplies a transformation matrix (with a bottom row of <code>[0.0, 0.0, 0.0, 1.0]</code>)
   * by an implicit translation matrix defined by a {@link Cartesian3}.  This is an optimization
   * for <code>Matrix4.multiply(m, Matrix4.fromTranslation(position), m);</code> with less allocations and arithmetic operations.
   *
   * @param {Matrix4} matrix The matrix on the left-hand side.
   * @param {Cartesian3} translation The translation on the right-hand side.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter.
   *
   * @example
   * // Instead of Cesium.Matrix4.multiply(m, Cesium.Matrix4.fromTranslation(position), m);
   * Cesium.Matrix4.multiplyByTranslation(m, position, m);
   */
  Matrix4.multiplyByTranslation = function (matrix, translation, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("translation", translation);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const x = translation.x;
    const y = translation.y;
    const z = translation.z;

    const tx = x * matrix[0] + y * matrix[4] + z * matrix[8] + matrix[12];
    const ty = x * matrix[1] + y * matrix[5] + z * matrix[9] + matrix[13];
    const tz = x * matrix[2] + y * matrix[6] + z * matrix[10] + matrix[14];

    result[0] = matrix[0];
    result[1] = matrix[1];
    result[2] = matrix[2];
    result[3] = matrix[3];
    result[4] = matrix[4];
    result[5] = matrix[5];
    result[6] = matrix[6];
    result[7] = matrix[7];
    result[8] = matrix[8];
    result[9] = matrix[9];
    result[10] = matrix[10];
    result[11] = matrix[11];
    result[12] = tx;
    result[13] = ty;
    result[14] = tz;
    result[15] = matrix[15];
    return result;
  };

  /**
   * Multiplies an affine transformation matrix (with a bottom row of <code>[0.0, 0.0, 0.0, 1.0]</code>)
   * by an implicit non-uniform scale matrix. This is an optimization
   * for <code>Matrix4.multiply(m, Matrix4.fromUniformScale(scale), m);</code>, where
   * <code>m</code> must be an affine matrix.
   * This function performs fewer allocations and arithmetic operations.
   *
   * @param {Matrix4} matrix The affine matrix on the left-hand side.
   * @param {Cartesian3} scale The non-uniform scale on the right-hand side.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter.
   *
   *
   * @example
   * // Instead of Cesium.Matrix4.multiply(m, Cesium.Matrix4.fromScale(scale), m);
   * Cesium.Matrix4.multiplyByScale(m, scale, m);
   *
   * @see Matrix4.multiplyByUniformScale
   * @see Matrix4.fromScale
   * @see Matrix4.fromUniformScale
   * @see Matrix4.setScale
   * @see Matrix4.setUniformScale
   * @see Matrix4.getScale
   */
  Matrix4.multiplyByScale = function (matrix, scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("scale", scale);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const scaleX = scale.x;
    const scaleY = scale.y;
    const scaleZ = scale.z;

    // Faster than Cartesian3.equals
    if (scaleX === 1.0 && scaleY === 1.0 && scaleZ === 1.0) {
      return Matrix4.clone(matrix, result);
    }

    result[0] = scaleX * matrix[0];
    result[1] = scaleX * matrix[1];
    result[2] = scaleX * matrix[2];
    result[3] = matrix[3];

    result[4] = scaleY * matrix[4];
    result[5] = scaleY * matrix[5];
    result[6] = scaleY * matrix[6];
    result[7] = matrix[7];

    result[8] = scaleZ * matrix[8];
    result[9] = scaleZ * matrix[9];
    result[10] = scaleZ * matrix[10];
    result[11] = matrix[11];

    result[12] = matrix[12];
    result[13] = matrix[13];
    result[14] = matrix[14];
    result[15] = matrix[15];

    return result;
  };

  /**
   * Computes the product of a matrix times a uniform scale, as if the scale were a scale matrix.
   *
   * @param {Matrix4} matrix The matrix on the left-hand side.
   * @param {Number} scale The uniform scale on the right-hand side.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter.
   *
   * @example
   * // Instead of Cesium.Matrix4.multiply(m, Cesium.Matrix4.fromUniformScale(scale), m);
   * Cesium.Matrix4.multiplyByUniformScale(m, scale, m);
   *
   * @see Matrix4.multiplyByScale
   * @see Matrix4.fromScale
   * @see Matrix4.fromUniformScale
   * @see Matrix4.setScale
   * @see Matrix4.setUniformScale
   * @see Matrix4.getScale
   */
  Matrix4.multiplyByUniformScale = function (matrix, scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.number("scale", scale);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result[0] = matrix[0] * scale;
    result[1] = matrix[1] * scale;
    result[2] = matrix[2] * scale;
    result[3] = matrix[3];

    result[4] = matrix[4] * scale;
    result[5] = matrix[5] * scale;
    result[6] = matrix[6] * scale;
    result[7] = matrix[7];

    result[8] = matrix[8] * scale;
    result[9] = matrix[9] * scale;
    result[10] = matrix[10] * scale;
    result[11] = matrix[11];

    result[12] = matrix[12];
    result[13] = matrix[13];
    result[14] = matrix[14];
    result[15] = matrix[15];

    return result;
  };

  /**
   * Computes the product of a matrix and a column vector.
   *
   * @param {Matrix4} matrix The matrix.
   * @param {Cartesian4} cartesian The vector.
   * @param {Cartesian4} result The object onto which to store the result.
   * @returns {Cartesian4} The modified result parameter.
   */
  Matrix4.multiplyByVector = function (matrix, cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const vX = cartesian.x;
    const vY = cartesian.y;
    const vZ = cartesian.z;
    const vW = cartesian.w;

    const x = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ + matrix[12] * vW;
    const y = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ + matrix[13] * vW;
    const z = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ + matrix[14] * vW;
    const w = matrix[3] * vX + matrix[7] * vY + matrix[11] * vZ + matrix[15] * vW;

    result.x = x;
    result.y = y;
    result.z = z;
    result.w = w;
    return result;
  };

  /**
   * Computes the product of a matrix and a {@link Cartesian3}.  This is equivalent to calling {@link Matrix4.multiplyByVector}
   * with a {@link Cartesian4} with a <code>w</code> component of zero.
   *
   * @param {Matrix4} matrix The matrix.
   * @param {Cartesian3} cartesian The point.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter.
   *
   * @example
   * const p = new Cesium.Cartesian3(1.0, 2.0, 3.0);
   * const result = Cesium.Matrix4.multiplyByPointAsVector(matrix, p, new Cesium.Cartesian3());
   * // A shortcut for
   * //   Cartesian3 p = ...
   * //   Cesium.Matrix4.multiplyByVector(matrix, new Cesium.Cartesian4(p.x, p.y, p.z, 0.0), result);
   */
  Matrix4.multiplyByPointAsVector = function (matrix, cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const vX = cartesian.x;
    const vY = cartesian.y;
    const vZ = cartesian.z;

    const x = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ;
    const y = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ;
    const z = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ;

    result.x = x;
    result.y = y;
    result.z = z;
    return result;
  };

  /**
   * Computes the product of a matrix and a {@link Cartesian3}. This is equivalent to calling {@link Matrix4.multiplyByVector}
   * with a {@link Cartesian4} with a <code>w</code> component of 1, but returns a {@link Cartesian3} instead of a {@link Cartesian4}.
   *
   * @param {Matrix4} matrix The matrix.
   * @param {Cartesian3} cartesian The point.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter.
   *
   * @example
   * const p = new Cesium.Cartesian3(1.0, 2.0, 3.0);
   * const result = Cesium.Matrix4.multiplyByPoint(matrix, p, new Cesium.Cartesian3());
   */
  Matrix4.multiplyByPoint = function (matrix, cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const vX = cartesian.x;
    const vY = cartesian.y;
    const vZ = cartesian.z;

    const x = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ + matrix[12];
    const y = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ + matrix[13];
    const z = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ + matrix[14];

    result.x = x;
    result.y = y;
    result.z = z;
    return result;
  };

  /**
   * Computes the product of a matrix and a scalar.
   *
   * @param {Matrix4} matrix The matrix.
   * @param {Number} scalar The number to multiply by.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter.
   *
   * @example
   * //create a Matrix4 instance which is a scaled version of the supplied Matrix4
   * // m = [10.0, 11.0, 12.0, 13.0]
   * //     [14.0, 15.0, 16.0, 17.0]
   * //     [18.0, 19.0, 20.0, 21.0]
   * //     [22.0, 23.0, 24.0, 25.0]
   *
   * const a = Cesium.Matrix4.multiplyByScalar(m, -2, new Cesium.Matrix4());
   *
   * // m remains the same
   * // a = [-20.0, -22.0, -24.0, -26.0]
   * //     [-28.0, -30.0, -32.0, -34.0]
   * //     [-36.0, -38.0, -40.0, -42.0]
   * //     [-44.0, -46.0, -48.0, -50.0]
   */
  Matrix4.multiplyByScalar = function (matrix, scalar, result) {
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
    result[9] = matrix[9] * scalar;
    result[10] = matrix[10] * scalar;
    result[11] = matrix[11] * scalar;
    result[12] = matrix[12] * scalar;
    result[13] = matrix[13] * scalar;
    result[14] = matrix[14] * scalar;
    result[15] = matrix[15] * scalar;
    return result;
  };

  /**
   * Computes a negated copy of the provided matrix.
   *
   * @param {Matrix4} matrix The matrix to negate.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter.
   *
   * @example
   * //create a new Matrix4 instance which is a negation of a Matrix4
   * // m = [10.0, 11.0, 12.0, 13.0]
   * //     [14.0, 15.0, 16.0, 17.0]
   * //     [18.0, 19.0, 20.0, 21.0]
   * //     [22.0, 23.0, 24.0, 25.0]
   *
   * const a = Cesium.Matrix4.negate(m, new Cesium.Matrix4());
   *
   * // m remains the same
   * // a = [-10.0, -11.0, -12.0, -13.0]
   * //     [-14.0, -15.0, -16.0, -17.0]
   * //     [-18.0, -19.0, -20.0, -21.0]
   * //     [-22.0, -23.0, -24.0, -25.0]
   */
  Matrix4.negate = function (matrix, result) {
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
    result[9] = -matrix[9];
    result[10] = -matrix[10];
    result[11] = -matrix[11];
    result[12] = -matrix[12];
    result[13] = -matrix[13];
    result[14] = -matrix[14];
    result[15] = -matrix[15];
    return result;
  };

  /**
   * Computes the transpose of the provided matrix.
   *
   * @param {Matrix4} matrix The matrix to transpose.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter.
   *
   * @example
   * //returns transpose of a Matrix4
   * // m = [10.0, 11.0, 12.0, 13.0]
   * //     [14.0, 15.0, 16.0, 17.0]
   * //     [18.0, 19.0, 20.0, 21.0]
   * //     [22.0, 23.0, 24.0, 25.0]
   *
   * const a = Cesium.Matrix4.transpose(m, new Cesium.Matrix4());
   *
   * // m remains the same
   * // a = [10.0, 14.0, 18.0, 22.0]
   * //     [11.0, 15.0, 19.0, 23.0]
   * //     [12.0, 16.0, 20.0, 24.0]
   * //     [13.0, 17.0, 21.0, 25.0]
   */
  Matrix4.transpose = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const matrix1 = matrix[1];
    const matrix2 = matrix[2];
    const matrix3 = matrix[3];
    const matrix6 = matrix[6];
    const matrix7 = matrix[7];
    const matrix11 = matrix[11];

    result[0] = matrix[0];
    result[1] = matrix[4];
    result[2] = matrix[8];
    result[3] = matrix[12];
    result[4] = matrix1;
    result[5] = matrix[5];
    result[6] = matrix[9];
    result[7] = matrix[13];
    result[8] = matrix2;
    result[9] = matrix6;
    result[10] = matrix[10];
    result[11] = matrix[14];
    result[12] = matrix3;
    result[13] = matrix7;
    result[14] = matrix11;
    result[15] = matrix[15];
    return result;
  };

  /**
   * Computes a matrix, which contains the absolute (unsigned) values of the provided matrix's elements.
   *
   * @param {Matrix4} matrix The matrix with signed elements.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter.
   */
  Matrix4.abs = function (matrix, result) {
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
    result[9] = Math.abs(matrix[9]);
    result[10] = Math.abs(matrix[10]);
    result[11] = Math.abs(matrix[11]);
    result[12] = Math.abs(matrix[12]);
    result[13] = Math.abs(matrix[13]);
    result[14] = Math.abs(matrix[14]);
    result[15] = Math.abs(matrix[15]);

    return result;
  };

  /**
   * Compares the provided matrices componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {Matrix4} [left] The first matrix.
   * @param {Matrix4} [right] The second matrix.
   * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
   *
   * @example
   * //compares two Matrix4 instances
   *
   * // a = [10.0, 14.0, 18.0, 22.0]
   * //     [11.0, 15.0, 19.0, 23.0]
   * //     [12.0, 16.0, 20.0, 24.0]
   * //     [13.0, 17.0, 21.0, 25.0]
   *
   * // b = [10.0, 14.0, 18.0, 22.0]
   * //     [11.0, 15.0, 19.0, 23.0]
   * //     [12.0, 16.0, 20.0, 24.0]
   * //     [13.0, 17.0, 21.0, 25.0]
   *
   * if(Cesium.Matrix4.equals(a,b)) {
   *      console.log("Both matrices are equal");
   * } else {
   *      console.log("They are not equal");
   * }
   *
   * //Prints "Both matrices are equal" on the console
   */
  Matrix4.equals = function (left, right) {
    // Given that most matrices will be transformation matrices, the elements
    // are tested in order such that the test is likely to fail as early
    // as possible.  I _think_ this is just as friendly to the L1 cache
    // as testing in index order.  It is certainty faster in practice.
    return (
      left === right ||
      (defaultValue.defined(left) &&
        defaultValue.defined(right) &&
        // Translation
        left[12] === right[12] &&
        left[13] === right[13] &&
        left[14] === right[14] &&
        // Rotation/scale
        left[0] === right[0] &&
        left[1] === right[1] &&
        left[2] === right[2] &&
        left[4] === right[4] &&
        left[5] === right[5] &&
        left[6] === right[6] &&
        left[8] === right[8] &&
        left[9] === right[9] &&
        left[10] === right[10] &&
        // Bottom row
        left[3] === right[3] &&
        left[7] === right[7] &&
        left[11] === right[11] &&
        left[15] === right[15])
    );
  };

  /**
   * Compares the provided matrices componentwise and returns
   * <code>true</code> if they are within the provided epsilon,
   * <code>false</code> otherwise.
   *
   * @param {Matrix4} [left] The first matrix.
   * @param {Matrix4} [right] The second matrix.
   * @param {Number} [epsilon=0] The epsilon to use for equality testing.
   * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
   *
   * @example
   * //compares two Matrix4 instances
   *
   * // a = [10.5, 14.5, 18.5, 22.5]
   * //     [11.5, 15.5, 19.5, 23.5]
   * //     [12.5, 16.5, 20.5, 24.5]
   * //     [13.5, 17.5, 21.5, 25.5]
   *
   * // b = [10.0, 14.0, 18.0, 22.0]
   * //     [11.0, 15.0, 19.0, 23.0]
   * //     [12.0, 16.0, 20.0, 24.0]
   * //     [13.0, 17.0, 21.0, 25.0]
   *
   * if(Cesium.Matrix4.equalsEpsilon(a,b,0.1)){
   *      console.log("Difference between both the matrices is less than 0.1");
   * } else {
   *      console.log("Difference between both the matrices is not less than 0.1");
   * }
   *
   * //Prints "Difference between both the matrices is not less than 0.1" on the console
   */
  Matrix4.equalsEpsilon = function (left, right, epsilon) {
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
        Math.abs(left[8] - right[8]) <= epsilon &&
        Math.abs(left[9] - right[9]) <= epsilon &&
        Math.abs(left[10] - right[10]) <= epsilon &&
        Math.abs(left[11] - right[11]) <= epsilon &&
        Math.abs(left[12] - right[12]) <= epsilon &&
        Math.abs(left[13] - right[13]) <= epsilon &&
        Math.abs(left[14] - right[14]) <= epsilon &&
        Math.abs(left[15] - right[15]) <= epsilon)
    );
  };

  /**
   * Gets the translation portion of the provided matrix, assuming the matrix is an affine transformation matrix.
   *
   * @param {Matrix4} matrix The matrix to use.
   * @param {Cartesian3} result The object onto which to store the result.
   * @returns {Cartesian3} The modified result parameter.
   */
  Matrix4.getTranslation = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = matrix[12];
    result.y = matrix[13];
    result.z = matrix[14];
    return result;
  };

  /**
   * Gets the upper left 3x3 matrix of the provided matrix.
   *
   * @param {Matrix4} matrix The matrix to use.
   * @param {Matrix3} result The object onto which to store the result.
   * @returns {Matrix3} The modified result parameter.
   *
   * @example
   * // returns a Matrix3 instance from a Matrix4 instance
   *
   * // m = [10.0, 14.0, 18.0, 22.0]
   * //     [11.0, 15.0, 19.0, 23.0]
   * //     [12.0, 16.0, 20.0, 24.0]
   * //     [13.0, 17.0, 21.0, 25.0]
   *
   * const b = new Cesium.Matrix3();
   * Cesium.Matrix4.getMatrix3(m,b);
   *
   * // b = [10.0, 14.0, 18.0]
   * //     [11.0, 15.0, 19.0]
   * //     [12.0, 16.0, 20.0]
   */
  Matrix4.getMatrix3 = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result[0] = matrix[0];
    result[1] = matrix[1];
    result[2] = matrix[2];
    result[3] = matrix[4];
    result[4] = matrix[5];
    result[5] = matrix[6];
    result[6] = matrix[8];
    result[7] = matrix[9];
    result[8] = matrix[10];
    return result;
  };

  const scratchInverseRotation = new Matrix3.Matrix3();
  const scratchMatrix3Zero = new Matrix3.Matrix3();
  const scratchBottomRow = new Cartesian4();
  const scratchExpectedBottomRow = new Cartesian4(0.0, 0.0, 0.0, 1.0);

  /**
   * Computes the inverse of the provided matrix using Cramers Rule.
   * If the determinant is zero, the matrix can not be inverted, and an exception is thrown.
   * If the matrix is a proper rigid transformation, it is more efficient
   * to invert it with {@link Matrix4.inverseTransformation}.
   *
   * @param {Matrix4} matrix The matrix to invert.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter.
   *
   * @exception {RuntimeError} matrix is not invertible because its determinate is zero.
   */
  Matrix4.inverse = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');
    //
    // Ported from:
    //   ftp://download.intel.com/design/PentiumIII/sml/24504301.pdf
    //
    const src0 = matrix[0];
    const src1 = matrix[4];
    const src2 = matrix[8];
    const src3 = matrix[12];
    const src4 = matrix[1];
    const src5 = matrix[5];
    const src6 = matrix[9];
    const src7 = matrix[13];
    const src8 = matrix[2];
    const src9 = matrix[6];
    const src10 = matrix[10];
    const src11 = matrix[14];
    const src12 = matrix[3];
    const src13 = matrix[7];
    const src14 = matrix[11];
    const src15 = matrix[15];

    // calculate pairs for first 8 elements (cofactors)
    let tmp0 = src10 * src15;
    let tmp1 = src11 * src14;
    let tmp2 = src9 * src15;
    let tmp3 = src11 * src13;
    let tmp4 = src9 * src14;
    let tmp5 = src10 * src13;
    let tmp6 = src8 * src15;
    let tmp7 = src11 * src12;
    let tmp8 = src8 * src14;
    let tmp9 = src10 * src12;
    let tmp10 = src8 * src13;
    let tmp11 = src9 * src12;

    // calculate first 8 elements (cofactors)
    const dst0 =
      tmp0 * src5 +
      tmp3 * src6 +
      tmp4 * src7 -
      (tmp1 * src5 + tmp2 * src6 + tmp5 * src7);
    const dst1 =
      tmp1 * src4 +
      tmp6 * src6 +
      tmp9 * src7 -
      (tmp0 * src4 + tmp7 * src6 + tmp8 * src7);
    const dst2 =
      tmp2 * src4 +
      tmp7 * src5 +
      tmp10 * src7 -
      (tmp3 * src4 + tmp6 * src5 + tmp11 * src7);
    const dst3 =
      tmp5 * src4 +
      tmp8 * src5 +
      tmp11 * src6 -
      (tmp4 * src4 + tmp9 * src5 + tmp10 * src6);
    const dst4 =
      tmp1 * src1 +
      tmp2 * src2 +
      tmp5 * src3 -
      (tmp0 * src1 + tmp3 * src2 + tmp4 * src3);
    const dst5 =
      tmp0 * src0 +
      tmp7 * src2 +
      tmp8 * src3 -
      (tmp1 * src0 + tmp6 * src2 + tmp9 * src3);
    const dst6 =
      tmp3 * src0 +
      tmp6 * src1 +
      tmp11 * src3 -
      (tmp2 * src0 + tmp7 * src1 + tmp10 * src3);
    const dst7 =
      tmp4 * src0 +
      tmp9 * src1 +
      tmp10 * src2 -
      (tmp5 * src0 + tmp8 * src1 + tmp11 * src2);

    // calculate pairs for second 8 elements (cofactors)
    tmp0 = src2 * src7;
    tmp1 = src3 * src6;
    tmp2 = src1 * src7;
    tmp3 = src3 * src5;
    tmp4 = src1 * src6;
    tmp5 = src2 * src5;
    tmp6 = src0 * src7;
    tmp7 = src3 * src4;
    tmp8 = src0 * src6;
    tmp9 = src2 * src4;
    tmp10 = src0 * src5;
    tmp11 = src1 * src4;

    // calculate second 8 elements (cofactors)
    const dst8 =
      tmp0 * src13 +
      tmp3 * src14 +
      tmp4 * src15 -
      (tmp1 * src13 + tmp2 * src14 + tmp5 * src15);
    const dst9 =
      tmp1 * src12 +
      tmp6 * src14 +
      tmp9 * src15 -
      (tmp0 * src12 + tmp7 * src14 + tmp8 * src15);
    const dst10 =
      tmp2 * src12 +
      tmp7 * src13 +
      tmp10 * src15 -
      (tmp3 * src12 + tmp6 * src13 + tmp11 * src15);
    const dst11 =
      tmp5 * src12 +
      tmp8 * src13 +
      tmp11 * src14 -
      (tmp4 * src12 + tmp9 * src13 + tmp10 * src14);
    const dst12 =
      tmp2 * src10 +
      tmp5 * src11 +
      tmp1 * src9 -
      (tmp4 * src11 + tmp0 * src9 + tmp3 * src10);
    const dst13 =
      tmp8 * src11 +
      tmp0 * src8 +
      tmp7 * src10 -
      (tmp6 * src10 + tmp9 * src11 + tmp1 * src8);
    const dst14 =
      tmp6 * src9 +
      tmp11 * src11 +
      tmp3 * src8 -
      (tmp10 * src11 + tmp2 * src8 + tmp7 * src9);
    const dst15 =
      tmp10 * src10 +
      tmp4 * src8 +
      tmp9 * src9 -
      (tmp8 * src9 + tmp11 * src10 + tmp5 * src8);

    // calculate determinant
    let det = src0 * dst0 + src1 * dst1 + src2 * dst2 + src3 * dst3;

    if (Math.abs(det) < Math$1.CesiumMath.EPSILON21) {
      // Special case for a zero scale matrix that can occur, for example,
      // when a model's node has a [0, 0, 0] scale.
      if (
        Matrix3.Matrix3.equalsEpsilon(
          Matrix4.getMatrix3(matrix, scratchInverseRotation),
          scratchMatrix3Zero,
          Math$1.CesiumMath.EPSILON7
        ) &&
        Cartesian4.equals(
          Matrix4.getRow(matrix, 3, scratchBottomRow),
          scratchExpectedBottomRow
        )
      ) {
        result[0] = 0.0;
        result[1] = 0.0;
        result[2] = 0.0;
        result[3] = 0.0;
        result[4] = 0.0;
        result[5] = 0.0;
        result[6] = 0.0;
        result[7] = 0.0;
        result[8] = 0.0;
        result[9] = 0.0;
        result[10] = 0.0;
        result[11] = 0.0;
        result[12] = -matrix[12];
        result[13] = -matrix[13];
        result[14] = -matrix[14];
        result[15] = 1.0;
        return result;
      }

      throw new RuntimeError.RuntimeError(
        "matrix is not invertible because its determinate is zero."
      );
    }

    // calculate matrix inverse
    det = 1.0 / det;

    result[0] = dst0 * det;
    result[1] = dst1 * det;
    result[2] = dst2 * det;
    result[3] = dst3 * det;
    result[4] = dst4 * det;
    result[5] = dst5 * det;
    result[6] = dst6 * det;
    result[7] = dst7 * det;
    result[8] = dst8 * det;
    result[9] = dst9 * det;
    result[10] = dst10 * det;
    result[11] = dst11 * det;
    result[12] = dst12 * det;
    result[13] = dst13 * det;
    result[14] = dst14 * det;
    result[15] = dst15 * det;
    return result;
  };

  /**
   * Computes the inverse of the provided matrix assuming it is a proper rigid matrix,
   * where the upper left 3x3 elements are a rotation matrix,
   * and the upper three elements in the fourth column are the translation.
   * The bottom row is assumed to be [0, 0, 0, 1].
   * The matrix is not verified to be in the proper form.
   * This method is faster than computing the inverse for a general 4x4
   * matrix using {@link Matrix4.inverse}.
   *
   * @param {Matrix4} matrix The matrix to invert.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter.
   */
  Matrix4.inverseTransformation = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    //This function is an optimized version of the below 4 lines.
    //const rT = Matrix3.transpose(Matrix4.getMatrix3(matrix));
    //const rTN = Matrix3.negate(rT);
    //const rTT = Matrix3.multiplyByVector(rTN, Matrix4.getTranslation(matrix));
    //return Matrix4.fromRotationTranslation(rT, rTT, result);

    const matrix0 = matrix[0];
    const matrix1 = matrix[1];
    const matrix2 = matrix[2];
    const matrix4 = matrix[4];
    const matrix5 = matrix[5];
    const matrix6 = matrix[6];
    const matrix8 = matrix[8];
    const matrix9 = matrix[9];
    const matrix10 = matrix[10];

    const vX = matrix[12];
    const vY = matrix[13];
    const vZ = matrix[14];

    const x = -matrix0 * vX - matrix1 * vY - matrix2 * vZ;
    const y = -matrix4 * vX - matrix5 * vY - matrix6 * vZ;
    const z = -matrix8 * vX - matrix9 * vY - matrix10 * vZ;

    result[0] = matrix0;
    result[1] = matrix4;
    result[2] = matrix8;
    result[3] = 0.0;
    result[4] = matrix1;
    result[5] = matrix5;
    result[6] = matrix9;
    result[7] = 0.0;
    result[8] = matrix2;
    result[9] = matrix6;
    result[10] = matrix10;
    result[11] = 0.0;
    result[12] = x;
    result[13] = y;
    result[14] = z;
    result[15] = 1.0;
    return result;
  };

  const scratchTransposeMatrix = new Matrix4();

  /**
   * Computes the inverse transpose of a matrix.
   *
   * @param {Matrix4} matrix The matrix to transpose and invert.
   * @param {Matrix4} result The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter.
   */
  Matrix4.inverseTranspose = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    return Matrix4.inverse(
      Matrix4.transpose(matrix, scratchTransposeMatrix),
      result
    );
  };

  /**
   * An immutable Matrix4 instance initialized to the identity matrix.
   *
   * @type {Matrix4}
   * @constant
   */
  Matrix4.IDENTITY = Object.freeze(
    new Matrix4(
      1.0,
      0.0,
      0.0,
      0.0,
      0.0,
      1.0,
      0.0,
      0.0,
      0.0,
      0.0,
      1.0,
      0.0,
      0.0,
      0.0,
      0.0,
      1.0
    )
  );

  /**
   * An immutable Matrix4 instance initialized to the zero matrix.
   *
   * @type {Matrix4}
   * @constant
   */
  Matrix4.ZERO = Object.freeze(
    new Matrix4(
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0
    )
  );

  /**
   * The index into Matrix4 for column 0, row 0.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN0ROW0 = 0;

  /**
   * The index into Matrix4 for column 0, row 1.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN0ROW1 = 1;

  /**
   * The index into Matrix4 for column 0, row 2.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN0ROW2 = 2;

  /**
   * The index into Matrix4 for column 0, row 3.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN0ROW3 = 3;

  /**
   * The index into Matrix4 for column 1, row 0.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN1ROW0 = 4;

  /**
   * The index into Matrix4 for column 1, row 1.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN1ROW1 = 5;

  /**
   * The index into Matrix4 for column 1, row 2.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN1ROW2 = 6;

  /**
   * The index into Matrix4 for column 1, row 3.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN1ROW3 = 7;

  /**
   * The index into Matrix4 for column 2, row 0.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN2ROW0 = 8;

  /**
   * The index into Matrix4 for column 2, row 1.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN2ROW1 = 9;

  /**
   * The index into Matrix4 for column 2, row 2.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN2ROW2 = 10;

  /**
   * The index into Matrix4 for column 2, row 3.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN2ROW3 = 11;

  /**
   * The index into Matrix4 for column 3, row 0.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN3ROW0 = 12;

  /**
   * The index into Matrix4 for column 3, row 1.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN3ROW1 = 13;

  /**
   * The index into Matrix4 for column 3, row 2.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN3ROW2 = 14;

  /**
   * The index into Matrix4 for column 3, row 3.
   *
   * @type {Number}
   * @constant
   */
  Matrix4.COLUMN3ROW3 = 15;

  Object.defineProperties(Matrix4.prototype, {
    /**
     * Gets the number of items in the collection.
     * @memberof Matrix4.prototype
     *
     * @type {Number}
     */
    length: {
      get: function () {
        return Matrix4.packedLength;
      },
    },
  });

  /**
   * Duplicates the provided Matrix4 instance.
   *
   * @param {Matrix4} [result] The object onto which to store the result.
   * @returns {Matrix4} The modified result parameter or a new Matrix4 instance if one was not provided.
   */
  Matrix4.prototype.clone = function (result) {
    return Matrix4.clone(this, result);
  };

  /**
   * Compares this matrix to the provided matrix componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {Matrix4} [right] The right hand side matrix.
   * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
   */
  Matrix4.prototype.equals = function (right) {
    return Matrix4.equals(this, right);
  };

  /**
   * @private
   */
  Matrix4.equalsArray = function (matrix, array, offset) {
    return (
      matrix[0] === array[offset] &&
      matrix[1] === array[offset + 1] &&
      matrix[2] === array[offset + 2] &&
      matrix[3] === array[offset + 3] &&
      matrix[4] === array[offset + 4] &&
      matrix[5] === array[offset + 5] &&
      matrix[6] === array[offset + 6] &&
      matrix[7] === array[offset + 7] &&
      matrix[8] === array[offset + 8] &&
      matrix[9] === array[offset + 9] &&
      matrix[10] === array[offset + 10] &&
      matrix[11] === array[offset + 11] &&
      matrix[12] === array[offset + 12] &&
      matrix[13] === array[offset + 13] &&
      matrix[14] === array[offset + 14] &&
      matrix[15] === array[offset + 15]
    );
  };

  /**
   * Compares this matrix to the provided matrix componentwise and returns
   * <code>true</code> if they are within the provided epsilon,
   * <code>false</code> otherwise.
   *
   * @param {Matrix4} [right] The right hand side matrix.
   * @param {Number} [epsilon=0] The epsilon to use for equality testing.
   * @returns {Boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
   */
  Matrix4.prototype.equalsEpsilon = function (right, epsilon) {
    return Matrix4.equalsEpsilon(this, right, epsilon);
  };

  /**
   * Computes a string representing this Matrix with each row being
   * on a separate line and in the format '(column0, column1, column2, column3)'.
   *
   * @returns {String} A string representing the provided Matrix with each row being on a separate line and in the format '(column0, column1, column2, column3)'.
   */
  Matrix4.prototype.toString = function () {
    return (
      `(${this[0]}, ${this[4]}, ${this[8]}, ${this[12]})\n` +
      `(${this[1]}, ${this[5]}, ${this[9]}, ${this[13]})\n` +
      `(${this[2]}, ${this[6]}, ${this[10]}, ${this[14]})\n` +
      `(${this[3]}, ${this[7]}, ${this[11]}, ${this[15]})`
    );
  };

  /**
   * A two dimensional region specified as longitude and latitude coordinates.
   *
   * @alias Rectangle
   * @constructor
   *
   * @param {Number} [west=0.0] The westernmost longitude, in radians, in the range [-Pi, Pi].
   * @param {Number} [south=0.0] The southernmost latitude, in radians, in the range [-Pi/2, Pi/2].
   * @param {Number} [east=0.0] The easternmost longitude, in radians, in the range [-Pi, Pi].
   * @param {Number} [north=0.0] The northernmost latitude, in radians, in the range [-Pi/2, Pi/2].
   *
   * @see Packable
   */
  function Rectangle(west, south, east, north) {
    /**
     * The westernmost longitude in radians in the range [-Pi, Pi].
     *
     * @type {Number}
     * @default 0.0
     */
    this.west = defaultValue.defaultValue(west, 0.0);

    /**
     * The southernmost latitude in radians in the range [-Pi/2, Pi/2].
     *
     * @type {Number}
     * @default 0.0
     */
    this.south = defaultValue.defaultValue(south, 0.0);

    /**
     * The easternmost longitude in radians in the range [-Pi, Pi].
     *
     * @type {Number}
     * @default 0.0
     */
    this.east = defaultValue.defaultValue(east, 0.0);

    /**
     * The northernmost latitude in radians in the range [-Pi/2, Pi/2].
     *
     * @type {Number}
     * @default 0.0
     */
    this.north = defaultValue.defaultValue(north, 0.0);
  }

  Object.defineProperties(Rectangle.prototype, {
    /**
     * Gets the width of the rectangle in radians.
     * @memberof Rectangle.prototype
     * @type {Number}
     * @readonly
     */
    width: {
      get: function () {
        return Rectangle.computeWidth(this);
      },
    },

    /**
     * Gets the height of the rectangle in radians.
     * @memberof Rectangle.prototype
     * @type {Number}
     * @readonly
     */
    height: {
      get: function () {
        return Rectangle.computeHeight(this);
      },
    },
  });

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  Rectangle.packedLength = 4;

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {Rectangle} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  Rectangle.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("value", value);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    array[startingIndex++] = value.west;
    array[startingIndex++] = value.south;
    array[startingIndex++] = value.east;
    array[startingIndex] = value.north;

    return array;
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {Rectangle} [result] The object into which to store the result.
   * @returns {Rectangle} The modified result parameter or a new Rectangle instance if one was not provided.
   */
  Rectangle.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    if (!defaultValue.defined(result)) {
      result = new Rectangle();
    }

    result.west = array[startingIndex++];
    result.south = array[startingIndex++];
    result.east = array[startingIndex++];
    result.north = array[startingIndex];
    return result;
  };

  /**
   * Computes the width of a rectangle in radians.
   * @param {Rectangle} rectangle The rectangle to compute the width of.
   * @returns {Number} The width.
   */
  Rectangle.computeWidth = function (rectangle) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("rectangle", rectangle);
    //>>includeEnd('debug');
    let east = rectangle.east;
    const west = rectangle.west;
    if (east < west) {
      east += Math$1.CesiumMath.TWO_PI;
    }
    return east - west;
  };

  /**
   * Computes the height of a rectangle in radians.
   * @param {Rectangle} rectangle The rectangle to compute the height of.
   * @returns {Number} The height.
   */
  Rectangle.computeHeight = function (rectangle) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("rectangle", rectangle);
    //>>includeEnd('debug');
    return rectangle.north - rectangle.south;
  };

  /**
   * Creates a rectangle given the boundary longitude and latitude in degrees.
   *
   * @param {Number} [west=0.0] The westernmost longitude in degrees in the range [-180.0, 180.0].
   * @param {Number} [south=0.0] The southernmost latitude in degrees in the range [-90.0, 90.0].
   * @param {Number} [east=0.0] The easternmost longitude in degrees in the range [-180.0, 180.0].
   * @param {Number} [north=0.0] The northernmost latitude in degrees in the range [-90.0, 90.0].
   * @param {Rectangle} [result] The object onto which to store the result, or undefined if a new instance should be created.
   * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided.
   *
   * @example
   * const rectangle = Cesium.Rectangle.fromDegrees(0.0, 20.0, 10.0, 30.0);
   */
  Rectangle.fromDegrees = function (west, south, east, north, result) {
    west = Math$1.CesiumMath.toRadians(defaultValue.defaultValue(west, 0.0));
    south = Math$1.CesiumMath.toRadians(defaultValue.defaultValue(south, 0.0));
    east = Math$1.CesiumMath.toRadians(defaultValue.defaultValue(east, 0.0));
    north = Math$1.CesiumMath.toRadians(defaultValue.defaultValue(north, 0.0));

    if (!defaultValue.defined(result)) {
      return new Rectangle(west, south, east, north);
    }

    result.west = west;
    result.south = south;
    result.east = east;
    result.north = north;

    return result;
  };

  /**
   * Creates a rectangle given the boundary longitude and latitude in radians.
   *
   * @param {Number} [west=0.0] The westernmost longitude in radians in the range [-Math.PI, Math.PI].
   * @param {Number} [south=0.0] The southernmost latitude in radians in the range [-Math.PI/2, Math.PI/2].
   * @param {Number} [east=0.0] The easternmost longitude in radians in the range [-Math.PI, Math.PI].
   * @param {Number} [north=0.0] The northernmost latitude in radians in the range [-Math.PI/2, Math.PI/2].
   * @param {Rectangle} [result] The object onto which to store the result, or undefined if a new instance should be created.
   * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided.
   *
   * @example
   * const rectangle = Cesium.Rectangle.fromRadians(0.0, Math.PI/4, Math.PI/8, 3*Math.PI/4);
   */
  Rectangle.fromRadians = function (west, south, east, north, result) {
    if (!defaultValue.defined(result)) {
      return new Rectangle(west, south, east, north);
    }

    result.west = defaultValue.defaultValue(west, 0.0);
    result.south = defaultValue.defaultValue(south, 0.0);
    result.east = defaultValue.defaultValue(east, 0.0);
    result.north = defaultValue.defaultValue(north, 0.0);

    return result;
  };

  /**
   * Creates the smallest possible Rectangle that encloses all positions in the provided array.
   *
   * @param {Cartographic[]} cartographics The list of Cartographic instances.
   * @param {Rectangle} [result] The object onto which to store the result, or undefined if a new instance should be created.
   * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided.
   */
  Rectangle.fromCartographicArray = function (cartographics, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("cartographics", cartographics);
    //>>includeEnd('debug');

    let west = Number.MAX_VALUE;
    let east = -Number.MAX_VALUE;
    let westOverIDL = Number.MAX_VALUE;
    let eastOverIDL = -Number.MAX_VALUE;
    let south = Number.MAX_VALUE;
    let north = -Number.MAX_VALUE;

    for (let i = 0, len = cartographics.length; i < len; i++) {
      const position = cartographics[i];
      west = Math.min(west, position.longitude);
      east = Math.max(east, position.longitude);
      south = Math.min(south, position.latitude);
      north = Math.max(north, position.latitude);

      const lonAdjusted =
        position.longitude >= 0
          ? position.longitude
          : position.longitude + Math$1.CesiumMath.TWO_PI;
      westOverIDL = Math.min(westOverIDL, lonAdjusted);
      eastOverIDL = Math.max(eastOverIDL, lonAdjusted);
    }

    if (east - west > eastOverIDL - westOverIDL) {
      west = westOverIDL;
      east = eastOverIDL;

      if (east > Math$1.CesiumMath.PI) {
        east = east - Math$1.CesiumMath.TWO_PI;
      }
      if (west > Math$1.CesiumMath.PI) {
        west = west - Math$1.CesiumMath.TWO_PI;
      }
    }

    if (!defaultValue.defined(result)) {
      return new Rectangle(west, south, east, north);
    }

    result.west = west;
    result.south = south;
    result.east = east;
    result.north = north;
    return result;
  };

  /**
   * Creates the smallest possible Rectangle that encloses all positions in the provided array.
   *
   * @param {Cartesian3[]} cartesians The list of Cartesian instances.
   * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid the cartesians are on.
   * @param {Rectangle} [result] The object onto which to store the result, or undefined if a new instance should be created.
   * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided.
   */
  Rectangle.fromCartesianArray = function (cartesians, ellipsoid, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("cartesians", cartesians);
    //>>includeEnd('debug');
    ellipsoid = defaultValue.defaultValue(ellipsoid, Matrix3.Ellipsoid.WGS84);

    let west = Number.MAX_VALUE;
    let east = -Number.MAX_VALUE;
    let westOverIDL = Number.MAX_VALUE;
    let eastOverIDL = -Number.MAX_VALUE;
    let south = Number.MAX_VALUE;
    let north = -Number.MAX_VALUE;

    for (let i = 0, len = cartesians.length; i < len; i++) {
      const position = ellipsoid.cartesianToCartographic(cartesians[i]);
      west = Math.min(west, position.longitude);
      east = Math.max(east, position.longitude);
      south = Math.min(south, position.latitude);
      north = Math.max(north, position.latitude);

      const lonAdjusted =
        position.longitude >= 0
          ? position.longitude
          : position.longitude + Math$1.CesiumMath.TWO_PI;
      westOverIDL = Math.min(westOverIDL, lonAdjusted);
      eastOverIDL = Math.max(eastOverIDL, lonAdjusted);
    }

    if (east - west > eastOverIDL - westOverIDL) {
      west = westOverIDL;
      east = eastOverIDL;

      if (east > Math$1.CesiumMath.PI) {
        east = east - Math$1.CesiumMath.TWO_PI;
      }
      if (west > Math$1.CesiumMath.PI) {
        west = west - Math$1.CesiumMath.TWO_PI;
      }
    }

    if (!defaultValue.defined(result)) {
      return new Rectangle(west, south, east, north);
    }

    result.west = west;
    result.south = south;
    result.east = east;
    result.north = north;
    return result;
  };

  /**
   * Duplicates a Rectangle.
   *
   * @param {Rectangle} rectangle The rectangle to clone.
   * @param {Rectangle} [result] The object onto which to store the result, or undefined if a new instance should be created.
   * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided. (Returns undefined if rectangle is undefined)
   */
  Rectangle.clone = function (rectangle, result) {
    if (!defaultValue.defined(rectangle)) {
      return undefined;
    }

    if (!defaultValue.defined(result)) {
      return new Rectangle(
        rectangle.west,
        rectangle.south,
        rectangle.east,
        rectangle.north
      );
    }

    result.west = rectangle.west;
    result.south = rectangle.south;
    result.east = rectangle.east;
    result.north = rectangle.north;
    return result;
  };

  /**
   * Compares the provided Rectangles componentwise and returns
   * <code>true</code> if they pass an absolute or relative tolerance test,
   * <code>false</code> otherwise.
   *
   * @param {Rectangle} [left] The first Rectangle.
   * @param {Rectangle} [right] The second Rectangle.
   * @param {Number} [absoluteEpsilon=0] The absolute epsilon tolerance to use for equality testing.
   * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
   */
  Rectangle.equalsEpsilon = function (left, right, absoluteEpsilon) {
    absoluteEpsilon = defaultValue.defaultValue(absoluteEpsilon, 0);

    return (
      left === right ||
      (defaultValue.defined(left) &&
        defaultValue.defined(right) &&
        Math.abs(left.west - right.west) <= absoluteEpsilon &&
        Math.abs(left.south - right.south) <= absoluteEpsilon &&
        Math.abs(left.east - right.east) <= absoluteEpsilon &&
        Math.abs(left.north - right.north) <= absoluteEpsilon)
    );
  };

  /**
   * Duplicates this Rectangle.
   *
   * @param {Rectangle} [result] The object onto which to store the result.
   * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided.
   */
  Rectangle.prototype.clone = function (result) {
    return Rectangle.clone(this, result);
  };

  /**
   * Compares the provided Rectangle with this Rectangle componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {Rectangle} [other] The Rectangle to compare.
   * @returns {Boolean} <code>true</code> if the Rectangles are equal, <code>false</code> otherwise.
   */
  Rectangle.prototype.equals = function (other) {
    return Rectangle.equals(this, other);
  };

  /**
   * Compares the provided rectangles and returns <code>true</code> if they are equal,
   * <code>false</code> otherwise.
   *
   * @param {Rectangle} [left] The first Rectangle.
   * @param {Rectangle} [right] The second Rectangle.
   * @returns {Boolean} <code>true</code> if left and right are equal; otherwise <code>false</code>.
   */
  Rectangle.equals = function (left, right) {
    return (
      left === right ||
      (defaultValue.defined(left) &&
        defaultValue.defined(right) &&
        left.west === right.west &&
        left.south === right.south &&
        left.east === right.east &&
        left.north === right.north)
    );
  };

  /**
   * Compares the provided Rectangle with this Rectangle componentwise and returns
   * <code>true</code> if they are within the provided epsilon,
   * <code>false</code> otherwise.
   *
   * @param {Rectangle} [other] The Rectangle to compare.
   * @param {Number} [epsilon=0] The epsilon to use for equality testing.
   * @returns {Boolean} <code>true</code> if the Rectangles are within the provided epsilon, <code>false</code> otherwise.
   */
  Rectangle.prototype.equalsEpsilon = function (other, epsilon) {
    return Rectangle.equalsEpsilon(this, other, epsilon);
  };

  /**
   * Checks a Rectangle's properties and throws if they are not in valid ranges.
   *
   * @param {Rectangle} rectangle The rectangle to validate
   *
   * @exception {DeveloperError} <code>north</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
   * @exception {DeveloperError} <code>south</code> must be in the interval [<code>-Pi/2</code>, <code>Pi/2</code>].
   * @exception {DeveloperError} <code>east</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
   * @exception {DeveloperError} <code>west</code> must be in the interval [<code>-Pi</code>, <code>Pi</code>].
   */
  Rectangle.validate = function (rectangle) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("rectangle", rectangle);

    const north = rectangle.north;
    Check.Check.typeOf.number.greaterThanOrEquals(
      "north",
      north,
      -Math$1.CesiumMath.PI_OVER_TWO
    );
    Check.Check.typeOf.number.lessThanOrEquals("north", north, Math$1.CesiumMath.PI_OVER_TWO);

    const south = rectangle.south;
    Check.Check.typeOf.number.greaterThanOrEquals(
      "south",
      south,
      -Math$1.CesiumMath.PI_OVER_TWO
    );
    Check.Check.typeOf.number.lessThanOrEquals("south", south, Math$1.CesiumMath.PI_OVER_TWO);

    const west = rectangle.west;
    Check.Check.typeOf.number.greaterThanOrEquals("west", west, -Math.PI);
    Check.Check.typeOf.number.lessThanOrEquals("west", west, Math.PI);

    const east = rectangle.east;
    Check.Check.typeOf.number.greaterThanOrEquals("east", east, -Math.PI);
    Check.Check.typeOf.number.lessThanOrEquals("east", east, Math.PI);
    //>>includeEnd('debug');
  };

  /**
   * Computes the southwest corner of a rectangle.
   *
   * @param {Rectangle} rectangle The rectangle for which to find the corner
   * @param {Cartographic} [result] The object onto which to store the result.
   * @returns {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
   */
  Rectangle.southwest = function (rectangle, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("rectangle", rectangle);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      return new Matrix3.Cartographic(rectangle.west, rectangle.south);
    }
    result.longitude = rectangle.west;
    result.latitude = rectangle.south;
    result.height = 0.0;
    return result;
  };

  /**
   * Computes the northwest corner of a rectangle.
   *
   * @param {Rectangle} rectangle The rectangle for which to find the corner
   * @param {Cartographic} [result] The object onto which to store the result.
   * @returns {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
   */
  Rectangle.northwest = function (rectangle, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("rectangle", rectangle);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      return new Matrix3.Cartographic(rectangle.west, rectangle.north);
    }
    result.longitude = rectangle.west;
    result.latitude = rectangle.north;
    result.height = 0.0;
    return result;
  };

  /**
   * Computes the northeast corner of a rectangle.
   *
   * @param {Rectangle} rectangle The rectangle for which to find the corner
   * @param {Cartographic} [result] The object onto which to store the result.
   * @returns {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
   */
  Rectangle.northeast = function (rectangle, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("rectangle", rectangle);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      return new Matrix3.Cartographic(rectangle.east, rectangle.north);
    }
    result.longitude = rectangle.east;
    result.latitude = rectangle.north;
    result.height = 0.0;
    return result;
  };

  /**
   * Computes the southeast corner of a rectangle.
   *
   * @param {Rectangle} rectangle The rectangle for which to find the corner
   * @param {Cartographic} [result] The object onto which to store the result.
   * @returns {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
   */
  Rectangle.southeast = function (rectangle, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("rectangle", rectangle);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      return new Matrix3.Cartographic(rectangle.east, rectangle.south);
    }
    result.longitude = rectangle.east;
    result.latitude = rectangle.south;
    result.height = 0.0;
    return result;
  };

  /**
   * Computes the center of a rectangle.
   *
   * @param {Rectangle} rectangle The rectangle for which to find the center
   * @param {Cartographic} [result] The object onto which to store the result.
   * @returns {Cartographic} The modified result parameter or a new Cartographic instance if none was provided.
   */
  Rectangle.center = function (rectangle, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("rectangle", rectangle);
    //>>includeEnd('debug');

    let east = rectangle.east;
    const west = rectangle.west;

    if (east < west) {
      east += Math$1.CesiumMath.TWO_PI;
    }

    const longitude = Math$1.CesiumMath.negativePiToPi((west + east) * 0.5);
    const latitude = (rectangle.south + rectangle.north) * 0.5;

    if (!defaultValue.defined(result)) {
      return new Matrix3.Cartographic(longitude, latitude);
    }

    result.longitude = longitude;
    result.latitude = latitude;
    result.height = 0.0;
    return result;
  };

  /**
   * Computes the intersection of two rectangles.  This function assumes that the rectangle's coordinates are
   * latitude and longitude in radians and produces a correct intersection, taking into account the fact that
   * the same angle can be represented with multiple values as well as the wrapping of longitude at the
   * anti-meridian.  For a simple intersection that ignores these factors and can be used with projected
   * coordinates, see {@link Rectangle.simpleIntersection}.
   *
   * @param {Rectangle} rectangle On rectangle to find an intersection
   * @param {Rectangle} otherRectangle Another rectangle to find an intersection
   * @param {Rectangle} [result] The object onto which to store the result.
   * @returns {Rectangle|undefined} The modified result parameter, a new Rectangle instance if none was provided or undefined if there is no intersection.
   */
  Rectangle.intersection = function (rectangle, otherRectangle, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("rectangle", rectangle);
    Check.Check.typeOf.object("otherRectangle", otherRectangle);
    //>>includeEnd('debug');

    let rectangleEast = rectangle.east;
    let rectangleWest = rectangle.west;

    let otherRectangleEast = otherRectangle.east;
    let otherRectangleWest = otherRectangle.west;

    if (rectangleEast < rectangleWest && otherRectangleEast > 0.0) {
      rectangleEast += Math$1.CesiumMath.TWO_PI;
    } else if (otherRectangleEast < otherRectangleWest && rectangleEast > 0.0) {
      otherRectangleEast += Math$1.CesiumMath.TWO_PI;
    }

    if (rectangleEast < rectangleWest && otherRectangleWest < 0.0) {
      otherRectangleWest += Math$1.CesiumMath.TWO_PI;
    } else if (otherRectangleEast < otherRectangleWest && rectangleWest < 0.0) {
      rectangleWest += Math$1.CesiumMath.TWO_PI;
    }

    const west = Math$1.CesiumMath.negativePiToPi(
      Math.max(rectangleWest, otherRectangleWest)
    );
    const east = Math$1.CesiumMath.negativePiToPi(
      Math.min(rectangleEast, otherRectangleEast)
    );

    if (
      (rectangle.west < rectangle.east ||
        otherRectangle.west < otherRectangle.east) &&
      east <= west
    ) {
      return undefined;
    }

    const south = Math.max(rectangle.south, otherRectangle.south);
    const north = Math.min(rectangle.north, otherRectangle.north);

    if (south >= north) {
      return undefined;
    }

    if (!defaultValue.defined(result)) {
      return new Rectangle(west, south, east, north);
    }
    result.west = west;
    result.south = south;
    result.east = east;
    result.north = north;
    return result;
  };

  /**
   * Computes a simple intersection of two rectangles.  Unlike {@link Rectangle.intersection}, this function
   * does not attempt to put the angular coordinates into a consistent range or to account for crossing the
   * anti-meridian.  As such, it can be used for rectangles where the coordinates are not simply latitude
   * and longitude (i.e. projected coordinates).
   *
   * @param {Rectangle} rectangle On rectangle to find an intersection
   * @param {Rectangle} otherRectangle Another rectangle to find an intersection
   * @param {Rectangle} [result] The object onto which to store the result.
   * @returns {Rectangle|undefined} The modified result parameter, a new Rectangle instance if none was provided or undefined if there is no intersection.
   */
  Rectangle.simpleIntersection = function (rectangle, otherRectangle, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("rectangle", rectangle);
    Check.Check.typeOf.object("otherRectangle", otherRectangle);
    //>>includeEnd('debug');

    const west = Math.max(rectangle.west, otherRectangle.west);
    const south = Math.max(rectangle.south, otherRectangle.south);
    const east = Math.min(rectangle.east, otherRectangle.east);
    const north = Math.min(rectangle.north, otherRectangle.north);

    if (south >= north || west >= east) {
      return undefined;
    }

    if (!defaultValue.defined(result)) {
      return new Rectangle(west, south, east, north);
    }

    result.west = west;
    result.south = south;
    result.east = east;
    result.north = north;
    return result;
  };

  /**
   * Computes a rectangle that is the union of two rectangles.
   *
   * @param {Rectangle} rectangle A rectangle to enclose in rectangle.
   * @param {Rectangle} otherRectangle A rectangle to enclose in a rectangle.
   * @param {Rectangle} [result] The object onto which to store the result.
   * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided.
   */
  Rectangle.union = function (rectangle, otherRectangle, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("rectangle", rectangle);
    Check.Check.typeOf.object("otherRectangle", otherRectangle);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      result = new Rectangle();
    }

    let rectangleEast = rectangle.east;
    let rectangleWest = rectangle.west;

    let otherRectangleEast = otherRectangle.east;
    let otherRectangleWest = otherRectangle.west;

    if (rectangleEast < rectangleWest && otherRectangleEast > 0.0) {
      rectangleEast += Math$1.CesiumMath.TWO_PI;
    } else if (otherRectangleEast < otherRectangleWest && rectangleEast > 0.0) {
      otherRectangleEast += Math$1.CesiumMath.TWO_PI;
    }

    if (rectangleEast < rectangleWest && otherRectangleWest < 0.0) {
      otherRectangleWest += Math$1.CesiumMath.TWO_PI;
    } else if (otherRectangleEast < otherRectangleWest && rectangleWest < 0.0) {
      rectangleWest += Math$1.CesiumMath.TWO_PI;
    }

    const west = Math$1.CesiumMath.negativePiToPi(
      Math.min(rectangleWest, otherRectangleWest)
    );
    const east = Math$1.CesiumMath.negativePiToPi(
      Math.max(rectangleEast, otherRectangleEast)
    );

    result.west = west;
    result.south = Math.min(rectangle.south, otherRectangle.south);
    result.east = east;
    result.north = Math.max(rectangle.north, otherRectangle.north);

    return result;
  };

  /**
   * Computes a rectangle by enlarging the provided rectangle until it contains the provided cartographic.
   *
   * @param {Rectangle} rectangle A rectangle to expand.
   * @param {Cartographic} cartographic A cartographic to enclose in a rectangle.
   * @param {Rectangle} [result] The object onto which to store the result.
   * @returns {Rectangle} The modified result parameter or a new Rectangle instance if one was not provided.
   */
  Rectangle.expand = function (rectangle, cartographic, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("rectangle", rectangle);
    Check.Check.typeOf.object("cartographic", cartographic);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      result = new Rectangle();
    }

    result.west = Math.min(rectangle.west, cartographic.longitude);
    result.south = Math.min(rectangle.south, cartographic.latitude);
    result.east = Math.max(rectangle.east, cartographic.longitude);
    result.north = Math.max(rectangle.north, cartographic.latitude);

    return result;
  };

  /**
   * Returns true if the cartographic is on or inside the rectangle, false otherwise.
   *
   * @param {Rectangle} rectangle The rectangle
   * @param {Cartographic} cartographic The cartographic to test.
   * @returns {Boolean} true if the provided cartographic is inside the rectangle, false otherwise.
   */
  Rectangle.contains = function (rectangle, cartographic) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("rectangle", rectangle);
    Check.Check.typeOf.object("cartographic", cartographic);
    //>>includeEnd('debug');

    let longitude = cartographic.longitude;
    const latitude = cartographic.latitude;

    const west = rectangle.west;
    let east = rectangle.east;

    if (east < west) {
      east += Math$1.CesiumMath.TWO_PI;
      if (longitude < 0.0) {
        longitude += Math$1.CesiumMath.TWO_PI;
      }
    }
    return (
      (longitude > west ||
        Math$1.CesiumMath.equalsEpsilon(longitude, west, Math$1.CesiumMath.EPSILON14)) &&
      (longitude < east ||
        Math$1.CesiumMath.equalsEpsilon(longitude, east, Math$1.CesiumMath.EPSILON14)) &&
      latitude >= rectangle.south &&
      latitude <= rectangle.north
    );
  };

  const subsampleLlaScratch = new Matrix3.Cartographic();
  /**
   * Samples a rectangle so that it includes a list of Cartesian points suitable for passing to
   * {@link BoundingSphere#fromPoints}.  Sampling is necessary to account
   * for rectangles that cover the poles or cross the equator.
   *
   * @param {Rectangle} rectangle The rectangle to subsample.
   * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to use.
   * @param {Number} [surfaceHeight=0.0] The height of the rectangle above the ellipsoid.
   * @param {Cartesian3[]} [result] The array of Cartesians onto which to store the result.
   * @returns {Cartesian3[]} The modified result parameter or a new Array of Cartesians instances if none was provided.
   */
  Rectangle.subsample = function (rectangle, ellipsoid, surfaceHeight, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("rectangle", rectangle);
    //>>includeEnd('debug');

    ellipsoid = defaultValue.defaultValue(ellipsoid, Matrix3.Ellipsoid.WGS84);
    surfaceHeight = defaultValue.defaultValue(surfaceHeight, 0.0);

    if (!defaultValue.defined(result)) {
      result = [];
    }
    let length = 0;

    const north = rectangle.north;
    const south = rectangle.south;
    const east = rectangle.east;
    const west = rectangle.west;

    const lla = subsampleLlaScratch;
    lla.height = surfaceHeight;

    lla.longitude = west;
    lla.latitude = north;
    result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
    length++;

    lla.longitude = east;
    result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
    length++;

    lla.latitude = south;
    result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
    length++;

    lla.longitude = west;
    result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
    length++;

    if (north < 0.0) {
      lla.latitude = north;
    } else if (south > 0.0) {
      lla.latitude = south;
    } else {
      lla.latitude = 0.0;
    }

    for (let i = 1; i < 8; ++i) {
      lla.longitude = -Math.PI + i * Math$1.CesiumMath.PI_OVER_TWO;
      if (Rectangle.contains(rectangle, lla)) {
        result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
        length++;
      }
    }

    if (lla.latitude === 0.0) {
      lla.longitude = west;
      result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
      length++;
      lla.longitude = east;
      result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
      length++;
    }
    result.length = length;
    return result;
  };

  /**
   * Computes a subsection of a rectangle from normalized coordinates in the range [0.0, 1.0].
   *
   * @param {Rectangle} rectangle The rectangle to subsection.
   * @param {Number} westLerp The west interpolation factor in the range [0.0, 1.0]. Must be less than or equal to eastLerp.
   * @param {Number} southLerp The south interpolation factor in the range [0.0, 1.0]. Must be less than or equal to northLerp.
   * @param {Number} eastLerp The east interpolation factor in the range [0.0, 1.0]. Must be greater than or equal to westLerp.
   * @param {Number} northLerp The north interpolation factor in the range [0.0, 1.0]. Must be greater than or equal to southLerp.
   * @param {Rectangle} [result] The object onto which to store the result.
   * @returns {Rectangle} The modified result parameter or a new Rectangle instance if none was provided.
   */
  Rectangle.subsection = function (
    rectangle,
    westLerp,
    southLerp,
    eastLerp,
    northLerp,
    result
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("rectangle", rectangle);
    Check.Check.typeOf.number.greaterThanOrEquals("westLerp", westLerp, 0.0);
    Check.Check.typeOf.number.lessThanOrEquals("westLerp", westLerp, 1.0);
    Check.Check.typeOf.number.greaterThanOrEquals("southLerp", southLerp, 0.0);
    Check.Check.typeOf.number.lessThanOrEquals("southLerp", southLerp, 1.0);
    Check.Check.typeOf.number.greaterThanOrEquals("eastLerp", eastLerp, 0.0);
    Check.Check.typeOf.number.lessThanOrEquals("eastLerp", eastLerp, 1.0);
    Check.Check.typeOf.number.greaterThanOrEquals("northLerp", northLerp, 0.0);
    Check.Check.typeOf.number.lessThanOrEquals("northLerp", northLerp, 1.0);

    Check.Check.typeOf.number.lessThanOrEquals("westLerp", westLerp, eastLerp);
    Check.Check.typeOf.number.lessThanOrEquals("southLerp", southLerp, northLerp);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      result = new Rectangle();
    }

    // This function doesn't use CesiumMath.lerp because it has floating point precision problems
    // when the start and end values are the same but the t changes.

    if (rectangle.west <= rectangle.east) {
      const width = rectangle.east - rectangle.west;
      result.west = rectangle.west + westLerp * width;
      result.east = rectangle.west + eastLerp * width;
    } else {
      const width = Math$1.CesiumMath.TWO_PI + rectangle.east - rectangle.west;
      result.west = Math$1.CesiumMath.negativePiToPi(rectangle.west + westLerp * width);
      result.east = Math$1.CesiumMath.negativePiToPi(rectangle.west + eastLerp * width);
    }
    const height = rectangle.north - rectangle.south;
    result.south = rectangle.south + southLerp * height;
    result.north = rectangle.south + northLerp * height;

    // Fix floating point precision problems when t = 1
    if (westLerp === 1.0) {
      result.west = rectangle.east;
    }
    if (eastLerp === 1.0) {
      result.east = rectangle.east;
    }
    if (southLerp === 1.0) {
      result.south = rectangle.north;
    }
    if (northLerp === 1.0) {
      result.north = rectangle.north;
    }

    return result;
  };

  /**
   * The largest possible rectangle.
   *
   * @type {Rectangle}
   * @constant
   */
  Rectangle.MAX_VALUE = Object.freeze(
    new Rectangle(
      -Math.PI,
      -Math$1.CesiumMath.PI_OVER_TWO,
      Math.PI,
      Math$1.CesiumMath.PI_OVER_TWO
    )
  );

  /**
   * A 2D Cartesian point.
   * @alias Cartesian2
   * @constructor
   *
   * @param {Number} [x=0.0] The X component.
   * @param {Number} [y=0.0] The Y component.
   *
   * @see Cartesian3
   * @see Cartesian4
   * @see Packable
   */
  function Cartesian2(x, y) {
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
  }

  /**
   * Creates a Cartesian2 instance from x and y coordinates.
   *
   * @param {Number} x The x coordinate.
   * @param {Number} y The y coordinate.
   * @param {Cartesian2} [result] The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if one was not provided.
   */
  Cartesian2.fromElements = function (x, y, result) {
    if (!defaultValue.defined(result)) {
      return new Cartesian2(x, y);
    }

    result.x = x;
    result.y = y;
    return result;
  };

  /**
   * Duplicates a Cartesian2 instance.
   *
   * @param {Cartesian2} cartesian The Cartesian to duplicate.
   * @param {Cartesian2} [result] The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if one was not provided. (Returns undefined if cartesian is undefined)
   */
  Cartesian2.clone = function (cartesian, result) {
    if (!defaultValue.defined(cartesian)) {
      return undefined;
    }
    if (!defaultValue.defined(result)) {
      return new Cartesian2(cartesian.x, cartesian.y);
    }

    result.x = cartesian.x;
    result.y = cartesian.y;
    return result;
  };

  /**
   * Creates a Cartesian2 instance from an existing Cartesian3.  This simply takes the
   * x and y properties of the Cartesian3 and drops z.
   * @function
   *
   * @param {Cartesian3} cartesian The Cartesian3 instance to create a Cartesian2 instance from.
   * @param {Cartesian2} [result] The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if one was not provided.
   */
  Cartesian2.fromCartesian3 = Cartesian2.clone;

  /**
   * Creates a Cartesian2 instance from an existing Cartesian4.  This simply takes the
   * x and y properties of the Cartesian4 and drops z and w.
   * @function
   *
   * @param {Cartesian4} cartesian The Cartesian4 instance to create a Cartesian2 instance from.
   * @param {Cartesian2} [result] The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if one was not provided.
   */
  Cartesian2.fromCartesian4 = Cartesian2.clone;

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  Cartesian2.packedLength = 2;

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {Cartesian2} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  Cartesian2.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("value", value);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    array[startingIndex++] = value.x;
    array[startingIndex] = value.y;

    return array;
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {Cartesian2} [result] The object into which to store the result.
   * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if one was not provided.
   */
  Cartesian2.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    if (!defaultValue.defined(result)) {
      result = new Cartesian2();
    }
    result.x = array[startingIndex++];
    result.y = array[startingIndex];
    return result;
  };

  /**
   * Flattens an array of Cartesian2s into an array of components.
   *
   * @param {Cartesian2[]} array The array of cartesians to pack.
   * @param {Number[]} [result] The array onto which to store the result. If this is a typed array, it must have array.length * 2 components, else a {@link DeveloperError} will be thrown. If it is a regular array, it will be resized to have (array.length * 2) elements.
   * @returns {Number[]} The packed array.
   */
  Cartesian2.packArray = function (array, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    const length = array.length;
    const resultLength = length * 2;
    if (!defaultValue.defined(result)) {
      result = new Array(resultLength);
    } else if (!Array.isArray(result) && result.length !== resultLength) {
      //>>includeStart('debug', pragmas.debug);
      throw new Check.DeveloperError(
        "If result is a typed array, it must have exactly array.length * 2 elements"
      );
      //>>includeEnd('debug');
    } else if (result.length !== resultLength) {
      result.length = resultLength;
    }

    for (let i = 0; i < length; ++i) {
      Cartesian2.pack(array[i], result, i * 2);
    }
    return result;
  };

  /**
   * Unpacks an array of cartesian components into an array of Cartesian2s.
   *
   * @param {Number[]} array The array of components to unpack.
   * @param {Cartesian2[]} [result] The array onto which to store the result.
   * @returns {Cartesian2[]} The unpacked array.
   */
  Cartesian2.unpackArray = function (array, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    Check.Check.typeOf.number.greaterThanOrEquals("array.length", array.length, 2);
    if (array.length % 2 !== 0) {
      throw new Check.DeveloperError("array length must be a multiple of 2.");
    }
    //>>includeEnd('debug');

    const length = array.length;
    if (!defaultValue.defined(result)) {
      result = new Array(length / 2);
    } else {
      result.length = length / 2;
    }

    for (let i = 0; i < length; i += 2) {
      const index = i / 2;
      result[index] = Cartesian2.unpack(array, i, result[index]);
    }
    return result;
  };

  /**
   * Creates a Cartesian2 from two consecutive elements in an array.
   * @function
   *
   * @param {Number[]} array The array whose two consecutive elements correspond to the x and y components, respectively.
   * @param {Number} [startingIndex=0] The offset into the array of the first element, which corresponds to the x component.
   * @param {Cartesian2} [result] The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if one was not provided.
   *
   * @example
   * // Create a Cartesian2 with (1.0, 2.0)
   * const v = [1.0, 2.0];
   * const p = Cesium.Cartesian2.fromArray(v);
   *
   * // Create a Cartesian2 with (1.0, 2.0) using an offset into an array
   * const v2 = [0.0, 0.0, 1.0, 2.0];
   * const p2 = Cesium.Cartesian2.fromArray(v2, 2);
   */
  Cartesian2.fromArray = Cartesian2.unpack;

  /**
   * Computes the value of the maximum component for the supplied Cartesian.
   *
   * @param {Cartesian2} cartesian The cartesian to use.
   * @returns {Number} The value of the maximum component.
   */
  Cartesian2.maximumComponent = function (cartesian) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    return Math.max(cartesian.x, cartesian.y);
  };

  /**
   * Computes the value of the minimum component for the supplied Cartesian.
   *
   * @param {Cartesian2} cartesian The cartesian to use.
   * @returns {Number} The value of the minimum component.
   */
  Cartesian2.minimumComponent = function (cartesian) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    return Math.min(cartesian.x, cartesian.y);
  };

  /**
   * Compares two Cartesians and computes a Cartesian which contains the minimum components of the supplied Cartesians.
   *
   * @param {Cartesian2} first A cartesian to compare.
   * @param {Cartesian2} second A cartesian to compare.
   * @param {Cartesian2} result The object into which to store the result.
   * @returns {Cartesian2} A cartesian with the minimum components.
   */
  Cartesian2.minimumByComponent = function (first, second, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("first", first);
    Check.Check.typeOf.object("second", second);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Math.min(first.x, second.x);
    result.y = Math.min(first.y, second.y);

    return result;
  };

  /**
   * Compares two Cartesians and computes a Cartesian which contains the maximum components of the supplied Cartesians.
   *
   * @param {Cartesian2} first A cartesian to compare.
   * @param {Cartesian2} second A cartesian to compare.
   * @param {Cartesian2} result The object into which to store the result.
   * @returns {Cartesian2} A cartesian with the maximum components.
   */
  Cartesian2.maximumByComponent = function (first, second, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("first", first);
    Check.Check.typeOf.object("second", second);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Math.max(first.x, second.x);
    result.y = Math.max(first.y, second.y);
    return result;
  };

  /**
   * Constrain a value to lie between two values.
   *
   * @param {Cartesian2} value The value to clamp.
   * @param {Cartesian2} min The minimum bound.
   * @param {Cartesian2} max The maximum bound.
   * @param {Cartesian2} result The object into which to store the result.
   * @returns {Cartesian2} The clamped value such that min <= result <= max.
   */
  Cartesian2.clamp = function (value, min, max, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("value", value);
    Check.Check.typeOf.object("min", min);
    Check.Check.typeOf.object("max", max);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const x = Math$1.CesiumMath.clamp(value.x, min.x, max.x);
    const y = Math$1.CesiumMath.clamp(value.y, min.y, max.y);

    result.x = x;
    result.y = y;

    return result;
  };

  /**
   * Computes the provided Cartesian's squared magnitude.
   *
   * @param {Cartesian2} cartesian The Cartesian instance whose squared magnitude is to be computed.
   * @returns {Number} The squared magnitude.
   */
  Cartesian2.magnitudeSquared = function (cartesian) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    return cartesian.x * cartesian.x + cartesian.y * cartesian.y;
  };

  /**
   * Computes the Cartesian's magnitude (length).
   *
   * @param {Cartesian2} cartesian The Cartesian instance whose magnitude is to be computed.
   * @returns {Number} The magnitude.
   */
  Cartesian2.magnitude = function (cartesian) {
    return Math.sqrt(Cartesian2.magnitudeSquared(cartesian));
  };

  const distanceScratch = new Cartesian2();

  /**
   * Computes the distance between two points.
   *
   * @param {Cartesian2} left The first point to compute the distance from.
   * @param {Cartesian2} right The second point to compute the distance to.
   * @returns {Number} The distance between two points.
   *
   * @example
   * // Returns 1.0
   * const d = Cesium.Cartesian2.distance(new Cesium.Cartesian2(1.0, 0.0), new Cesium.Cartesian2(2.0, 0.0));
   */
  Cartesian2.distance = function (left, right) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    Cartesian2.subtract(left, right, distanceScratch);
    return Cartesian2.magnitude(distanceScratch);
  };

  /**
   * Computes the squared distance between two points.  Comparing squared distances
   * using this function is more efficient than comparing distances using {@link Cartesian2#distance}.
   *
   * @param {Cartesian2} left The first point to compute the distance from.
   * @param {Cartesian2} right The second point to compute the distance to.
   * @returns {Number} The distance between two points.
   *
   * @example
   * // Returns 4.0, not 2.0
   * const d = Cesium.Cartesian2.distance(new Cesium.Cartesian2(1.0, 0.0), new Cesium.Cartesian2(3.0, 0.0));
   */
  Cartesian2.distanceSquared = function (left, right) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    Cartesian2.subtract(left, right, distanceScratch);
    return Cartesian2.magnitudeSquared(distanceScratch);
  };

  /**
   * Computes the normalized form of the supplied Cartesian.
   *
   * @param {Cartesian2} cartesian The Cartesian to be normalized.
   * @param {Cartesian2} result The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter.
   */
  Cartesian2.normalize = function (cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const magnitude = Cartesian2.magnitude(cartesian);

    result.x = cartesian.x / magnitude;
    result.y = cartesian.y / magnitude;

    //>>includeStart('debug', pragmas.debug);
    if (isNaN(result.x) || isNaN(result.y)) {
      throw new Check.DeveloperError("normalized result is not a number");
    }
    //>>includeEnd('debug');

    return result;
  };

  /**
   * Computes the dot (scalar) product of two Cartesians.
   *
   * @param {Cartesian2} left The first Cartesian.
   * @param {Cartesian2} right The second Cartesian.
   * @returns {Number} The dot product.
   */
  Cartesian2.dot = function (left, right) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    return left.x * right.x + left.y * right.y;
  };

  /**
   * Computes the magnitude of the cross product that would result from implicitly setting the Z coordinate of the input vectors to 0
   *
   * @param {Cartesian2} left The first Cartesian.
   * @param {Cartesian2} right The second Cartesian.
   * @returns {Number} The cross product.
   */
  Cartesian2.cross = function (left, right) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    return left.x * right.y - left.y * right.x;
  };

  /**
   * Computes the componentwise product of two Cartesians.
   *
   * @param {Cartesian2} left The first Cartesian.
   * @param {Cartesian2} right The second Cartesian.
   * @param {Cartesian2} result The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter.
   */
  Cartesian2.multiplyComponents = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x * right.x;
    result.y = left.y * right.y;
    return result;
  };

  /**
   * Computes the componentwise quotient of two Cartesians.
   *
   * @param {Cartesian2} left The first Cartesian.
   * @param {Cartesian2} right The second Cartesian.
   * @param {Cartesian2} result The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter.
   */
  Cartesian2.divideComponents = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x / right.x;
    result.y = left.y / right.y;
    return result;
  };

  /**
   * Computes the componentwise sum of two Cartesians.
   *
   * @param {Cartesian2} left The first Cartesian.
   * @param {Cartesian2} right The second Cartesian.
   * @param {Cartesian2} result The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter.
   */
  Cartesian2.add = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x + right.x;
    result.y = left.y + right.y;
    return result;
  };

  /**
   * Computes the componentwise difference of two Cartesians.
   *
   * @param {Cartesian2} left The first Cartesian.
   * @param {Cartesian2} right The second Cartesian.
   * @param {Cartesian2} result The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter.
   */
  Cartesian2.subtract = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x - right.x;
    result.y = left.y - right.y;
    return result;
  };

  /**
   * Multiplies the provided Cartesian componentwise by the provided scalar.
   *
   * @param {Cartesian2} cartesian The Cartesian to be scaled.
   * @param {Number} scalar The scalar to multiply with.
   * @param {Cartesian2} result The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter.
   */
  Cartesian2.multiplyByScalar = function (cartesian, scalar, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.number("scalar", scalar);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = cartesian.x * scalar;
    result.y = cartesian.y * scalar;
    return result;
  };

  /**
   * Divides the provided Cartesian componentwise by the provided scalar.
   *
   * @param {Cartesian2} cartesian The Cartesian to be divided.
   * @param {Number} scalar The scalar to divide by.
   * @param {Cartesian2} result The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter.
   */
  Cartesian2.divideByScalar = function (cartesian, scalar, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.number("scalar", scalar);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = cartesian.x / scalar;
    result.y = cartesian.y / scalar;
    return result;
  };

  /**
   * Negates the provided Cartesian.
   *
   * @param {Cartesian2} cartesian The Cartesian to be negated.
   * @param {Cartesian2} result The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter.
   */
  Cartesian2.negate = function (cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = -cartesian.x;
    result.y = -cartesian.y;
    return result;
  };

  /**
   * Computes the absolute value of the provided Cartesian.
   *
   * @param {Cartesian2} cartesian The Cartesian whose absolute value is to be computed.
   * @param {Cartesian2} result The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter.
   */
  Cartesian2.abs = function (cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Math.abs(cartesian.x);
    result.y = Math.abs(cartesian.y);
    return result;
  };

  const lerpScratch = new Cartesian2();
  /**
   * Computes the linear interpolation or extrapolation at t using the provided cartesians.
   *
   * @param {Cartesian2} start The value corresponding to t at 0.0.
   * @param {Cartesian2} end The value corresponding to t at 1.0.
   * @param {Number} t The point along t at which to interpolate.
   * @param {Cartesian2} result The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter.
   */
  Cartesian2.lerp = function (start, end, t, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("start", start);
    Check.Check.typeOf.object("end", end);
    Check.Check.typeOf.number("t", t);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    Cartesian2.multiplyByScalar(end, t, lerpScratch);
    result = Cartesian2.multiplyByScalar(start, 1.0 - t, result);
    return Cartesian2.add(lerpScratch, result, result);
  };

  const angleBetweenScratch = new Cartesian2();
  const angleBetweenScratch2 = new Cartesian2();
  /**
   * Returns the angle, in radians, between the provided Cartesians.
   *
   * @param {Cartesian2} left The first Cartesian.
   * @param {Cartesian2} right The second Cartesian.
   * @returns {Number} The angle between the Cartesians.
   */
  Cartesian2.angleBetween = function (left, right) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    Cartesian2.normalize(left, angleBetweenScratch);
    Cartesian2.normalize(right, angleBetweenScratch2);
    return Math$1.CesiumMath.acosClamped(
      Cartesian2.dot(angleBetweenScratch, angleBetweenScratch2)
    );
  };

  const mostOrthogonalAxisScratch = new Cartesian2();
  /**
   * Returns the axis that is most orthogonal to the provided Cartesian.
   *
   * @param {Cartesian2} cartesian The Cartesian on which to find the most orthogonal axis.
   * @param {Cartesian2} result The object onto which to store the result.
   * @returns {Cartesian2} The most orthogonal axis.
   */
  Cartesian2.mostOrthogonalAxis = function (cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const f = Cartesian2.normalize(cartesian, mostOrthogonalAxisScratch);
    Cartesian2.abs(f, f);

    if (f.x <= f.y) {
      result = Cartesian2.clone(Cartesian2.UNIT_X, result);
    } else {
      result = Cartesian2.clone(Cartesian2.UNIT_Y, result);
    }

    return result;
  };

  /**
   * Compares the provided Cartesians componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {Cartesian2} [left] The first Cartesian.
   * @param {Cartesian2} [right] The second Cartesian.
   * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
   */
  Cartesian2.equals = function (left, right) {
    return (
      left === right ||
      (defaultValue.defined(left) &&
        defaultValue.defined(right) &&
        left.x === right.x &&
        left.y === right.y)
    );
  };

  /**
   * @private
   */
  Cartesian2.equalsArray = function (cartesian, array, offset) {
    return cartesian.x === array[offset] && cartesian.y === array[offset + 1];
  };

  /**
   * Compares the provided Cartesians componentwise and returns
   * <code>true</code> if they pass an absolute or relative tolerance test,
   * <code>false</code> otherwise.
   *
   * @param {Cartesian2} [left] The first Cartesian.
   * @param {Cartesian2} [right] The second Cartesian.
   * @param {Number} [relativeEpsilon=0] The relative epsilon tolerance to use for equality testing.
   * @param {Number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
   * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
   */
  Cartesian2.equalsEpsilon = function (
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
        ))
    );
  };

  /**
   * An immutable Cartesian2 instance initialized to (0.0, 0.0).
   *
   * @type {Cartesian2}
   * @constant
   */
  Cartesian2.ZERO = Object.freeze(new Cartesian2(0.0, 0.0));

  /**
   * An immutable Cartesian2 instance initialized to (1.0, 1.0).
   *
   * @type {Cartesian2}
   * @constant
   */
  Cartesian2.ONE = Object.freeze(new Cartesian2(1.0, 1.0));

  /**
   * An immutable Cartesian2 instance initialized to (1.0, 0.0).
   *
   * @type {Cartesian2}
   * @constant
   */
  Cartesian2.UNIT_X = Object.freeze(new Cartesian2(1.0, 0.0));

  /**
   * An immutable Cartesian2 instance initialized to (0.0, 1.0).
   *
   * @type {Cartesian2}
   * @constant
   */
  Cartesian2.UNIT_Y = Object.freeze(new Cartesian2(0.0, 1.0));

  /**
   * Duplicates this Cartesian2 instance.
   *
   * @param {Cartesian2} [result] The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter or a new Cartesian2 instance if one was not provided.
   */
  Cartesian2.prototype.clone = function (result) {
    return Cartesian2.clone(this, result);
  };

  /**
   * Compares this Cartesian against the provided Cartesian componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {Cartesian2} [right] The right hand side Cartesian.
   * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
   */
  Cartesian2.prototype.equals = function (right) {
    return Cartesian2.equals(this, right);
  };

  /**
   * Compares this Cartesian against the provided Cartesian componentwise and returns
   * <code>true</code> if they pass an absolute or relative tolerance test,
   * <code>false</code> otherwise.
   *
   * @param {Cartesian2} [right] The right hand side Cartesian.
   * @param {Number} [relativeEpsilon=0] The relative epsilon tolerance to use for equality testing.
   * @param {Number} [absoluteEpsilon=relativeEpsilon] The absolute epsilon tolerance to use for equality testing.
   * @returns {Boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
   */
  Cartesian2.prototype.equalsEpsilon = function (
    right,
    relativeEpsilon,
    absoluteEpsilon
  ) {
    return Cartesian2.equalsEpsilon(
      this,
      right,
      relativeEpsilon,
      absoluteEpsilon
    );
  };

  /**
   * Creates a string representing this Cartesian in the format '(x, y)'.
   *
   * @returns {String} A string representing the provided Cartesian in the format '(x, y)'.
   */
  Cartesian2.prototype.toString = function () {
    return `(${this.x}, ${this.y})`;
  };

  /**
   * A 2x2 matrix, indexable as a column-major order array.
   * Constructor parameters are in row-major order for code readability.
   * @alias Matrix2
   * @constructor
   * @implements {ArrayLike<number>}
   *
   * @param {Number} [column0Row0=0.0] The value for column 0, row 0.
   * @param {Number} [column1Row0=0.0] The value for column 1, row 0.
   * @param {Number} [column0Row1=0.0] The value for column 0, row 1.
   * @param {Number} [column1Row1=0.0] The value for column 1, row 1.
   *
   * @see Matrix2.fromArray
   * @see Matrix2.fromColumnMajorArray
   * @see Matrix2.fromRowMajorArray
   * @see Matrix2.fromScale
   * @see Matrix2.fromUniformScale
   * @see Matrix2.fromRotation
   * @see Matrix3
   * @see Matrix4
   */
  function Matrix2(column0Row0, column1Row0, column0Row1, column1Row1) {
    this[0] = defaultValue.defaultValue(column0Row0, 0.0);
    this[1] = defaultValue.defaultValue(column0Row1, 0.0);
    this[2] = defaultValue.defaultValue(column1Row0, 0.0);
    this[3] = defaultValue.defaultValue(column1Row1, 0.0);
  }

  /**
   * The number of elements used to pack the object into an array.
   * @type {Number}
   */
  Matrix2.packedLength = 4;

  /**
   * Stores the provided instance into the provided array.
   *
   * @param {Matrix2} value The value to pack.
   * @param {Number[]} array The array to pack into.
   * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
   *
   * @returns {Number[]} The array that was packed into
   */
  Matrix2.pack = function (value, array, startingIndex) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("value", value);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    array[startingIndex++] = value[0];
    array[startingIndex++] = value[1];
    array[startingIndex++] = value[2];
    array[startingIndex++] = value[3];

    return array;
  };

  /**
   * Retrieves an instance from a packed array.
   *
   * @param {Number[]} array The packed array.
   * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
   * @param {Matrix2} [result] The object into which to store the result.
   * @returns {Matrix2} The modified result parameter or a new Matrix2 instance if one was not provided.
   */
  Matrix2.unpack = function (array, startingIndex, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    startingIndex = defaultValue.defaultValue(startingIndex, 0);

    if (!defaultValue.defined(result)) {
      result = new Matrix2();
    }

    result[0] = array[startingIndex++];
    result[1] = array[startingIndex++];
    result[2] = array[startingIndex++];
    result[3] = array[startingIndex++];
    return result;
  };

  /**
   * Flattens an array of Matrix2s into an array of components. The components
   * are stored in column-major order.
   *
   * @param {Matrix2[]} array The array of matrices to pack.
   * @param {Number[]} [result] The array onto which to store the result. If this is a typed array, it must have array.length * 4 components, else a {@link DeveloperError} will be thrown. If it is a regular array, it will be resized to have (array.length * 4) elements.
   * @returns {Number[]} The packed array.
   */
  Matrix2.packArray = function (array, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    //>>includeEnd('debug');

    const length = array.length;
    const resultLength = length * 4;
    if (!defaultValue.defined(result)) {
      result = new Array(resultLength);
    } else if (!Array.isArray(result) && result.length !== resultLength) {
      //>>includeStart('debug', pragmas.debug);
      throw new Check.DeveloperError(
        "If result is a typed array, it must have exactly array.length * 4 elements"
      );
      //>>includeEnd('debug');
    } else if (result.length !== resultLength) {
      result.length = resultLength;
    }

    for (let i = 0; i < length; ++i) {
      Matrix2.pack(array[i], result, i * 4);
    }
    return result;
  };

  /**
   * Unpacks an array of column-major matrix components into an array of Matrix2s.
   *
   * @param {Number[]} array The array of components to unpack.
   * @param {Matrix2[]} [result] The array onto which to store the result.
   * @returns {Matrix2[]} The unpacked array.
   */
  Matrix2.unpackArray = function (array, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("array", array);
    Check.Check.typeOf.number.greaterThanOrEquals("array.length", array.length, 4);
    if (array.length % 4 !== 0) {
      throw new Check.DeveloperError("array length must be a multiple of 4.");
    }
    //>>includeEnd('debug');

    const length = array.length;
    if (!defaultValue.defined(result)) {
      result = new Array(length / 4);
    } else {
      result.length = length / 4;
    }

    for (let i = 0; i < length; i += 4) {
      const index = i / 4;
      result[index] = Matrix2.unpack(array, i, result[index]);
    }
    return result;
  };

  /**
   * Duplicates a Matrix2 instance.
   *
   * @param {Matrix2} matrix The matrix to duplicate.
   * @param {Matrix2} [result] The object onto which to store the result.
   * @returns {Matrix2} The modified result parameter or a new Matrix2 instance if one was not provided. (Returns undefined if matrix is undefined)
   */
  Matrix2.clone = function (matrix, result) {
    if (!defaultValue.defined(matrix)) {
      return undefined;
    }
    if (!defaultValue.defined(result)) {
      return new Matrix2(matrix[0], matrix[2], matrix[1], matrix[3]);
    }
    result[0] = matrix[0];
    result[1] = matrix[1];
    result[2] = matrix[2];
    result[3] = matrix[3];
    return result;
  };

  /**
   * Creates a Matrix2 from 4 consecutive elements in an array.
   *
   * @function
   * @param {Number[]} array The array whose 4 consecutive elements correspond to the positions of the matrix.  Assumes column-major order.
   * @param {Number} [startingIndex=0] The offset into the array of the first element, which corresponds to first column first row position in the matrix.
   * @param {Matrix2} [result] The object onto which to store the result.
   * @returns {Matrix2} The modified result parameter or a new Matrix2 instance if one was not provided.
   *
   * @example
   * // Create the Matrix2:
   * // [1.0, 2.0]
   * // [1.0, 2.0]
   *
   * const v = [1.0, 1.0, 2.0, 2.0];
   * const m = Cesium.Matrix2.fromArray(v);
   *
   * // Create same Matrix2 with using an offset into an array
   * const v2 = [0.0, 0.0, 1.0, 1.0, 2.0, 2.0];
   * const m2 = Cesium.Matrix2.fromArray(v2, 2);
   */
  Matrix2.fromArray = Matrix2.unpack;
  /**
   * Creates a Matrix2 instance from a column-major order array.
   *
   * @param {Number[]} values The column-major order array.
   * @param {Matrix2} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix2} The modified result parameter, or a new Matrix2 instance if one was not provided.
   */
  Matrix2.fromColumnMajorArray = function (values, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("values", values);
    //>>includeEnd('debug');

    return Matrix2.clone(values, result);
  };

  /**
   * Creates a Matrix2 instance from a row-major order array.
   * The resulting matrix will be in column-major order.
   *
   * @param {Number[]} values The row-major order array.
   * @param {Matrix2} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix2} The modified result parameter, or a new Matrix2 instance if one was not provided.
   */
  Matrix2.fromRowMajorArray = function (values, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.defined("values", values);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      return new Matrix2(values[0], values[1], values[2], values[3]);
    }
    result[0] = values[0];
    result[1] = values[2];
    result[2] = values[1];
    result[3] = values[3];
    return result;
  };

  /**
   * Computes a Matrix2 instance representing a non-uniform scale.
   *
   * @param {Cartesian2} scale The x and y scale factors.
   * @param {Matrix2} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix2} The modified result parameter, or a new Matrix2 instance if one was not provided.
   *
   * @example
   * // Creates
   * //   [7.0, 0.0]
   * //   [0.0, 8.0]
   * const m = Cesium.Matrix2.fromScale(new Cesium.Cartesian2(7.0, 8.0));
   */
  Matrix2.fromScale = function (scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("scale", scale);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      return new Matrix2(scale.x, 0.0, 0.0, scale.y);
    }

    result[0] = scale.x;
    result[1] = 0.0;
    result[2] = 0.0;
    result[3] = scale.y;
    return result;
  };

  /**
   * Computes a Matrix2 instance representing a uniform scale.
   *
   * @param {Number} scale The uniform scale factor.
   * @param {Matrix2} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix2} The modified result parameter, or a new Matrix2 instance if one was not provided.
   *
   * @example
   * // Creates
   * //   [2.0, 0.0]
   * //   [0.0, 2.0]
   * const m = Cesium.Matrix2.fromUniformScale(2.0);
   */
  Matrix2.fromUniformScale = function (scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("scale", scale);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      return new Matrix2(scale, 0.0, 0.0, scale);
    }

    result[0] = scale;
    result[1] = 0.0;
    result[2] = 0.0;
    result[3] = scale;
    return result;
  };

  /**
   * Creates a rotation matrix.
   *
   * @param {Number} angle The angle, in radians, of the rotation.  Positive angles are counterclockwise.
   * @param {Matrix2} [result] The object in which the result will be stored, if undefined a new instance will be created.
   * @returns {Matrix2} The modified result parameter, or a new Matrix2 instance if one was not provided.
   *
   * @example
   * // Rotate a point 45 degrees counterclockwise.
   * const p = new Cesium.Cartesian2(5, 6);
   * const m = Cesium.Matrix2.fromRotation(Cesium.Math.toRadians(45.0));
   * const rotated = Cesium.Matrix2.multiplyByVector(m, p, new Cesium.Cartesian2());
   */
  Matrix2.fromRotation = function (angle, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number("angle", angle);
    //>>includeEnd('debug');

    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);

    if (!defaultValue.defined(result)) {
      return new Matrix2(cosAngle, -sinAngle, sinAngle, cosAngle);
    }
    result[0] = cosAngle;
    result[1] = sinAngle;
    result[2] = -sinAngle;
    result[3] = cosAngle;
    return result;
  };

  /**
   * Creates an Array from the provided Matrix2 instance.
   * The array will be in column-major order.
   *
   * @param {Matrix2} matrix The matrix to use..
   * @param {Number[]} [result] The Array onto which to store the result.
   * @returns {Number[]} The modified Array parameter or a new Array instance if one was not provided.
   */
  Matrix2.toArray = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    //>>includeEnd('debug');

    if (!defaultValue.defined(result)) {
      return [matrix[0], matrix[1], matrix[2], matrix[3]];
    }
    result[0] = matrix[0];
    result[1] = matrix[1];
    result[2] = matrix[2];
    result[3] = matrix[3];
    return result;
  };

  /**
   * Computes the array index of the element at the provided row and column.
   *
   * @param {Number} row The zero-based index of the row.
   * @param {Number} column The zero-based index of the column.
   * @returns {Number} The index of the element at the provided row and column.
   *
   * @exception {DeveloperError} row must be 0 or 1.
   * @exception {DeveloperError} column must be 0 or 1.
   *
   * @example
   * const myMatrix = new Cesium.Matrix2();
   * const column1Row0Index = Cesium.Matrix2.getElementIndex(1, 0);
   * const column1Row0 = myMatrix[column1Row0Index]
   * myMatrix[column1Row0Index] = 10.0;
   */
  Matrix2.getElementIndex = function (column, row) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.number.greaterThanOrEquals("row", row, 0);
    Check.Check.typeOf.number.lessThanOrEquals("row", row, 1);

    Check.Check.typeOf.number.greaterThanOrEquals("column", column, 0);
    Check.Check.typeOf.number.lessThanOrEquals("column", column, 1);
    //>>includeEnd('debug');

    return column * 2 + row;
  };

  /**
   * Retrieves a copy of the matrix column at the provided index as a Cartesian2 instance.
   *
   * @param {Matrix2} matrix The matrix to use.
   * @param {Number} index The zero-based index of the column to retrieve.
   * @param {Cartesian2} result The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter.
   *
   * @exception {DeveloperError} index must be 0 or 1.
   */
  Matrix2.getColumn = function (matrix, index, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);

    Check.Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.Check.typeOf.number.lessThanOrEquals("index", index, 1);

    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const startIndex = index * 2;
    const x = matrix[startIndex];
    const y = matrix[startIndex + 1];

    result.x = x;
    result.y = y;
    return result;
  };

  /**
   * Computes a new matrix that replaces the specified column in the provided matrix with the provided Cartesian2 instance.
   *
   * @param {Matrix2} matrix The matrix to use.
   * @param {Number} index The zero-based index of the column to set.
   * @param {Cartesian2} cartesian The Cartesian whose values will be assigned to the specified column.
   * @param {Cartesian2} result The object onto which to store the result.
   * @returns {Matrix2} The modified result parameter.
   *
   * @exception {DeveloperError} index must be 0 or 1.
   */
  Matrix2.setColumn = function (matrix, index, cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);

    Check.Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.Check.typeOf.number.lessThanOrEquals("index", index, 1);

    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result = Matrix2.clone(matrix, result);
    const startIndex = index * 2;
    result[startIndex] = cartesian.x;
    result[startIndex + 1] = cartesian.y;
    return result;
  };

  /**
   * Retrieves a copy of the matrix row at the provided index as a Cartesian2 instance.
   *
   * @param {Matrix2} matrix The matrix to use.
   * @param {Number} index The zero-based index of the row to retrieve.
   * @param {Cartesian2} result The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter.
   *
   * @exception {DeveloperError} index must be 0 or 1.
   */
  Matrix2.getRow = function (matrix, index, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);

    Check.Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.Check.typeOf.number.lessThanOrEquals("index", index, 1);

    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const x = matrix[index];
    const y = matrix[index + 2];

    result.x = x;
    result.y = y;
    return result;
  };

  /**
   * Computes a new matrix that replaces the specified row in the provided matrix with the provided Cartesian2 instance.
   *
   * @param {Matrix2} matrix The matrix to use.
   * @param {Number} index The zero-based index of the row to set.
   * @param {Cartesian2} cartesian The Cartesian whose values will be assigned to the specified row.
   * @param {Matrix2} result The object onto which to store the result.
   * @returns {Matrix2} The modified result parameter.
   *
   * @exception {DeveloperError} index must be 0 or 1.
   */
  Matrix2.setRow = function (matrix, index, cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);

    Check.Check.typeOf.number.greaterThanOrEquals("index", index, 0);
    Check.Check.typeOf.number.lessThanOrEquals("index", index, 1);

    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result = Matrix2.clone(matrix, result);
    result[index] = cartesian.x;
    result[index + 2] = cartesian.y;
    return result;
  };

  const scaleScratch1 = new Cartesian2();

  /**
   * Computes a new matrix that replaces the scale with the provided scale.
   * This assumes the matrix is an affine transformation.
   *
   * @param {Matrix2} matrix The matrix to use.
   * @param {Cartesian2} scale The scale that replaces the scale of the provided matrix.
   * @param {Matrix2} result The object onto which to store the result.
   * @returns {Matrix2} The modified result parameter.
   *
   * @see Matrix2.setUniformScale
   * @see Matrix2.fromScale
   * @see Matrix2.fromUniformScale
   * @see Matrix2.multiplyByScale
   * @see Matrix2.multiplyByUniformScale
   * @see Matrix2.getScale
   */
  Matrix2.setScale = function (matrix, scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("scale", scale);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const existingScale = Matrix2.getScale(matrix, scaleScratch1);
    const scaleRatioX = scale.x / existingScale.x;
    const scaleRatioY = scale.y / existingScale.y;

    result[0] = matrix[0] * scaleRatioX;
    result[1] = matrix[1] * scaleRatioX;
    result[2] = matrix[2] * scaleRatioY;
    result[3] = matrix[3] * scaleRatioY;

    return result;
  };

  const scaleScratch2 = new Cartesian2();

  /**
   * Computes a new matrix that replaces the scale with the provided uniform scale.
   * This assumes the matrix is an affine transformation.
   *
   * @param {Matrix2} matrix The matrix to use.
   * @param {Number} scale The uniform scale that replaces the scale of the provided matrix.
   * @param {Matrix2} result The object onto which to store the result.
   * @returns {Matrix2} The modified result parameter.
   *
   * @see Matrix2.setScale
   * @see Matrix2.fromScale
   * @see Matrix2.fromUniformScale
   * @see Matrix2.multiplyByScale
   * @see Matrix2.multiplyByUniformScale
   * @see Matrix2.getScale
   */
  Matrix2.setUniformScale = function (matrix, scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.number("scale", scale);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const existingScale = Matrix2.getScale(matrix, scaleScratch2);
    const scaleRatioX = scale / existingScale.x;
    const scaleRatioY = scale / existingScale.y;

    result[0] = matrix[0] * scaleRatioX;
    result[1] = matrix[1] * scaleRatioX;
    result[2] = matrix[2] * scaleRatioY;
    result[3] = matrix[3] * scaleRatioY;

    return result;
  };

  const scratchColumn = new Cartesian2();

  /**
   * Extracts the non-uniform scale assuming the matrix is an affine transformation.
   *
   * @param {Matrix2} matrix The matrix.
   * @param {Cartesian2} result The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter.
   *
   * @see Matrix2.multiplyByScale
   * @see Matrix2.multiplyByUniformScale
   * @see Matrix2.fromScale
   * @see Matrix2.fromUniformScale
   * @see Matrix2.setScale
   * @see Matrix2.setUniformScale
   */
  Matrix2.getScale = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Cartesian2.magnitude(
      Cartesian2.fromElements(matrix[0], matrix[1], scratchColumn)
    );
    result.y = Cartesian2.magnitude(
      Cartesian2.fromElements(matrix[2], matrix[3], scratchColumn)
    );
    return result;
  };

  const scaleScratch3 = new Cartesian2();

  /**
   * Computes the maximum scale assuming the matrix is an affine transformation.
   * The maximum scale is the maximum length of the column vectors.
   *
   * @param {Matrix2} matrix The matrix.
   * @returns {Number} The maximum scale.
   */
  Matrix2.getMaximumScale = function (matrix) {
    Matrix2.getScale(matrix, scaleScratch3);
    return Cartesian2.maximumComponent(scaleScratch3);
  };

  const scaleScratch4 = new Cartesian2();

  /**
   * Sets the rotation assuming the matrix is an affine transformation.
   *
   * @param {Matrix2} matrix The matrix.
   * @param {Matrix2} rotation The rotation matrix.
   * @param {Matrix2} result The object onto which to store the result.
   * @returns {Matrix2} The modified result parameter.
   *
   * @see Matrix2.fromRotation
   * @see Matrix2.getRotation
   */
  Matrix2.setRotation = function (matrix, rotation, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const scale = Matrix2.getScale(matrix, scaleScratch4);

    result[0] = rotation[0] * scale.x;
    result[1] = rotation[1] * scale.x;
    result[2] = rotation[2] * scale.y;
    result[3] = rotation[3] * scale.y;

    return result;
  };

  const scaleScratch5 = new Cartesian2();

  /**
   * Extracts the rotation matrix assuming the matrix is an affine transformation.
   *
   * @param {Matrix2} matrix The matrix.
   * @param {Matrix2} result The object onto which to store the result.
   * @returns {Matrix2} The modified result parameter.
   *
   * @see Matrix2.setRotation
   * @see Matrix2.fromRotation
   */
  Matrix2.getRotation = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const scale = Matrix2.getScale(matrix, scaleScratch5);

    result[0] = matrix[0] / scale.x;
    result[1] = matrix[1] / scale.x;
    result[2] = matrix[2] / scale.y;
    result[3] = matrix[3] / scale.y;

    return result;
  };

  /**
   * Computes the product of two matrices.
   *
   * @param {Matrix2} left The first matrix.
   * @param {Matrix2} right The second matrix.
   * @param {Matrix2} result The object onto which to store the result.
   * @returns {Matrix2} The modified result parameter.
   */
  Matrix2.multiply = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const column0Row0 = left[0] * right[0] + left[2] * right[1];
    const column1Row0 = left[0] * right[2] + left[2] * right[3];
    const column0Row1 = left[1] * right[0] + left[3] * right[1];
    const column1Row1 = left[1] * right[2] + left[3] * right[3];

    result[0] = column0Row0;
    result[1] = column0Row1;
    result[2] = column1Row0;
    result[3] = column1Row1;
    return result;
  };

  /**
   * Computes the sum of two matrices.
   *
   * @param {Matrix2} left The first matrix.
   * @param {Matrix2} right The second matrix.
   * @param {Matrix2} result The object onto which to store the result.
   * @returns {Matrix2} The modified result parameter.
   */
  Matrix2.add = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result[0] = left[0] + right[0];
    result[1] = left[1] + right[1];
    result[2] = left[2] + right[2];
    result[3] = left[3] + right[3];
    return result;
  };

  /**
   * Computes the difference of two matrices.
   *
   * @param {Matrix2} left The first matrix.
   * @param {Matrix2} right The second matrix.
   * @param {Matrix2} result The object onto which to store the result.
   * @returns {Matrix2} The modified result parameter.
   */
  Matrix2.subtract = function (left, right, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("left", left);
    Check.Check.typeOf.object("right", right);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result[0] = left[0] - right[0];
    result[1] = left[1] - right[1];
    result[2] = left[2] - right[2];
    result[3] = left[3] - right[3];
    return result;
  };

  /**
   * Computes the product of a matrix and a column vector.
   *
   * @param {Matrix2} matrix The matrix.
   * @param {Cartesian2} cartesian The column.
   * @param {Cartesian2} result The object onto which to store the result.
   * @returns {Cartesian2} The modified result parameter.
   */
  Matrix2.multiplyByVector = function (matrix, cartesian, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("cartesian", cartesian);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const x = matrix[0] * cartesian.x + matrix[2] * cartesian.y;
    const y = matrix[1] * cartesian.x + matrix[3] * cartesian.y;

    result.x = x;
    result.y = y;
    return result;
  };

  /**
   * Computes the product of a matrix and a scalar.
   *
   * @param {Matrix2} matrix The matrix.
   * @param {Number} scalar The number to multiply by.
   * @param {Matrix2} result The object onto which to store the result.
   * @returns {Matrix2} The modified result parameter.
   */
  Matrix2.multiplyByScalar = function (matrix, scalar, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.number("scalar", scalar);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result[0] = matrix[0] * scalar;
    result[1] = matrix[1] * scalar;
    result[2] = matrix[2] * scalar;
    result[3] = matrix[3] * scalar;
    return result;
  };

  /**
   * Computes the product of a matrix times a (non-uniform) scale, as if the scale were a scale matrix.
   *
   * @param {Matrix2} matrix The matrix on the left-hand side.
   * @param {Cartesian2} scale The non-uniform scale on the right-hand side.
   * @param {Matrix2} result The object onto which to store the result.
   * @returns {Matrix2} The modified result parameter.
   *
   *
   * @example
   * // Instead of Cesium.Matrix2.multiply(m, Cesium.Matrix2.fromScale(scale), m);
   * Cesium.Matrix2.multiplyByScale(m, scale, m);
   *
   * @see Matrix2.multiplyByUniformScale
   * @see Matrix2.fromScale
   * @see Matrix2.fromUniformScale
   * @see Matrix2.setScale
   * @see Matrix2.setUniformScale
   * @see Matrix2.getScale
   */
  Matrix2.multiplyByScale = function (matrix, scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("scale", scale);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result[0] = matrix[0] * scale.x;
    result[1] = matrix[1] * scale.x;
    result[2] = matrix[2] * scale.y;
    result[3] = matrix[3] * scale.y;

    return result;
  };

  /**
   * Computes the product of a matrix times a uniform scale, as if the scale were a scale matrix.
   *
   * @param {Matrix2} matrix The matrix on the left-hand side.
   * @param {Number} scale The uniform scale on the right-hand side.
   * @param {Matrix2} result The object onto which to store the result.
   * @returns {Matrix2} The modified result parameter.
   *
   * @example
   * // Instead of Cesium.Matrix2.multiply(m, Cesium.Matrix2.fromUniformScale(scale), m);
   * Cesium.Matrix2.multiplyByUniformScale(m, scale, m);
   *
   * @see Matrix2.multiplyByScale
   * @see Matrix2.fromScale
   * @see Matrix2.fromUniformScale
   * @see Matrix2.setScale
   * @see Matrix2.setUniformScale
   * @see Matrix2.getScale
   */
  Matrix2.multiplyByUniformScale = function (matrix, scale, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.number("scale", scale);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result[0] = matrix[0] * scale;
    result[1] = matrix[1] * scale;
    result[2] = matrix[2] * scale;
    result[3] = matrix[3] * scale;

    return result;
  };

  /**
   * Creates a negated copy of the provided matrix.
   *
   * @param {Matrix2} matrix The matrix to negate.
   * @param {Matrix2} result The object onto which to store the result.
   * @returns {Matrix2} The modified result parameter.
   */
  Matrix2.negate = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result[0] = -matrix[0];
    result[1] = -matrix[1];
    result[2] = -matrix[2];
    result[3] = -matrix[3];
    return result;
  };

  /**
   * Computes the transpose of the provided matrix.
   *
   * @param {Matrix2} matrix The matrix to transpose.
   * @param {Matrix2} result The object onto which to store the result.
   * @returns {Matrix2} The modified result parameter.
   */
  Matrix2.transpose = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const column0Row0 = matrix[0];
    const column0Row1 = matrix[2];
    const column1Row0 = matrix[1];
    const column1Row1 = matrix[3];

    result[0] = column0Row0;
    result[1] = column0Row1;
    result[2] = column1Row0;
    result[3] = column1Row1;
    return result;
  };

  /**
   * Computes a matrix, which contains the absolute (unsigned) values of the provided matrix's elements.
   *
   * @param {Matrix2} matrix The matrix with signed elements.
   * @param {Matrix2} result The object onto which to store the result.
   * @returns {Matrix2} The modified result parameter.
   */
  Matrix2.abs = function (matrix, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.Check.typeOf.object("matrix", matrix);
    Check.Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result[0] = Math.abs(matrix[0]);
    result[1] = Math.abs(matrix[1]);
    result[2] = Math.abs(matrix[2]);
    result[3] = Math.abs(matrix[3]);

    return result;
  };

  /**
   * Compares the provided matrices componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {Matrix2} [left] The first matrix.
   * @param {Matrix2} [right] The second matrix.
   * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
   */
  Matrix2.equals = function (left, right) {
    return (
      left === right ||
      (defaultValue.defined(left) &&
        defaultValue.defined(right) &&
        left[0] === right[0] &&
        left[1] === right[1] &&
        left[2] === right[2] &&
        left[3] === right[3])
    );
  };

  /**
   * @private
   */
  Matrix2.equalsArray = function (matrix, array, offset) {
    return (
      matrix[0] === array[offset] &&
      matrix[1] === array[offset + 1] &&
      matrix[2] === array[offset + 2] &&
      matrix[3] === array[offset + 3]
    );
  };

  /**
   * Compares the provided matrices componentwise and returns
   * <code>true</code> if they are within the provided epsilon,
   * <code>false</code> otherwise.
   *
   * @param {Matrix2} [left] The first matrix.
   * @param {Matrix2} [right] The second matrix.
   * @param {Number} [epsilon=0] The epsilon to use for equality testing.
   * @returns {Boolean} <code>true</code> if left and right are within the provided epsilon, <code>false</code> otherwise.
   */
  Matrix2.equalsEpsilon = function (left, right, epsilon) {
    epsilon = defaultValue.defaultValue(epsilon, 0);
    return (
      left === right ||
      (defaultValue.defined(left) &&
        defaultValue.defined(right) &&
        Math.abs(left[0] - right[0]) <= epsilon &&
        Math.abs(left[1] - right[1]) <= epsilon &&
        Math.abs(left[2] - right[2]) <= epsilon &&
        Math.abs(left[3] - right[3]) <= epsilon)
    );
  };

  /**
   * An immutable Matrix2 instance initialized to the identity matrix.
   *
   * @type {Matrix2}
   * @constant
   */
  Matrix2.IDENTITY = Object.freeze(new Matrix2(1.0, 0.0, 0.0, 1.0));

  /**
   * An immutable Matrix2 instance initialized to the zero matrix.
   *
   * @type {Matrix2}
   * @constant
   */
  Matrix2.ZERO = Object.freeze(new Matrix2(0.0, 0.0, 0.0, 0.0));

  /**
   * The index into Matrix2 for column 0, row 0.
   *
   * @type {Number}
   * @constant
   *
   * @example
   * const matrix = new Cesium.Matrix2();
   * matrix[Cesium.Matrix2.COLUMN0ROW0] = 5.0; // set column 0, row 0 to 5.0
   */
  Matrix2.COLUMN0ROW0 = 0;

  /**
   * The index into Matrix2 for column 0, row 1.
   *
   * @type {Number}
   * @constant
   *
   * @example
   * const matrix = new Cesium.Matrix2();
   * matrix[Cesium.Matrix2.COLUMN0ROW1] = 5.0; // set column 0, row 1 to 5.0
   */
  Matrix2.COLUMN0ROW1 = 1;

  /**
   * The index into Matrix2 for column 1, row 0.
   *
   * @type {Number}
   * @constant
   *
   * @example
   * const matrix = new Cesium.Matrix2();
   * matrix[Cesium.Matrix2.COLUMN1ROW0] = 5.0; // set column 1, row 0 to 5.0
   */
  Matrix2.COLUMN1ROW0 = 2;

  /**
   * The index into Matrix2 for column 1, row 1.
   *
   * @type {Number}
   * @constant
   *
   * @example
   * const matrix = new Cesium.Matrix2();
   * matrix[Cesium.Matrix2.COLUMN1ROW1] = 5.0; // set column 1, row 1 to 5.0
   */
  Matrix2.COLUMN1ROW1 = 3;

  Object.defineProperties(Matrix2.prototype, {
    /**
     * Gets the number of items in the collection.
     * @memberof Matrix2.prototype
     *
     * @type {Number}
     */
    length: {
      get: function () {
        return Matrix2.packedLength;
      },
    },
  });

  /**
   * Duplicates the provided Matrix2 instance.
   *
   * @param {Matrix2} [result] The object onto which to store the result.
   * @returns {Matrix2} The modified result parameter or a new Matrix2 instance if one was not provided.
   */
  Matrix2.prototype.clone = function (result) {
    return Matrix2.clone(this, result);
  };

  /**
   * Compares this matrix to the provided matrix componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param {Matrix2} [right] The right hand side matrix.
   * @returns {Boolean} <code>true</code> if they are equal, <code>false</code> otherwise.
   */
  Matrix2.prototype.equals = function (right) {
    return Matrix2.equals(this, right);
  };

  /**
   * Compares this matrix to the provided matrix componentwise and returns
   * <code>true</code> if they are within the provided epsilon,
   * <code>false</code> otherwise.
   *
   * @param {Matrix2} [right] The right hand side matrix.
   * @param {Number} [epsilon=0] The epsilon to use for equality testing.
   * @returns {Boolean} <code>true</code> if they are within the provided epsilon, <code>false</code> otherwise.
   */
  Matrix2.prototype.equalsEpsilon = function (right, epsilon) {
    return Matrix2.equalsEpsilon(this, right, epsilon);
  };

  /**
   * Creates a string representing this Matrix with each row being
   * on a separate line and in the format '(column0, column1)'.
   *
   * @returns {String} A string representing the provided Matrix with each row being on a separate line and in the format '(column0, column1)'.
   */
  Matrix2.prototype.toString = function () {
    return `(${this[0]}, ${this[2]})\n` + `(${this[1]}, ${this[3]})`;
  };

  exports.Cartesian2 = Cartesian2;
  exports.Cartesian4 = Cartesian4;
  exports.Matrix2 = Matrix2;
  exports.Matrix4 = Matrix4;
  exports.Rectangle = Rectangle;

}));
