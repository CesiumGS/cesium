import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import Check from "./Check.js";
import defined from "./defined.js";
import Ellipsoid from "./Ellipsoid.js";
import GeographicProjection from "./GeographicProjection.js";
import Intersect from "./Intersect.js";
import Interval from "./Interval.js";
import CesiumMath from "./Math.js";
import Matrix3 from "./Matrix3.js";
import Matrix4 from "./Matrix4.js";
import Rectangle from "./Rectangle.js";

/**
 * A Cartesian3-like interface for cross-type compatibility
 */
interface Cartesian3Like {
  x: number;
  y: number;
  z: number;
}

/**
 * A BoundingSphere-like interface for duck-typing
 */
interface BoundingSphereLike {
  center: Cartesian3Like;
  radius: number;
}

/**
 * Interface for Plane objects
 */
interface PlaneLike {
  normal: Cartesian3Like;
  distance: number;
}

/**
 * Interface for Occluder objects
 */
interface OccluderLike {
  isBoundingSphereVisible(sphere: BoundingSphereLike): boolean;
}

/**
 * Interface for OrientedBoundingBox objects
 */
interface OrientedBoundingBoxLike {
  center: Cartesian3Like;
  halfAxes: any; // Matrix3
}

/**
 * Interface for projection objects
 */
interface ProjectionLike {
  ellipsoid: any;
  project(cartographic: any, result?: Cartesian3Like): Cartesian3Like;
  _ellipsoid?: any;
}

/**
 * Interface for Ellipsoid-like objects
 */
interface EllipsoidLike {
  maximumRadius: number;
  geodeticSurfaceNormal(cartesian: Cartesian3Like, result?: Cartesian3Like): Cartesian3Like;
  cartesianToCartographic(cartesian: Cartesian3Like, result?: any): any;
}

/**
 * Interface for Interval results
 */
interface IntervalLike {
  start: number;
  stop: number;
}

// Scratch variables for fromPoints
const fromPointsXMin = new Cartesian3();
const fromPointsYMin = new Cartesian3();
const fromPointsZMin = new Cartesian3();
const fromPointsXMax = new Cartesian3();
const fromPointsYMax = new Cartesian3();
const fromPointsZMax = new Cartesian3();
const fromPointsCurrentPos = new Cartesian3();
const fromPointsScratch = new Cartesian3();
const fromPointsRitterCenter = new Cartesian3();
const fromPointsMinBoxPt = new Cartesian3();
const fromPointsMaxBoxPt = new Cartesian3();
const fromPointsNaiveCenterScratch = new Cartesian3();
const volumeConstant = (4.0 / 3.0) * CesiumMath.PI;

// Scratch variables for fromRectangle2D
const defaultProjection = new GeographicProjection();
const fromRectangle2DLowerLeft = new Cartesian3();
const fromRectangle2DUpperRight = new Cartesian3();
const fromRectangle2DSouthwest = new Cartographic();
const fromRectangle2DNortheast = new Cartographic();

// Scratch variables for fromRectangle3D
const fromRectangle3DScratch: Cartesian3[] = [];

// Scratch variables for fromBoundingSpheres
const fromBoundingSpheresScratch = new Cartesian3();

// Scratch variables for fromOrientedBoundingBox
const fromOrientedBoundingBoxScratchU = new Cartesian3();
const fromOrientedBoundingBoxScratchV = new Cartesian3();
const fromOrientedBoundingBoxScratchW = new Cartesian3();

// Scratch variables for fromTransformation
const scratchFromTransformationCenter = new Cartesian3();
const scratchFromTransformationScale = new Cartesian3();

// Scratch variables for union
const unionScratch = new Cartesian3();
const unionScratchCenter = new Cartesian3();

// Scratch variables for expand
const expandScratch = new Cartesian3();

// Scratch variables for distanceSquaredTo
const distanceSquaredToScratch = new Cartesian3();

// Scratch variables for computePlaneDistances
const scratchCartesian3 = new Cartesian3();

// Scratch variables for projectTo2D
const projectTo2DNormalScratch = new Cartesian3();
const projectTo2DEastScratch = new Cartesian3();
const projectTo2DNorthScratch = new Cartesian3();
const projectTo2DWestScratch = new Cartesian3();
const projectTo2DSouthScratch = new Cartesian3();
const projectTo2DCartographicScratch = new Cartographic();
const projectTo2DPositionsScratch: Cartesian3[] = new Array(8);
for (let n = 0; n < 8; ++n) {
  projectTo2DPositionsScratch[n] = new Cartesian3();
}
const projectTo2DProjection = new GeographicProjection();

/**
 * A bounding sphere with a center and a radius.
 * @alias BoundingSphere
 *
 * @see AxisAlignedBoundingBox
 * @see BoundingRectangle
 * @see Packable
 */
class BoundingSphere {
  /**
   * The center point of the sphere.
   */
  center: Cartesian3;

  /**
   * The radius of the sphere.
   */
  radius: number;

  /**
   * The number of elements used to pack the object into an array.
   */
  static readonly packedLength: number = 4;

  /**
   * Creates a new BoundingSphere instance.
   * @param center - The center of the bounding sphere. Default is Cartesian3.ZERO.
   * @param radius - The radius of the bounding sphere. Default is 0.0.
   */
  constructor(center?: Cartesian3Like, radius: number = 0.0) {
    this.center = Cartesian3.clone(center ?? Cartesian3.ZERO) as Cartesian3;
    this.radius = radius;
  }

