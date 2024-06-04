import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Interval from "./Interval.js";
import CesiumMath from "./Math.js";
import Matrix3 from "./Matrix3.js";
import QuadraticRealPolynomial from "./QuadraticRealPolynomial.js";
import QuarticRealPolynomial from "./QuarticRealPolynomial.js";
import Ray from "./Ray.js";

/**
 * Functions for computing the intersection between geometries such as rays, planes, triangles, and ellipsoids.
 *
 * @namespace IntersectionTests
 */
const IntersectionTests = {};

/**
 * Computes the intersection of a ray and a plane.
 *
 * @param {Ray} ray The ray.
 * @param {Plane} plane The plane.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3} The intersection point or undefined if there is no intersections.
 */
IntersectionTests.rayPlane = function (ray, plane, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(ray)) {
    throw new DeveloperError("ray is required.");
  }
  if (!defined(plane)) {
    throw new DeveloperError("plane is required.");
  }
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Cartesian3();
  }

  const origin = ray.origin;
  const direction = ray.direction;
  const normal = plane.normal;
  const denominator = Cartesian3.dot(normal, direction);

  if (Math.abs(denominator) < CesiumMath.EPSILON15) {
    // Ray is parallel to plane.  The ray may be in the polygon's plane.
    return undefined;
  }

  const t = (-plane.distance - Cartesian3.dot(normal, origin)) / denominator;

  if (t < 0) {
    return undefined;
  }

  result = Cartesian3.multiplyByScalar(direction, t, result);
  return Cartesian3.add(origin, result, result);
};

const scratchEdge0 = new Cartesian3();
const scratchEdge1 = new Cartesian3();
const scratchPVec = new Cartesian3();
const scratchTVec = new Cartesian3();
const scratchQVec = new Cartesian3();

/**
 * Computes the intersection of a ray and a triangle as a parametric distance along the input ray. The result is negative when the triangle is behind the ray.
 *
 * Implements {@link https://cadxfem.org/inf/Fast%20MinimumStorage%20RayTriangle%20Intersection.pdf|
 * Fast Minimum Storage Ray/Triangle Intersection} by Tomas Moller and Ben Trumbore.
 *
 * @memberof IntersectionTests
 *
 * @param {Ray} ray The ray.
 * @param {Cartesian3} p0 The first vertex of the triangle.
 * @param {Cartesian3} p1 The second vertex of the triangle.
 * @param {Cartesian3} p2 The third vertex of the triangle.
 * @param {boolean} [cullBackFaces=false] If <code>true</code>, will only compute an intersection with the front face of the triangle
 *                  and return undefined for intersections with the back face.
 * @returns {number} The intersection as a parametric distance along the ray, or undefined if there is no intersection.
 */
IntersectionTests.rayTriangleParametric = function (
  ray,
  p0,
  p1,
  p2,
  cullBackFaces
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(ray)) {
    throw new DeveloperError("ray is required.");
  }
  if (!defined(p0)) {
    throw new DeveloperError("p0 is required.");
  }
  if (!defined(p1)) {
    throw new DeveloperError("p1 is required.");
  }
  if (!defined(p2)) {
    throw new DeveloperError("p2 is required.");
  }
  //>>includeEnd('debug');

  cullBackFaces = defaultValue(cullBackFaces, false);

  const origin = ray.origin;
  const direction = ray.direction;

  const edge0 = Cartesian3.subtract(p1, p0, scratchEdge0);
  const edge1 = Cartesian3.subtract(p2, p0, scratchEdge1);

  const p = Cartesian3.cross(direction, edge1, scratchPVec);
  const det = Cartesian3.dot(edge0, p);

  let tvec;
  let q;

  let u;
  let v;
  let t;

  if (cullBackFaces) {
    if (det < CesiumMath.EPSILON6) {
      return undefined;
    }

    tvec = Cartesian3.subtract(origin, p0, scratchTVec);
    u = Cartesian3.dot(tvec, p);
    if (u < 0.0 || u > det) {
      return undefined;
    }

    q = Cartesian3.cross(tvec, edge0, scratchQVec);

    v = Cartesian3.dot(direction, q);
    if (v < 0.0 || u + v > det) {
      return undefined;
    }

    t = Cartesian3.dot(edge1, q) / det;
  } else {
    if (Math.abs(det) < CesiumMath.EPSILON6) {
      return undefined;
    }
    const invDet = 1.0 / det;

    tvec = Cartesian3.subtract(origin, p0, scratchTVec);
    u = Cartesian3.dot(tvec, p) * invDet;
    if (u < 0.0 || u > 1.0) {
      return undefined;
    }

    q = Cartesian3.cross(tvec, edge0, scratchQVec);

    v = Cartesian3.dot(direction, q) * invDet;
    if (v < 0.0 || u + v > 1.0) {
      return undefined;
    }

    t = Cartesian3.dot(edge1, q) * invDet;
  }

  return t;
};

