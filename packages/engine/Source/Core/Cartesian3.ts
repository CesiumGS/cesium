import Check from "./Check.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import CesiumMath from "./Math.js";

/**
 * Spherical coordinate interface used by Cartesian3.fromSpherical
 */
interface Spherical {
  clock: number;
  cone: number;
  magnitude?: number;
}

/**
 * Ellipsoid interface for geographic coordinate conversion
 */
interface EllipsoidLike {
  radiiSquared: Cartesian3;
}

/**
 * A 3D Cartesian point.
 * @alias Cartesian3
 */
class Cartesian3 {
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
   * Creates a new Cartesian3 instance.
   * @param x - The X component. Default is 0.0.
   * @param y - The Y component. Default is 0.0.
   * @param z - The Z component. Default is 0.0.
   */
  constructor(x: number = 0.0, y: number = 0.0, z: number = 0.0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /**
   * The number of elements used to pack the object into an array.
   */
  static packedLength: number = 3;

  /**
   * An immutable Cartesian3 instance initialized to (0.0, 0.0, 0.0).
   */
  static ZERO: Cartesian3 = Object.freeze(new Cartesian3(0.0, 0.0, 0.0));

  /**
   * An immutable Cartesian3 instance initialized to (1.0, 1.0, 1.0).
   */
  static ONE: Cartesian3 = Object.freeze(new Cartesian3(1.0, 1.0, 1.0));

  /**
   * An immutable Cartesian3 instance initialized to (1.0, 0.0, 0.0).
   */
  static UNIT_X: Cartesian3 = Object.freeze(new Cartesian3(1.0, 0.0, 0.0));

  /**
   * An immutable Cartesian3 instance initialized to (0.0, 1.0, 0.0).
   */
  static UNIT_Y: Cartesian3 = Object.freeze(new Cartesian3(0.0, 1.0, 0.0));

  /**
   * An immutable Cartesian3 instance initialized to (0.0, 0.0, 1.0).
   */
  static UNIT_Z: Cartesian3 = Object.freeze(new Cartesian3(0.0, 0.0, 1.0));

  // To prevent a circular dependency, this value is overridden by Ellipsoid when Ellipsoid.default is set
  static _ellipsoidRadiiSquared: Cartesian3 = new Cartesian3(
    6378137.0 * 6378137.0,
    6378137.0 * 6378137.0,
    6356752.3142451793 * 6356752.3142451793
  );

  /**
   * Converts the provided Spherical into Cartesian3 coordinates.
   * @param spherical - The Spherical to be converted to Cartesian3.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Cartesian3 instance if one was not provided.
   */
  static fromSpherical(spherical: Spherical, result?: Cartesian3): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("spherical", spherical);
    //>>includeEnd('debug');

    if (!defined(result)) {
      result = new Cartesian3();
    }

    const clock = spherical.clock;
    const cone = spherical.cone;
    const magnitude = spherical.magnitude ?? 1.0;
    const radial = magnitude * Math.sin(cone);
    result!.x = radial * Math.cos(clock);
    result!.y = radial * Math.sin(clock);
    result!.z = magnitude * Math.cos(cone);
    return result!;
  }

  /**
   * Creates a Cartesian3 instance from x, y and z coordinates.
   * @param x - The x coordinate.
   * @param y - The y coordinate.
   * @param z - The z coordinate.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Cartesian3 instance if one was not provided.
   */
  static fromElements(x: number, y: number, z: number, result?: Cartesian3): Cartesian3 {
    if (!defined(result)) {
      return new Cartesian3(x, y, z);
    }

    result!.x = x;
    result!.y = y;
    result!.z = z;
    return result!;
  }

  /**
   * Duplicates a Cartesian3 instance.
   * @param cartesian - The Cartesian to duplicate.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Cartesian3 instance if one was not provided. (Returns undefined if cartesian is undefined)
   */
  static clone(cartesian: Cartesian3 | undefined, result?: Cartesian3): Cartesian3 | undefined {
    if (!defined(cartesian)) {
      return undefined;
    }
    if (!defined(result)) {
      return new Cartesian3(cartesian!.x, cartesian!.y, cartesian!.z);
    }

    result!.x = cartesian!.x;
    result!.y = cartesian!.y;
    result!.z = cartesian!.z;
    return result;
  }