  /**
   * Computes a tight-fitting bounding sphere enclosing a list of 3D Cartesian points.
   * The bounding sphere is computed by running two algorithms, a naive algorithm and
   * Ritter's algorithm. The smaller of the two spheres is used to ensure a tight fit.
   *
   * @param positions - An array of points that the bounding sphere will enclose.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new BoundingSphere instance if one was not provided.
   *
   * @see {@link http://help.agi.com/AGIComponents/html/BlogBoundingSphere.htm|Bounding Sphere computation article}
   */
  static fromPoints(
    positions?: Cartesian3Like[],
    result?: BoundingSphere
  ): BoundingSphere {
    if (!defined(result)) {
      result = new BoundingSphere();
    }

    if (!defined(positions) || positions!.length === 0) {
      result!.center = Cartesian3.clone(Cartesian3.ZERO, result!.center) as Cartesian3;
      result!.radius = 0.0;
      return result!;
    }

    const currentPos = Cartesian3.clone(positions![0], fromPointsCurrentPos) as Cartesian3;

    const xMin = Cartesian3.clone(currentPos, fromPointsXMin) as Cartesian3;
    const yMin = Cartesian3.clone(currentPos, fromPointsYMin) as Cartesian3;
    const zMin = Cartesian3.clone(currentPos, fromPointsZMin) as Cartesian3;

    const xMax = Cartesian3.clone(currentPos, fromPointsXMax) as Cartesian3;
    const yMax = Cartesian3.clone(currentPos, fromPointsYMax) as Cartesian3;
    const zMax = Cartesian3.clone(currentPos, fromPointsZMax) as Cartesian3;

    const numPositions = positions!.length;
    let i: number;
    for (i = 1; i < numPositions; i++) {
      Cartesian3.clone(positions![i], currentPos);

      const x = currentPos.x;
      const y = currentPos.y;
      const z = currentPos.z;

      // Store points containing the smallest and largest components
      if (x < xMin.x) {
        Cartesian3.clone(currentPos, xMin);
      }

      if (x > xMax.x) {
        Cartesian3.clone(currentPos, xMax);
      }

      if (y < yMin.y) {
        Cartesian3.clone(currentPos, yMin);
      }

      if (y > yMax.y) {
        Cartesian3.clone(currentPos, yMax);
      }

      if (z < zMin.z) {
        Cartesian3.clone(currentPos, zMin);
      }

      if (z > zMax.z) {
        Cartesian3.clone(currentPos, zMax);
      }
    }

    // Compute x-, y-, and z-spans (Squared distances b/n each component's min. and max.).
    const xSpan = Cartesian3.magnitudeSquared(
      Cartesian3.subtract(xMax, xMin, fromPointsScratch)
    );
    const ySpan = Cartesian3.magnitudeSquared(
      Cartesian3.subtract(yMax, yMin, fromPointsScratch)
    );
    const zSpan = Cartesian3.magnitudeSquared(
      Cartesian3.subtract(zMax, zMin, fromPointsScratch)
    );

    // Set the diameter endpoints to the largest span.
    let diameter1 = xMin;
    let diameter2 = xMax;
    let maxSpan = xSpan;
    if (ySpan > maxSpan) {
      maxSpan = ySpan;
      diameter1 = yMin;
      diameter2 = yMax;
    }
    if (zSpan > maxSpan) {
      maxSpan = zSpan;
      diameter1 = zMin;
      diameter2 = zMax;
    }

    // Calculate the center of the initial sphere found by Ritter's algorithm
    const ritterCenter = fromPointsRitterCenter;
    ritterCenter.x = (diameter1.x + diameter2.x) * 0.5;
    ritterCenter.y = (diameter1.y + diameter2.y) * 0.5;
    ritterCenter.z = (diameter1.z + diameter2.z) * 0.5;

    // Calculate the radius of the initial sphere found by Ritter's algorithm
    let radiusSquared = Cartesian3.magnitudeSquared(
      Cartesian3.subtract(diameter2, ritterCenter, fromPointsScratch)
    );
    let ritterRadius = Math.sqrt(radiusSquared);

    // Find the center of the sphere found using the Naive method.
    const minBoxPt = fromPointsMinBoxPt;
    minBoxPt.x = xMin.x;
    minBoxPt.y = yMin.y;
    minBoxPt.z = zMin.z;

    const maxBoxPt = fromPointsMaxBoxPt;
    maxBoxPt.x = xMax.x;
    maxBoxPt.y = yMax.y;
    maxBoxPt.z = zMax.z;

    const naiveCenter = Cartesian3.midpoint(
      minBoxPt,
      maxBoxPt,
      fromPointsNaiveCenterScratch
    );

    // Begin 2nd pass to find naive radius and modify the ritter sphere.
    let naiveRadius = 0;
    for (i = 0; i < numPositions; i++) {
      Cartesian3.clone(positions![i], currentPos);

      // Find the furthest point from the naive center to calculate the naive radius.
      const r = Cartesian3.magnitude(
        Cartesian3.subtract(currentPos, naiveCenter, fromPointsScratch)
      );
      if (r > naiveRadius) {
        naiveRadius = r;
      }

      // Make adjustments to the Ritter Sphere to include all points.
      const oldCenterToPointSquared = Cartesian3.magnitudeSquared(
        Cartesian3.subtract(currentPos, ritterCenter, fromPointsScratch)
      );
      if (oldCenterToPointSquared > radiusSquared) {
        const oldCenterToPoint = Math.sqrt(oldCenterToPointSquared);
        // Calculate new radius to include the point that lies outside
        ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5;
        radiusSquared = ritterRadius * ritterRadius;
        // Calculate center of new Ritter sphere
        const oldToNew = oldCenterToPoint - ritterRadius;
        ritterCenter.x =
          (ritterRadius * ritterCenter.x + oldToNew * currentPos.x) /
          oldCenterToPoint;
        ritterCenter.y =
          (ritterRadius * ritterCenter.y + oldToNew * currentPos.y) /
          oldCenterToPoint;
        ritterCenter.z =
          (ritterRadius * ritterCenter.z + oldToNew * currentPos.z) /
          oldCenterToPoint;
      }
    }

    if (ritterRadius < naiveRadius) {
      Cartesian3.clone(ritterCenter, result!.center);
      result!.radius = ritterRadius;
    } else {
      Cartesian3.clone(naiveCenter, result!.center);
      result!.radius = naiveRadius;
    }

    return result!;
  }

  /**
   * Computes a bounding sphere from a rectangle projected in 2D.
   *
   * @param rectangle - The rectangle around which to create a bounding sphere.
   * @param projection - The projection used to project the rectangle into 2D.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new BoundingSphere instance if none was provided.
   */
  static fromRectangle2D(
    rectangle?: any,
    projection?: ProjectionLike,
    result?: BoundingSphere
  ): BoundingSphere {
    return BoundingSphere.fromRectangleWithHeights2D(
      rectangle,
      projection,
      0.0,
      0.0,
      result
    );
  }

  /**
   * Computes a bounding sphere from a rectangle projected in 2D. The bounding sphere accounts for the
   * object's minimum and maximum heights over the rectangle.
   *
   * @param rectangle - The rectangle around which to create a bounding sphere.
   * @param projection - The projection used to project the rectangle into 2D.
   * @param minimumHeight - The minimum height over the rectangle.
   * @param maximumHeight - The maximum height over the rectangle.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new BoundingSphere instance if none was provided.
   */
  static fromRectangleWithHeights2D(
    rectangle?: any,
    projection?: ProjectionLike,
    minimumHeight: number = 0.0,
    maximumHeight: number = 0.0,
    result?: BoundingSphere
  ): BoundingSphere {
    if (!defined(result)) {
      result = new BoundingSphere();
    }

    if (!defined(rectangle)) {
      result!.center = Cartesian3.clone(Cartesian3.ZERO, result!.center) as Cartesian3;
      result!.radius = 0.0;
      return result!;
    }

    (defaultProjection as any)._ellipsoid = Ellipsoid.default;
    projection = projection ?? defaultProjection;

    Rectangle.southwest(rectangle, fromRectangle2DSouthwest);
    fromRectangle2DSouthwest.height = minimumHeight;
    Rectangle.northeast(rectangle, fromRectangle2DNortheast);
    fromRectangle2DNortheast.height = maximumHeight;

    const lowerLeft = projection.project(
      fromRectangle2DSouthwest,
      fromRectangle2DLowerLeft
    ) as Cartesian3;
    const upperRight = projection.project(
      fromRectangle2DNortheast,
      fromRectangle2DUpperRight
    ) as Cartesian3;

    const width = upperRight.x - lowerLeft.x;
    const height = upperRight.y - lowerLeft.y;
    const elevation = upperRight.z - lowerLeft.z;

    result!.radius =
      Math.sqrt(width * width + height * height + elevation * elevation) * 0.5;
    const center = result!.center;
    center.x = lowerLeft.x + width * 0.5;
    center.y = lowerLeft.y + height * 0.5;
    center.z = lowerLeft.z + elevation * 0.5;
    return result!;
  }

