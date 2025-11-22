import Check from "./Check.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import CesiumMath from "./Math.js";

/**
 * Cartesian3-like interface for fromCartesian3
 */
interface Cartesian3Like {
  x: number;
  y: number;
  z?: number;
}

/**
 * Cartesian4-like interface for fromCartesian4
 */
interface Cartesian4Like {
  x: number;
  y: number;
  z?: number;
  w?: number;
}

/**
 * A 2D Cartesian point.
 * @alias Cartesian2
 *
 * @see Cartesian3
 * @see Cartesian4
 * @see Packable
 */
class Cartesian2 {
  /**
   * The X component.
   */
  x: number;

  /**
   * The Y component.
   */
  y: number;

  /**
   * Creates a new Cartesian2 instance.
   * @param x - The X component. Default is 0.0.
   * @param y - The Y component. Default is 0.0.
   */
  constructor(x: number = 0.0, y: number = 0.0) {
    this.x = x;
    this.y = y;
  }

  /**
   * The number of elements used to pack the object into an array.
   */
  static packedLength: number = 2;

  /**
   * An immutable Cartesian2 instance initialized to (0.0, 0.0).
   */
  static ZERO: Cartesian2 = Object.freeze(new Cartesian2(0.0, 0.0));

  /**
   * An immutable Cartesian2 instance initialized to (1.0, 1.0).
   */
  static ONE: Cartesian2 = Object.freeze(new Cartesian2(1.0, 1.0));

  /**
   * An immutable Cartesian2 instance initialized to (1.0, 0.0).
   */
  static UNIT_X: Cartesian2 = Object.freeze(new Cartesian2(1.0, 0.0));

  /**
   * An immutable Cartesian2 instance initialized to (0.0, 1.0).
   */
  static UNIT_Y: Cartesian2 = Object.freeze(new Cartesian2(0.0, 1.0));

  /**
   * Creates a Cartesian2 instance from x and y coordinates.
   * @param x - The x coordinate.
   * @param y - The y coordinate.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Cartesian2 instance if one was not provided.
   */
  static fromElements(x: number, y: number, result?: Cartesian2): Cartesian2 {
    if (!defined(result)) {
      return new Cartesian2(x, y);
    }

    result!.x = x;
    result!.y = y;
    return result!;
  }

  /**
   * Duplicates a Cartesian2 instance.
   * @param cartesian - The Cartesian to duplicate.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Cartesian2 instance if one was not provided. (Returns undefined if cartesian is undefined)
   */
  static clone(cartesian: Cartesian2 | undefined, result?: Cartesian2): Cartesian2 | undefined {
    if (!defined(cartesian)) {
      return undefined;
    }
    if (!defined(result)) {
      return new Cartesian2(cartesian!.x, cartesian!.y);
    }

    result!.x = cartesian!.x;
    result!.y = cartesian!.y;
    return result;
  }

  /**
   * Creates a Cartesian2 instance from an existing Cartesian3. This simply takes the
   * x and y properties of the Cartesian3 and drops z.
   * @param cartesian - The Cartesian3 instance to create a Cartesian2 instance from.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Cartesian2 instance if one was not provided.
   */
  static fromCartesian3(cartesian: Cartesian3Like | undefined, result?: Cartesian2): Cartesian2 | undefined {
    return Cartesian2.clone(cartesian as Cartesian2 | undefined, result);
  }

  /**
   * Creates a Cartesian2 instance from an existing Cartesian4. This simply takes the
   * x and y properties of the Cartesian4 and drops z and w.
   * @param cartesian - The Cartesian4 instance to create a Cartesian2 instance from.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Cartesian2 instance if one was not provided.
   */
  static fromCartesian4(cartesian: Cartesian4Like | undefined, result?: Cartesian2): Cartesian2 | undefined {
    return Cartesian2.clone(cartesian as Cartesian2 | undefined, result);
  }

  /**
   * Stores the provided instance into the provided array.
   * @param value - The value to pack.
   * @param array - The array to pack into.
   * @param startingIndex - The index into the array at which to start packing the elements.
   * @returns The array that was packed into
   */
  static pack(value: Cartesian2, array: number[], startingIndex: number = 0): number[] {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("value", value);
    Check.defined("array", array);
    //>>includeEnd('debug');

    array[startingIndex++] = value.x;
    array[startingIndex] = value.y;

    return array;
  }

