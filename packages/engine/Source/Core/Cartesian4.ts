import Check from "./Check.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import CesiumMath from "./Math.js";

/**
 * Color interface for Cartesian4.fromColor
 */
interface ColorLike {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

/**
 * A 4D Cartesian point.
 * @alias Cartesian4
 *
 * @see Cartesian2
 * @see Cartesian3
 * @see Packable
 */
class Cartesian4 {
  /**
   * The X component.
   */
  x: number;

  /**
   * The Y component.
   */
  y: number;

  /**
   * The Z component.
   */
  z: number;

  /**
   * The W component.
   */
  w: number;

  /**
   * Creates a new Cartesian4 instance.
   * @param x - The X component. Default is 0.0.
   * @param y - The Y component. Default is 0.0.
   * @param z - The Z component. Default is 0.0.
   * @param w - The W component. Default is 0.0.
   */
  constructor(x: number = 0.0, y: number = 0.0, z: number = 0.0, w: number = 0.0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  /**
   * The number of elements used to pack the object into an array.
   */
  static packedLength: number = 4;

  /**
   * An immutable Cartesian4 instance initialized to (0.0, 0.0, 0.0, 0.0).
   */
  static ZERO: Cartesian4 = Object.freeze(new Cartesian4(0.0, 0.0, 0.0, 0.0));

  /**
   * An immutable Cartesian4 instance initialized to (1.0, 1.0, 1.0, 1.0).
   */
  static ONE: Cartesian4 = Object.freeze(new Cartesian4(1.0, 1.0, 1.0, 1.0));

  /**
   * An immutable Cartesian4 instance initialized to (1.0, 0.0, 0.0, 0.0).
   */
  static UNIT_X: Cartesian4 = Object.freeze(new Cartesian4(1.0, 0.0, 0.0, 0.0));

  /**
   * An immutable Cartesian4 instance initialized to (0.0, 1.0, 0.0, 0.0).
   */
  static UNIT_Y: Cartesian4 = Object.freeze(new Cartesian4(0.0, 1.0, 0.0, 0.0));

  /**
   * An immutable Cartesian4 instance initialized to (0.0, 0.0, 1.0, 0.0).
   */
  static UNIT_Z: Cartesian4 = Object.freeze(new Cartesian4(0.0, 0.0, 1.0, 0.0));

  /**
   * An immutable Cartesian4 instance initialized to (0.0, 0.0, 0.0, 1.0).
   */
  static UNIT_W: Cartesian4 = Object.freeze(new Cartesian4(0.0, 0.0, 0.0, 1.0));

  /**
   * Creates a Cartesian4 instance from x, y, z and w coordinates.
   * @param x - The x coordinate.
   * @param y - The y coordinate.
   * @param z - The z coordinate.
   * @param w - The w coordinate.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Cartesian4 instance if one was not provided.
   */
  static fromElements(x: number, y: number, z: number, w: number, result?: Cartesian4): Cartesian4 {
    if (!defined(result)) {
      return new Cartesian4(x, y, z, w);
    }

    result!.x = x;
    result!.y = y;
    result!.z = z;
    result!.w = w;
    return result!;
  }

  /**
   * Creates a Cartesian4 instance from a Color. red, green, blue,
   * and alpha map to x, y, z, and w, respectively.
   * @param color - The source color.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Cartesian4 instance if one was not provided.
   */
  static fromColor(color: ColorLike, result?: Cartesian4): Cartesian4 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("color", color);
    //>>includeEnd('debug');
    if (!defined(result)) {
      return new Cartesian4(color.red, color.green, color.blue, color.alpha);
    }

    result!.x = color.red;
    result!.y = color.green;
    result!.z = color.blue;
    result!.w = color.alpha;
    return result!;
  }