  /**
   * Computes a bounding sphere from a rectangle in 3D. The bounding sphere is created using a subsample of points
   * on the ellipsoid and contained in the rectangle. It may not be accurate for all rectangles on all types of ellipsoids.
   *
   * @param rectangle - The valid rectangle used to create a bounding sphere.
   * @param ellipsoid - The ellipsoid used to determine positions of the rectangle.
   * @param surfaceHeight - The height above the surface of the ellipsoid.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new BoundingSphere instance if none was provided.
   */
  static fromRectangle3D(
    rectangle?: any,
    ellipsoid?: any,
    surfaceHeight: number = 0.0,
    result?: BoundingSphere
  ): BoundingSphere {
    ellipsoid = ellipsoid ?? Ellipsoid.default;

    if (!defined(result)) {
      result = new BoundingSphere();
    }

    if (!defined(rectangle)) {
      result!.center = Cartesian3.clone(Cartesian3.ZERO, result!.center) as Cartesian3;
      result!.radius = 0.0;
      return result!;
    }

    const positions = Rectangle.subsample(
      rectangle,
      ellipsoid,
      surfaceHeight,
      fromRectangle3DScratch
    );
    return BoundingSphere.fromPoints(positions, result);
  }

  /**
   * Computes a tight-fitting bounding sphere enclosing a list of 3D points, where the points are
   * stored in a flat array in X, Y, Z, order. The bounding sphere is computed by running two
   * algorithms, a naive algorithm and Ritter's algorithm. The smaller of the two spheres is used to
   * ensure a tight fit.
   *
   * @param positions - An array of points that the bounding sphere will enclose. Each point
   *        is formed from three elements in the array in the order X, Y, Z.
   * @param center - The position to which the positions are relative, which need not be the
   *        origin of the coordinate system. This is useful when the positions are to be used for
   *        relative-to-center (RTC) rendering.
   * @param stride - The number of array elements per vertex. It must be at least 3, but it may
   *        be higher.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new BoundingSphere instance if one was not provided.
   *
   * @example
   * // Compute the bounding sphere from 3 positions, each specified relative to a center.
   * // In addition to the X, Y, and Z coordinates, the points array contains two additional
   * // elements per point which are ignored for the purpose of computing the bounding sphere.
   * const center = new Cesium.Cartesian3(1.0, 2.0, 3.0);
   * const points = [1.0, 2.0, 3.0, 0.1, 0.2,
   *               4.0, 5.0, 6.0, 0.1, 0.2,
   *               7.0, 8.0, 9.0, 0.1, 0.2];
   * const sphere = Cesium.BoundingSphere.fromVertices(points, center, 5);
   *
   * @see {@link http://blogs.agi.com/insight3d/index.php/2008/02/04/a-bounding/|Bounding Sphere computation article}
   */
  static fromVertices(
    positions?: number[],
    center?: Cartesian3Like,
    stride: number = 3,
    result?: BoundingSphere
  ): BoundingSphere {
    if (!defined(result)) {
      result = new BoundingSphere();
    }

    if (!defined(positions) || positions!.length === 0) {
      result!.center = Cartesian3.clone(Cartesian3.ZERO, result!.center) as Cartesian3;
      result!.radius = 0.0;
      return result!;
    }

    center = center ?? Cartesian3.ZERO;

    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.number.greaterThanOrEquals("stride", stride, 3);
    //>>includeEnd('debug');

    const currentPos = fromPointsCurrentPos;
    currentPos.x = positions![0] + center.x;
    currentPos.y = positions![1] + center.y;
    currentPos.z = positions![2] + center.z;

    const xMin = Cartesian3.clone(currentPos, fromPointsXMin) as Cartesian3;
    const yMin = Cartesian3.clone(currentPos, fromPointsYMin) as Cartesian3;
    const zMin = Cartesian3.clone(currentPos, fromPointsZMin) as Cartesian3;

    const xMax = Cartesian3.clone(currentPos, fromPointsXMax) as Cartesian3;
    const yMax = Cartesian3.clone(currentPos, fromPointsYMax) as Cartesian3;
    const zMax = Cartesian3.clone(currentPos, fromPointsZMax) as Cartesian3;

    const numElements = positions!.length;
    let i: number;
    for (i = 0; i < numElements; i += stride) {
      const x = positions![i] + center.x;
      const y = positions![i + 1] + center.y;
      const z = positions![i + 2] + center.z;

      currentPos.x = x;
      currentPos.y = y;
      currentPos.z = z;

      // Store points containing the smallest and largest components
      if (x < xMin.x) {
        Cartesian3.clone(currentPos, xMin);
      }

      if (x > xMax.x) {
        Cartesian3.clone(currentPos, xMax);
      }

      if (y < yMin.y) {
        Cartesian3.clone(currentPos, yMin);
      }

      if (y > yMax.y) {
        Cartesian3.clone(currentPos, yMax);
      }

      if (z < zMin.z) {
        Cartesian3.clone(currentPos, zMin);
      }

      if (z > zMax.z) {
        Cartesian3.clone(currentPos, zMax);
      }
    }

    // Compute x-, y-, and z-spans (Squared distances b/n each component's min. and max.).
    const xSpan = Cartesian3.magnitudeSquared(
      Cartesian3.subtract(xMax, xMin, fromPointsScratch)
    );
    const ySpan = Cartesian3.magnitudeSquared(
      Cartesian3.subtract(yMax, yMin, fromPointsScratch)
    );
    const zSpan = Cartesian3.magnitudeSquared(
      Cartesian3.subtract(zMax, zMin, fromPointsScratch)
    );

    // Set the diameter endpoints to the largest span.
    let diameter1 = xMin;
    let diameter2 = xMax;
    let maxSpan = xSpan;
    if (ySpan > maxSpan) {
      maxSpan = ySpan;
      diameter1 = yMin;
      diameter2 = yMax;
    }
    if (zSpan > maxSpan) {
      maxSpan = zSpan;
      diameter1 = zMin;
      diameter2 = zMax;
    }

    // Calculate the center of the initial sphere found by Ritter's algorithm
    const ritterCenter = fromPointsRitterCenter;
    ritterCenter.x = (diameter1.x + diameter2.x) * 0.5;
    ritterCenter.y = (diameter1.y + diameter2.y) * 0.5;
    ritterCenter.z = (diameter1.z + diameter2.z) * 0.5;

    // Calculate the radius of the initial sphere found by Ritter's algorithm
    let radiusSquared = Cartesian3.magnitudeSquared(
      Cartesian3.subtract(diameter2, ritterCenter, fromPointsScratch)
    );
    let ritterRadius = Math.sqrt(radiusSquared);

    // Find the center of the sphere found using the Naive method.
    const minBoxPt = fromPointsMinBoxPt;
    minBoxPt.x = xMin.x;
    minBoxPt.y = yMin.y;
    minBoxPt.z = zMin.z;

    const maxBoxPt = fromPointsMaxBoxPt;
    maxBoxPt.x = xMax.x;
    maxBoxPt.y = yMax.y;
    maxBoxPt.z = zMax.z;

    const naiveCenter = Cartesian3.midpoint(
      minBoxPt,
      maxBoxPt,
      fromPointsNaiveCenterScratch
    );

    // Begin 2nd pass to find naive radius and modify the ritter sphere.
    let naiveRadius = 0;
    for (i = 0; i < numElements; i += stride) {
      currentPos.x = positions![i] + center.x;
      currentPos.y = positions![i + 1] + center.y;
      currentPos.z = positions![i + 2] + center.z;

      // Find the furthest point from the naive center to calculate the naive radius.
      const r = Cartesian3.magnitude(
        Cartesian3.subtract(currentPos, naiveCenter, fromPointsScratch)
      );
      if (r > naiveRadius) {
        naiveRadius = r;
      }

      // Make adjustments to the Ritter Sphere to include all points.
      const oldCenterToPointSquared = Cartesian3.magnitudeSquared(
        Cartesian3.subtract(currentPos, ritterCenter, fromPointsScratch)
      );
      if (oldCenterToPointSquared > radiusSquared) {
        const oldCenterToPoint = Math.sqrt(oldCenterToPointSquared);
        // Calculate new radius to include the point that lies outside
        ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5;
        radiusSquared = ritterRadius * ritterRadius;
        // Calculate center of new Ritter sphere
        const oldToNew = oldCenterToPoint - ritterRadius;
        ritterCenter.x =
          (ritterRadius * ritterCenter.x + oldToNew * currentPos.x) /
          oldCenterToPoint;
        ritterCenter.y =
          (ritterRadius * ritterCenter.y + oldToNew * currentPos.y) /
          oldCenterToPoint;
        ritterCenter.z =
          (ritterRadius * ritterCenter.z + oldToNew * currentPos.z) /
          oldCenterToPoint;
      }
    }

    if (ritterRadius < naiveRadius) {
      Cartesian3.clone(ritterCenter, result!.center);
      result!.radius = ritterRadius;
    } else {
      Cartesian3.clone(naiveCenter, result!.center);
      result!.radius = naiveRadius;
    }

    return result!;
  }