/**
 * Computes the intersection of a ray and a triangle as a Cartesian3 coordinate.
 *
 * Implements {@link https://cadxfem.org/inf/Fast%20MinimumStorage%20RayTriangle%20Intersection.pdf|
 * Fast Minimum Storage Ray/Triangle Intersection} by Tomas Moller and Ben Trumbore.
 *
 * @memberof IntersectionTests
 *
 * @param {Ray} ray The ray.
 * @param {Cartesian3} p0 The first vertex of the triangle.
 * @param {Cartesian3} p1 The second vertex of the triangle.
 * @param {Cartesian3} p2 The third vertex of the triangle.
 * @param {boolean} [cullBackFaces=false] If <code>true</code>, will only compute an intersection with the front face of the triangle
 *                  and return undefined for intersections with the back face.
 * @param {Cartesian3} [result] The <code>Cartesian3</code> onto which to store the result.
 * @returns {Cartesian3} The intersection point or undefined if there is no intersections.
 */
IntersectionTests.rayTriangle = function (
  ray,
  p0,
  p1,
  p2,
  cullBackFaces,
  result
) {
  const t = IntersectionTests.rayTriangleParametric(
    ray,
    p0,
    p1,
    p2,
    cullBackFaces
  );
  if (!defined(t) || t < 0.0) {
    return undefined;
  }

  if (!defined(result)) {
    result = new Cartesian3();
  }

  Cartesian3.multiplyByScalar(ray.direction, t, result);
  return Cartesian3.add(ray.origin, result, result);
};

const scratchLineSegmentTriangleRay = new Ray();

/**
 * Computes the intersection of a line segment and a triangle.
 * @memberof IntersectionTests
 *
 * @param {Cartesian3} v0 The an end point of the line segment.
 * @param {Cartesian3} v1 The other end point of the line segment.
 * @param {Cartesian3} p0 The first vertex of the triangle.
 * @param {Cartesian3} p1 The second vertex of the triangle.
 * @param {Cartesian3} p2 The third vertex of the triangle.
 * @param {boolean} [cullBackFaces=false] If <code>true</code>, will only compute an intersection with the front face of the triangle
 *                  and return undefined for intersections with the back face.
 * @param {Cartesian3} [result] The <code>Cartesian3</code> onto which to store the result.
 * @returns {Cartesian3} The intersection point or undefined if there is no intersections.
 */
IntersectionTests.lineSegmentTriangle = function (
  v0,
  v1,
  p0,
  p1,
  p2,
  cullBackFaces,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(v0)) {
    throw new DeveloperError("v0 is required.");
  }
  if (!defined(v1)) {
    throw new DeveloperError("v1 is required.");
  }
  if (!defined(p0)) {
    throw new DeveloperError("p0 is required.");
  }
  if (!defined(p1)) {
    throw new DeveloperError("p1 is required.");
  }
  if (!defined(p2)) {
    throw new DeveloperError("p2 is required.");
  }
  //>>includeEnd('debug');

  const ray = scratchLineSegmentTriangleRay;
  Cartesian3.clone(v0, ray.origin);
  Cartesian3.subtract(v1, v0, ray.direction);
  Cartesian3.normalize(ray.direction, ray.direction);

  const t = IntersectionTests.rayTriangleParametric(
    ray,
    p0,
    p1,
    p2,
    cullBackFaces
  );
  if (!defined(t) || t < 0.0 || t > Cartesian3.distance(v0, v1)) {
    return undefined;
  }

  if (!defined(result)) {
    result = new Cartesian3();
  }

  Cartesian3.multiplyByScalar(ray.direction, t, result);
  return Cartesian3.add(ray.origin, result, result);
};

