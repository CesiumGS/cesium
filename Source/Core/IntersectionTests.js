/*global define*/
define([
        './Cartesian3',
        './Cartographic',
        './defined',
        './DeveloperError',
        './Math',
        './Matrix3',
        './QuadraticRealPolynomial',
        './QuarticRealPolynomial'
    ], function(
        Cartesian3,
        Cartographic,
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
     * @param {Cartesian3} [result] The object onto which to store the result.
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

        if (!defined(result)) {
            result = new Cartesian3();
        }

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

    var firstAxisScratch = new Cartesian3();
    var secondAxisScratch = new Cartesian3();
    var thirdAxisScratch = new Cartesian3();
    var referenceScratch = new Cartesian3();
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
        var firstAxis = Cartesian3.normalize(f, firstAxisScratch);
        var reference = Cartesian3.mostOrthogonalAxis(f, referenceScratch);
        var secondAxis = Cartesian3.normalize(Cartesian3.cross(reference, firstAxis, secondAxisScratch), secondAxisScratch);
        var thirdAxis  = Cartesian3.normalize(Cartesian3.cross(firstAxis, secondAxis, thirdAxisScratch), thirdAxisScratch);
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
        var solutions = quadraticVectorExpression(A, Cartesian3.negate(b, firstAxisScratch), 0.0, 0.0, 1.0);

        var s;
        var altitude;
        var length = solutions.length;
        if (length > 0) {
            var closest = Cartesian3.ZERO;
            var maximumValue = Number.NEGATIVE_INFINITY;

            for ( var i = 0; i < length; ++i) {
                s = Matrix3.multiplyByVector(D_I, Matrix3.multiplyByVector(B, solutions[i]));
                var v = Cartesian3.normalize(Cartesian3.subtract(s, position, referenceScratch), referenceScratch);
                var dotProduct = Cartesian3.dot(v, direction);

                if (dotProduct > maximumValue) {
                    maximumValue = dotProduct;
                    closest = s;
                }
            }

            var surfacePoint = ellipsoid.cartesianToCartographic(closest);
            maximumValue = CesiumMath.clamp(maximumValue, 0.0, 1.0);
            altitude = Cartesian3.magnitude(Cartesian3.subtract(closest, position, referenceScratch)) * Math.sqrt(1.0 - maximumValue * maximumValue);
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

        if (!defined(result)) {
            result = new Cartesian3();
        }

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

    return IntersectionTests;
});