  /**
   * Creates a Cartesian3 instance from an existing Cartesian4. This simply takes the
   * x, y, and z properties of the Cartesian4 and drops w.
   */
  static fromCartesian4 = Cartesian3.clone;

  /**
   * Stores the provided instance into the provided array.
   * @param value - The value to pack.
   * @param array - The array to pack into.
   * @param startingIndex - The index into the array at which to start packing the elements.
   * @returns The array that was packed into
   */
  static pack(value: Cartesian3, array: number[], startingIndex: number = 0): number[] {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("value", value);
    Check.defined("array", array);
    //>>includeEnd('debug');

    array[startingIndex++] = value.x;
    array[startingIndex++] = value.y;
    array[startingIndex] = value.z;

    return array;
  }

  /**
   * Retrieves an instance from a packed array.
   * @param array - The packed array.
   * @param startingIndex - The starting index of the element to be unpacked.
   * @param result - The object into which to store the result.
   * @returns The modified result parameter or a new Cartesian3 instance if one was not provided.
   */
  static unpack(array: number[], startingIndex: number = 0, result?: Cartesian3): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("array", array);
    //>>includeEnd('debug');

    if (!defined(result)) {
      result = new Cartesian3();
    }
    result!.x = array[startingIndex++];
    result!.y = array[startingIndex++];
    result!.z = array[startingIndex];
    return result!;
  }

  /**
   * Flattens an array of Cartesian3s into an array of components.
   * @param array - The array of cartesians to pack.
   * @param result - The array onto which to store the result.
   * @returns The packed array.
   */
  static packArray(array: Cartesian3[], result?: number[]): number[] {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("array", array);
    //>>includeEnd('debug');

    const length = array.length;
    const resultLength = length * 3;
    if (!defined(result)) {
      result = new Array(resultLength);
    } else if (!Array.isArray(result) && result!.length !== resultLength) {
      //>>includeStart('debug', pragmas.debug);
      throw new DeveloperError(
        "If result is a typed array, it must have exactly array.length * 3 elements"
      );
      //>>includeEnd('debug');
    } else if (result!.length !== resultLength) {
      result!.length = resultLength;
    }

    for (let i = 0; i < length; ++i) {
      Cartesian3.pack(array[i], result!, i * 3);
    }
    return result!;
  }

  /**
   * Unpacks an array of cartesian components into an array of Cartesian3s.
   * @param array - The array of components to unpack.
   * @param result - The array onto which to store the result.
   * @returns The unpacked array.
   */
  static unpackArray(array: number[], result?: Cartesian3[]): Cartesian3[] {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("array", array);
    Check.typeOf.number.greaterThanOrEquals("array.length", array.length, 3);
    if (array.length % 3 !== 0) {
      throw new DeveloperError("array length must be a multiple of 3.");
    }
    //>>includeEnd('debug');

    const length = array.length;
    if (!defined(result)) {
      result = new Array(length / 3);
    } else {
      result!.length = length / 3;
    }

    for (let i = 0; i < length; i += 3) {
      const index = i / 3;
      result![index] = Cartesian3.unpack(array, i, result![index]);
    }
    return result!;
  }

  /**
   * Creates a Cartesian3 from three consecutive elements in an array.
   */
  static fromArray = Cartesian3.unpack;

  /**
   * Computes the value of the maximum component for the supplied Cartesian.
   * @param cartesian - The cartesian to use.
   * @returns The value of the maximum component.
   */
  static maximumComponent(cartesian: Cartesian3): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    return Math.max(cartesian.x, cartesian.y, cartesian.z);
  }

  /**
   * Computes the value of the minimum component for the supplied Cartesian.
   * @param cartesian - The cartesian to use.
   * @returns The value of the minimum component.
   */
  static minimumComponent(cartesian: Cartesian3): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    return Math.min(cartesian.x, cartesian.y, cartesian.z);
  }

  /**
   * Compares two Cartesians and computes a Cartesian which contains the minimum components of the supplied Cartesians.
   * @param first - A cartesian to compare.
   * @param second - A cartesian to compare.
   * @param result - The object into which to store the result.
   * @returns A cartesian with the minimum components.
   */
  static minimumByComponent(first: Cartesian3, second: Cartesian3, result: Cartesian3): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("first", first);
    Check.typeOf.object("second", second);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Math.min(first.x, second.x);
    result.y = Math.min(first.y, second.y);
    result.z = Math.min(first.z, second.z);

    return result;
  }

  /**
   * Compares two Cartesians and computes a Cartesian which contains the maximum components of the supplied Cartesians.
   * @param first - A cartesian to compare.
   * @param second - A cartesian to compare.
   * @param result - The object into which to store the result.
   * @returns A cartesian with the maximum components.
   */
  static maximumByComponent(first: Cartesian3, second: Cartesian3, result: Cartesian3): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("first", first);
    Check.typeOf.object("second", second);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Math.max(first.x, second.x);
    result.y = Math.max(first.y, second.y);
    result.z = Math.max(first.z, second.z);
    return result;
  }

  /**
   * Constrain a value to lie between two values.
   * @param value - The value to clamp.
   * @param min - The minimum bound.
   * @param max - The maximum bound.
   * @param result - The object into which to store the result.
   * @returns The clamped value such that min <= value <= max.
   */
  static clamp(value: Cartesian3, min: Cartesian3, max: Cartesian3, result: Cartesian3): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("value", value);
    Check.typeOf.object("min", min);
    Check.typeOf.object("max", max);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const x = CesiumMath.clamp(value.x, min.x, max.x);
    const y = CesiumMath.clamp(value.y, min.y, max.y);
    const z = CesiumMath.clamp(value.z, min.z, max.z);

    result.x = x;
    result.y = y;
    result.z = z;

    return result;
  }

  /**
   * Computes the provided Cartesian's squared magnitude.
   * @param cartesian - The Cartesian instance whose squared magnitude is to be computed.
   * @returns The squared magnitude.
   */
  static magnitudeSquared(cartesian: Cartesian3): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    return (
      cartesian.x * cartesian.x +
      cartesian.y * cartesian.y +
      cartesian.z * cartesian.z
    );
  }

  /**
   * Computes the Cartesian's magnitude (length).
   * @param cartesian - The Cartesian instance whose magnitude is to be computed.
   * @returns The magnitude.
   */
  static magnitude(cartesian: Cartesian3): number {
    return Math.sqrt(Cartesian3.magnitudeSquared(cartesian));
  }

  private static distanceScratch = new Cartesian3();

  /**
   * Computes the distance between two points.
   * @param left - The first point to compute the distance from.
   * @param right - The second point to compute the distance to.
   * @returns The distance between two points.
   */
  static distance(left: Cartesian3, right: Cartesian3): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    Cartesian3.subtract(left, right, Cartesian3.distanceScratch);
    return Cartesian3.magnitude(Cartesian3.distanceScratch);
  }

  /**
   * Computes the squared distance between two points.
   * @param left - The first point to compute the distance from.
   * @param right - The second point to compute the distance to.
   * @returns The squared distance between two points.
   */
  static distanceSquared(left: Cartesian3, right: Cartesian3): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    Cartesian3.subtract(left, right, Cartesian3.distanceScratch);
    return Cartesian3.magnitudeSquared(Cartesian3.distanceScratch);
  }

  /**
   * Computes the normalized form of the supplied Cartesian.
   * @param cartesian - The Cartesian to be normalized.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static normalize(cartesian: Cartesian3, result: Cartesian3): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const magnitude = Cartesian3.magnitude(cartesian);

    result.x = cartesian.x / magnitude;
    result.y = cartesian.y / magnitude;
    result.z = cartesian.z / magnitude;

    //>>includeStart('debug', pragmas.debug);
    if (isNaN(result.x) || isNaN(result.y) || isNaN(result.z)) {
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
  static dot(left: Cartesian3, right: Cartesian3): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    return left.x * right.x + left.y * right.y + left.z * right.z;
  }

  /**
   * Computes the componentwise product of two Cartesians.
   * @param left - The first Cartesian.
   * @param right - The second Cartesian.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static multiplyComponents(left: Cartesian3, right: Cartesian3, result: Cartesian3): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x * right.x;
    result.y = left.y * right.y;
    result.z = left.z * right.z;
    return result;
  }

  /**
   * Computes the componentwise quotient of two Cartesians.
   * @param left - The first Cartesian.
   * @param right - The second Cartesian.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static divideComponents(left: Cartesian3, right: Cartesian3, result: Cartesian3): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x / right.x;
    result.y = left.y / right.y;
    result.z = left.z / right.z;
    return result;
  }

  /**
   * Computes the componentwise sum of two Cartesians.
   * @param left - The first Cartesian.
   * @param right - The second Cartesian.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static add(left: Cartesian3, right: Cartesian3, result: Cartesian3): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x + right.x;
    result.y = left.y + right.y;
    result.z = left.z + right.z;
    return result;
  }

  /**
   * Computes the componentwise difference of two Cartesians.
   * @param left - The first Cartesian.
   * @param right - The second Cartesian.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static subtract(left: Cartesian3, right: Cartesian3, result: Cartesian3): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = left.x - right.x;
    result.y = left.y - right.y;
    result.z = left.z - right.z;
    return result;
  }

  /**
   * Multiplies the provided Cartesian componentwise by the provided scalar.
   * @param cartesian - The Cartesian to be scaled.
   * @param scalar - The scalar to multiply with.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static multiplyByScalar(cartesian: Cartesian3, scalar: number, result: Cartesian3): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    Check.typeOf.number("scalar", scalar);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = cartesian.x * scalar;
    result.y = cartesian.y * scalar;
    result.z = cartesian.z * scalar;
    return result;
  }

  /**
   * Divides the provided Cartesian componentwise by the provided scalar.
   * @param cartesian - The Cartesian to be divided.
   * @param scalar - The scalar to divide by.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static divideByScalar(cartesian: Cartesian3, scalar: number, result: Cartesian3): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    Check.typeOf.number("scalar", scalar);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = cartesian.x / scalar;
    result.y = cartesian.y / scalar;
    result.z = cartesian.z / scalar;
    return result;
  }

  /**
   * Negates the provided Cartesian.
   * @param cartesian - The Cartesian to be negated.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static negate(cartesian: Cartesian3, result: Cartesian3): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = -cartesian.x;
    result.y = -cartesian.y;
    result.z = -cartesian.z;
    return result;
  }

  /**
   * Computes the absolute value of the provided Cartesian.
   * @param cartesian - The Cartesian whose absolute value is to be computed.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static abs(cartesian: Cartesian3, result: Cartesian3): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = Math.abs(cartesian.x);
    result.y = Math.abs(cartesian.y);
    result.z = Math.abs(cartesian.z);
    return result;
  }

  private static lerpScratch = new Cartesian3();

  /**
   * Computes the linear interpolation or extrapolation at t using the provided cartesians.
   * @param start - The value corresponding to t at 0.0.
   * @param end - The value corresponding to t at 1.0.
   * @param t - The point along t at which to interpolate.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter.
   */
  static lerp(start: Cartesian3, end: Cartesian3, t: number, result: Cartesian3): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("start", start);
    Check.typeOf.object("end", end);
    Check.typeOf.number("t", t);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    Cartesian3.multiplyByScalar(end, t, Cartesian3.lerpScratch);
    result = Cartesian3.multiplyByScalar(start, 1.0 - t, result);
    return Cartesian3.add(Cartesian3.lerpScratch, result, result);
  }

  private static angleBetweenScratch = new Cartesian3();
  private static angleBetweenScratch2 = new Cartesian3();

  /**
   * Returns the angle, in radians, between the provided Cartesians.
   * @param left - The first Cartesian.
   * @param right - The second Cartesian.
   * @returns The angle between the Cartesians.
   */
  static angleBetween(left: Cartesian3, right: Cartesian3): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    Cartesian3.normalize(left, Cartesian3.angleBetweenScratch);
    Cartesian3.normalize(right, Cartesian3.angleBetweenScratch2);
    const cosine = Cartesian3.dot(Cartesian3.angleBetweenScratch, Cartesian3.angleBetweenScratch2);
    const sine = Cartesian3.magnitude(
      Cartesian3.cross(
        Cartesian3.angleBetweenScratch,
        Cartesian3.angleBetweenScratch2,
        Cartesian3.angleBetweenScratch
      )
    );
    return Math.atan2(sine, cosine);
  }

  private static mostOrthogonalAxisScratch = new Cartesian3();

  /**
   * Returns the axis that is most orthogonal to the provided Cartesian.
   * @param cartesian - The Cartesian on which to find the most orthogonal axis.
   * @param result - The object onto which to store the result.
   * @returns The most orthogonal axis.
   */
  static mostOrthogonalAxis(cartesian: Cartesian3, result: Cartesian3): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    const f = Cartesian3.normalize(cartesian, Cartesian3.mostOrthogonalAxisScratch);
    Cartesian3.abs(f, f);

    if (f.x <= f.y) {
      if (f.x <= f.z) {
        result = Cartesian3.clone(Cartesian3.UNIT_X, result)!;
      } else {
        result = Cartesian3.clone(Cartesian3.UNIT_Z, result)!;
      }
    } else if (f.y <= f.z) {
      result = Cartesian3.clone(Cartesian3.UNIT_Y, result)!;
    } else {
      result = Cartesian3.clone(Cartesian3.UNIT_Z, result)!;
    }

    return result;
  }

  /**
   * Projects vector a onto vector b
   * @param a - The vector that needs projecting
   * @param b - The vector to project onto
   * @param result - The result cartesian
   * @returns The modified result parameter
   */
  static projectVector(a: Cartesian3, b: Cartesian3, result: Cartesian3): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("a", a);
    Check.defined("b", b);
    Check.defined("result", result);
    //>>includeEnd('debug');

    const scalar = Cartesian3.dot(a, b) / Cartesian3.dot(b, b);
    return Cartesian3.multiplyByScalar(b, scalar, result);
  }

  /**
   * Compares the provided Cartesians componentwise and returns
   * true if they are equal, false otherwise.
   * @param left - The first Cartesian.
   * @param right - The second Cartesian.
   * @returns true if left and right are equal, false otherwise.
   */
  static equals(left?: Cartesian3, right?: Cartesian3): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        left!.x === right!.x &&
        left!.y === right!.y &&
        left!.z === right!.z)
    );
  }

  /**
   * @private
   */
  static equalsArray(cartesian: Cartesian3, array: number[], offset: number): boolean {
    return (
      cartesian.x === array[offset] &&
      cartesian.y === array[offset + 1] &&
      cartesian.z === array[offset + 2]
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
    left?: Cartesian3,
    right?: Cartesian3,
    relativeEpsilon: number = 0,
    absoluteEpsilon: number = relativeEpsilon
  ): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        CesiumMath.equalsEpsilon(left!.x, right!.x, relativeEpsilon, absoluteEpsilon) &&
        CesiumMath.equalsEpsilon(left!.y, right!.y, relativeEpsilon, absoluteEpsilon) &&
        CesiumMath.equalsEpsilon(left!.z, right!.z, relativeEpsilon, absoluteEpsilon))
    );
  }

  /**
   * Computes the cross (outer) product of two Cartesians.
   * @param left - The first Cartesian.
   * @param right - The second Cartesian.
   * @param result - The object onto which to store the result.
   * @returns The cross product.
   */
  static cross(left: Cartesian3, right: Cartesian3, result: Cartesian3): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    Check.typeOf.object("result", result);
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
  }

  /**
   * Computes the midpoint between the right and left Cartesian.
   * @param left - The first Cartesian.
   * @param right - The second Cartesian.
   * @param result - The object onto which to store the result.
   * @returns The midpoint.
   */
  static midpoint(left: Cartesian3, right: Cartesian3, result: Cartesian3): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    Check.typeOf.object("result", result);
    //>>includeEnd('debug');

    result.x = (left.x + right.x) * 0.5;
    result.y = (left.y + right.y) * 0.5;
    result.z = (left.z + right.z) * 0.5;

    return result;
  }

  /**
   * Returns a Cartesian3 position from longitude and latitude values given in degrees.
   * @param longitude - The longitude, in degrees
   * @param latitude - The latitude, in degrees
   * @param height - The height, in meters, above the ellipsoid.
   * @param ellipsoid - The ellipsoid on which the position lies.
   * @param result - The object onto which to store the result.
   * @returns The position
   */
  static fromDegrees(
    longitude: number,
    latitude: number,
    height: number = 0.0,
    ellipsoid?: EllipsoidLike,
    result?: Cartesian3
  ): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number("longitude", longitude);
    Check.typeOf.number("latitude", latitude);
    //>>includeEnd('debug');

    longitude = CesiumMath.toRadians(longitude);
    latitude = CesiumMath.toRadians(latitude);
    return Cartesian3.fromRadians(longitude, latitude, height, ellipsoid, result);
  }

  private static scratchN = new Cartesian3();
  private static scratchK = new Cartesian3();

  /**
   * Returns a Cartesian3 position from longitude and latitude values given in radians.
   * @param longitude - The longitude, in radians
   * @param latitude - The latitude, in radians
   * @param height - The height, in meters, above the ellipsoid.
   * @param ellipsoid - The ellipsoid on which the position lies.
   * @param result - The object onto which to store the result.
   * @returns The position
   */
  static fromRadians(
    longitude: number,
    latitude: number,
    height: number = 0.0,
    ellipsoid?: EllipsoidLike,
    result?: Cartesian3
  ): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number("longitude", longitude);
    Check.typeOf.number("latitude", latitude);
    //>>includeEnd('debug');

    const radiiSquared = !defined(ellipsoid)
      ? Cartesian3._ellipsoidRadiiSquared
      : ellipsoid!.radiiSquared;

    const cosLatitude = Math.cos(latitude);
    Cartesian3.scratchN.x = cosLatitude * Math.cos(longitude);
    Cartesian3.scratchN.y = cosLatitude * Math.sin(longitude);
    Cartesian3.scratchN.z = Math.sin(latitude);
    Cartesian3.normalize(Cartesian3.scratchN, Cartesian3.scratchN);

    Cartesian3.multiplyComponents(radiiSquared, Cartesian3.scratchN, Cartesian3.scratchK);
    const gamma = Math.sqrt(Cartesian3.dot(Cartesian3.scratchN, Cartesian3.scratchK));
    Cartesian3.divideByScalar(Cartesian3.scratchK, gamma, Cartesian3.scratchK);
    Cartesian3.multiplyByScalar(Cartesian3.scratchN, height, Cartesian3.scratchN);

    if (!defined(result)) {
      result = new Cartesian3();
    }
    return Cartesian3.add(Cartesian3.scratchK, Cartesian3.scratchN, result!);
  }

  /**
   * Returns an array of Cartesian3 positions given an array of longitude and latitude values given in degrees.
   * @param coordinates - A list of longitude and latitude values. Values alternate [longitude, latitude, longitude, latitude...].
   * @param ellipsoid - The ellipsoid on which the coordinates lie.
   * @param result - An array of Cartesian3 objects to store the result.
   * @returns The array of positions.
   */
  static fromDegreesArray(
    coordinates: number[],
    ellipsoid?: EllipsoidLike,
    result?: Cartesian3[]
  ): Cartesian3[] {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("coordinates", coordinates);
    if (coordinates.length < 2 || coordinates.length % 2 !== 0) {
      throw new DeveloperError(
        "the number of coordinates must be a multiple of 2 and at least 2"
      );
    }
    //>>includeEnd('debug');

    const length = coordinates.length;
    if (!defined(result)) {
      result = new Array(length / 2);
    } else {
      result!.length = length / 2;
    }

    for (let i = 0; i < length; i += 2) {
      const longitude = coordinates[i];
      const latitude = coordinates[i + 1];
      const index = i / 2;
      result![index] = Cartesian3.fromDegrees(
        longitude,
        latitude,
        0,
        ellipsoid,
        result![index]
      );
    }

    return result!;
  }

  /**
   * Returns an array of Cartesian3 positions given an array of longitude and latitude values given in radians.
   * @param coordinates - A list of longitude and latitude values. Values alternate [longitude, latitude, longitude, latitude...].
   * @param ellipsoid - The ellipsoid on which the coordinates lie.
   * @param result - An array of Cartesian3 objects to store the result.
   * @returns The array of positions.
   */
  static fromRadiansArray(
    coordinates: number[],
    ellipsoid?: EllipsoidLike,
    result?: Cartesian3[]
  ): Cartesian3[] {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("coordinates", coordinates);
    if (coordinates.length < 2 || coordinates.length % 2 !== 0) {
      throw new DeveloperError(
        "the number of coordinates must be a multiple of 2 and at least 2"
      );
    }
    //>>includeEnd('debug');

    const length = coordinates.length;
    if (!defined(result)) {
      result = new Array(length / 2);
    } else {
      result!.length = length / 2;
    }

    for (let i = 0; i < length; i += 2) {
      const longitude = coordinates[i];
      const latitude = coordinates[i + 1];
      const index = i / 2;
      result![index] = Cartesian3.fromRadians(
        longitude,
        latitude,
        0,
        ellipsoid,
        result![index]
      );
    }

    return result!;
  }

  /**
   * Returns an array of Cartesian3 positions given an array of longitude, latitude and height values where longitude and latitude are given in degrees.
   * @param coordinates - A list of longitude, latitude and height values. Values alternate [longitude, latitude, height, longitude, latitude, height...].
   * @param ellipsoid - The ellipsoid on which the position lies.
   * @param result - An array of Cartesian3 objects to store the result.
   * @returns The array of positions.
   */
  static fromDegreesArrayHeights(
    coordinates: number[],
    ellipsoid?: EllipsoidLike,
    result?: Cartesian3[]
  ): Cartesian3[] {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("coordinates", coordinates);
    if (coordinates.length < 3 || coordinates.length % 3 !== 0) {
      throw new DeveloperError(
        "the number of coordinates must be a multiple of 3 and at least 3"
      );
    }
    //>>includeEnd('debug');

    const length = coordinates.length;
    if (!defined(result)) {
      result = new Array(length / 3);
    } else {
      result!.length = length / 3;
    }

    for (let i = 0; i < length; i += 3) {
      const longitude = coordinates[i];
      const latitude = coordinates[i + 1];
      const height = coordinates[i + 2];
      const index = i / 3;
      result![index] = Cartesian3.fromDegrees(
        longitude,
        latitude,
        height,
        ellipsoid,
        result![index]
      );
    }

    return result!;
  }

  /**
   * Returns an array of Cartesian3 positions given an array of longitude, latitude and height values where longitude and latitude are given in radians.
   * @param coordinates - A list of longitude, latitude and height values. Values alternate [longitude, latitude, height, longitude, latitude, height...].
   * @param ellipsoid - The ellipsoid on which the position lies.
   * @param result - An array of Cartesian3 objects to store the result.
   * @returns The array of positions.
   */
  static fromRadiansArrayHeights(
    coordinates: number[],
    ellipsoid?: EllipsoidLike,
    result?: Cartesian3[]
  ): Cartesian3[] {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("coordinates", coordinates);
    if (coordinates.length < 3 || coordinates.length % 3 !== 0) {
      throw new DeveloperError(
        "the number of coordinates must be a multiple of 3 and at least 3"
      );
    }
    //>>includeEnd('debug');

    const length = coordinates.length;
    if (!defined(result)) {
      result = new Array(length / 3);
    } else {
      result!.length = length / 3;
    }

    for (let i = 0; i < length; i += 3) {
      const longitude = coordinates[i];
      const latitude = coordinates[i + 1];
      const height = coordinates[i + 2];
      const index = i / 3;
      result![index] = Cartesian3.fromRadians(
        longitude,
        latitude,
        height,
        ellipsoid,
        result![index]
      );
    }

    return result!;
  }

  /**
   * Duplicates this Cartesian3 instance.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Cartesian3 instance if one was not provided.
   */
  clone(result?: Cartesian3): Cartesian3 {
    return Cartesian3.clone(this, result)!;
  }

  /**
   * Compares this Cartesian against the provided Cartesian componentwise and returns
   * true if they are equal, false otherwise.
   * @param right - The right hand side Cartesian.
   * @returns true if they are equal, false otherwise.
   */
  equals(right?: Cartesian3): boolean {
    return Cartesian3.equals(this, right);
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
    right?: Cartesian3,
    relativeEpsilon: number = 0,
    absoluteEpsilon: number = relativeEpsilon
  ): boolean {
    return Cartesian3.equalsEpsilon(this, right, relativeEpsilon, absoluteEpsilon);
  }

  /**
   * Creates a string representing this Cartesian in the format '(x, y, z)'.
   * @returns A string representing this Cartesian in the format '(x, y, z)'.
   */
  toString(): string {
    return `(${this.x}, ${this.y}, ${this.z})`;
  }
}

export default Cartesian3;
