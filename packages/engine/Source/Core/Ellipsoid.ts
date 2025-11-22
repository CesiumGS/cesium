import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import Check from "./Check.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import CesiumMath from "./Math.js";
import scaleToGeodeticSurface from "./scaleToGeodeticSurface.js";

const cartographicToCartesianNormal = new Cartesian3();
const cartographicToCartesianK = new Cartesian3();
const cartesianToCartographicN = new Cartesian3();
const cartesianToCartographicP = new Cartesian3();
const cartesianToCartographicH = new Cartesian3();
const scratchEndpoint = new Cartesian3();

const abscissas = [
  0.14887433898163, 0.43339539412925, 0.67940956829902, 0.86506336668898,
  0.97390652851717, 0.0,
];
const weights = [
  0.29552422471475, 0.26926671930999, 0.21908636251598, 0.14945134915058,
  0.066671344308684, 0.0,
];

/**
 * Compute the 10th order Gauss-Legendre Quadrature of the given definite integral.
 * @private
 */
function gaussLegendreQuadrature(a: number, b: number, func: (x: number) => number): number {
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.number("a", a);
  Check.typeOf.number("b", b);
  Check.typeOf.func("func", func);
  //>>includeEnd('debug');

  const xMean = 0.5 * (b + a);
  const xRange = 0.5 * (b - a);

  let sum = 0.0;
  for (let i = 0; i < 5; i++) {
    const dx = xRange * abscissas[i];
    sum += weights[i] * (func(xMean + dx) + func(xMean - dx));
  }

  sum *= xRange;
  return sum;
}

/**
 * A quadratic surface defined in Cartesian coordinates by the equation
 * <code>(x / a)^2 + (y / b)^2 + (z / c)^2 = 1</code>.  Primarily used
 * by Cesium to represent the shape of planetary bodies.
 *
 * Rather than constructing this object directly, one of the provided
 * constants is normally used.
 * @alias Ellipsoid
 */
class Ellipsoid {
  private _radii: Cartesian3;
  private _radiiSquared: Cartesian3;
  private _radiiToTheFourth: Cartesian3;
  private _oneOverRadii: Cartesian3;
  private _oneOverRadiiSquared: Cartesian3;
  private _minimumRadius: number;
  private _maximumRadius: number;
  private _centerToleranceSquared: number;
  private _squaredXOverSquaredZ: number;

  /**
   * The number of elements used to pack the object into an array.
   */
  static packedLength: number = Cartesian3.packedLength;

  private static _default: Ellipsoid;

  /**
   * Creates a new Ellipsoid instance.
   * @param x - The radius in the x direction. Default is 0.
   * @param y - The radius in the y direction. Default is 0.
   * @param z - The radius in the z direction. Default is 0.
   * @exception {DeveloperError} All radii components must be greater than or equal to zero.
   */
  constructor(x: number = 0.0, y: number = 0.0, z: number = 0.0) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number.greaterThanOrEquals("x", x, 0.0);
    Check.typeOf.number.greaterThanOrEquals("y", y, 0.0);
    Check.typeOf.number.greaterThanOrEquals("z", z, 0.0);
    //>>includeEnd('debug');

    this._radii = new Cartesian3(x, y, z);
    this._radiiSquared = new Cartesian3(x * x, y * y, z * z);
    this._radiiToTheFourth = new Cartesian3(
      x * x * x * x,
      y * y * y * y,
      z * z * z * z
    );
    this._oneOverRadii = new Cartesian3(
      x === 0.0 ? 0.0 : 1.0 / x,
      y === 0.0 ? 0.0 : 1.0 / y,
      z === 0.0 ? 0.0 : 1.0 / z
    );
    this._oneOverRadiiSquared = new Cartesian3(
      x === 0.0 ? 0.0 : 1.0 / (x * x),
      y === 0.0 ? 0.0 : 1.0 / (y * y),
      z === 0.0 ? 0.0 : 1.0 / (z * z)
    );
    this._minimumRadius = Math.min(x, y, z);
    this._maximumRadius = Math.max(x, y, z);
    this._centerToleranceSquared = CesiumMath.EPSILON1;
    this._squaredXOverSquaredZ = 0;