  /**
   * Computes a tight-fitting bounding sphere enclosing a list of EncodedCartesian3s, where the points are
   * stored in parallel flat arrays in X, Y, Z, order. The bounding sphere is computed by running two
   * algorithms, a naive algorithm and Ritter's algorithm. The smaller of the two spheres is used to
   * ensure a tight fit.
   *
   * @param positionsHigh - An array of high bits of the encoded cartesians that the bounding sphere will enclose.
   * @param positionsLow - An array of low bits of the encoded cartesians that the bounding sphere will enclose.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new BoundingSphere instance if one was not provided.
   *
   * @see {@link http://blogs.agi.com/insight3d/index.php/2008/02/04/a-bounding/|Bounding Sphere computation article}
   */
  static fromEncodedCartesianVertices(
    positionsHigh?: number[],
    positionsLow?: number[],
    result?: BoundingSphere
  ): BoundingSphere {
    if (!defined(result)) {
      result = new BoundingSphere();
    }

    if (
      !defined(positionsHigh) ||
      !defined(positionsLow) ||
      positionsHigh!.length !== positionsLow!.length ||
      positionsHigh!.length === 0
    ) {
      result!.center = Cartesian3.clone(Cartesian3.ZERO, result!.center) as Cartesian3;
      result!.radius = 0.0;
      return result!;
    }

    const currentPos = fromPointsCurrentPos;
    currentPos.x = positionsHigh![0] + positionsLow![0];
    currentPos.y = positionsHigh![1] + positionsLow![1];
    currentPos.z = positionsHigh![2] + positionsLow![2];

    const xMin = Cartesian3.clone(currentPos, fromPointsXMin) as Cartesian3;
    const yMin = Cartesian3.clone(currentPos, fromPointsYMin) as Cartesian3;
    const zMin = Cartesian3.clone(currentPos, fromPointsZMin) as Cartesian3;

    const xMax = Cartesian3.clone(currentPos, fromPointsXMax) as Cartesian3;
    const yMax = Cartesian3.clone(currentPos, fromPointsYMax) as Cartesian3;
    const zMax = Cartesian3.clone(currentPos, fromPointsZMax) as Cartesian3;

    const numElements = positionsHigh!.length;
    let i: number;
    for (i = 0; i < numElements; i += 3) {
      const x = positionsHigh![i] + positionsLow![i];
      const y = positionsHigh![i + 1] + positionsLow![i + 1];
      const z = positionsHigh![i + 2] + positionsLow![i + 2];

      currentPos.x = x;
      currentPos.y = y;
      currentPos.z = z;

      // Store points containing the smallest and largest components
      if (x < xMin.x) {
        Cartesian3.clone(currentPos, xMin);
      }

      if (x > xMax.x) {
        Cartesian3.clone(currentPos, xMax);
      }

      if (y < yMin.y) {
        Cartesian3.clone(currentPos, yMin);
      }

      if (y > yMax.y) {
        Cartesian3.clone(currentPos, yMax);
      }

      if (z < zMin.z) {
        Cartesian3.clone(currentPos, zMin);
      }

      if (z > zMax.z) {
        Cartesian3.clone(currentPos, zMax);
      }
    }

    // Compute x-, y-, and z-spans (Squared distances b/n each component's min. and max.).
    const xSpan = Cartesian3.magnitudeSquared(
      Cartesian3.subtract(xMax, xMin, fromPointsScratch)
    );
    const ySpan = Cartesian3.magnitudeSquared(
      Cartesian3.subtract(yMax, yMin, fromPointsScratch)
    );
    const zSpan = Cartesian3.magnitudeSquared(
      Cartesian3.subtract(zMax, zMin, fromPointsScratch)
    );

    // Set the diameter endpoints to the largest span.
    let diameter1 = xMin;
    let diameter2 = xMax;
    let maxSpan = xSpan;
    if (ySpan > maxSpan) {
      maxSpan = ySpan;
      diameter1 = yMin;
      diameter2 = yMax;
    }
    if (zSpan > maxSpan) {
      maxSpan = zSpan;
      diameter1 = zMin;
      diameter2 = zMax;
    }

    // Calculate the center of the initial sphere found by Ritter's algorithm
    const ritterCenter = fromPointsRitterCenter;
    ritterCenter.x = (diameter1.x + diameter2.x) * 0.5;
    ritterCenter.y = (diameter1.y + diameter2.y) * 0.5;
    ritterCenter.z = (diameter1.z + diameter2.z) * 0.5;

    // Calculate the radius of the initial sphere found by Ritter's algorithm
    let radiusSquared = Cartesian3.magnitudeSquared(
      Cartesian3.subtract(diameter2, ritterCenter, fromPointsScratch)
    );
    let ritterRadius = Math.sqrt(radiusSquared);

    // Find the center of the sphere found using the Naive method.
    const minBoxPt = fromPointsMinBoxPt;
    minBoxPt.x = xMin.x;
    minBoxPt.y = yMin.y;
    minBoxPt.z = zMin.z;

    const maxBoxPt = fromPointsMaxBoxPt;
    maxBoxPt.x = xMax.x;
    maxBoxPt.y = yMax.y;
    maxBoxPt.z = zMax.z;

    const naiveCenter = Cartesian3.midpoint(
      minBoxPt,
      maxBoxPt,
      fromPointsNaiveCenterScratch
    );

    // Begin 2nd pass to find naive radius and modify the ritter sphere.
    let naiveRadius = 0;
    for (i = 0; i < numElements; i += 3) {
      currentPos.x = positionsHigh![i] + positionsLow![i];
      currentPos.y = positionsHigh![i + 1] + positionsLow![i + 1];
      currentPos.z = positionsHigh![i + 2] + positionsLow![i + 2];

      // Find the furthest point from the naive center to calculate the naive radius.
      const r = Cartesian3.magnitude(
        Cartesian3.subtract(currentPos, naiveCenter, fromPointsScratch)
      );
      if (r > naiveRadius) {
        naiveRadius = r;
      }

      // Make adjustments to the Ritter Sphere to include all points.
      const oldCenterToPointSquared = Cartesian3.magnitudeSquared(
        Cartesian3.subtract(currentPos, ritterCenter, fromPointsScratch)
      );
      if (oldCenterToPointSquared > radiusSquared) {
        const oldCenterToPoint = Math.sqrt(oldCenterToPointSquared);
        // Calculate new radius to include the point that lies outside
        ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5;
        radiusSquared = ritterRadius * ritterRadius;
        // Calculate center of new Ritter sphere
        const oldToNew = oldCenterToPoint - ritterRadius;
        ritterCenter.x =
          (ritterRadius * ritterCenter.x + oldToNew * currentPos.x) /
          oldCenterToPoint;
        ritterCenter.y =
          (ritterRadius * ritterCenter.y + oldToNew * currentPos.y) /
          oldCenterToPoint;
        ritterCenter.z =
          (ritterRadius * ritterCenter.z + oldToNew * currentPos.z) /
          oldCenterToPoint;
      }
    }

    if (ritterRadius < naiveRadius) {
      Cartesian3.clone(ritterCenter, result!.center);
      result!.radius = ritterRadius;
    } else {
      Cartesian3.clone(naiveCenter, result!.center);
      result!.radius = naiveRadius;
    }

    return result!;
  }