function solveQuadratic(a, b, c, result) {
  const det = b * b - 4.0 * a * c;
  if (det < 0.0) {
    return undefined;
  } else if (det > 0.0) {
    const denom = 1.0 / (2.0 * a);
    const disc = Math.sqrt(det);
    const root0 = (-b + disc) * denom;
    const root1 = (-b - disc) * denom;

    if (root0 < root1) {
      result.root0 = root0;
      result.root1 = root1;
    } else {
      result.root0 = root1;
      result.root1 = root0;
    }

    return result;
  }

  const root = -b / (2.0 * a);
  if (root === 0.0) {
    return undefined;
  }

  result.root0 = result.root1 = root;
  return result;
}

const raySphereRoots = {
  root0: 0.0,
  root1: 0.0,
};

function raySphere(ray, sphere, result) {
  if (!defined(result)) {
    result = new Interval();
  }

  const origin = ray.origin;
  const direction = ray.direction;

  const center = sphere.center;
  const radiusSquared = sphere.radius * sphere.radius;

  const diff = Cartesian3.subtract(origin, center, scratchPVec);

  const a = Cartesian3.dot(direction, direction);
  const b = 2.0 * Cartesian3.dot(direction, diff);
  const c = Cartesian3.magnitudeSquared(diff) - radiusSquared;

  const roots = solveQuadratic(a, b, c, raySphereRoots);
  if (!defined(roots)) {
    return undefined;
  }

  result.start = roots.root0;
  result.stop = roots.root1;
  return result;
}

/**
 * Computes the intersection points of a ray with a sphere.
 * @memberof IntersectionTests
 *
 * @param {Ray} ray The ray.
 * @param {BoundingSphere} sphere The sphere.
 * @param {Interval} [result] The result onto which to store the result.
 * @returns {Interval} The interval containing scalar points along the ray or undefined if there are no intersections.
 */
IntersectionTests.raySphere = function (ray, sphere, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(ray)) {
    throw new DeveloperError("ray is required.");
  }
  if (!defined(sphere)) {
    throw new DeveloperError("sphere is required.");
  }
  //>>includeEnd('debug');

  result = raySphere(ray, sphere, result);
  if (!defined(result) || result.stop < 0.0) {
    return undefined;
  }

  result.start = Math.max(result.start, 0.0);
  return result;
};

const scratchLineSegmentRay = new Ray();

/**
 * Computes the intersection points of a line segment with a sphere.
 * @memberof IntersectionTests
 *
 * @param {Cartesian3} p0 An end point of the line segment.
 * @param {Cartesian3} p1 The other end point of the line segment.
 * @param {BoundingSphere} sphere The sphere.
 * @param {Interval} [result] The result onto which to store the result.
 * @returns {Interval} The interval containing scalar points along the ray or undefined if there are no intersections.
 */
IntersectionTests.lineSegmentSphere = function (p0, p1, sphere, result) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(p0)) {
    throw new DeveloperError("p0 is required.");
  }
  if (!defined(p1)) {
    throw new DeveloperError("p1 is required.");
  }
  if (!defined(sphere)) {
    throw new DeveloperError("sphere is required.");
  }
  //>>includeEnd('debug');

  const ray = scratchLineSegmentRay;
  Cartesian3.clone(p0, ray.origin);
  const direction = Cartesian3.subtract(p1, p0, ray.direction);

  const maxT = Cartesian3.magnitude(direction);
  Cartesian3.normalize(direction, direction);

  result = raySphere(ray, sphere, result);
  if (!defined(result) || result.stop < 0.0 || result.start > maxT) {
    return undefined;
  }

  result.start = Math.max(result.start, 0.0);
  result.stop = Math.min(result.stop, maxT);
  return result;
};

