/*global define*/
define([
        './Cartesian2',
        './Cartesian3',
        './Cartographic',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Math',
        './Matrix3',
        './QuadraticRealPolynomial',
        './QuarticRealPolynomial'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartographic,
        defaultValue,
        defined,
        DeveloperError,
        CesiumMath,
        Matrix3,
        QuadraticRealPolynomial,
        QuarticRealPolynomial) {
    "use strict";

    /**
     * Functions for computing the intersection between geometries such as rays, planes, triangles, and ellipsoids.
     *
     * @exports IntersectionTests
     */
    var IntersectionTests = {};

    /**
     * Computes the intersection of a ray and a plane.
     *
     * @param {Ray} ray The ray.
     * @param {Plane} plane The plane.
     * @returns {Cartesian3} The intersection point or undefined if there is no intersections.
     */
    IntersectionTests.rayPlane = function(ray, plane, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(ray)) {
            throw new DeveloperError('ray is required.');
        }
        if (!defined(plane)) {
            throw new DeveloperError('plane is required.');
        }
        //>>includeEnd('debug');

        var origin = ray.origin;
        var direction = ray.direction;
        var normal = plane.normal;
        var denominator = Cartesian3.dot(normal, direction);

        if (Math.abs(denominator) < CesiumMath.EPSILON15) {
            // Ray is parallel to plane.  The ray may be in the polygon's plane.
            return undefined;
        }

        var t = (-plane.distance - Cartesian3.dot(normal, origin)) / denominator;

        if (t < 0) {
            return undefined;
        }

        result = Cartesian3.multiplyByScalar(direction, t, result);
        return Cartesian3.add(origin, result, result);
    };

    var scratchEdge0 = new Cartesian3();
    var scratchEdge1 = new Cartesian3();
    var scratchPVec = new Cartesian3();
    var scratchTVec = new Cartesian3();
    var scratchQVec = new Cartesian3();

    /**
     * Computes the intersection of a ray and a triangle.
     * @memberof IntersectionTests
     *
     * @param {Ray} ray The ray.
     * @param {Cartesian3} p0 The first vertex of the triangle.
     * @param {Cartesian3} p1 The second vertex of the triangle.
     * @param {Cartesian3} p2 The third vertex of the triangle.
     * @param {Boolean} [cullBackFacing=false] If <code>true<code>, will only compute an intersection with the front face of the triangle
     *                  and return undefined for intersections with the back face.
     * @returns {Cartesian3} The intersection point or undefined if there is no intersections.
     */
    IntersectionTests.rayTriangle = function(ray, p0, p1, p2, cullBackFacing, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(ray)) {
            throw new DeveloperError('ray is required.');
        }
        if (!defined(p0)) {
            throw new DeveloperError('p0 is required.');
        }
        if (!defined(p1)) {
            throw new DeveloperError('p1 is required.');
        }
        if (!defined(p2)) {
            throw new DeveloperError('p2 is required.');
        }
        //>>includeEnd('debug');

        cullBackFacing = defaultValue(cullBackFacing, false);

        var origin = ray.origin;
        var direction = ray.direction;

        var edge0 = Cartesian3.subtract(p1, p0, scratchEdge0);
        var edge1 = Cartesian3.subtract(p2, p0, scratchEdge1);

        var p = Cartesian3.cross(direction, edge1, scratchPVec);
        var det = Cartesian3.dot(edge0, p);

        var tvec;
        var q;

        var u;
        var v;
        var t;

        if (cullBackFacing) {
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
            var invDet = 1.0 / det;

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

        result = Cartesian3.multiplyByScalar(direction, t, result);
        return Cartesian3.add(origin, result, result);
    };

    function solveQuadratic(a, b, c, result) {
        var det = b * b - 4.0 * a * c;
        if (det < 0.0) {
            return undefined;
        } else if (det > 0.0) {
            var denom = 1.0 / (2.0 * a);
            var disc = Math.sqrt(det);
            var root0 = (-b + disc) * denom;
            var root1 = (-b - disc) * denom;

            if (root0 <= 0.0 && root1 <= 0.0) {
                return undefined;
            } else if (root0 < 0.0) {
                root0 = 0.0;
            } else if (root1 < 0.0) {
                root1 = 0.0;
            }

            if (root0 < root1) {
                result.root0 = root0;
                result.root1 = root1;
            } else {
                result.root0 = root1;
                result.root1 = root0;
            }

            return result;
        }

        var root = -b / (2.0 * a);
        if (root === 0.0) {
            return undefined;
        }

        result.root0 = result.root1 = root;
        return result;
    }

    var raySphereRoots = {
        root0 : 0.0,
        root1 : 0.0
    };

    /**
     * Computes the intersection points of a ray with a sphere.
     * @memberof IntersectionTests
     *
     * @param {Ray} ray The ray.
     * @param {BoundingSphere} sphere The sphere.
     * @param {Object} [result] The result onto which to store the result.
     * @returns {Object} An object with the first (<code>start</code>) and the second (<code>stop</code>) intersection scalars for points along the ray or undefined if there are no intersections.
     */
    IntersectionTests.raySphere = function(ray, sphere, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(ray)) {
            throw new DeveloperError('ray is required.');
        }
        if (!defined(sphere)) {
            throw new DeveloperError('sphere is required.');
        }
        //>>includeEnd('debug');

        if (!defined(result)) {
            result = {};
        }

        var origin = ray.origin;
        var direction = ray.direction;

        var center = sphere.center;
        var radiusSquared = sphere.radius * sphere.radius;

        var diff = Cartesian3.subtract(origin, center, scratchPVec);

        var a = Cartesian3.dot(direction, direction);
        var b = 2.0 * Cartesian3.dot(direction, diff);
        var c = Cartesian3.magnitudeSquared(diff) - radiusSquared;

        var roots = solveQuadratic(a, b, c, raySphereRoots);
        if (!defined(roots)) {
            return undefined;
        }

        result.start = roots.root0;
        result.stop = roots.root1;
        return result;
    };

    var scratchQ = new Cartesian3();
    var scratchW = new Cartesian3();

    /**
     * Computes the intersection points of a ray with an ellipsoid.
     *
     * @param {Ray} ray The ray.
     * @param {Ellipsoid} ellipsoid The ellipsoid.
     * @returns {Object} An object with the first (<code>start</code>) and the second (<code>stop</code>) intersection scalars for points along the ray or undefined if there are no intersections.
     */
    IntersectionTests.rayEllipsoid = function(ray, ellipsoid) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(ray)) {
            throw new DeveloperError('ray is required.');
        }
        if (!defined(ellipsoid)) {
            throw new DeveloperError('ellipsoid is required.');
        }
        //>>includeEnd('debug');

        var inverseRadii = ellipsoid.oneOverRadii;
        var q = Cartesian3.multiplyComponents(inverseRadii, ray.origin, scratchQ);
        var w = Cartesian3.multiplyComponents(inverseRadii, ray.direction, scratchW);

        var q2 = Cartesian3.magnitudeSquared(q);
        var qw = Cartesian3.dot(q, w);

        var difference, w2, product, discriminant, temp;

        if (q2 > 1.0) {
            // Outside ellipsoid.
            if (qw >= 0.0) {
                // Looking outward or tangent (0 intersections).
                return undefined;
            }

            // qw < 0.0.
            var qw2 = qw * qw;
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
                var root0 = temp / w2;
                var root1 = difference / temp;
                if (root0 < root1) {
                    return {
                        start : root0,
                        stop : root1
                    };
                }

                return {
                    start : root1,
                    stop : root0
                };
            } else {
                // qw2 == product.  Repeated roots (2 intersections).
                var root = Math.sqrt(difference / w2);
                return {
                    start : root,
                    stop : root
                };
            }
        } else if (q2 < 1.0) {
            // Inside ellipsoid (2 intersections).
            difference = q2 - 1.0; // Negatively valued.
            w2 = Cartesian3.magnitudeSquared(w);
            product = w2 * difference; // Negatively valued.

            discriminant = qw * qw - product;
            temp = -qw + Math.sqrt(discriminant); // Positively valued.
            return {
                start : 0.0,
                stop : temp / w2
            };
        } else {
            // q2 == 1.0. On ellipsoid.
            if (qw < 0.0) {
                // Looking inward.
                w2 = Cartesian3.magnitudeSquared(w);
                return {
                    start : 0.0,
                    stop : -qw / w2
                };
            }

            // qw >= 0.0.  Looking outward or tangent.
            return undefined;
        }
    };

    function addWithCancellationCheck(left, right, tolerance) {
        var difference = left + right;
        if ((CesiumMath.sign(left) !== CesiumMath.sign(right)) &&
                Math.abs(difference / Math.max(Math.abs(left), Math.abs(right))) < tolerance) {
            return 0.0;
        }

        return difference;
    }

    function quadraticVectorExpression(A, b, c, x, w) {
        var xSquared = x * x;
        var wSquared = w * w;

        var l2 = (A[Matrix3.COLUMN1ROW1] - A[Matrix3.COLUMN2ROW2]) * wSquared;
        var l1 = w * (x * addWithCancellationCheck(A[Matrix3.COLUMN1ROW0], A[Matrix3.COLUMN0ROW1], CesiumMath.EPSILON15) + b.y);
        var l0 = (A[Matrix3.COLUMN0ROW0] * xSquared + A[Matrix3.COLUMN2ROW2] * wSquared) + x * b.x + c;

        var r1 = wSquared * addWithCancellationCheck(A[Matrix3.COLUMN2ROW1], A[Matrix3.COLUMN1ROW2], CesiumMath.EPSILON15);
        var r0 = w * (x * addWithCancellationCheck(A[Matrix3.COLUMN2ROW0], A[Matrix3.COLUMN0ROW2]) + b.z);

        var cosines;
        var solutions = [];
        if (r0 === 0.0 && r1 === 0.0) {
            cosines = QuadraticRealPolynomial.realRoots(l2, l1, l0);
            if (cosines.length === 0) {
                return solutions;
            }

            var cosine0 = cosines[0];
            var sine0 = Math.sqrt(Math.max(1.0 - cosine0 * cosine0, 0.0));
            solutions.push(new Cartesian3(x, w * cosine0, w * -sine0));
            solutions.push(new Cartesian3(x, w * cosine0, w * sine0));

            if (cosines.length === 2) {
                var cosine1 = cosines[1];
                var sine1 = Math.sqrt(Math.max(1.0 - cosine1 * cosine1, 0.0));
                solutions.push(new Cartesian3(x, w * cosine1, w * -sine1));
                solutions.push(new Cartesian3(x, w * cosine1, w * sine1));
            }

            return solutions;
        }

        var r0Squared = r0 * r0;
        var r1Squared = r1 * r1;
        var l2Squared = l2 * l2;
        var r0r1 = r0 * r1;

        var c4 = l2Squared + r1Squared;
        var c3 = 2.0 * (l1 * l2 + r0r1);
        var c2 = 2.0 * l0 * l2 + l1 * l1 - r1Squared + r0Squared;
        var c1 = 2.0 * (l0 * l1 - r0r1);
        var c0 = l0 * l0 - r0Squared;

        if (c4 === 0.0 && c3 === 0.0 && c2 === 0.0 && c1 === 0.0) {
            return solutions;
        }

        cosines = QuarticRealPolynomial.realRoots(c4, c3, c2, c1, c0);
        var length = cosines.length;
        if (length === 0) {
            return solutions;
        }

        for ( var i = 0; i < length; ++i) {
            var cosine = cosines[i];
            var cosineSquared = cosine * cosine;
            var sineSquared = Math.max(1.0 - cosineSquared, 0.0);
            var sine = Math.sqrt(sineSquared);

            //var left = l2 * cosineSquared + l1 * cosine + l0;
            var left;
            if (CesiumMath.sign(l2) === CesiumMath.sign(l0)) {
                left = addWithCancellationCheck(l2 * cosineSquared + l0, l1 * cosine, CesiumMath.EPSILON12);
            } else if (CesiumMath.sign(l0) === CesiumMath.sign(l1 * cosine)) {
                left = addWithCancellationCheck(l2 * cosineSquared, l1 * cosine + l0, CesiumMath.EPSILON12);
            } else {
                left = addWithCancellationCheck(l2 * cosineSquared + l1 * cosine, l0, CesiumMath.EPSILON12);
            }

            var right = addWithCancellationCheck(r1 * cosine, r0, CesiumMath.EPSILON15);
            var product = left * right;

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
    }

    /**
     * Provides the point along the ray which is nearest to the ellipsoid.
     *
     * @param {Ray} ray The ray.
     * @param {Ellipsoid} ellipsoid The ellipsoid.
     * @returns {Cartesian} The nearest planetodetic point on the ray.
     */
    IntersectionTests.grazingAltitudeLocation = function(ray, ellipsoid) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(ray)) {
            throw new DeveloperError('ray is required.');
        }
        if (!defined(ellipsoid)) {
            throw new DeveloperError('ellipsoid is required.');
        }
        //>>includeEnd('debug');

        var position = ray.origin;
        var direction = ray.direction;

        var normal = ellipsoid.geodeticSurfaceNormal(position);

        if (Cartesian3.dot(direction, normal) >= 0.0) { // The location provided is the closest point in altitude
            return position;
        }

        var intersects = defined(this.rayEllipsoid(ray, ellipsoid));

        // Compute the scaled direction vector.
        var f = ellipsoid.transformPositionToScaledSpace(direction);

        // Constructs a basis from the unit scaled direction vector. Construct its rotation and transpose.
        var firstAxis = Cartesian3.normalize(f);
        var reference = Cartesian3.mostOrthogonalAxis(f);
        var secondAxis = Cartesian3.normalize(Cartesian3.cross(reference, firstAxis));
        var thirdAxis  = Cartesian3.normalize(Cartesian3.cross(firstAxis, secondAxis));
        var B = new Matrix3(firstAxis.x, secondAxis.x, thirdAxis.x,
                            firstAxis.y, secondAxis.y, thirdAxis.y,
                            firstAxis.z, secondAxis.z, thirdAxis.z);
        var B_T = Matrix3.transpose(B);

        // Get the scaling matrix and its inverse.
        var D_I = Matrix3.fromScale(ellipsoid.radii);
        var D = Matrix3.fromScale(ellipsoid.oneOverRadii);

        var C = new Matrix3(0.0, direction.z, -direction.y,
                            -direction.z, 0.0, direction.x,
                            direction.y, -direction.x, 0.0);

        var temp = Matrix3.multiply(Matrix3.multiply(B_T, D), C);
        var A = Matrix3.multiply(Matrix3.multiply(temp, D_I), B);
        var b = Matrix3.multiplyByVector(temp, position);

        // Solve for the solutions to the expression in standard form:
        var solutions = quadraticVectorExpression(A, Cartesian3.negate(b), 0.0, 0.0, 1.0);

        var s;
        var altitude;
        var length = solutions.length;
        if (length > 0) {
            var closest = Cartesian3.ZERO;
            var maximumValue = Number.NEGATIVE_INFINITY;

            for ( var i = 0; i < length; ++i) {
                s = Matrix3.multiplyByVector(D_I, Matrix3.multiplyByVector(B, solutions[i]));
                var v = Cartesian3.normalize(Cartesian3.subtract(s, position));
                var dotProduct = Cartesian3.dot(v, direction);

                if (dotProduct > maximumValue) {
                    maximumValue = dotProduct;
                    closest = s;
                }
            }

            var surfacePoint = ellipsoid.cartesianToCartographic(closest);
            maximumValue = CesiumMath.clamp(maximumValue, 0.0, 1.0);
            altitude = Cartesian3.magnitude(Cartesian3.subtract(closest, position)) * Math.sqrt(1.0 - maximumValue * maximumValue);
            altitude = intersects ? -altitude : altitude;
            return ellipsoid.cartographicToCartesian(new Cartographic(surfacePoint.longitude, surfacePoint.latitude, altitude));
        }

        return undefined;
    };

    var lineSegmentPlaneDifference = new Cartesian3();

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
     * var origin = Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883);
     * var normal = ellipsoid.geodeticSurfaceNormal(origin);
     * var plane = Cesium.Plane.fromPointNormal(origin, normal);
     *
     * var p0 = new Cesium.Cartesian3(...);
     * var p1 = new Cesium.Cartesian3(...);
     *
     * // find the intersection of the line segment from p0 to p1 and the tangent plane at origin.
     * var intersection = Cesium.IntersectionTests.lineSegmentPlane(p0, p1, plane);
     */
    IntersectionTests.lineSegmentPlane = function(endPoint0, endPoint1, plane, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(endPoint0)) {
            throw new DeveloperError('endPoint0 is required.');
        }
        if (!defined(endPoint1)) {
            throw new DeveloperError('endPoint1 is required.');
        }
        if (!defined(plane)) {
            throw new DeveloperError('plane is required.');
        }
        //>>includeEnd('debug');

        var difference = Cartesian3.subtract(endPoint1, endPoint0, lineSegmentPlaneDifference);
        var normal = plane.normal;
        var nDotDiff = Cartesian3.dot(normal, difference);

        // check if the segment and plane are parallel
        if (Math.abs(nDotDiff) < CesiumMath.EPSILON6) {
            return undefined;
        }

        var nDotP0 = Cartesian3.dot(normal, endPoint0);
        var t = -(plane.distance + nDotP0) / nDotDiff;

        // intersection only if t is in [0, 1]
        if (t < 0.0 || t > 1.0) {
            return undefined;
        }

        // intersection is endPoint0 + t * (endPoint1 - endPoint0)
        if (!defined(result)) {
            result = new Cartesian3();
        }
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
     *
     * @returns {Object} An object with properties <code>positions</code> and <code>indices</code>, which are arrays that represent three triangles that do not cross the plane. (Undefined if no intersection exists)
     *
     * @example
     * var origin = Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883);
     * var normal = ellipsoid.geodeticSurfaceNormal(origin);
     * var plane = Cesium.Plane.fromPointNormal(origin, normal);
     *
     * var p0 = new Cesium.Cartesian3(...);
     * var p1 = new Cesium.Cartesian3(...);
     * var p2 = new Cesium.Cartesian3(...);
     *
     * // convert the triangle composed of points (p0, p1, p2) to three triangles that don't cross the plane
     * var triangles = Cesium.IntersectionTests.trianglePlaneIntersection(p0, p1, p2, plane);
     */
    IntersectionTests.trianglePlaneIntersection = function(p0, p1, p2, plane) {
        //>>includeStart('debug', pragmas.debug);
        if ((!defined(p0)) ||
            (!defined(p1)) ||
            (!defined(p2)) ||
            (!defined(plane))) {
            throw new DeveloperError('p0, p1, p2, and plane are required.');
        }
        //>>includeEnd('debug');

        var planeNormal = plane.normal;
        var planeD = plane.distance;
        var p0Behind = (Cartesian3.dot(planeNormal, p0) + planeD) < 0.0;
        var p1Behind = (Cartesian3.dot(planeNormal, p1) + planeD) < 0.0;
        var p2Behind = (Cartesian3.dot(planeNormal, p2) + planeD) < 0.0;
        // Given these dots products, the calls to lineSegmentPlaneIntersection
        // always have defined results.

        var numBehind = 0;
        numBehind += p0Behind ? 1 : 0;
        numBehind += p1Behind ? 1 : 0;
        numBehind += p2Behind ? 1 : 0;

        var u1, u2;
        if (numBehind === 1 || numBehind === 2) {
            u1 = new Cartesian3();
            u2 = new Cartesian3();
        }

        if (numBehind === 1) {
            if (p0Behind) {
                IntersectionTests.lineSegmentPlane(p0, p1, plane, u1);
                IntersectionTests.lineSegmentPlane(p0, p2, plane, u2);

                return {
                    positions : [p0, p1, p2, u1, u2 ],
                    indices : [
                        // Behind
                        0, 3, 4,

                        // In front
                        1, 2, 4,
                        1, 4, 3
                    ]
                };
            } else if (p1Behind) {
                IntersectionTests.lineSegmentPlane(p1, p2, plane, u1);
                IntersectionTests.lineSegmentPlane(p1, p0, plane, u2);

                return {
                    positions : [p0, p1, p2, u1, u2 ],
                    indices : [
                        // Behind
                        1, 3, 4,

                        // In front
                        2, 0, 4,
                        2, 4, 3
                    ]
                };
            } else if (p2Behind) {
                IntersectionTests.lineSegmentPlane(p2, p0, plane, u1);
                IntersectionTests.lineSegmentPlane(p2, p1, plane, u2);

                return {
                    positions : [p0, p1, p2, u1, u2 ],
                    indices : [
                        // Behind
                        2, 3, 4,

                        // In front
                        0, 1, 4,
                        0, 4, 3
                    ]
                };
            }
        } else if (numBehind === 2) {
            if (!p0Behind) {
                IntersectionTests.lineSegmentPlane(p1, p0, plane, u1);
                IntersectionTests.lineSegmentPlane(p2, p0, plane, u2);

                return {
                    positions : [p0, p1, p2, u1, u2 ],
                    indices : [
                        // Behind
                        1, 2, 4,
                        1, 4, 3,

                        // In front
                        0, 3, 4
                    ]
                };
            } else if (!p1Behind) {
                IntersectionTests.lineSegmentPlane(p2, p1, plane, u1);
                IntersectionTests.lineSegmentPlane(p0, p1, plane, u2);

                return {
                    positions : [p0, p1, p2, u1, u2 ],
                    indices : [
                        // Behind
                        2, 0, 4,
                        2, 4, 3,

                        // In front
                        1, 3, 4
                    ]
                };
            } else if (!p2Behind) {
                IntersectionTests.lineSegmentPlane(p0, p2, plane, u1);
                IntersectionTests.lineSegmentPlane(p1, p2, plane, u2);

                return {
                    positions : [p0, p1, p2, u1, u2 ],
                    indices : [
                        // Behind
                        0, 1, 4,
                        0, 4, 3,

                        // In front
                        2, 3, 4
                    ]
                };
            }
        }

        // if numBehind is 3, the triangle is completely behind the plane;
        // otherwise, it is completely in front (numBehind is 0).
        return undefined;
    };

    IntersectionTests.spherePlane = function(sphere, plane, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(sphere)) {
            throw new DeveloperError('sphere is required.');
        }
        if (!defined(plane)) {
            throw new DeveloperError('plane is required.');
        }
        //>>includeEnd('debug');

        var sphereCenter = sphere.center;
        var sphereRadius = sphere.radius;

        var planeNormal = plane.normal;
        var planeD = plane.distance;

        var p = Cartesian3.dot(planeNormal, sphereCenter) + planeD;
        var planeNormalMagSqrd = Cartesian3.magnitudeSquared(planeNormal);
        var d = Math.abs(p) / Math.sqrt(planeNormalMagSqrd);

        if (sphereRadius < d) {
            return undefined;
        }

        if (!defined(result)) {
            result = {};
        }

        var center = result.center;
        if (!defined(result.center)) {
            center = result.center = new Cartesian3();
        }

        var c = p / planeNormalMagSqrd;
        Cartesian3.multiplyByScalar(planeNormal, c, center);
        Cartesian3.subtract(sphereCenter, center, center);

        result.radius = (sphereRadius > d) ? Math.sqrt(sphereRadius * sphereRadius - d * d) : 0.0;

        return result;
    };

    var scratchCircleCircleRoots = {
        root0 : 0.0,
        root1 : 0.0
    };

    IntersectionTests.circleCircle = function(c0, c1, result) {
        var p0 = c0.center;
        var p1 = c1.center;
        if (Cartesian2.equalsEpsilon(p0, p1, CesiumMath.EPSILON6)) {
            return undefined;
        }

        var r0 = c0.radius;
        var r1 = c1.radius;

        if (Cartesian2.distance(p0, p1) > r0 + r1) {
            return undefined;
        }

        var x0 = p0.x;
        var y0 = p0.y;

        var x1 = p1.x;
        var y1 = p1.y;

        var r0Sqrd = r0 * r0;
        var x0Sqrd = x0 * x0;
        var y0Sqrd = y0 * y0;

        var q = r0Sqrd - r1 * r1 + y1 * y1 - y0Sqrd + x1 * x1 - x0Sqrd;

        var a;
        var b;
        var c;
        var roots;

        if (!CesiumMath.equalsEpsilon(y1, y0, CesiumMath.EPSILON6)) {
            var invYDiff = 1.0 / (y1 - y0);
            q *= 0.5 * invYDiff;
            var r = (x1 - x0) * invYDiff;

            a = 1.0 + r * r;
            b = 2.0 * (r * y0 - q * r - x0);
            c = x0Sqrd + q * q - 2.0 * q * y0 + y0Sqrd - r0Sqrd;

            roots = solveQuadratic(a, b, c, scratchCircleCircleRoots);
            if (!defined(roots)) {
                return undefined;
            }

            x0 = roots.root0;
            y0 = q - roots.root0 * r;

            x1 = roots.root1;
            y1 = q - roots.root1 * r;
        } else {
            q /= 2.0 * (x1 - x0);

            a = 1.0;
            b = -2.0 * y0;
            c = y0Sqrd - r0Sqrd + q * q - 2.0 * q * x0 + x0Sqrd;

            roots = solveQuadratic(a, b, c, scratchCircleCircleRoots);
            if (!defined(roots)) {
                return undefined;
            }

            x0 = x1 = q;
            y0 = roots.root0;
            y1 = roots.root1;
        }

        if (!defined(result)) {
            result = [];
        }

        var cartesian = result[0];
        if (!defined(cartesian)) {
            cartesian = result[0] = new Cartesian2();
        }

        cartesian.x = x0;
        cartesian.y = y0;

        cartesian = result[1];
        if (!defined(cartesian)) {
            cartesian = result[1] = new Cartesian2();
        }

        cartesian.x = x1;
        cartesian.y = y1;

        return result;
    };

    var scratchDirection = new Cartesian3();
    var xName = 'x';
    var yName = 'y';
    var zName = 'z';

    IntersectionTests.planePlaneIntersection = function(p0, p1, result) {
        var p0Normal = p0.normal;
        var p1Normal = p1.normal;

        var direction = Cartesian3.cross(p0Normal, p1Normal, scratchDirection);
        if (Cartesian3.equalsEpsilon(direction, Cartesian3.ZERO, CesiumMath.EPSILON6)) {
            return undefined;
        }

        if (!defined(result)) {
            result = {
                direction : new Cartesian3(),
                point : new Cartesian3()
            };
        }

        Cartesian3.normalize(direction, result.direction);

        var absX = Math.abs(p0Normal.x);
        var absY = Math.abs(p0Normal.y);
        var absZ = Math.abs(p0Normal.z);

        var a1;
        var a2;
        var b1;
        var b2;

        var aName;
        var bName;
        var zeroName;

        if (absX < absY) {
            if (absX < absZ) {
                zeroName = xName;
                aName = yName;
                bName = zName;

                a1 = p0Normal.y;
                a2 = p1Normal.y;
                b1 = p0Normal.z;
                b2 = p1Normal.z;
            } else {
                zeroName = zName;
                aName = xName;
                bName = yName;

                a1 = p0Normal.x;
                a2 = p1Normal.x;
                b1 = p0Normal.y;
                b2 = p1Normal.y;
            }
        } else if (absY < absZ) {
            zeroName = yName;
            aName = xName;
            bName = zName;

            a1 = p0Normal.x;
            a2 = p1Normal.x;
            b1 = p0Normal.z;
            b2 = p1Normal.z;
        } else {
            zeroName = zName;
            aName = xName;
            bName = yName;

            a1 = p0Normal.x;
            a2 = p1Normal.x;
            b1 = p0Normal.y;
            b2 = p1Normal.y;
        }

        var d1 = p0.distance;
        var d2 = p1.distance;

        var point = result.point;
        point[zeroName] = 0.0;

        if (CesiumMath.equalsEpsilon(a1, 0.0, CesiumMath.EPSILON6)) {
            point[aName] = 0.0;
            point[bName] = -d1 / b1;
        } else if (CesiumMath.equalsEpsilon(b1, 0.0, CesiumMath.EPSILON6)) {
            point[bName] = 0.0;
            point[aName] = -d1 / a1;
        } else {
            var ratio = a2 / a1;
            point[bName] = (ratio * d1 - d2) / (b2 - ratio * b1);
            point[aName] = (-b1 * point[bName] - d1) / b1;
        }
    };

    var scratchLineCircleDiff = new Cartesian2();
    var scratchLineCircleRoots = {
        root0 : 0.0,
        root1 : 0.0
    };

    IntersectionTests.lineCircle = function(line, circle, result) {
        var direction = line.direction;
        var point = line.point;

        var center = circle.center;
        var radius = circle.radius;

        var diff = Cartesian2.subtract(point, center, scratchLineCircleDiff);

        var a = Cartesian2.magnitudeSquared(direction);
        var b = 2.0 * Cartesian2.dot(direction, diff);
        var c = Cartesian2.magnitudeSquared(diff) - radius * radius;

        var roots = solveQuadratic(a, b, c, scratchLineCircleRoots);
        if (!defined(roots)) {
            return undefined;
        }

        if (!defined(result)) {
            result = {
                intersection0 : new Cartesian2(),
                intersection1 : new Cartesian2()
            };
        }

        var pointOnCircle = result.intersection0;
        Cartesian2.multiplyByScalar(direction, roots.root0, pointOnCircle);
        Cartesian2.add(point, pointOnCircle, pointOnCircle);

        pointOnCircle = result.intersection1;
        Cartesian2.multiplyByScalar(direction, roots.root1, pointOnCircle);
        Cartesian2.add(point, pointOnCircle, pointOnCircle);

        return result;
    };

    return IntersectionTests;
});