  /**
   * Computes a bounding sphere from the corner points of an axis-aligned bounding box. The sphere
   * tightly and fully encompasses the box.
   *
   * @param corner - The minimum height over the rectangle.
   * @param oppositeCorner - The maximum height over the rectangle.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new BoundingSphere instance if none was provided.
   *
   * @example
   * // Create a bounding sphere around the unit cube
   * const sphere = Cesium.BoundingSphere.fromCornerPoints(new Cesium.Cartesian3(-0.5, -0.5, -0.5), new Cesium.Cartesian3(0.5, 0.5, 0.5));
   */
  static fromCornerPoints(
    corner: Cartesian3Like,
    oppositeCorner: Cartesian3Like,
    result?: BoundingSphere
  ): BoundingSphere {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("corner", corner);
    Check.typeOf.object("oppositeCorner", oppositeCorner);
    //>>includeEnd('debug');

    if (!defined(result)) {
      result = new BoundingSphere();
    }

    const center = Cartesian3.midpoint(corner, oppositeCorner, result!.center);
    result!.radius = Cartesian3.distance(center, oppositeCorner);
    return result!;
  }

  /**
   * Creates a bounding sphere encompassing an ellipsoid.
   *
   * @param ellipsoid - The ellipsoid around which to create a bounding sphere.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new BoundingSphere instance if none was provided.
   *
   * @example
   * const boundingSphere = Cesium.BoundingSphere.fromEllipsoid(ellipsoid);
   */
  static fromEllipsoid(
    ellipsoid: EllipsoidLike,
    result?: BoundingSphere
  ): BoundingSphere {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("ellipsoid", ellipsoid);
    //>>includeEnd('debug');

    if (!defined(result)) {
      result = new BoundingSphere();
    }

    Cartesian3.clone(Cartesian3.ZERO, result!.center);
    result!.radius = ellipsoid.maximumRadius;
    return result!;
  }

  /**
   * Computes a tight-fitting bounding sphere enclosing the provided array of bounding spheres.
   *
   * @param boundingSpheres - The array of bounding spheres.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new BoundingSphere instance if none was provided.
   */
  static fromBoundingSpheres(
    boundingSpheres?: BoundingSphereLike[],
    result?: BoundingSphere
  ): BoundingSphere {
    if (!defined(result)) {
      result = new BoundingSphere();
    }

    if (!defined(boundingSpheres) || boundingSpheres!.length === 0) {
      result!.center = Cartesian3.clone(Cartesian3.ZERO, result!.center) as Cartesian3;
      result!.radius = 0.0;
      return result!;
    }

    const length = boundingSpheres!.length;
    if (length === 1) {
      return BoundingSphere.clone(boundingSpheres![0], result)!;
    }

    if (length === 2) {
      return BoundingSphere.union(boundingSpheres![0], boundingSpheres![1], result);
    }

    const positions: Cartesian3Like[] = [];
    let i: number;
    for (i = 0; i < length; i++) {
      positions.push(boundingSpheres![i].center);
    }

    result = BoundingSphere.fromPoints(positions, result);

    const center = result!.center;
    let radius = result!.radius;
    for (i = 0; i < length; i++) {
      const tmp = boundingSpheres![i];
      radius = Math.max(
        radius,
        Cartesian3.distance(center, tmp.center, fromBoundingSpheresScratch) +
          tmp.radius
      );
    }
    result!.radius = radius;

    return result!;
  }