const scratchQ = new Cartesian3();
const scratchW = new Cartesian3();

/**
 * Computes the intersection points of a ray with an ellipsoid.
 *
 * @param {Ray} ray The ray.
 * @param {Ellipsoid} ellipsoid The ellipsoid.
 * @returns {Interval} The interval containing scalar points along the ray or undefined if there are no intersections.
 */
IntersectionTests.rayEllipsoid = function (ray, ellipsoid) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(ray)) {
    throw new DeveloperError("ray is required.");
  }
  if (!defined(ellipsoid)) {
    throw new DeveloperError("ellipsoid is required.");
  }
  //>>includeEnd('debug');

  const inverseRadii = ellipsoid.oneOverRadii;
  const q = Cartesian3.multiplyComponents(inverseRadii, ray.origin, scratchQ);
  const w = Cartesian3.multiplyComponents(
    inverseRadii,
    ray.direction,
    scratchW
  );

  const q2 = Cartesian3.magnitudeSquared(q);
  const qw = Cartesian3.dot(q, w);

  let difference, w2, product, discriminant, temp;

  if (q2 > 1.0) {
    // Outside ellipsoid.
    if (qw >= 0.0) {
      // Looking outward or tangent (0 intersections).
      return undefined;
    }

    // qw < 0.0.
    const qw2 = qw * qw;
    difference = q2 - 1.0; // Positively valued.
    w2 = Cartesian3.magnitudeSquared(w);
    product = w2 * difference;

    if (qw2 < product) {
      // Imaginary roots (0 intersections).
      return undefined;
    } else if (qw2 > product) {
      // Distinct roots (2 intersections).
      discriminant = qw * qw - product;
      temp = -qw + Math.sqrt(discriminant); // Avoid cancellation.
      const root0 = temp / w2;
      const root1 = difference / temp;
      if (root0 < root1) {
        return new Interval(root0, root1);
      }

      return {
        start: root1,
        stop: root0,
      };
    }
    // qw2 == product.  Repeated roots (2 intersections).
    const root = Math.sqrt(difference / w2);
    return new Interval(root, root);
  } else if (q2 < 1.0) {
    // Inside ellipsoid (2 intersections).
    difference = q2 - 1.0; // Negatively valued.
    w2 = Cartesian3.magnitudeSquared(w);
    product = w2 * difference; // Negatively valued.

    discriminant = qw * qw - product;
    temp = -qw + Math.sqrt(discriminant); // Positively valued.
    return new Interval(0.0, temp / w2);
  }
  // q2 == 1.0. On ellipsoid.
  if (qw < 0.0) {
    // Looking inward.
    w2 = Cartesian3.magnitudeSquared(w);
    return new Interval(0.0, -qw / w2);
  }

  // qw >= 0.0.  Looking outward or tangent.
  return undefined;
};

function addWithCancellationCheck(left, right, tolerance) {
  const difference = left + right;
  if (
    CesiumMath.sign(left) !== CesiumMath.sign(right) &&
    Math.abs(difference / Math.max(Math.abs(left), Math.abs(right))) < tolerance
  ) {
    return 0.0;
  }

  return difference;
}

/**
 * @private
 */