    if (this._radiiSquared.z !== 0) {
      this._squaredXOverSquaredZ =
        this._radiiSquared.x / this._radiiSquared.z;
    }
  }

  /**
   * Gets the radii of the ellipsoid.
   */
  get radii(): Cartesian3 {
    return this._radii;
  }

  /**
   * Gets the squared radii of the ellipsoid.
   */
  get radiiSquared(): Cartesian3 {
    return this._radiiSquared;
  }

  /**
   * Gets the radii of the ellipsoid raise to the fourth power.
   */
  get radiiToTheFourth(): Cartesian3 {
    return this._radiiToTheFourth;
  }

  /**
   * Gets one over the radii of the ellipsoid.
   */
  get oneOverRadii(): Cartesian3 {
    return this._oneOverRadii;
  }

  /**
   * Gets one over the squared radii of the ellipsoid.
   */
  get oneOverRadiiSquared(): Cartesian3 {
    return this._oneOverRadiiSquared;
  }

  /**
   * Gets the minimum radius of the ellipsoid.
   */
  get minimumRadius(): number {
    return this._minimumRadius;
  }

  /**
   * Gets the maximum radius of the ellipsoid.
   */
  get maximumRadius(): number {
    return this._maximumRadius;
  }

  /**
   * An Ellipsoid instance initialized to the WGS84 standard.
   */
  static WGS84: Ellipsoid = Object.freeze(
    new Ellipsoid(6378137.0, 6378137.0, 6356752.3142451793)
  ) as Ellipsoid;

  /**
   * An Ellipsoid instance initialized to radii of (1.0, 1.0, 1.0).
   */
  static UNIT_SPHERE: Ellipsoid = Object.freeze(new Ellipsoid(1.0, 1.0, 1.0)) as Ellipsoid;

  /**
   * An Ellipsoid instance initialized to a sphere with the lunar radius.
   */
  static MOON: Ellipsoid = Object.freeze(
    new Ellipsoid(
      CesiumMath.LUNAR_RADIUS,
      CesiumMath.LUNAR_RADIUS,
      CesiumMath.LUNAR_RADIUS
    )
  ) as Ellipsoid;

  /**
   * An Ellipsoid instance initialized to a sphere with the mean radii of Mars.
   * Source: https://epsg.io/104905
   */
  static MARS: Ellipsoid = Object.freeze(
    new Ellipsoid(3396190.0, 3396190.0, 3376200.0)
  ) as Ellipsoid;

  /**
   * The default ellipsoid used when not otherwise specified.
   */
  static get default(): Ellipsoid {
    return Ellipsoid._default;
  }

  static set default(value: Ellipsoid) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("value", value);
    //>>includeEnd('debug');

    Ellipsoid._default = value;
    Cartesian3._ellipsoidRadiiSquared = value.radiiSquared;
    Cartographic._ellipsoidOneOverRadii = value.oneOverRadii;
    Cartographic._ellipsoidOneOverRadiiSquared = value.oneOverRadiiSquared;
    Cartographic._ellipsoidCenterToleranceSquared = value._centerToleranceSquared;
  }

  /**
   * Duplicates an Ellipsoid instance.
   * @param ellipsoid - The ellipsoid to duplicate.
   * @param result - The object onto which to store the result.
   * @returns The cloned Ellipsoid. (Returns undefined if ellipsoid is undefined)
   */
  static clone(ellipsoid: Ellipsoid | undefined, result?: Ellipsoid): Ellipsoid | undefined {
    if (!defined(ellipsoid)) {
      return undefined;
    }
    const radii = ellipsoid!._radii;

    if (!defined(result)) {
      return new Ellipsoid(radii.x, radii.y, radii.z);
    }

    Cartesian3.clone(radii, result!._radii);
    Cartesian3.clone(ellipsoid!._radiiSquared, result!._radiiSquared);
    Cartesian3.clone(ellipsoid!._radiiToTheFourth, result!._radiiToTheFourth);
    Cartesian3.clone(ellipsoid!._oneOverRadii, result!._oneOverRadii);
    Cartesian3.clone(ellipsoid!._oneOverRadiiSquared, result!._oneOverRadiiSquared);
    result!._minimumRadius = ellipsoid!._minimumRadius;
    result!._maximumRadius = ellipsoid!._maximumRadius;
    result!._centerToleranceSquared = ellipsoid!._centerToleranceSquared;

    return result;
  }

  /**
   * Computes an Ellipsoid from a Cartesian specifying the radii in x, y, and z directions.
   * @param cartesian - The ellipsoid's radius in the x, y, and z directions.
   * @param result - The object onto which to store the result.
   * @returns A new Ellipsoid instance.
   */
  static fromCartesian3(cartesian?: Cartesian3, result?: Ellipsoid): Ellipsoid {
    if (!defined(result)) {
      result = new Ellipsoid();
    }

    if (!defined(cartesian)) {
      return result!;
    }

    // Re-initialize using private method
    const x = cartesian!.x;
    const y = cartesian!.y;
    const z = cartesian!.z;

    result!._radii = new Cartesian3(x, y, z);
    result!._radiiSquared = new Cartesian3(x * x, y * y, z * z);
    result!._radiiToTheFourth = new Cartesian3(
      x * x * x * x,
      y * y * y * y,
      z * z * z * z
    );
    result!._oneOverRadii = new Cartesian3(
      x === 0.0 ? 0.0 : 1.0 / x,
      y === 0.0 ? 0.0 : 1.0 / y,
      z === 0.0 ? 0.0 : 1.0 / z
    );
    result!._oneOverRadiiSquared = new Cartesian3(
      x === 0.0 ? 0.0 : 1.0 / (x * x),
      y === 0.0 ? 0.0 : 1.0 / (y * y),
      z === 0.0 ? 0.0 : 1.0 / (z * z)
    );
    result!._minimumRadius = Math.min(x, y, z);
    result!._maximumRadius = Math.max(x, y, z);
    result!._centerToleranceSquared = CesiumMath.EPSILON1;
    if (result!._radiiSquared.z !== 0) {
      result!._squaredXOverSquaredZ =
        result!._radiiSquared.x / result!._radiiSquared.z;
    }

    return result!;
  }

  /**
   * Stores the provided instance into the provided array.
   * @param value - The value to pack.
   * @param array - The array to pack into.
   * @param startingIndex - The index into the array at which to start packing.
   * @returns The array that was packed into.
   */
  static pack(value: Ellipsoid, array: number[], startingIndex: number = 0): number[] {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("value", value);
    Check.defined("array", array);
    //>>includeEnd('debug');

    Cartesian3.pack(value._radii, array, startingIndex);
    return array;
  }

  /**
   * Retrieves an instance from a packed array.
   * @param array - The packed array.
   * @param startingIndex - The starting index of the element to be unpacked.
   * @param result - The object into which to store the result.
   * @returns The modified result parameter or a new Ellipsoid instance.
   */
  static unpack(array: number[], startingIndex: number = 0, result?: Ellipsoid): Ellipsoid {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("array", array);
    //>>includeEnd('debug');

    const radii = Cartesian3.unpack(array, startingIndex);
    return Ellipsoid.fromCartesian3(radii, result);
  }

  /**
   * Duplicates this Ellipsoid instance.
   * @param result - The object onto which to store the result.
   * @returns The cloned Ellipsoid.
   */
  clone(result?: Ellipsoid): Ellipsoid | undefined {
    return Ellipsoid.clone(this, result);
  }

  /**
   * Computes the unit vector directed from the center of this ellipsoid toward the provided Cartesian position.
   * @param cartesian - The Cartesian for which to determine the geocentric normal.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Cartesian3 instance.
   */
  geocentricSurfaceNormal(cartesian: Cartesian3, result?: Cartesian3): Cartesian3 {
    return Cartesian3.normalize(cartesian, result);
  }

  /**
   * Computes the normal of the plane tangent to the surface of the ellipsoid at the provided position.
   * @param cartographic - The cartographic position for which to determine the geodetic normal.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Cartesian3 instance.
   */
  geodeticSurfaceNormalCartographic(cartographic: Cartographic, result?: Cartesian3): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartographic", cartographic);
    //>>includeEnd('debug');

    const longitude = cartographic.longitude;
    const latitude = cartographic.latitude;
    const cosLatitude = Math.cos(latitude);

    const x = cosLatitude * Math.cos(longitude);
    const y = cosLatitude * Math.sin(longitude);
    const z = Math.sin(latitude);

    if (!defined(result)) {
      result = new Cartesian3();
    }
    result!.x = x;
    result!.y = y;
    result!.z = z;
    return Cartesian3.normalize(result!, result);
  }

  /**
   * Computes the normal of the plane tangent to the surface of the ellipsoid at the provided position.
   * @param cartesian - The Cartesian position for which to determine the surface normal.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Cartesian3 instance, or undefined if a normal cannot be found.
   */
  geodeticSurfaceNormal(cartesian: Cartesian3, result?: Cartesian3): Cartesian3 | undefined {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    if (isNaN(cartesian.x) || isNaN(cartesian.y) || isNaN(cartesian.z)) {
      throw new DeveloperError("cartesian has a NaN component");
    }
    //>>includeEnd('debug');
    if (
      Cartesian3.equalsEpsilon(cartesian, Cartesian3.ZERO, CesiumMath.EPSILON14)
    ) {
      return undefined;
    }
    if (!defined(result)) {
      result = new Cartesian3();
    }
    result = Cartesian3.multiplyComponents(
      cartesian,
      this._oneOverRadiiSquared,
      result
    );
    return Cartesian3.normalize(result!, result);
  }

  /**
   * Converts the provided cartographic to Cartesian representation.
   * @param cartographic - The cartographic position.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Cartesian3 instance.
   */
  cartographicToCartesian(cartographic: Cartographic, result?: Cartesian3): Cartesian3 {
    const n = cartographicToCartesianNormal;
    const k = cartographicToCartesianK;
    this.geodeticSurfaceNormalCartographic(cartographic, n);
    Cartesian3.multiplyComponents(this._radiiSquared, n, k);
    const gamma = Math.sqrt(Cartesian3.dot(n, k));
    Cartesian3.divideByScalar(k, gamma, k);
    Cartesian3.multiplyByScalar(n, cartographic.height, n);

    if (!defined(result)) {
      result = new Cartesian3();
    }
    return Cartesian3.add(k, n, result!);
  }

  /**
   * Converts the provided array of cartographics to an array of Cartesians.
   * @param cartographics - An array of cartographic positions.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Array instance.
   */
  cartographicArrayToCartesianArray(
    cartographics: Cartographic[],
    result?: Cartesian3[]
  ): Cartesian3[] {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("cartographics", cartographics);
    //>>includeEnd('debug');

    const length = cartographics.length;
    if (!defined(result)) {
      result = new Array(length);
    } else {
      result!.length = length;
    }
    for (let i = 0; i < length; i++) {
      result![i] = this.cartographicToCartesian(cartographics[i], result![i]);
    }
    return result!;
  }

  /**
   * Converts the provided cartesian to cartographic representation.
   * The cartesian is undefined at the center of the ellipsoid.
   * @param cartesian - The Cartesian position to convert.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter, new Cartographic instance, or undefined.
   */
  cartesianToCartographic(cartesian: Cartesian3, result?: Cartographic): Cartographic | undefined {
    const p = this.scaleToGeodeticSurface(cartesian, cartesianToCartographicP);

    if (!defined(p)) {
      return undefined;
    }

    const n = this.geodeticSurfaceNormal(p!, cartesianToCartographicN);
    const h = Cartesian3.subtract(cartesian, p!, cartesianToCartographicH);

    const longitude = Math.atan2(n!.y, n!.x);
    const latitude = Math.asin(n!.z);
    const height =
      CesiumMath.sign(Cartesian3.dot(h, cartesian)) * Cartesian3.magnitude(h);

    if (!defined(result)) {
      return new Cartographic(longitude, latitude, height);
    }
    result!.longitude = longitude;
    result!.latitude = latitude;
    result!.height = height;
    return result;
  }

  /**
   * Converts the provided array of cartesians to an array of cartographics.
   * @param cartesians - An array of Cartesian positions.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Array instance.
   */
  cartesianArrayToCartographicArray(
    cartesians: Cartesian3[],
    result?: Cartographic[]
  ): Cartographic[] {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("cartesians", cartesians);
    //>>includeEnd('debug');

    const length = cartesians.length;
    if (!defined(result)) {
      result = new Array(length);
    } else {
      result!.length = length;
    }
    for (let i = 0; i < length; ++i) {
      result![i] = this.cartesianToCartographic(cartesians[i], result![i])!;
    }
    return result!;
  }

  /**
   * Scales the provided Cartesian position along the geodetic surface normal
   * so that it is on the surface of this ellipsoid.
   * @param cartesian - The Cartesian position to scale.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter, a new Cartesian3 instance, or undefined.
   */
  scaleToGeodeticSurface(cartesian: Cartesian3, result?: Cartesian3): Cartesian3 | undefined {
    return scaleToGeodeticSurface(
      cartesian,
      this._oneOverRadii,
      this._oneOverRadiiSquared,
      this._centerToleranceSquared,
      result
    );
  }

  /**
   * Scales the provided Cartesian position along the geocentric surface normal
   * so that it is on the surface of this ellipsoid.
   * @param cartesian - The Cartesian position to scale.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new Cartesian3 instance.
   */
  scaleToGeocentricSurface(cartesian: Cartesian3, result?: Cartesian3): Cartesian3 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    if (!defined(result)) {
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

    return Cartesian3.multiplyByScalar(cartesian, beta, result!);
  }

  /**
   * Transforms a Cartesian X, Y, Z position to the ellipsoid-scaled space.
   * @param position - The position to transform.
   * @param result - The position to which to copy the result.
   * @returns The position expressed in the scaled space.
   */
  transformPositionToScaledSpace(position: Cartesian3, result?: Cartesian3): Cartesian3 {
    if (!defined(result)) {
      result = new Cartesian3();
    }

    return Cartesian3.multiplyComponents(position, this._oneOverRadii, result!);
  }

  /**
   * Transforms a Cartesian X, Y, Z position from the ellipsoid-scaled space.
   * @param position - The position to transform.
   * @param result - The position to which to copy the result.
   * @returns The position expressed in the unscaled space.
   */
  transformPositionFromScaledSpace(position: Cartesian3, result?: Cartesian3): Cartesian3 {
    if (!defined(result)) {
      result = new Cartesian3();
    }

    return Cartesian3.multiplyComponents(position, this._radii, result!);
  }

  /**
   * Compares this Ellipsoid against the provided Ellipsoid.
   * @param right - The other Ellipsoid.
   * @returns true if they are equal, false otherwise.
   */
  equals(right?: Ellipsoid): boolean {
    return (
      this === right ||
      (defined(right) && Cartesian3.equals(this._radii, right!._radii))
    );
  }

  /**
   * Creates a string representing this Ellipsoid.
   * @returns A string representing this ellipsoid.
   */
  toString(): string {
    return this._radii.toString();
  }

  /**
   * Computes a point which is the intersection of the surface normal with the z-axis.
   * @param position - The position. Must be on the surface of the ellipsoid.
   * @param buffer - A buffer to subtract from the ellipsoid size.
   * @param result - The cartesian to which to copy the result.
   * @returns The intersection point if inside the ellipsoid, undefined otherwise.
   */
  getSurfaceNormalIntersectionWithZAxis(
    position: Cartesian3,
    buffer: number = 0.0,
    result?: Cartesian3
  ): Cartesian3 | undefined {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("position", position);

    if (
      !CesiumMath.equalsEpsilon(
        this._radii.x,
        this._radii.y,
        CesiumMath.EPSILON15
      )
    ) {
      throw new DeveloperError(
        "Ellipsoid must be an ellipsoid of revolution (radii.x == radii.y)"
      );
    }

    Check.typeOf.number.greaterThan("Ellipsoid.radii.z", this._radii.z, 0);
    //>>includeEnd('debug');

    const squaredXOverSquaredZ = this._squaredXOverSquaredZ;

    if (!defined(result)) {
      result = new Cartesian3();
    }

    result!.x = 0.0;
    result!.y = 0.0;
    result!.z = position.z * (1 - squaredXOverSquaredZ);

    if (Math.abs(result!.z) >= this._radii.z - buffer) {
      return undefined;
    }

    return result;
  }

  /**
   * Computes the ellipsoid curvatures at a given position on the surface.
   * @param surfacePosition - The position on the ellipsoid surface.
   * @param result - The cartesian to which to copy the result.
   * @returns The local curvature of the ellipsoid surface.
   */
  getLocalCurvature(surfacePosition: Cartesian3, result?: Cartesian2): Cartesian2 {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("surfacePosition", surfacePosition);
    //>>includeEnd('debug');

    if (!defined(result)) {
      result = new Cartesian2();
    }

    const primeVerticalEndpoint = this.getSurfaceNormalIntersectionWithZAxis(
      surfacePosition,
      0.0,
      scratchEndpoint
    );
    const primeVerticalRadius = Cartesian3.distance(
      surfacePosition,
      primeVerticalEndpoint!
    );
    const radiusRatio =
      (this.minimumRadius * primeVerticalRadius) / this.maximumRadius ** 2;
    const meridionalRadius = primeVerticalRadius * radiusRatio ** 2;

    return Cartesian2.fromElements(
      1.0 / primeVerticalRadius,
      1.0 / meridionalRadius,
      result
    );
  }

  /**
   * Computes an approximation of the surface area of a rectangle on the surface of an ellipsoid.
   * @param rectangle - The rectangle used for computing the surface area.
   * @returns The approximate area of the rectangle on the surface.
   */
  surfaceArea(rectangle: any): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("rectangle", rectangle);
    //>>includeEnd('debug');
    const minLongitude = rectangle.west;
    let maxLongitude = rectangle.east;
    const minLatitude = rectangle.south;
    const maxLatitude = rectangle.north;

    while (maxLongitude < minLongitude) {
      maxLongitude += CesiumMath.TWO_PI;
    }

    const radiiSquared = this._radiiSquared;
    const a2 = radiiSquared.x;
    const b2 = radiiSquared.y;
    const c2 = radiiSquared.z;
    const a2b2 = a2 * b2;
    return gaussLegendreQuadrature(minLatitude, maxLatitude, (lat: number) => {
      const sinPhi = Math.cos(lat);
      const cosPhi = Math.sin(lat);
      return (
        Math.cos(lat) *
        gaussLegendreQuadrature(minLongitude, maxLongitude, (lon: number) => {
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
  }
}

// Initialize the default ellipsoid after class definition
Ellipsoid._default = Ellipsoid.WGS84;

export default Ellipsoid;