  /**
   * Computes a tight-fitting bounding sphere enclosing the provided oriented bounding box.
   *
   * @param orientedBoundingBox - The oriented bounding box.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new BoundingSphere instance if none was provided.
   */
  static fromOrientedBoundingBox(
    orientedBoundingBox: OrientedBoundingBoxLike,
    result?: BoundingSphere
  ): BoundingSphere {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("orientedBoundingBox", orientedBoundingBox);
    //>>includeEnd('debug');

    if (!defined(result)) {
      result = new BoundingSphere();
    }

    const halfAxes = orientedBoundingBox.halfAxes;
    const u = Matrix3.getColumn(halfAxes, 0, fromOrientedBoundingBoxScratchU);
    const v = Matrix3.getColumn(halfAxes, 1, fromOrientedBoundingBoxScratchV);
    const w = Matrix3.getColumn(halfAxes, 2, fromOrientedBoundingBoxScratchW);

    Cartesian3.add(u, v, u);
    Cartesian3.add(u, w, u);

    result!.center = Cartesian3.clone(orientedBoundingBox.center, result!.center) as Cartesian3;
    result!.radius = Cartesian3.magnitude(u);

    return result!;
  }

  /**
   * Computes a tight-fitting bounding sphere enclosing the provided affine transformation.
   *
   * @param transformation - The affine transformation.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new BoundingSphere instance if none was provided.
   */
  static fromTransformation(
    transformation: any,
    result?: BoundingSphere
  ): BoundingSphere {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("transformation", transformation);
    //>>includeEnd('debug');

    if (!defined(result)) {
      result = new BoundingSphere();
    }

    const center = Matrix4.getTranslation(
      transformation,
      scratchFromTransformationCenter
    );
    const scale = Matrix4.getScale(
      transformation,
      scratchFromTransformationScale
    );
    const radius = 0.5 * Cartesian3.magnitude(scale);
    result!.center = Cartesian3.clone(center, result!.center) as Cartesian3;
    result!.radius = radius;

    return result!;
  }

  /**
   * Duplicates a BoundingSphere instance.
   *
   * @param sphere - The bounding sphere to duplicate.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new BoundingSphere instance if none was provided. (Returns undefined if sphere is undefined)
   */
  static clone(
    sphere?: BoundingSphereLike,
    result?: BoundingSphere
  ): BoundingSphere | undefined {
    if (!defined(sphere)) {
      return undefined;
    }

    if (!defined(result)) {
      return new BoundingSphere(sphere!.center, sphere!.radius);
    }

    result!.center = Cartesian3.clone(sphere!.center, result!.center) as Cartesian3;
    result!.radius = sphere!.radius;
    return result;
  }

  /**
   * Stores the provided instance into the provided array.
   *
   * @param value - The value to pack.
   * @param array - The array to pack into.
   * @param startingIndex - The index into the array at which to start packing the elements.
   * @returns The array that was packed into
   */
  static pack(
    value: BoundingSphereLike,
    array: number[],
    startingIndex: number = 0
  ): number[] {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("value", value);
    Check.defined("array", array);
    //>>includeEnd('debug');

    const center = value.center;
    array[startingIndex++] = center.x;
    array[startingIndex++] = center.y;
    array[startingIndex++] = center.z;
    array[startingIndex] = value.radius;

    return array;
  }

  /**
   * Retrieves an instance from a packed array.
   *
   * @param array - The packed array.
   * @param startingIndex - The starting index of the element to be unpacked.
   * @param result - The object into which to store the result.
   * @returns The modified result parameter or a new BoundingSphere instance if one was not provided.
   */
  static unpack(
    array: number[],
    startingIndex: number = 0,
    result?: BoundingSphere
  ): BoundingSphere {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("array", array);
    //>>includeEnd('debug');

    if (!defined(result)) {
      result = new BoundingSphere();
    }

    const center = result!.center;
    center.x = array[startingIndex++];
    center.y = array[startingIndex++];
    center.z = array[startingIndex++];
    result!.radius = array[startingIndex];
    return result!;
  }

  /**
   * Computes a bounding sphere that contains both the left and right bounding spheres.
   *
   * @param left - A sphere to enclose in a bounding sphere.
   * @param right - A sphere to enclose in a bounding sphere.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new BoundingSphere instance if none was provided.
   */
  static union(
    left: BoundingSphereLike,
    right: BoundingSphereLike,
    result?: BoundingSphere
  ): BoundingSphere {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("left", left);
    Check.typeOf.object("right", right);
    //>>includeEnd('debug');

    if (!defined(result)) {
      result = new BoundingSphere();
    }

    const leftCenter = left.center;
    const leftRadius = left.radius;
    const rightCenter = right.center;
    const rightRadius = right.radius;

    const toRightCenter = Cartesian3.subtract(
      rightCenter,
      leftCenter,
      unionScratch
    );
    const centerSeparation = Cartesian3.magnitude(toRightCenter);

    if (leftRadius >= centerSeparation + rightRadius) {
      // Left sphere wins.
      BoundingSphere.clone(left, result);
      return result!;
    }

    if (rightRadius >= centerSeparation + leftRadius) {
      // Right sphere wins.
      BoundingSphere.clone(right, result);
      return result!;
    }

    // There are two tangent points, one on far side of each sphere.
    const halfDistanceBetweenTangentPoints =
      (leftRadius + centerSeparation + rightRadius) * 0.5;

    // Compute the center point halfway between the two tangent points.
    const center = Cartesian3.multiplyByScalar(
      toRightCenter,
      (-leftRadius + halfDistanceBetweenTangentPoints) / centerSeparation,
      unionScratchCenter
    );
    Cartesian3.add(center, leftCenter, center);
    Cartesian3.clone(center, result!.center);
    result!.radius = halfDistanceBetweenTangentPoints;

    return result!;
  }

  /**
   * Computes a bounding sphere by enlarging the provided sphere to contain the provided point.
   *
   * @param sphere - A sphere to expand.
   * @param point - A point to enclose in a bounding sphere.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new BoundingSphere instance if none was provided.
   */
  static expand(
    sphere: BoundingSphereLike,
    point: Cartesian3Like,
    result?: BoundingSphere
  ): BoundingSphere {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("sphere", sphere);
    Check.typeOf.object("point", point);
    //>>includeEnd('debug');

    result = BoundingSphere.clone(sphere, result)!;

    const radius = Cartesian3.magnitude(
      Cartesian3.subtract(point, result.center, expandScratch)
    );
    if (radius > result.radius) {
      result.radius = radius;
    }

    return result;
  }