  /**
   * Retrieves an instance from a packed array.
   * @param array - The packed array.
   * @param startingIndex - The starting index of the element to be unpacked.
   * @param result - The object into which to store the result.
   * @returns The modified result parameter or a new Cartesian2 instance if one was not provided.
   */
  static unpack(array: number[], startingIndex: number = 0, result?: Cartesian2): Cartesian2 {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("array", array);
    //>>includeEnd('debug');

    if (!defined(result)) {
      result = new Cartesian2();
    }
    result!.x = array[startingIndex++];
    result!.y = array[startingIndex];
    return result!;
  }

  /**
   * Flattens an array of Cartesian2s into an array of components.
   * @param array - The array of cartesians to pack.
   * @param result - The array onto which to store the result. If this is a typed array, it must have array.length * 2 components, else a DeveloperError will be thrown. If it is a regular array, it will be resized to have (array.length * 2) elements.
   * @returns The packed array.
   */
  static packArray(array: Cartesian2[], result?: number[]): number[] {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("array", array);
    //>>includeEnd('debug');

    const length = array.length;
    const resultLength = length * 2;
    if (!defined(result)) {
      result = new Array(resultLength);
    } else if (!Array.isArray(result) && result!.length !== resultLength) {
      //>>includeStart('debug', pragmas.debug);
      throw new DeveloperError(
        "If result is a typed array, it must have exactly array.length * 2 elements"
      );
      //>>includeEnd('debug');
    } else if (result!.length !== resultLength) {
      result!.length = resultLength;
    }

    for (let i = 0; i < length; ++i) {
      Cartesian2.pack(array[i], result!, i * 2);
    }
    return result!;
  }

  /**
   * Unpacks an array of cartesian components into an array of Cartesian2s.
   * @param array - The array of components to unpack.
   * @param result - The array onto which to store the result.
   * @returns The unpacked array.
   */
  static unpackArray(array: number[], result?: Cartesian2[]): Cartesian2[] {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("array", array);
    Check.typeOf.number.greaterThanOrEquals("array.length", array.length, 2);
    if (array.length % 2 !== 0) {
      throw new DeveloperError("array length must be a multiple of 2.");
    }
    //>>includeEnd('debug');

    const length = array.length;
    if (!defined(result)) {
      result = new Array(length / 2);
    } else {
      result!.length = length / 2;
    }

    for (let i = 0; i < length; i += 2) {
      const index = i / 2;
      result![index] = Cartesian2.unpack(array, i, result![index]);
    }
    return result!;
  }