  /**
   * Duplicates a Cartesian4 instance.
   * @param cartesian - The Cartesian to duplicate.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Cartesian4 instance if one was not provided. (Returns undefined if cartesian is undefined)
   */
  static clone(cartesian: Cartesian4 | undefined, result?: Cartesian4): Cartesian4 | undefined {
    if (!defined(cartesian)) {
      return undefined;
    }

    if (!defined(result)) {
      return new Cartesian4(cartesian!.x, cartesian!.y, cartesian!.z, cartesian!.w);
    }

    result!.x = cartesian!.x;
    result!.y = cartesian!.y;
    result!.z = cartesian!.z;
    result!.w = cartesian!.w;
    return result;
  }

  /**
   * Stores the provided instance into the provided array.
   * @param value - The value to pack.
   * @param array - The array to pack into.
   * @param startingIndex - The index into the array at which to start packing the elements.
   * @returns The array that was packed into
   */
  static pack(value: Cartesian4, array: number[], startingIndex: number = 0): number[] {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("value", value);
    Check.defined("array", array);
    //>>includeEnd('debug');

    array[startingIndex++] = value.x;
    array[startingIndex++] = value.y;
    array[startingIndex++] = value.z;
    array[startingIndex] = value.w;

    return array;
  }

  /**
   * Retrieves an instance from a packed array.
   * @param array - The packed array.
   * @param startingIndex - The starting index of the element to be unpacked.
   * @param result - The object into which to store the result.
   * @returns The modified result parameter or a new Cartesian4 instance if one was not provided.
   */
  static unpack(array: number[], startingIndex: number = 0, result?: Cartesian4): Cartesian4 {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("array", array);
    //>>includeEnd('debug');

    if (!defined(result)) {
      result = new Cartesian4();
    }
    result!.x = array[startingIndex++];
    result!.y = array[startingIndex++];
    result!.z = array[startingIndex++];
    result!.w = array[startingIndex];
    return result!;
  }

  /**
   * Flattens an array of Cartesian4s into an array of components.
   * @param array - The array of cartesians to pack.
   * @param result - The array onto which to store the result. If this is a typed array, it must have array.length * 4 components, else a DeveloperError will be thrown. If it is a regular array, it will be resized to have (array.length * 4) elements.
   * @returns The packed array.
   */
  static packArray(array: Cartesian4[], result?: number[]): number[] {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("array", array);
    //>>includeEnd('debug');

    const length = array.length;
    const resultLength = length * 4;
    if (!defined(result)) {
      result = new Array(resultLength);
    } else if (!Array.isArray(result) && result!.length !== resultLength) {
      //>>includeStart('debug', pragmas.debug);
      throw new DeveloperError(
        "If result is a typed array, it must have exactly array.length * 4 elements"
      );
      //>>includeEnd('debug');
    } else if (result!.length !== resultLength) {
      result!.length = resultLength;
    }

    for (let i = 0; i < length; ++i) {
      Cartesian4.pack(array[i], result!, i * 4);
    }
    return result!;
  }

  /**
   * Unpacks an array of cartesian components into an array of Cartesian4s.
   * @param array - The array of components to unpack.
   * @param result - The array onto which to store the result.
   * @returns The unpacked array.
   */
  static unpackArray(array: number[], result?: Cartesian4[]): Cartesian4[] {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("array", array);
    Check.typeOf.number.greaterThanOrEquals("array.length", array.length, 4);
    if (array.length % 4 !== 0) {
      throw new DeveloperError("array length must be a multiple of 4.");
    }
    //>>includeEnd('debug');

    const length = array.length;
    if (!defined(result)) {
      result = new Array(length / 4);
    } else {
      result!.length = length / 4;
    }

    for (let i = 0; i < length; i += 4) {
      const index = i / 4;
      result![index] = Cartesian4.unpack(array, i, result![index]);
    }
    return result!;
  }

  /**
   * Creates a Cartesian4 from four consecutive elements in an array.
   * @param array - The array whose four consecutive elements correspond to the x, y, z, and w components, respectively.
   * @param startingIndex - The offset into the array of the first element, which corresponds to the x component.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Cartesian4 instance if one was not provided.
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
  static fromArray = Cartesian4.unpack;

  /**
   * Computes the value of the maximum component for the supplied Cartesian.
   * @param cartesian - The cartesian to use.
   * @returns The value of the maximum component.
   */
  static maximumComponent(cartesian: Cartesian4): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    return Math.max(cartesian.x, cartesian.y, cartesian.z, cartesian.w);
  }