  /**
   * Determines which side of a plane a sphere is located.
   *
   * @param sphere - The bounding sphere to test.
   * @param plane - The plane to test against.
   * @returns {@link Intersect.INSIDE} if the entire sphere is on the side of the plane
   *          the normal is pointing, {@link Intersect.OUTSIDE} if the entire sphere is
   *          on the opposite side, and {@link Intersect.INTERSECTING} if the sphere
   *          intersects the plane.
   */
  static intersectPlane(
    sphere: BoundingSphereLike,
    plane: PlaneLike
  ): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("sphere", sphere);
    Check.typeOf.object("plane", plane);
    //>>includeEnd('debug');

    const center = sphere.center;
    const radius = sphere.radius;
    const normal = plane.normal;
    const distanceToPlane = Cartesian3.dot(normal, center) + plane.distance;

    if (distanceToPlane < -radius) {
      // The center point is negative side of the plane normal
      return Intersect.OUTSIDE;
    } else if (distanceToPlane < radius) {
      // The center point is positive side of the plane, but radius extends beyond it; partial overlap
      return Intersect.INTERSECTING;
    }
    return Intersect.INSIDE;
  }

  /**
   * Applies a 4x4 affine transformation matrix to a bounding sphere.
   *
   * @param sphere - The bounding sphere to apply the transformation to.
   * @param transform - The transformation matrix to apply to the bounding sphere.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new BoundingSphere instance if none was provided.
   */
  static transform(
    sphere: BoundingSphereLike,
    transform: any,
    result?: BoundingSphere
  ): BoundingSphere {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("sphere", sphere);
    Check.typeOf.object("transform", transform);
    //>>includeEnd('debug');

    if (!defined(result)) {
      result = new BoundingSphere();
    }

    result!.center = Matrix4.multiplyByPoint(
      transform,
      sphere.center,
      result!.center
    );
    result!.radius = Matrix4.getMaximumScale(transform) * sphere.radius;

    return result!;
  }

  /**
   * Computes the estimated distance squared from the closest point on a bounding sphere to a point.
   *
   * @param sphere - The sphere.
   * @param cartesian - The point
   * @returns The distance squared from the bounding sphere to the point. Returns 0 if the point is inside the sphere.
   *
   * @example
   * // Sort bounding spheres from back to front
   * spheres.sort(function(a, b) {
   *     return Cesium.BoundingSphere.distanceSquaredTo(b, camera.positionWC) - Cesium.BoundingSphere.distanceSquaredTo(a, camera.positionWC);
   * });
   */
  static distanceSquaredTo(
    sphere: BoundingSphereLike,
    cartesian: Cartesian3Like
  ): number {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("sphere", sphere);
    Check.typeOf.object("cartesian", cartesian);
    //>>includeEnd('debug');

    const diff = Cartesian3.subtract(
      sphere.center,
      cartesian,
      distanceSquaredToScratch
    );

    const distance = Cartesian3.magnitude(diff) - sphere.radius;
    if (distance <= 0.0) {
      return 0.0;
    }

    return distance * distance;
  }

  /**
   * Applies a 4x4 affine transformation matrix to a bounding sphere where there is no scale
   * The transformation matrix is not verified to have a uniform scale of 1.
   * This method is faster than computing the general bounding sphere transform using {@link BoundingSphere.transform}.
   *
   * @param sphere - The bounding sphere to apply the transformation to.
   * @param transform - The transformation matrix to apply to the bounding sphere.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new BoundingSphere instance if none was provided.
   *
   * @example
   * const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(positionOnEllipsoid);
   * const boundingSphere = new Cesium.BoundingSphere();
   * const newBoundingSphere = Cesium.BoundingSphere.transformWithoutScale(boundingSphere, modelMatrix);
   */
  static transformWithoutScale(
    sphere: BoundingSphereLike,
    transform: any,
    result?: BoundingSphere
  ): BoundingSphere {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("sphere", sphere);
    Check.typeOf.object("transform", transform);
    //>>includeEnd('debug');

    if (!defined(result)) {
      result = new BoundingSphere();
    }

    result!.center = Matrix4.multiplyByPoint(
      transform,
      sphere.center,
      result!.center
    );
    result!.radius = sphere.radius;

    return result!;
  }

  /**
   * The distances calculated by the vector from the center of the bounding sphere to position projected onto direction
   * plus/minus the radius of the bounding sphere.
   * <br>
   * If you imagine the infinite number of planes with normal direction, this computes the smallest distance to the
   * closest and farthest planes from position that intersect the bounding sphere.
   *
   * @param sphere - The bounding sphere to calculate the distance to.
   * @param position - The position to calculate the distance from.
   * @param direction - The direction from position.
   * @param result - A Interval to store the nearest and farthest distances.
   * @returns The nearest and farthest distances on the bounding sphere from position in direction.
   */
  static computePlaneDistances(
    sphere: BoundingSphereLike,
    position: Cartesian3Like,
    direction: Cartesian3Like,
    result?: IntervalLike
  ): IntervalLike {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("sphere", sphere);
    Check.typeOf.object("position", position);
    Check.typeOf.object("direction", direction);
    //>>includeEnd('debug');

    if (!defined(result)) {
      result = new Interval();
    }

    const toCenter = Cartesian3.subtract(
      sphere.center,
      position,
      scratchCartesian3
    );
    const mag = Cartesian3.dot(direction, toCenter);

    result!.start = mag - sphere.radius;
    result!.stop = mag + sphere.radius;
    return result!;
  }

  /**
   * Creates a bounding sphere in 2D from a bounding sphere in 3D world coordinates.
   *
   * @param sphere - The bounding sphere to transform to 2D.
   * @param projection - The projection to 2D.
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new BoundingSphere instance if none was provided.
   */
  static projectTo2D(
    sphere: BoundingSphereLike,
    projection?: ProjectionLike,
    result?: BoundingSphere
  ): BoundingSphere {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("sphere", sphere);
    //>>includeEnd('debug');

    (projectTo2DProjection as any)._ellipsoid = Ellipsoid.default;
    projection = projection ?? projectTo2DProjection;

    const ellipsoid = projection.ellipsoid;
    let center = sphere.center;
    const radius = sphere.radius;

    let normal: Cartesian3;
    if (Cartesian3.equals(center, Cartesian3.ZERO)) {
      // Bounding sphere is at the center. The geodetic surface normal is not
      // defined here so pick the x-axis as a fallback.
      normal = Cartesian3.clone(Cartesian3.UNIT_X, projectTo2DNormalScratch) as Cartesian3;
    } else {
      normal = ellipsoid.geodeticSurfaceNormal(center, projectTo2DNormalScratch);
    }
    const east = Cartesian3.cross(
      Cartesian3.UNIT_Z,
      normal,
      projectTo2DEastScratch
    );
    Cartesian3.normalize(east, east);
    const north = Cartesian3.cross(normal, east, projectTo2DNorthScratch);
    Cartesian3.normalize(north, north);

    Cartesian3.multiplyByScalar(normal, radius, normal);
    Cartesian3.multiplyByScalar(north, radius, north);
    Cartesian3.multiplyByScalar(east, radius, east);

    const south = Cartesian3.negate(north, projectTo2DSouthScratch);
    const west = Cartesian3.negate(east, projectTo2DWestScratch);

    const positions = projectTo2DPositionsScratch;

    // top NE corner
    let corner = positions[0];
    Cartesian3.add(normal, north, corner);
    Cartesian3.add(corner, east, corner);

    // top NW corner
    corner = positions[1];
    Cartesian3.add(normal, north, corner);
    Cartesian3.add(corner, west, corner);

    // top SW corner
    corner = positions[2];
    Cartesian3.add(normal, south, corner);
    Cartesian3.add(corner, west, corner);

    // top SE corner
    corner = positions[3];
    Cartesian3.add(normal, south, corner);
    Cartesian3.add(corner, east, corner);

    Cartesian3.negate(normal, normal);

    // bottom NE corner
    corner = positions[4];
    Cartesian3.add(normal, north, corner);
    Cartesian3.add(corner, east, corner);

    // bottom NW corner
    corner = positions[5];
    Cartesian3.add(normal, north, corner);
    Cartesian3.add(corner, west, corner);

    // bottom SW corner
    corner = positions[6];
    Cartesian3.add(normal, south, corner);
    Cartesian3.add(corner, west, corner);

    // bottom SE corner
    corner = positions[7];
    Cartesian3.add(normal, south, corner);
    Cartesian3.add(corner, east, corner);

    const length = positions.length;
    for (let i = 0; i < length; ++i) {
      const position = positions[i];
      Cartesian3.add(center, position, position);
      const cartographic = ellipsoid.cartesianToCartographic(
        position,
        projectTo2DCartographicScratch
      );
      projection.project(cartographic, position);
    }

    result = BoundingSphere.fromPoints(positions, result);

    // swizzle center components
    center = result!.center;
    const x = center.x;
    const y = center.y;
    const z = center.z;
    center.x = z;
    center.y = x;
    center.z = y;

    return result!;
  }

  /**
   * Determines whether or not a sphere is hidden from view by the occluder.
   *
   * @param sphere - The bounding sphere surrounding the occluded object.
   * @param occluder - The occluder.
   * @returns <code>true</code> if the sphere is not visible; otherwise <code>false</code>.
   */
  static isOccluded(
    sphere: BoundingSphereLike,
    occluder: OccluderLike
  ): boolean {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("sphere", sphere);
    Check.typeOf.object("occluder", occluder);
    //>>includeEnd('debug');
    return !occluder.isBoundingSphereVisible(sphere);
  }

  /**
   * Compares the provided BoundingSphere componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param left - The first BoundingSphere.
   * @param right - The second BoundingSphere.
   * @returns <code>true</code> if left and right are equal, <code>false</code> otherwise.
   */
  static equals(
    left?: BoundingSphereLike,
    right?: BoundingSphereLike
  ): boolean {
    return (
      left === right ||
      (defined(left) &&
        defined(right) &&
        Cartesian3.equals(left!.center, right!.center) &&
        left!.radius === right!.radius)
    );
  }

  /**
   * Determines which side of a plane the sphere is located.
   *
   * @param plane - The plane to test against.
   * @returns {@link Intersect.INSIDE} if the entire sphere is on the side of the plane
   *          the normal is pointing, {@link Intersect.OUTSIDE} if the entire sphere is
   *          on the opposite side, and {@link Intersect.INTERSECTING} if the sphere
   *          intersects the plane.
   */
  intersectPlane(plane: PlaneLike): number {
    return BoundingSphere.intersectPlane(this, plane);
  }

  /**
   * Computes the estimated distance squared from the closest point on a bounding sphere to a point.
   *
   * @param cartesian - The point
   * @returns The estimated distance squared from the bounding sphere to the point.
   *
   * @example
   * // Sort bounding spheres from back to front
   * spheres.sort(function(a, b) {
   *     return b.distanceSquaredTo(camera.positionWC) - a.distanceSquaredTo(camera.positionWC);
   * });
   */
  distanceSquaredTo(cartesian: Cartesian3Like): number {
    return BoundingSphere.distanceSquaredTo(this, cartesian);
  }

  /**
   * The distances calculated by the vector from the center of the bounding sphere to position projected onto direction
   * plus/minus the radius of the bounding sphere.
   * <br>
   * If you imagine the infinite number of planes with normal direction, this computes the smallest distance to the
   * closest and farthest planes from position that intersect the bounding sphere.
   *
   * @param position - The position to calculate the distance from.
   * @param direction - The direction from position.
   * @param result - A Interval to store the nearest and farthest distances.
   * @returns The nearest and farthest distances on the bounding sphere from position in direction.
   */
  computePlaneDistances(
    position: Cartesian3Like,
    direction: Cartesian3Like,
    result?: IntervalLike
  ): IntervalLike {
    return BoundingSphere.computePlaneDistances(
      this,
      position,
      direction,
      result
    );
  }

  /**
   * Determines whether or not a sphere is hidden from view by the occluder.
   *
   * @param occluder - The occluder.
   * @returns <code>true</code> if the sphere is not visible; otherwise <code>false</code>.
   */
  isOccluded(occluder: OccluderLike): boolean {
    return BoundingSphere.isOccluded(this, occluder);
  }

  /**
   * Compares this BoundingSphere against the provided BoundingSphere componentwise and returns
   * <code>true</code> if they are equal, <code>false</code> otherwise.
   *
   * @param right - The right hand side BoundingSphere.
   * @returns <code>true</code> if they are equal, <code>false</code> otherwise.
   */
  equals(right?: BoundingSphereLike): boolean {
    return BoundingSphere.equals(this, right);
  }

  /**
   * Duplicates this BoundingSphere instance.
   *
   * @param result - The object onto which to store the result.
   * @returns The modified result parameter or a new BoundingSphere instance if none was provided.
   */
  clone(result?: BoundingSphere): BoundingSphere {
    return BoundingSphere.clone(this, result)!;
  }

  /**
   * Computes the volume of the BoundingSphere.
   * @returns The volume of the BoundingSphere.
   */
  volume(): number {
    const radius = this.radius;
    return volumeConstant * radius * radius * radius;
  }
}

export default BoundingSphere;

// Export interfaces for use by other modules
export type {
  BoundingSphereLike,
  Cartesian3Like,
  PlaneLike,
  OccluderLike,
  OrientedBoundingBoxLike,
  ProjectionLike,
  EllipsoidLike,
  IntervalLike,
};
