import earcut from "../ThirdParty/earcut.js";
import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import Check from "./Check.js";
import ComponentDatatype from "./ComponentDatatype.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import Ellipsoid from "./Ellipsoid.js";
import EllipsoidRhumbLine from "./EllipsoidRhumbLine.js";
import Geometry from "./Geometry.js";
import GeometryAttribute from "./GeometryAttribute.js";
import CesiumMath from "./Math.js";
import PrimitiveType from "./PrimitiveType.js";
import WindingOrder from "./WindingOrder.js";

const scaleToGeodeticHeightN = new Cartesian3();
const scaleToGeodeticHeightP = new Cartesian3();

/**
 * @private
 */
const PolygonPipeline = {};

/**
 * @exception {DeveloperError} At least three positions are required.
 */
PolygonPipeline.computeArea2D = function (positions) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("positions", positions);
  Check.typeOf.number.greaterThanOrEquals(
    "positions.length",
    positions.length,
    3
  );
  //>>includeEnd('debug');

  const length = positions.length;
  let area = 0.0;

  for (let i0 = length - 1, i1 = 0; i1 < length; i0 = i1++) {
    const v0 = positions[i0];
    const v1 = positions[i1];

    area += v0.x * v1.y - v1.x * v0.y;
  }

  return area * 0.5;
};

/**
 * @returns {WindingOrder} The winding order.
 *
 * @exception {DeveloperError} At least three positions are required.
 */
PolygonPipeline.computeWindingOrder2D = function (positions) {
  const area = PolygonPipeline.computeArea2D(positions);
  return area > 0.0 ? WindingOrder.COUNTER_CLOCKWISE : WindingOrder.CLOCKWISE;
};

/**
 * Triangulate a polygon.
 *
 * @param {Cartesian2[]} positions Cartesian2 array containing the vertices of the polygon
 * @param {Number[]} [holes] An array of the staring indices of the holes.
 * @returns {Number[]} Index array representing triangles that fill the polygon
 */
PolygonPipeline.triangulate = function (positions, holes) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("positions", positions);
  //>>includeEnd('debug');

  const flattenedPositions = Cartesian2.packArray(positions);
  return earcut(flattenedPositions, holes, 2);
};

const subdivisionV0Scratch = new Cartesian3();
const subdivisionV1Scratch = new Cartesian3();
const subdivisionV2Scratch = new Cartesian3();
const subdivisionS0Scratch = new Cartesian3();
const subdivisionS1Scratch = new Cartesian3();
const subdivisionS2Scratch = new Cartesian3();
const subdivisionMidScratch = new Cartesian3();

/**
 * Subdivides positions and raises points to the surface of the ellipsoid.
 *
 * @param {Ellipsoid} ellipsoid The ellipsoid the polygon in on.
 * @param {Cartesian3[]} positions An array of {@link Cartesian3} positions of the polygon.
 * @param {Number[]} indices An array of indices that determines the triangles in the polygon.
 * @param {Number} [granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
 *
 * @exception {DeveloperError} At least three indices are required.
 * @exception {DeveloperError} The number of indices must be divisable by three.
 * @exception {DeveloperError} Granularity must be greater than zero.
 */