  /**
   * Computes the value of the minimum component for the supplied Cartesian.
   * @param cartesian - The cartesian to use.
   * @returns The value of the minimum component.
   */
  static minimumComponent(cartesian: Cartesian4): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    return Math.min(cartesian.x, cartesian.y, cartesian.z, cartesian.w);
  }

  /**
   * Compares two Cartesians and computes a Cartesian which contains the minimum components of the supplied Cartesians.
   * @param first - A cartesian to compare.
   * @param second - A cartesian to compare.
   * @param result - The object into which to store the result.
   * @returns A cartesian with the minimum components.
   */
  static minimumByComponent(first: Cartesian4, second: Cartesian4, result: Cartesian4): Cartesian4 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("first", first);
    Check.typeOf.object("second", second);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Math.min(first.x, second.x);
    result.y = Math.min(first.y, second.y);
    result.z = Math.min(first.z, second.z);
    result.w = Math.min(first.w, second.w);

    return result;
  }

  /**
   * Compares two Cartesians and computes a Cartesian which contains the maximum components of the supplied Cartesians.
   * @param first - A cartesian to compare.
   * @param second - A cartesian to compare.
   * @param result - The object into which to store the result.
   * @returns A cartesian with the maximum components.
   */
  static maximumByComponent(first: Cartesian4, second: Cartesian4, result: Cartesian4): Cartesian4 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("first", first);
    Check.typeOf.object("second", second);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Math.max(first.x, second.x);
    result.y = Math.max(first.y, second.y);
    result.z = Math.max(first.z, second.z);
    result.w = Math.max(first.w, second.w);

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
  static clamp(value: Cartesian4, min: Cartesian4, max: Cartesian4, result: Cartesian4): Cartesian4 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("value", value);
    Check.typeOf.object("min", min);
    Check.typeOf.object("max", max);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const x = CesiumMath.clamp(value.x, min.x, max.x);
    const y = CesiumMath.clamp(value.y, min.y, max.y);
    const z = CesiumMath.clamp(value.z, min.z, max.z);
    const w = CesiumMath.clamp(value.w, min.w, max.w);

    result.x = x;
    result.y = y;
    result.z = z;
    result.w = w;

    return result;
  }

  /**
   * Computes the provided Cartesian's squared magnitude.
   * @param cartesian - The Cartesian instance whose squared magnitude is to be computed.
   * @returns The squared magnitude.
   */
  static magnitudeSquared(cartesian: Cartesian4): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    return (
      cartesian.x * cartesian.x +
      cartesian.y * cartesian.y +
      cartesian.z * cartesian.z +
      cartesian.w * cartesian.w
    );
  }

  /**
   * Computes the Cartesian's magnitude (length).
   * @param cartesian - The Cartesian instance whose magnitude is to be computed.
   * @returns The magnitude.
   */
  static magnitude(cartesian: Cartesian4): number {
    return Math.sqrt(Cartesian4.magnitudeSquared(cartesian));
  }

  private static distanceScratch = new Cartesian4();

  /**
   * Computes the 4-space distance between two points.
   * @param left - The first point to compute the distance from.
   * @param right - The second point to compute the distance to.
   * @returns The distance between two points.
   *
   * @example
   * // Returns 1.0
   * const d = Cesium.Cartesian4.distance(
   *   new Cesium.Cartesian4(1.0, 0.0, 0.0, 0.0),
   *   new Cesium.Cartesian4(2.0, 0.0, 0.0, 0.0));
   */
  static distance(left: Cartesian4, right: Cartesian4): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    Cartesian4.subtract(left, right, Cartesian4.distanceScratch);
    return Cartesian4.magnitude(Cartesian4.distanceScratch);
  }

  /**
   * Computes the squared distance between two points. Comparing squared distances
   * using this function is more efficient than comparing distances using Cartesian4.distance.
   * @param left - The first point to compute the distance from.
   * @param right - The second point to compute the distance to.
   * @returns The distance between two points.
   *
   * @example
   * // Returns 4.0, not 2.0
   * const d = Cesium.Cartesian4.distance(
   *   new Cesium.Cartesian4(1.0, 0.0, 0.0, 0.0),
   *   new Cesium.Cartesian4(3.0, 0.0, 0.0, 0.0));
   */
  static distanceSquared(left: Cartesian4, right: Cartesian4): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    Cartesian4.subtract(left, right, Cartesian4.distanceScratch);
    return Cartesian4.magnitudeSquared(Cartesian4.distanceScratch);
  }

  /**
   * Computes the normalized form of the supplied Cartesian.
   * @param cartesian - The Cartesian to be normalized.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static normalize(cartesian: Cartesian4, result: Cartesian4): Cartesian4 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    Check.typeOf.object("result", result);
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
  static dot(left: Cartesian4, right: Cartesian4): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    return (
      left.x * right.x + left.y * right.y + left.z * right.z + left.w * right.w
    );
  }

  /**
   * Computes the componentwise product of two Cartesians.
   * @param left - The first Cartesian.
   * @param right - The second Cartesian.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static multiplyComponents(left: Cartesian4, right: Cartesian4, result: Cartesian4): Cartesian4 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x * right.x;
    result.y = left.y * right.y;
    result.z = left.z * right.z;
    result.w = left.w * right.w;
    return result;
  }

  /**
   * Computes the componentwise quotient of two Cartesians.
   * @param left - The first Cartesian.
   * @param right - The second Cartesian.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static divideComponents(left: Cartesian4, right: Cartesian4, result: Cartesian4): Cartesian4 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x / right.x;
    result.y = left.y / right.y;
    result.z = left.z / right.z;
    result.w = left.w / right.w;
    return result;
  }

  /**
   * Computes the componentwise sum of two Cartesians.
   * @param left - The first Cartesian.
   * @param right - The second Cartesian.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static add(left: Cartesian4, right: Cartesian4, result: Cartesian4): Cartesian4 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x + right.x;
    result.y = left.y + right.y;
    result.z = left.z + right.z;
    result.w = left.w + right.w;
    return result;
  }

  /**
   * Computes the componentwise difference of two Cartesians.
   * @param left - The first Cartesian.
   * @param right - The second Cartesian.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static subtract(left: Cartesian4, right: Cartesian4, result: Cartesian4): Cartesian4 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x - right.x;
    result.y = left.y - right.y;
    result.z = left.z - right.z;
    result.w = left.w - right.w;
    return result;
  }

  /**
   * Multiplies the provided Cartesian componentwise by the provided scalar.
   * @param cartesian - The Cartesian to be scaled.
   * @param scalar - The scalar to multiply with.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static multiplyByScalar(cartesian: Cartesian4, scalar: number, result: Cartesian4): Cartesian4 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    Check.typeOf.number("scalar", scalar);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = cartesian.x * scalar;
    result.y = cartesian.y * scalar;
    result.z = cartesian.z * scalar;
    result.w = cartesian.w * scalar;
    return result;
  }

  /**
   * Divides the provided Cartesian componentwise by the provided scalar.
   * @param cartesian - The Cartesian to be divided.
   * @param scalar - The scalar to divide by.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static divideByScalar(cartesian: Cartesian4, scalar: number, result: Cartesian4): Cartesian4 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    Check.typeOf.number("scalar", scalar);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = cartesian.x / scalar;
    result.y = cartesian.y / scalar;
    result.z = cartesian.z / scalar;
    result.w = cartesian.w / scalar;
    return result;
  }

  /**
   * Negates the provided Cartesian.
   * @param cartesian - The Cartesian to be negated.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static negate(cartesian: Cartesian4, result: Cartesian4): Cartesian4 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = -cartesian.x;
    result.y = -cartesian.y;
    result.z = -cartesian.z;
    result.w = -cartesian.w;
    return result;
  }

  /**
   * Computes the absolute value of the provided Cartesian.
   * @param cartesian - The Cartesian whose absolute value is to be computed.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static abs(cartesian: Cartesian4, result: Cartesian4): Cartesian4 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Math.abs(cartesian.x);
    result.y = Math.abs(cartesian.y);
    result.z = Math.abs(cartesian.z);
    result.w = Math.abs(cartesian.w);
    return result;
  }

  private static lerpScratch = new Cartesian4();

  /**
   * Computes the linear interpolation or extrapolation at t using the provided cartesians.
   * @param start - The value corresponding to t at 0.0.
   * @param end - The value corresponding to t at 1.0.
   * @param t - The point along t at which to interpolate.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static lerp(start: Cartesian4, end: Cartesian4, t: number, result: Cartesian4): Cartesian4 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("start", start);
    Check.typeOf.object("end", end);
    Check.typeOf.number("t", t);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    Cartesian4.multiplyByScalar(end, t, Cartesian4.lerpScratch);
    result = Cartesian4.multiplyByScalar(start, 1.0 - t, result);
    return Cartesian4.add(Cartesian4.lerpScratch, result, result);
  }

  private static mostOrthogonalAxisScratch = new Cartesian4();

  /**
   * Returns the axis that is most orthogonal to the provided Cartesian.
   * @param cartesian - The Cartesian on which to find the most orthogonal axis.
   * @param result - The object onto which to store the result.
   * @returns The most orthogonal axis.
   */
  static mostOrthogonalAxis(cartesian: Cartesian4, result: Cartesian4): Cartesian4 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const f = Cartesian4.normalize(cartesian, Cartesian4.mostOrthogonalAxisScratch);
    Cartesian4.abs(f, f);

    if (f.x <= f.y) {
      if (f.x <= f.z) {
        if (f.x <= f.w) {
          result = Cartesian4.clone(Cartesian4.UNIT_X, result)!;
        } else {
          result = Cartesian4.clone(Cartesian4.UNIT_W, result)!;
        }
      } else if (f.z <= f.w) {
        result = Cartesian4.clone(Cartesian4.UNIT_Z, result)!;
      } else {
        result = Cartesian4.clone(Cartesian4.UNIT_W, result)!;
      }
    } else if (f.y <= f.z) {
      if (f.y <= f.w) {
        result = Cartesian4.clone(Cartesian4.UNIT_Y, result)!;
      } else {
        result = Cartesian4.clone(Cartesian4.UNIT_W, result)!;
      }
    } else if (f.z <= f.w) {
      result = Cartesian4.clone(Cartesian4.UNIT_Z, result)!;
    } else {
      result = Cartesian4.clone(Cartesian4.UNIT_W, result)!;
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
  static equals(left?: Cartesian4, right?: Cartesian4): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        left!.x === right!.x &&
        left!.y === right!.y &&
        left!.z === right!.z &&
        left!.w === right!.w)
    );
  }

  /**
   * @private
   */
  static equalsArray(cartesian: Cartesian4, array: number[], offset: number): boolean {
    return (
      cartesian.x === array[offset] &&
      cartesian.y === array[offset + 1] &&
      cartesian.z === array[offset + 2] &&
      cartesian.w === array[offset + 3]
    );
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
    left?: Cartesian4,
    right?: Cartesian4,
    relativeEpsilon: number = 0,
    absoluteEpsilon: number = relativeEpsilon
  ): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        CesiumMath.equalsEpsilon(
          left!.x,
          right!.x,
          relativeEpsilon,
          absoluteEpsilon
        ) &&
        CesiumMath.equalsEpsilon(
          left!.y,
          right!.y,
          relativeEpsilon,
          absoluteEpsilon
        ) &&
        CesiumMath.equalsEpsilon(
          left!.z,
          right!.z,
          relativeEpsilon,
          absoluteEpsilon
        ) &&
        CesiumMath.equalsEpsilon(
          left!.w,
          right!.w,
          relativeEpsilon,
          absoluteEpsilon
        ))
    );
  }

  // scratchU8Array and scratchF32Array are views into the same buffer
  private static scratchF32Array = new Float32Array(1);
  private static scratchU8Array = new Uint8Array(Cartesian4.scratchF32Array.buffer);
  private static testU32 = new Uint32Array([0x11223344]);
  private static testU8 = new Uint8Array(Cartesian4.testU32.buffer);
  private static littleEndian = Cartesian4.testU8[0] === 0x44;

  /**
   * Packs an arbitrary floating point value to 4 values representable using uint8.
   * @param value - A floating point number.
   * @param result - The Cartesian4 that will contain the packed float.
   * @returns A Cartesian4 representing the float packed to values in x, y, z, and w.
   */
  static packFloat(value: number, result?: Cartesian4): Cartesian4 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number("value", value);
    //>>includeEnd('debug');

    if (!defined(result)) {
      result = new Cartesian4();
    }

    // scratchU8Array and scratchF32Array are views into the same buffer
    Cartesian4.scratchF32Array[0] = value;

    if (Cartesian4.littleEndian) {
      result!.x = Cartesian4.scratchU8Array[0];
      result!.y = Cartesian4.scratchU8Array[1];
      result!.z = Cartesian4.scratchU8Array[2];
      result!.w = Cartesian4.scratchU8Array[3];
    } else {
      // convert from big-endian to little-endian
      result!.x = Cartesian4.scratchU8Array[3];
      result!.y = Cartesian4.scratchU8Array[2];
      result!.z = Cartesian4.scratchU8Array[1];
      result!.w = Cartesian4.scratchU8Array[0];
    }
    return result!;
  }

  /**
   * Unpacks a float packed using Cartesian4.packFloat.
   * @param packedFloat - A Cartesian4 containing a float packed to 4 values representable using uint8.
   * @returns The unpacked float.
   * @private
   */
  static unpackFloat(packedFloat: Cartesian4): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("packedFloat", packedFloat);
    //>>includeEnd('debug');

    // scratchU8Array and scratchF32Array are views into the same buffer
    if (Cartesian4.littleEndian) {
      Cartesian4.scratchU8Array[0] = packedFloat.x;
      Cartesian4.scratchU8Array[1] = packedFloat.y;
      Cartesian4.scratchU8Array[2] = packedFloat.z;
      Cartesian4.scratchU8Array[3] = packedFloat.w;
    } else {
      // convert from little-endian to big-endian
      Cartesian4.scratchU8Array[0] = packedFloat.w;
      Cartesian4.scratchU8Array[1] = packedFloat.z;
      Cartesian4.scratchU8Array[2] = packedFloat.y;
      Cartesian4.scratchU8Array[3] = packedFloat.x;
    }
    return Cartesian4.scratchF32Array[0];
  }

  /**
   * Duplicates this Cartesian4 instance.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Cartesian4 instance if one was not provided.
   */
  clone(result?: Cartesian4): Cartesian4 {
    return Cartesian4.clone(this, result)!;
  }

  /**
   * Compares this Cartesian against the provided Cartesian componentwise and returns
   * true if they are equal, false otherwise.
   * @param right - The right hand side Cartesian.
   * @returns true if they are equal, false otherwise.
   */
  equals(right?: Cartesian4): boolean {
    return Cartesian4.equals(this, right);
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
    right?: Cartesian4,
    relativeEpsilon: number = 0,
    absoluteEpsilon: number = relativeEpsilon
  ): boolean {
    return Cartesian4.equalsEpsilon(
      this,
      right,
      relativeEpsilon,
      absoluteEpsilon
    );
  }

  /**
   * Creates a string representing this Cartesian in the format '(x, y, z, w)'.
   * @returns A string representing the provided Cartesian in the format '(x, y, z, w)'.
   */
  toString(): string {
    return `(${this.x}, ${this.y}, ${this.z}, ${this.w})`;
  }
}

export default Cartesian4;