IntersectionTests.quadraticVectorExpression = function (A, b, c, x, w) {
  const xSquared = x * x;
  const wSquared = w * w;

  const l2 = (A[Matrix3.COLUMN1ROW1] - A[Matrix3.COLUMN2ROW2]) * wSquared;
  const l1 =
    w *
    (x *
      addWithCancellationCheck(
        A[Matrix3.COLUMN1ROW0],
        A[Matrix3.COLUMN0ROW1],
        CesiumMath.EPSILON15
      ) +
      b.y);
  const l0 =
    A[Matrix3.COLUMN0ROW0] * xSquared +
    A[Matrix3.COLUMN2ROW2] * wSquared +
    x * b.x +
    c;

  const r1 =
    wSquared *
    addWithCancellationCheck(
      A[Matrix3.COLUMN2ROW1],
      A[Matrix3.COLUMN1ROW2],
      CesiumMath.EPSILON15
    );
  const r0 =
    w *
    (x *
      addWithCancellationCheck(A[Matrix3.COLUMN2ROW0], A[Matrix3.COLUMN0ROW2]) +
      b.z);

  let cosines;
  const solutions = [];
  if (r0 === 0.0 && r1 === 0.0) {
    cosines = QuadraticRealPolynomial.computeRealRoots(l2, l1, l0);
    if (cosines.length === 0) {
      return solutions;
    }

    const cosine0 = cosines[0];
    const sine0 = Math.sqrt(Math.max(1.0 - cosine0 * cosine0, 0.0));
    solutions.push(new Cartesian3(x, w * cosine0, w * -sine0));
    solutions.push(new Cartesian3(x, w * cosine0, w * sine0));

    if (cosines.length === 2) {
      const cosine1 = cosines[1];
      const sine1 = Math.sqrt(Math.max(1.0 - cosine1 * cosine1, 0.0));
      solutions.push(new Cartesian3(x, w * cosine1, w * -sine1));
      solutions.push(new Cartesian3(x, w * cosine1, w * sine1));
    }

    return solutions;
  }

  const r0Squared = r0 * r0;
  const r1Squared = r1 * r1;
  const l2Squared = l2 * l2;
  const r0r1 = r0 * r1;

  const c4 = l2Squared + r1Squared;
  const c3 = 2.0 * (l1 * l2 + r0r1);
  const c2 = 2.0 * l0 * l2 + l1 * l1 - r1Squared + r0Squared;
  const c1 = 2.0 * (l0 * l1 - r0r1);
  const c0 = l0 * l0 - r0Squared;

  if (c4 === 0.0 && c3 === 0.0 && c2 === 0.0 && c1 === 0.0) {
    return solutions;
  }

  cosines = QuarticRealPolynomial.computeRealRoots(c4, c3, c2, c1, c0);
  const length = cosines.length;
  if (length === 0) {
    return solutions;
  }

  for (let i = 0; i < length; ++i) {
    const cosine = cosines[i];
    const cosineSquared = cosine * cosine;
    const sineSquared = Math.max(1.0 - cosineSquared, 0.0);
    const sine = Math.sqrt(sineSquared);

    //const left = l2 * cosineSquared + l1 * cosine + l0;
    let left;
    if (CesiumMath.sign(l2) === CesiumMath.sign(l0)) {
      left = addWithCancellationCheck(
        l2 * cosineSquared + l0,
        l1 * cosine,
        CesiumMath.EPSILON12
      );
    } else if (CesiumMath.sign(l0) === CesiumMath.sign(l1 * cosine)) {
      left = addWithCancellationCheck(
        l2 * cosineSquared,
        l1 * cosine + l0,
        CesiumMath.EPSILON12
      );
    } else {
      left = addWithCancellationCheck(
        l2 * cosineSquared + l1 * cosine,
        l0,
        CesiumMath.EPSILON12
      );
    }

    const right = addWithCancellationCheck(
      r1 * cosine,
      r0,
      CesiumMath.EPSILON15
    );
    const product = left * right;

    if (product < 0.0) {
      solutions.push(new Cartesian3(x, w * cosine, w * sine));
    } else if (product > 0.0) {
      solutions.push(new Cartesian3(x, w * cosine, w * -sine));
    } else if (sine !== 0.0) {
      solutions.push(new Cartesian3(x, w * cosine, w * -sine));
      solutions.push(new Cartesian3(x, w * cosine, w * sine));
      ++i;
    } else {
      solutions.push(new Cartesian3(x, w * cosine, w * sine));
    }
  }

  return solutions;
};