  /**
   * Creates a Cartesian2 from two consecutive elements in an array.
   * @param array - The array whose two consecutive elements correspond to the x and y components, respectively.
   * @param startingIndex - The offset into the array of the first element, which corresponds to the x component.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Cartesian2 instance if one was not provided.
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
  static fromArray = Cartesian2.unpack;

  /**
   * Computes the value of the maximum component for the supplied Cartesian.
   * @param cartesian - The cartesian to use.
   * @returns The value of the maximum component.
   */
  static maximumComponent(cartesian: Cartesian2): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    return Math.max(cartesian.x, cartesian.y);
  }

  /**
   * Computes the value of the minimum component for the supplied Cartesian.
   * @param cartesian - The cartesian to use.
   * @returns The value of the minimum component.
   */
  static minimumComponent(cartesian: Cartesian2): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    return Math.min(cartesian.x, cartesian.y);
  }

  /**
   * Compares two Cartesians and computes a Cartesian which contains the minimum components of the supplied Cartesians.
   * @param first - A cartesian to compare.
   * @param second - A cartesian to compare.
   * @param result - The object into which to store the result.
   * @returns A cartesian with the minimum components.
   */
  static minimumByComponent(first: Cartesian2, second: Cartesian2, result: Cartesian2): Cartesian2 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("first", first);
    Check.typeOf.object("second", second);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Math.min(first.x, second.x);
    result.y = Math.min(first.y, second.y);

    return result;
  }

  /**
   * Compares two Cartesians and computes a Cartesian which contains the maximum components of the supplied Cartesians.
   * @param first - A cartesian to compare.
   * @param second - A cartesian to compare.
   * @param result - The object into which to store the result.
   * @returns A cartesian with the maximum components.
   */
  static maximumByComponent(first: Cartesian2, second: Cartesian2, result: Cartesian2): Cartesian2 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("first", first);
    Check.typeOf.object("second", second);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Math.max(first.x, second.x);
    result.y = Math.max(first.y, second.y);
    return result;
  }

  /**
   * Constrain a value to lie between two values.
   * @param value - The value to clamp.
   * @param min - The minimum bound.
   * @param max - The maximum bound.
   * @param result - The object into which to store the result.
   * @returns The clamped value such that min <= result <= max.
   */
  static clamp(value: Cartesian2, min: Cartesian2, max: Cartesian2, result: Cartesian2): Cartesian2 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("value", value);
    Check.typeOf.object("min", min);
    Check.typeOf.object("max", max);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const x = CesiumMath.clamp(value.x, min.x, max.x);
    const y = CesiumMath.clamp(value.y, min.y, max.y);

    result.x = x;
    result.y = y;

    return result;
  }

  /**
   * Computes the provided Cartesian's squared magnitude.
   * @param cartesian - The Cartesian instance whose squared magnitude is to be computed.
   * @returns The squared magnitude.
   */
  static magnitudeSquared(cartesian: Cartesian2): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    return cartesian.x * cartesian.x + cartesian.y * cartesian.y;
  }

  /**
   * Computes the Cartesian's magnitude (length).
   * @param cartesian - The Cartesian instance whose magnitude is to be computed.
   * @returns The magnitude.
   */
  static magnitude(cartesian: Cartesian2): number {
    return Math.sqrt(Cartesian2.magnitudeSquared(cartesian));
  }

  private static distanceScratch = new Cartesian2();

  /**
   * Computes the distance between two points.
   * @param left - The first point to compute the distance from.
   * @param right - The second point to compute the distance to.
   * @returns The distance between two points.
   *
   * @example
   * // Returns 1.0
   * const d = Cesium.Cartesian2.distance(new Cesium.Cartesian2(1.0, 0.0), new Cesium.Cartesian2(2.0, 0.0));
   */
  static distance(left: Cartesian2, right: Cartesian2): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    Cartesian2.subtract(left, right, Cartesian2.distanceScratch);
    return Cartesian2.magnitude(Cartesian2.distanceScratch);
  }

  /**
   * Computes the squared distance between two points. Comparing squared distances
   * using this function is more efficient than comparing distances using Cartesian2#distance.
   * @param left - The first point to compute the distance from.
   * @param right - The second point to compute the distance to.
   * @returns The distance between two points.
   *
   * @example
   * // Returns 4.0, not 2.0
   * const d = Cesium.Cartesian2.distance(new Cesium.Cartesian2(1.0, 0.0), new Cesium.Cartesian2(3.0, 0.0));
   */
  static distanceSquared(left: Cartesian2, right: Cartesian2): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    Cartesian2.subtract(left, right, Cartesian2.distanceScratch);
    return Cartesian2.magnitudeSquared(Cartesian2.distanceScratch);
  }

  /**
   * Computes the normalized form of the supplied Cartesian.
   * @param cartesian - The Cartesian to be normalized.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static normalize(cartesian: Cartesian2, result: Cartesian2): Cartesian2 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const magnitude = Cartesian2.magnitude(cartesian);

    result.x = cartesian.x / magnitude;
    result.y = cartesian.y / magnitude;

    //>>includeStart('debug', pragmas.debug);
    if (isNaN(result.x) || isNaN(result.y)) {
      throw new DeveloperError("normalized result is not a number");
    }
    //>>includeEnd('debug');

    return result;
  }

  /**
   * Computes the dot (scalar) product of two Cartesians.
   * @param left - The first Cartesian.
   * @param right - The second Cartesian.
   * @returns The dot product.
   */
  static dot(left: Cartesian2, right: Cartesian2): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    return left.x * right.x + left.y * right.y;
  }

  /**
   * Computes the magnitude of the cross product that would result from implicitly setting the Z coordinate of the input vectors to 0.
   * @param left - The first Cartesian.
   * @param right - The second Cartesian.
   * @returns The cross product.
   */
  static cross(left: Cartesian2, right: Cartesian2): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    return left.x * right.y - left.y * right.x;
  }

  /**
   * Computes the componentwise product of two Cartesians.
   * @param left - The first Cartesian.
   * @param right - The second Cartesian.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static multiplyComponents(left: Cartesian2, right: Cartesian2, result: Cartesian2): Cartesian2 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x * right.x;
    result.y = left.y * right.y;
    return result;
  }

  /**
   * Computes the componentwise quotient of two Cartesians.
   * @param left - The first Cartesian.
   * @param right - The second Cartesian.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static divideComponents(left: Cartesian2, right: Cartesian2, result: Cartesian2): Cartesian2 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x / right.x;
    result.y = left.y / right.y;
    return result;
  }

  /**
   * Computes the componentwise sum of two Cartesians.
   * @param left - The first Cartesian.
   * @param right - The second Cartesian.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static add(left: Cartesian2, right: Cartesian2, result: Cartesian2): Cartesian2 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x + right.x;
    result.y = left.y + right.y;
    return result;
  }

  /**
   * Computes the componentwise difference of two Cartesians.
   * @param left - The first Cartesian.
   * @param right - The second Cartesian.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static subtract(left: Cartesian2, right: Cartesian2, result: Cartesian2): Cartesian2 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x - right.x;
    result.y = left.y - right.y;
    return result;
  }

  /**
   * Multiplies the provided Cartesian componentwise by the provided scalar.
   * @param cartesian - The Cartesian to be scaled.
   * @param scalar - The scalar to multiply with.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static multiplyByScalar(cartesian: Cartesian2, scalar: number, result: Cartesian2): Cartesian2 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    Check.typeOf.number("scalar", scalar);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = cartesian.x * scalar;
    result.y = cartesian.y * scalar;
    return result;
  }

  /**
   * Divides the provided Cartesian componentwise by the provided scalar.
   * @param cartesian - The Cartesian to be divided.
   * @param scalar - The scalar to divide by.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static divideByScalar(cartesian: Cartesian2, scalar: number, result: Cartesian2): Cartesian2 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    Check.typeOf.number("scalar", scalar);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = cartesian.x / scalar;
    result.y = cartesian.y / scalar;
    return result;
  }

  /**
   * Negates the provided Cartesian.
   * @param cartesian - The Cartesian to be negated.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static negate(cartesian: Cartesian2, result: Cartesian2): Cartesian2 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = -cartesian.x;
    result.y = -cartesian.y;
    return result;
  }

  /**
   * Computes the absolute value of the provided Cartesian.
   * @param cartesian - The Cartesian whose absolute value is to be computed.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static abs(cartesian: Cartesian2, result: Cartesian2): Cartesian2 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Math.abs(cartesian.x);
    result.y = Math.abs(cartesian.y);
    return result;
  }

  private static lerpScratch = new Cartesian2();

  /**
   * Computes the linear interpolation or extrapolation at t using the provided cartesians.
   * @param start - The value corresponding to t at 0.0.
   * @param end - The value corresponding to t at 1.0.
   * @param t - The point along t at which to interpolate.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static lerp(start: Cartesian2, end: Cartesian2, t: number, result: Cartesian2): Cartesian2 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("start", start);
    Check.typeOf.object("end", end);
    Check.typeOf.number("t", t);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    Cartesian2.multiplyByScalar(end, t, Cartesian2.lerpScratch);
    result = Cartesian2.multiplyByScalar(start, 1.0 - t, result);
    return Cartesian2.add(Cartesian2.lerpScratch, result, result);
  }

  private static angleBetweenScratch = new Cartesian2();
  private static angleBetweenScratch2 = new Cartesian2();

  /**
   * Returns the angle, in radians, between the provided Cartesians.
   * @param left - The first Cartesian.
   * @param right - The second Cartesian.
   * @returns The angle between the Cartesians.
   */
  static angleBetween(left: Cartesian2, right: Cartesian2): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    Cartesian2.normalize(left, Cartesian2.angleBetweenScratch);
    Cartesian2.normalize(right, Cartesian2.angleBetweenScratch2);
    return CesiumMath.acosClamped(
      Cartesian2.dot(Cartesian2.angleBetweenScratch, Cartesian2.angleBetweenScratch2)
    );
  }

  private static mostOrthogonalAxisScratch = new Cartesian2();

  /**
   * Returns the axis that is most orthogonal to the provided Cartesian.
   * @param cartesian - The Cartesian on which to find the most orthogonal axis.
   * @param result - The object onto which to store the result.
   * @returns The most orthogonal axis.
   */
  static mostOrthogonalAxis(cartesian: Cartesian2, result: Cartesian2): Cartesian2 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const f = Cartesian2.normalize(cartesian, Cartesian2.mostOrthogonalAxisScratch);
    Cartesian2.abs(f, f);

    if (f.x <= f.y) {
      result = Cartesian2.clone(Cartesian2.UNIT_X, result)!;
    } else {
      result = Cartesian2.clone(Cartesian2.UNIT_Y, result)!;
    }

    return result;
  }

  /**
   * Compares the provided Cartesians componentwise and returns
   * true if they are equal, false otherwise.
   * @param left - The first Cartesian.
   * @param right - The second Cartesian.
   * @returns true if left and right are equal, false otherwise.
   */
  static equals(left?: Cartesian2, right?: Cartesian2): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        left!.x === right!.x &&
        left!.y === right!.y)
    );
  }

  /**
   * @private
   */
  static equalsArray(cartesian: Cartesian2, array: number[], offset: number): boolean {
    return cartesian.x === array[offset] && cartesian.y === array[offset + 1];
  }

  /**
   * Compares the provided Cartesians componentwise and returns
   * true if they pass an absolute or relative tolerance test, false otherwise.
   * @param left - The first Cartesian.
   * @param right - The second Cartesian.
   * @param relativeEpsilon - The relative epsilon tolerance to use for equality testing.
   * @param absoluteEpsilon - The absolute epsilon tolerance to use for equality testing.
   * @returns true if left and right are within the provided epsilon, false otherwise.
   */
  static equalsEpsilon(
    left?: Cartesian2,
    right?: Cartesian2,
    relativeEpsilon: number = 0,
    absoluteEpsilon: number = relativeEpsilon
  ): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        CesiumMath.equalsEpsilon(left!.x, right!.x, relativeEpsilon, absoluteEpsilon) &&
        CesiumMath.equalsEpsilon(left!.y, right!.y, relativeEpsilon, absoluteEpsilon))
    );
  }

  /**
   * Duplicates this Cartesian2 instance.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Cartesian2 instance if one was not provided.
   */
  clone(result?: Cartesian2): Cartesian2 {
    return Cartesian2.clone(this, result)!;
  }

  /**
   * Compares this Cartesian against the provided Cartesian componentwise and returns
   * true if they are equal, false otherwise.
   * @param right - The right hand side Cartesian.
   * @returns true if they are equal, false otherwise.
   */
  equals(right?: Cartesian2): boolean {
    return Cartesian2.equals(this, right);
  }

  /**
   * Compares this Cartesian against the provided Cartesian componentwise and returns
   * true if they pass an absolute or relative tolerance test, false otherwise.
   * @param right - The right hand side Cartesian.
   * @param relativeEpsilon - The relative epsilon tolerance to use for equality testing.
   * @param absoluteEpsilon - The absolute epsilon tolerance to use for equality testing.
   * @returns true if they are within the provided epsilon, false otherwise.
   */
  equalsEpsilon(
    right?: Cartesian2,
    relativeEpsilon: number = 0,
    absoluteEpsilon: number = relativeEpsilon
  ): boolean {
    return Cartesian2.equalsEpsilon(this, right, relativeEpsilon, absoluteEpsilon);
  }

  /**
   * Creates a string representing this Cartesian in the format '(x, y)'.
   * @returns A string representing the provided Cartesian in the format '(x, y)'.
   */
  toString(): string {
    return `(${this.x}, ${this.y})`;
  }
}

export default Cartesian2;