PolygonPipeline.computeSubdivision = function (
  ellipsoid,
  positions,
  indices,
  granularity
) {
  granularity = defaultValue(granularity, CesiumMath.RADIANS_PER_DEGREE);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("ellipsoid", ellipsoid);
  Check.defined("positions", positions);
  Check.defined("indices", indices);
  Check.typeOf.number.greaterThanOrEquals("indices.length", indices.length, 3);
  Check.typeOf.number.equals("indices.length % 3", "0", indices.length % 3, 0);
  Check.typeOf.number.greaterThan("granularity", granularity, 0.0);
  //>>includeEnd('debug');

  // triangles that need (or might need) to be subdivided.
  const triangles = indices.slice(0);

  // New positions due to edge splits are appended to the positions list.
  let i;
  const length = positions.length;
  const subdividedPositions = new Array(length * 3);
  let q = 0;
  for (i = 0; i < length; i++) {
    const item = positions[i];
    subdividedPositions[q++] = item.x;
    subdividedPositions[q++] = item.y;
    subdividedPositions[q++] = item.z;
  }

  const subdividedIndices = [];

  // Used to make sure shared edges are not split more than once.
  const edges = {};

  const radius = ellipsoid.maximumRadius;
  const minDistance = CesiumMath.chordLength(granularity, radius);
  const minDistanceSqrd = minDistance * minDistance;

  while (triangles.length > 0) {
    const i2 = triangles.pop();
    const i1 = triangles.pop();
    const i0 = triangles.pop();

    const v0 = Cartesian3.fromArray(
      subdividedPositions,
      i0 * 3,
      subdivisionV0Scratch
    );
    const v1 = Cartesian3.fromArray(
      subdividedPositions,
      i1 * 3,
      subdivisionV1Scratch
    );
    const v2 = Cartesian3.fromArray(
      subdividedPositions,
      i2 * 3,
      subdivisionV2Scratch
    );

    const s0 = Cartesian3.multiplyByScalar(
      Cartesian3.normalize(v0, subdivisionS0Scratch),
      radius,
      subdivisionS0Scratch
    );
    const s1 = Cartesian3.multiplyByScalar(
      Cartesian3.normalize(v1, subdivisionS1Scratch),
      radius,
      subdivisionS1Scratch
    );
    const s2 = Cartesian3.multiplyByScalar(
      Cartesian3.normalize(v2, subdivisionS2Scratch),
      radius,
      subdivisionS2Scratch
    );

    const g0 = Cartesian3.magnitudeSquared(
      Cartesian3.subtract(s0, s1, subdivisionMidScratch)
    );
    const g1 = Cartesian3.magnitudeSquared(
      Cartesian3.subtract(s1, s2, subdivisionMidScratch)
    );
    const g2 = Cartesian3.magnitudeSquared(
      Cartesian3.subtract(s2, s0, subdivisionMidScratch)
    );

    const max = Math.max(g0, g1, g2);
    let edge;
    let mid;

    // if the max length squared of a triangle edge is greater than the chord length of squared
    // of the granularity, subdivide the triangle
    if (max > minDistanceSqrd) {
      if (g0 === max) {
        edge = Math.min(i0, i1) + " " + Math.max(i0, i1);

        i = edges[edge];
        if (!defined(i)) {
          mid = Cartesian3.add(v0, v1, subdivisionMidScratch);
          Cartesian3.multiplyByScalar(mid, 0.5, mid);
          subdividedPositions.push(mid.x, mid.y, mid.z);
          i = subdividedPositions.length / 3 - 1;
          edges[edge] = i;
        }

        triangles.push(i0, i, i2);
        triangles.push(i, i1, i2);
      } else if (g1 === max) {
        edge = Math.min(i1, i2) + " " + Math.max(i1, i2);

        i = edges[edge];
        if (!defined(i)) {
          mid = Cartesian3.add(v1, v2, subdivisionMidScratch);
          Cartesian3.multiplyByScalar(mid, 0.5, mid);
          subdividedPositions.push(mid.x, mid.y, mid.z);
          i = subdividedPositions.length / 3 - 1;
          edges[edge] = i;
        }

        triangles.push(i1, i, i0);
        triangles.push(i, i2, i0);
      } else if (g2 === max) {
        edge = Math.min(i2, i0) + " " + Math.max(i2, i0);

        i = edges[edge];
        if (!defined(i)) {
          mid = Cartesian3.add(v2, v0, subdivisionMidScratch);
          Cartesian3.multiplyByScalar(mid, 0.5, mid);
          subdividedPositions.push(mid.x, mid.y, mid.z);
          i = subdividedPositions.length / 3 - 1;
          edges[edge] = i;
        }

        triangles.push(i2, i, i1);
        triangles.push(i, i0, i1);
      }
    } else {
      subdividedIndices.push(i0);
      subdividedIndices.push(i1);
      subdividedIndices.push(i2);
    }
  }

  return new Geometry({
    attributes: {
      position: new GeometryAttribute({
        componentDatatype: ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3,
        values: subdividedPositions,
      }),
    },
    indices: subdividedIndices,
    primitiveType: PrimitiveType.TRIANGLES,
  });
};