const firstAxisScratch = new Cartesian3();
const secondAxisScratch = new Cartesian3();
const thirdAxisScratch = new Cartesian3();
const referenceScratch = new Cartesian3();
const bCart = new Cartesian3();
const bScratch = new Matrix3();
const btScratch = new Matrix3();
const diScratch = new Matrix3();
const dScratch = new Matrix3();
const cScratch = new Matrix3();
const tempMatrix = new Matrix3();
const aScratch = new Matrix3();
const sScratch = new Cartesian3();
const closestScratch = new Cartesian3();
const surfPointScratch = new Cartographic();

/**
 * Provides the point along the ray which is nearest to the ellipsoid.
 *
 * @param {Ray} ray The ray.
 * @param {Ellipsoid} ellipsoid The ellipsoid.
 * @returns {Cartesian3} The nearest planetodetic point on the ray.
 */
IntersectionTests.grazingAltitudeLocation = function (ray, ellipsoid) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(ray)) {
    throw new DeveloperError("ray is required.");
  }
  if (!defined(ellipsoid)) {
    throw new DeveloperError("ellipsoid is required.");
  }
  //>>includeEnd('debug');

  const position = ray.origin;
  const direction = ray.direction;

  if (!Cartesian3.equals(position, Cartesian3.ZERO)) {
    const normal = ellipsoid.geodeticSurfaceNormal(position, firstAxisScratch);
    if (Cartesian3.dot(direction, normal) >= 0.0) {
      // The location provided is the closest point in altitude
      return position;
    }
  }

  const intersects = defined(this.rayEllipsoid(ray, ellipsoid));

  // Compute the scaled direction vector.
  const f = ellipsoid.transformPositionToScaledSpace(
    direction,
    firstAxisScratch
  );

  // Constructs a basis from the unit scaled direction vector. Construct its rotation and transpose.
  const firstAxis = Cartesian3.normalize(f, f);
  const reference = Cartesian3.mostOrthogonalAxis(f, referenceScratch);
  const secondAxis = Cartesian3.normalize(
    Cartesian3.cross(reference, firstAxis, secondAxisScratch),
    secondAxisScratch
  );
  const thirdAxis = Cartesian3.normalize(
    Cartesian3.cross(firstAxis, secondAxis, thirdAxisScratch),
    thirdAxisScratch
  );
  const B = bScratch;
  B[0] = firstAxis.x;
  B[1] = firstAxis.y;
  B[2] = firstAxis.z;
  B[3] = secondAxis.x;
  B[4] = secondAxis.y;
  B[5] = secondAxis.z;
  B[6] = thirdAxis.x;
  B[7] = thirdAxis.y;
  B[8] = thirdAxis.z;

  const B_T = Matrix3.transpose(B, btScratch);

  // Get the scaling matrix and its inverse.
  const D_I = Matrix3.fromScale(ellipsoid.radii, diScratch);
  const D = Matrix3.fromScale(ellipsoid.oneOverRadii, dScratch);

  const C = cScratch;
  C[0] = 0.0;
  C[1] = -direction.z;
  C[2] = direction.y;
  C[3] = direction.z;
  C[4] = 0.0;
  C[5] = -direction.x;
  C[6] = -direction.y;
  C[7] = direction.x;
  C[8] = 0.0;

  const temp = Matrix3.multiply(
    Matrix3.multiply(B_T, D, tempMatrix),
    C,
    tempMatrix
  );
  const A = Matrix3.multiply(
    Matrix3.multiply(temp, D_I, aScratch),
    B,
    aScratch
  );
  const b = Matrix3.multiplyByVector(temp, position, bCart);

  // Solve for the solutions to the expression in standard form:
  const solutions = IntersectionTests.quadraticVectorExpression(
    A,
    Cartesian3.negate(b, firstAxisScratch),
    0.0,
    0.0,
    1.0
  );

  let s;
  let altitude;
  const length = solutions.length;
  if (length > 0) {
    let closest = Cartesian3.clone(Cartesian3.ZERO, closestScratch);
    let maximumValue = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < length; ++i) {
      s = Matrix3.multiplyByVector(
        D_I,
        Matrix3.multiplyByVector(B, solutions[i], sScratch),
        sScratch
      );
      const v = Cartesian3.normalize(
        Cartesian3.subtract(s, position, referenceScratch),
        referenceScratch
      );
      const dotProduct = Cartesian3.dot(v, direction);

      if (dotProduct > maximumValue) {
        maximumValue = dotProduct;
        closest = Cartesian3.clone(s, closest);
      }
    }

    const surfacePoint = ellipsoid.cartesianToCartographic(
      closest,
      surfPointScratch
    );
    maximumValue = CesiumMath.clamp(maximumValue, 0.0, 1.0);
    altitude =
      Cartesian3.magnitude(
        Cartesian3.subtract(closest, position, referenceScratch)
      ) * Math.sqrt(1.0 - maximumValue * maximumValue);
    altitude = intersects ? -altitude : altitude;
    surfacePoint.height = altitude;
    return ellipsoid.cartographicToCartesian(surfacePoint, new Cartesian3());
  }

  return undefined;
};

