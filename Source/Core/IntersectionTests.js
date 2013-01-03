/*global define*/
define([
        './DeveloperError',
        './Math',
        './Cartesian3',
        './Cartographic',
        './Matrix3',
        './QuadraticRealPolynomial',
        './QuarticRealPolynomial'
    ],
    function(
        DeveloperError,
        CesiumMath,
        Cartesian3,
        Cartographic,
        Matrix3,
        QuadraticRealPolynomial,
        QuarticRealPolynomial) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports IntersectionTests
     */
    var IntersectionTests = {};

    /**
     * Computes the intersection of a ray and a plane.
     * @memberof IntersectionTests
     *
     * @param {Ray} ray The ray.
     * @param {Cartesian3} planeNormal The plane normal.
     * @param {Number} planeD The distance from the plane to the origin.
     * @returns {Cartesian3} The intersection point or undefined if there is no intersections.
     *
     * @exception {DeveloperError} ray is required.
     * @exception {DeveloperError} planeNormal is required.
     * @exception {DeveloperError} planeD is required.
     */
    IntersectionTests.rayPlane = function(ray, planeNormal, planeD, result) {
        if (typeof ray === 'undefined') {
            throw new DeveloperError('ray is required.');
        }

        if (typeof planeNormal === 'undefined') {
            throw new DeveloperError('planeNormal is required.');
        }

        if (typeof planeD === 'undefined') {
            throw new DeveloperError('planeD is required.');
        }

        var origin = ray.origin;
        var direction = ray.direction;
        var denominator = Cartesian3.dot(planeNormal, direction);

        if (Math.abs(denominator) < CesiumMath.EPSILON15) {
            // Ray is parallel to plane.  The ray may be in the polygon's plane.
            return undefined;
        }

        var t = (-planeD - Cartesian3.dot(planeNormal, origin)) / denominator;

        if (t < 0) {
            return undefined;
        }

        result = direction.multiplyByScalar(t, result);
        return Cartesian3.add(origin, result);
    };

    /**
     * Computes the intersection points of a ray with an ellipsoid.
     * @memberof IntersectionTests
     *
     * @param {Ray} ray The ray.
     * @param {Ellipsoid} ellipsoid The ellipsoid.
     * @returns {Array} An array of one or two intersection scalars for points along the ray or undefined if there are no intersections.
     *
     * @exception {DeveloperError} ray is required.
     * @exception {DeveloperError} ellipsoid is required.
     */
    IntersectionTests.rayEllipsoid = function(ray, ellipsoid) {
        if (typeof ray === 'undefined') {
            throw new DeveloperError('ray is required.');
        }

        if (typeof ellipsoid === 'undefined') {
            throw new DeveloperError('ellipsoid is required.');
        }

        var inverseRadii = ellipsoid.getOneOverRadii();
        var q = inverseRadii.multiplyComponents(ray.origin);
        var w = inverseRadii.multiplyComponents(ray.direction);

        var q2 = q.magnitudeSquared();
        var qw = q.dot(w);

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
            w2 = w.magnitudeSquared();
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
            w2 = w.magnitudeSquared();
            product = w2 * difference; // Negatively valued.
            if (qw < 0.0) {
                // Looking inward.
                discriminant = qw * qw - product;
                temp = qw - Math.sqrt(discriminant); // Avoid cancellation.  Negatively valued.
                return {
                    start : 0.0,
                    stop : difference / temp
                };
            } else if (qw > 0.0) {
                // Looking outward.
                discriminant = qw * qw - product;
                temp = qw + Math.sqrt(discriminant); // Avoid cancellation. Positively valued.
                return {
                    start : 0.0,
                    stop : temp / w2
                };
            } else {
                // qw == 0.0 // Looking tangent.
                temp = Math.sqrt(-product);
                return {
                    start : 0.0,
                    stop : temp / w2
                };
            }
        } else {
            // q2 == 1.0. On ellipsoid.
            if (qw < 0.0) {
                // Looking inward.
                w2 = w.magnitudeSquared();
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
     * @memberof IntersectionTests
     *
     * @param {Ray} ray The ray.
     * @param {Ellipsoid} ellipsoid The ellipsoid.
     * @returns {Cartesian} The nearest planetodetic point on the ray.
     *
     * @exception {DeveloperError} ray is required.
     * @exception {DeveloperError} ellipsoid is required.
     */
    IntersectionTests.grazingAltitudeLocation = function(ray, ellipsoid) {
        if (typeof ray === 'undefined') {
            throw new DeveloperError('ray is required.');
        }

        if (typeof ellipsoid === 'undefined') {
            throw new DeveloperError('ellipsoid is required.');
        }

        var position = ray.origin;
        var direction = ray.direction;

        var normal = ellipsoid.geodeticSurfaceNormal(position);

        if (Cartesian3.dot(direction, normal) >= 0.0) { // The location provided is the closest point in altitude
            return position;
        }

        var intersects = typeof this.rayEllipsoid(ray, ellipsoid) !== 'undefined';

        // Compute the scaled direction vector.
        var f = ellipsoid.transformPositionToScaledSpace(direction);

        // Constructs a basis from the unit scaled direction vector. Construct its rotation and transpose.
        var firstAxis = f.normalize();
        var reference = f.mostOrthogonalAxis();
        var secondAxis = reference.cross(firstAxis).normalize();
        var thirdAxis = firstAxis.cross(secondAxis).normalize();
        var B = new Matrix3(firstAxis.x, secondAxis.x, thirdAxis.x,
                            firstAxis.y, secondAxis.y, thirdAxis.y,
                            firstAxis.z, secondAxis.z, thirdAxis.z);
        var B_T = B.transpose();

        // Get the scaling matrix and its inverse.
        var D_I = Matrix3.fromScale(ellipsoid.getRadii());
        var D = Matrix3.fromScale(ellipsoid.getOneOverRadii());

        var C = new Matrix3(0.0, direction.z, -direction.y,
                            -direction.z, 0.0, direction.x,
                            direction.y, -direction.x, 0.0);

        var temp = B_T.multiply(D).multiply(C);
        var A = temp.multiply(D_I).multiply(B);
        var b = temp.multiplyByVector(position);

        // Solve for the solutions to the expression in standard form:
        var solutions = quadraticVectorExpression(A, b.negate(), 0.0, 0.0, 1.0);

        var s;
        var altitude;
        var length = solutions.length;
        if (length > 0) {
            var closest = Cartesian3.ZERO;
            var maximumValue = Number.NEGATIVE_INFINITY;

            for ( var i = 0; i < length; ++i) {
                s = D_I.multiplyByVector(B.multiplyByVector(solutions[i]));
                var v = s.subtract(position).normalize();
                var dotProduct = v.dot(direction);

                if (dotProduct > maximumValue) {
                    maximumValue = dotProduct;
                    closest = s;
                }
            }

            var surfacePoint = ellipsoid.cartesianToCartographic(closest);
            maximumValue = CesiumMath.clamp(maximumValue, 0.0, 1.0);
            altitude = closest.subtract(position).magnitude() * Math.sqrt(1.0 - maximumValue * maximumValue);
            altitude = intersects ? -altitude : altitude;
            return ellipsoid.cartographicToCartesian(new Cartographic(surfacePoint.longitude, surfacePoint.latitude, altitude));
        }

        return undefined;
    };

    return IntersectionTests;
});