const subdivisionC0Scratch = new Cartographic();
const subdivisionC1Scratch = new Cartographic();
const subdivisionC2Scratch = new Cartographic();
const subdivisionCartographicScratch = new Cartographic();

/**
 * Subdivides positions on rhumb lines and raises points to the surface of the ellipsoid.
 *
 * @param {Ellipsoid} ellipsoid The ellipsoid the polygon in on.
 * @param {Cartesian3[]} positions An array of {@link Cartesian3} positions of the polygon.
 * @param {Number[]} indices An array of indices that determines the triangles in the polygon.
 * @param {Number} [granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
 *
 * @exception {DeveloperError} At least three indices are required.
 * @exception {DeveloperError} The number of indices must be divisable by three.
 * @exception {DeveloperError} Granularity must be greater than zero.
 */
PolygonPipeline.computeRhumbLineSubdivision = function (
  ellipsoid,
  positions,
  indices,
  granularity
) {
  granularity = defaultValue(granularity, CesiumMath.RADIANS_PER_DEGREE);

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("ellipsoid", ellipsoid);
  Check.defined("positions", positions);
  Check.defined("indices", indices);
  Check.typeOf.number.greaterThanOrEquals("indices.length", indices.length, 3);
  Check.typeOf.number.equals("indices.length % 3", "0", indices.length % 3, 0);
  Check.typeOf.number.greaterThan("granularity", granularity, 0.0);
  //>>includeEnd('debug');

  // triangles that need (or might need) to be subdivided.
  const triangles = indices.slice(0);

  // New positions due to edge splits are appended to the positions list.
  let i;
  const length = positions.length;
  const subdividedPositions = new Array(length * 3);
  let q = 0;
  for (i = 0; i < length; i++) {
    const item = positions[i];
    subdividedPositions[q++] = item.x;
    subdividedPositions[q++] = item.y;
    subdividedPositions[q++] = item.z;
  }

  const subdividedIndices = [];

  // Used to make sure shared edges are not split more than once.
  const edges = {};

  const radius = ellipsoid.maximumRadius;
  const minDistance = CesiumMath.chordLength(granularity, radius);

  const rhumb0 = new EllipsoidRhumbLine(undefined, undefined, ellipsoid);
  const rhumb1 = new EllipsoidRhumbLine(undefined, undefined, ellipsoid);
  const rhumb2 = new EllipsoidRhumbLine(undefined, undefined, ellipsoid);

  while (triangles.length > 0) {
    const i2 = triangles.pop();
    const i1 = triangles.pop();
    const i0 = triangles.pop();

    const v0 = Cartesian3.fromArray(
      subdividedPositions,
      i0 * 3,
      subdivisionV0Scratch
    );
    const v1 = Cartesian3.fromArray(
      subdividedPositions,
      i1 * 3,
      subdivisionV1Scratch
    );
    const v2 = Cartesian3.fromArray(
      subdividedPositions,
      i2 * 3,
      subdivisionV2Scratch
    );

    const c0 = ellipsoid.cartesianToCartographic(v0, subdivisionC0Scratch);
    const c1 = ellipsoid.cartesianToCartographic(v1, subdivisionC1Scratch);
    const c2 = ellipsoid.cartesianToCartographic(v2, subdivisionC2Scratch);

    rhumb0.setEndPoints(c0, c1);
    const g0 = rhumb0.surfaceDistance;
    rhumb1.setEndPoints(c1, c2);
    const g1 = rhumb1.surfaceDistance;
    rhumb2.setEndPoints(c2, c0);
    const g2 = rhumb2.surfaceDistance;

    const max = Math.max(g0, g1, g2);
    let edge;
    let mid;
    let midHeight;
    let midCartesian3;

    // if the max length squared of a triangle edge is greater than granularity, subdivide the triangle
    if (max > minDistance) {
      if (g0 === max) {
        edge = Math.min(i0, i1) + " " + Math.max(i0, i1);

        i = edges[edge];
        if (!defined(i)) {
          mid = rhumb0.interpolateUsingFraction(
            0.5,
            subdivisionCartographicScratch
          );
          midHeight = (c0.height + c1.height) * 0.5;
          midCartesian3 = Cartesian3.fromRadians(
            mid.longitude,
            mid.latitude,
            midHeight,
            ellipsoid,
            subdivisionMidScratch
          );
          subdividedPositions.push(
            midCartesian3.x,
            midCartesian3.y,
            midCartesian3.z
          );
          i = subdividedPositions.length / 3 - 1;
          edges[edge] = i;
        }

        triangles.push(i0, i, i2);
        triangles.push(i, i1, i2);
      } else if (g1 === max) {
        edge = Math.min(i1, i2) + " " + Math.max(i1, i2);

        i = edges[edge];
        if (!defined(i)) {
          mid = rhumb1.interpolateUsingFraction(
            0.5,
            subdivisionCartographicScratch
          );
          midHeight = (c1.height + c2.height) * 0.5;
          midCartesian3 = Cartesian3.fromRadians(
            mid.longitude,
            mid.latitude,
            midHeight,
            ellipsoid,
            subdivisionMidScratch
          );
          subdividedPositions.push(
            midCartesian3.x,
            midCartesian3.y,
            midCartesian3.z
          );
          i = subdividedPositions.length / 3 - 1;
          edges[edge] = i;
        }

        triangles.push(i1, i, i0);
        triangles.push(i, i2, i0);
      } else if (g2 === max) {
        edge = Math.min(i2, i0) + " " + Math.max(i2, i0);

        i = edges[edge];
        if (!defined(i)) {
          mid = rhumb2.interpolateUsingFraction(
            0.5,
            subdivisionCartographicScratch
          );
          midHeight = (c2.height + c0.height) * 0.5;
          midCartesian3 = Cartesian3.fromRadians(
            mid.longitude,
            mid.latitude,
            midHeight,
            ellipsoid,
            subdivisionMidScratch
          );
          subdividedPositions.push(
            midCartesian3.x,
            midCartesian3.y,
            midCartesian3.z
          );
          i = subdividedPositions.length / 3 - 1;
          edges[edge] = i;
        }

        triangles.push(i2, i, i1);
        triangles.push(i, i0, i1);
      }
    } else {
      subdividedIndices.push(i0);
      subdividedIndices.push(i1);
      subdividedIndices.push(i2);
    }
  }

  return new Geometry({
    attributes: {
      position: new GeometryAttribute({
        componentDatatype: ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3,
        values: subdividedPositions,
      }),
    },
    indices: subdividedIndices,
    primitiveType: PrimitiveType.TRIANGLES,
  });
};