const lineSegmentPlaneDifference = new Cartesian3();

/**
 * Computes the intersection of a line segment and a plane.
 *
 * @param {Cartesian3} endPoint0 An end point of the line segment.
 * @param {Cartesian3} endPoint1 The other end point of the line segment.
 * @param {Plane} plane The plane.
 * @param {Cartesian3} [result] The object onto which to store the result.
 * @returns {Cartesian3} The intersection point or undefined if there is no intersection.
 *
 * @example
 * const origin = Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883);
 * const normal = ellipsoid.geodeticSurfaceNormal(origin);
 * const plane = Cesium.Plane.fromPointNormal(origin, normal);
 *
 * const p0 = new Cesium.Cartesian3(...);
 * const p1 = new Cesium.Cartesian3(...);
 *
 * // find the intersection of the line segment from p0 to p1 and the tangent plane at origin.
 * const intersection = Cesium.IntersectionTests.lineSegmentPlane(p0, p1, plane);
 */
IntersectionTests.lineSegmentPlane = function (
  endPoint0,
  endPoint1,
  plane,
  result
) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(endPoint0)) {
    throw new DeveloperError("endPoint0 is required.");
  }
  if (!defined(endPoint1)) {
    throw new DeveloperError("endPoint1 is required.");
  }
  if (!defined(plane)) {
    throw new DeveloperError("plane is required.");
  }
  //>>includeEnd('debug');

  if (!defined(result)) {
    result = new Cartesian3();
  }

  const difference = Cartesian3.subtract(
    endPoint1,
    endPoint0,
    lineSegmentPlaneDifference
  );
  const normal = plane.normal;
  const nDotDiff = Cartesian3.dot(normal, difference);

  // check if the segment and plane are parallel
  if (Math.abs(nDotDiff) < CesiumMath.EPSILON6) {
    return undefined;
  }

  const nDotP0 = Cartesian3.dot(normal, endPoint0);
  const t = -(plane.distance + nDotP0) / nDotDiff;

  // intersection only if t is in [0, 1]
  if (t < 0.0 || t > 1.0) {
    return undefined;
  }

  // intersection is endPoint0 + t * (endPoint1 - endPoint0)
  Cartesian3.multiplyByScalar(difference, t, result);
  Cartesian3.add(endPoint0, result, result);
  return result;
};

/**
 * Computes the intersection of a triangle and a plane
 *
 * @param {Cartesian3} p0 First point of the triangle
 * @param {Cartesian3} p1 Second point of the triangle
 * @param {Cartesian3} p2 Third point of the triangle
 * @param {Plane} plane Intersection plane
 * @returns {object} An object with properties <code>positions</code> and <code>indices</code>, which are arrays that represent three triangles that do not cross the plane. (Undefined if no intersection exists)
 *
 * @example
 * const origin = Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883);
 * const normal = ellipsoid.geodeticSurfaceNormal(origin);
 * const plane = Cesium.Plane.fromPointNormal(origin, normal);
 *
 * const p0 = new Cesium.Cartesian3(...);
 * const p1 = new Cesium.Cartesian3(...);
 * const p2 = new Cesium.Cartesian3(...);
 *
 * // convert the triangle composed of points (p0, p1, p2) to three triangles that don't cross the plane
 * const triangles = Cesium.IntersectionTests.trianglePlaneIntersection(p0, p1, p2, plane);
 */
IntersectionTests.trianglePlaneIntersection = function (p0, p1, p2, plane) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(p0) || !defined(p1) || !defined(p2) || !defined(plane)) {
    throw new DeveloperError("p0, p1, p2, and plane are required.");
  }
  //>>includeEnd('debug');

  const planeNormal = plane.normal;
  const planeD = plane.distance;
  const p0Behind = Cartesian3.dot(planeNormal, p0) + planeD < 0.0;
  const p1Behind = Cartesian3.dot(planeNormal, p1) + planeD < 0.0;
  const p2Behind = Cartesian3.dot(planeNormal, p2) + planeD < 0.0;
  // Given these dots products, the calls to lineSegmentPlaneIntersection
  // always have defined results.

  let numBehind = 0;
  numBehind += p0Behind ? 1 : 0;
  numBehind += p1Behind ? 1 : 0;
  numBehind += p2Behind ? 1 : 0;

  let u1, u2;
  if (numBehind === 1 || numBehind === 2) {
    u1 = new Cartesian3();
    u2 = new Cartesian3();
  }

  if (numBehind === 1) {
    if (p0Behind) {
      IntersectionTests.lineSegmentPlane(p0, p1, plane, u1);
      IntersectionTests.lineSegmentPlane(p0, p2, plane, u2);

      return {
        positions: [p0, p1, p2, u1, u2],
        indices: [
          // Behind
          0,
          3,
          4,

          // In front
          1,
          2,
          4,
          1,
          4,
          3,
        ],
      };
    } else if (p1Behind) {
      IntersectionTests.lineSegmentPlane(p1, p2, plane, u1);
      IntersectionTests.lineSegmentPlane(p1, p0, plane, u2);

      return {
        positions: [p0, p1, p2, u1, u2],
        indices: [
          // Behind
          1,
          3,
          4,

          // In front
          2,
          0,
          4,
          2,
          4,
          3,
        ],
      };
    } else if (p2Behind) {
      IntersectionTests.lineSegmentPlane(p2, p0, plane, u1);
      IntersectionTests.lineSegmentPlane(p2, p1, plane, u2);

      return {
        positions: [p0, p1, p2, u1, u2],
        indices: [
          // Behind
          2,
          3,
          4,

          // In front
          0,
          1,
          4,
          0,
          4,
          3,
        ],
      };
    }
  } else if (numBehind === 2) {
    if (!p0Behind) {
      IntersectionTests.lineSegmentPlane(p1, p0, plane, u1);
      IntersectionTests.lineSegmentPlane(p2, p0, plane, u2);

      return {
        positions: [p0, p1, p2, u1, u2],
        indices: [
          // Behind
          1,
          2,
          4,
          1,
          4,
          3,

          // In front
          0,
          3,
          4,
        ],
      };
    } else if (!p1Behind) {
      IntersectionTests.lineSegmentPlane(p2, p1, plane, u1);
      IntersectionTests.lineSegmentPlane(p0, p1, plane, u2);

      return {
        positions: [p0, p1, p2, u1, u2],
        indices: [
          // Behind
          2,
          0,
          4,
          2,
          4,
          3,

          // In front
          1,
          3,
          4,
        ],
      };
    } else if (!p2Behind) {
      IntersectionTests.lineSegmentPlane(p0, p2, plane, u1);
      IntersectionTests.lineSegmentPlane(p1, p2, plane, u2);

      return {
        positions: [p0, p1, p2, u1, u2],
        indices: [
          // Behind
          0,
          1,
          4,
          0,
          4,
          3,

          // In front
          2,
          3,
          4,
        ],
      };
    }
  }

  // if numBehind is 3, the triangle is completely behind the plane;
  // otherwise, it is completely in front (numBehind is 0).
  return undefined;
};
export default IntersectionTests;