/**
 * Scales each position of a geometry's position attribute to a height, in place.
 *
 * @param {Number[]} positions The array of numbers representing the positions to be scaled
 * @param {Number} [height=0.0] The desired height to add to the positions
 * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid on which the positions lie.
 * @param {Boolean} [scaleToSurface=true] <code>true</code> if the positions need to be scaled to the surface before the height is added.
 * @returns {Number[]} The input array of positions, scaled to height
 */
PolygonPipeline.scaleToGeodeticHeight = function (
  positions,
  height,
  ellipsoid,
  scaleToSurface
) {
  ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

  let n = scaleToGeodeticHeightN;
  let p = scaleToGeodeticHeightP;

  height = defaultValue(height, 0.0);
  scaleToSurface = defaultValue(scaleToSurface, true);

  if (defined(positions)) {
    const length = positions.length;

    for (let i = 0; i < length; i += 3) {
      Cartesian3.fromArray(positions, i, p);

      if (scaleToSurface) {
        p = ellipsoid.scaleToGeodeticSurface(p, p);
      }

      if (height !== 0) {
        n = ellipsoid.geodeticSurfaceNormal(p, n);

        Cartesian3.multiplyByScalar(n, height, n);
        Cartesian3.add(p, n, p);
      }

      positions[i] = p.x;
      positions[i + 1] = p.y;
      positions[i + 2] = p.z;
    }
  }

  return positions;
};
export default PolygonPipeline;
