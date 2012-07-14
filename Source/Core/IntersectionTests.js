/*global define*/
define([
        './DeveloperError',
        './Math',
        './Cartesian3',
        './Ray'
    ],
    function(
        DeveloperError,
        CesiumMath,
        Cartesian3,
        Ray) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @exports IntersectionTests
     */
    var IntersectionTests = {
// TODO
//   LineSegment class - p0 and p1
//   Plane class - planeNormal and planeD
//   Should ray constructor normalize?

        /**
         * DOC_TBA
         *
         * @param {Ray} ray DOC_TBA
         * @param {Cartesian3} planeNormal DOC_TBA
         * @param {Number} planeD DOC_TBA
         *
         * @exception {DeveloperError} ray is required.
         * @exception {DeveloperError} planeNormal is required.
         * @exception {DeveloperError} planeD is required.
         */
        rayPlane : function(ray, planeNormal, planeD) {
            if (typeof ray === 'undefined') {
                throw new DeveloperError('ray is required.');
            }

            if (typeof planeNormal === 'undefined') {
                throw new DeveloperError('planeNormal is required.');
            }

            if (typeof planeD === 'undefined') {
                throw new DeveloperError('planeD is required.');
            }

            var origin = Cartesian3.clone(ray.origin);
            var direction = Cartesian3.clone(ray.direction);
            var normal = Cartesian3.clone(planeNormal);

            var denominator = normal.dot(direction);

            if (Math.abs(denominator) < CesiumMath.EPSILON15) {
                // Ray is parallel to plane.  The ray may be in the polygon's plane.
                return undefined;
            }

            var t = (-planeD - normal.dot(origin)) / denominator;

            if (t < 0) {
                return undefined;
            }

            return origin.add(direction.multiplyWithScalar(t));
        },

        /**
         * DOC_TBA
         *
         * @param {Ray} ray DOC_TBA
         * @param {Ellipsoid} ellipsoid DOC_TBA
         *
         * @exception {DeveloperError} ray is required.
         * @exception {DeveloperError} ellipsoid is required.
         */
        rayEllipsoid : function(ray, ellipsoid) {
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
        },

        /**
         * DOC_TBA
         *
         * @param {Cartesian3} p0 DOC_TBA
         * @param {Cartesian3} p1 DOC_TBA
         * @param {Cartesian3} planeNormal DOC_TBA
         * @param {Number} planeD DOC_TBA
         *
         * @exception {DeveloperError} p0, p1, planeNormal, and plane are required.
         *
         * @return {Cartesian3} The intersection point of the line segment and the
         * plane, or <code>undefined</code> if they do not intersect.
         *
         * @example
         * // Returns Cartesian3(0.0, 0.0, 0.0)
         * var p = IntersectionTests.lineSegmentPlaneIntersection(
         *   new Cartesian3(-1.0, 0.0, 0.0),
         *   new Cartesian3(1.0, 0.0, 0.0),
         *   new Cartesian3(1.0, 0.0, 0.0),
         *   0.0);
         */
        lineSegmentPlaneIntersection : function(p0, p1, planeNormal, planeD) {
            if ((typeof p0 === 'undefined') ||
                (typeof p1 === 'undefined') ||
                (typeof planeNormal === 'undefined') ||
                (typeof planeD === 'undefined')) {
                throw new DeveloperError('p0, p1, planeNormal, and plane are required.');
            }

            // TODO: remove clone
            var direction = Cartesian3.clone(p1);
            direction = direction.subtract(p0);
            direction = direction.normalize();

            return IntersectionTests.rayPlane(new Ray(p0, direction), planeNormal, planeD);
        },

        /**
         * DOC_TBA
         *
         * @param {Cartesian3} p0 DOC_TBA
         * @param {Cartesian3} p1 DOC_TBA
         * @param {Cartesian3} p2 DOC_TBA
         * @param {Cartesian3} planeNormal DOC_TBA
         * @param {Number} planeD DOC_TBA
         *
         * @exception {DeveloperError} p0, p1, planeNormal, and plane are required.
         */
        trianglePlaneIntersection : function(p0, p1, p2, planeNormal, planeD) {
            if ((typeof p0 === 'undefined') ||
                (typeof p1 === 'undefined') ||
                (typeof planeNormal === 'undefined') ||
                (typeof planeD === 'undefined')) {
                throw new DeveloperError('p0, p1, planeNormal, and plane are required.');
            }

            // TODO: returning triangle strips or fans?
            // TODO: Don't assume planeNormal is Cartesian3?
            var p0Behind = (planeNormal.dot(p0) + planeD) < 0.0;
            var p1Behind = (planeNormal.dot(p1) + planeD) < 0.0;
            var p2Behind = (planeNormal.dot(p2) + planeD) < 0.0;
            // Given these dots products, the calls to lineSegmentPlaneIntersection
            // always have defined results.

            var numBehind = 0;
            numBehind += p0Behind ? 1 : 0;
            numBehind += p1Behind ? 1 : 0;
            numBehind += p2Behind ? 1 : 0;

            if (numBehind === 1) {
                if (p0Behind) {
                    var u01 = IntersectionTests.lineSegmentPlaneIntersection(p0, p1, planeNormal, planeD);
                    var u02 = IntersectionTests.lineSegmentPlaneIntersection(p0, p2, planeNormal, planeD);

                    return [
                        // Behind
                        p0,
                        u01,
                        u02,

                        // In front
                        p1,
                        p2,
                        u02,
                        u01
                    ];
                } else if (p1Behind) {
                    var u12 = IntersectionTests.lineSegmentPlaneIntersection(p1, p2, planeNormal, planeD);
                    var u10 = IntersectionTests.lineSegmentPlaneIntersection(p1, p0, planeNormal, planeD);

                    return [
                        // Behind
                        p1,
                        u12,
                        u10,

                        // In front
                        p2,
                        p0,
                        u10,
                        u12
                    ];
                } else if (p2Behind) {
                    var u20 = IntersectionTests.lineSegmentPlaneIntersection(p2, p0, planeNormal, planeD);
                    var u21 = IntersectionTests.lineSegmentPlaneIntersection(p2, p1, planeNormal, planeD);

                    return [
                        // Behind
                        p2,
                        u20,
                        u21,

                        // In front
                        p0,
                        p1,
                        u21,
                        u20
                    ];
                }
            } else if (numBehind === 2) {
                if (!p0Behind) {
                    var u10 = IntersectionTests.lineSegmentPlaneIntersection(p1, p0, planeNormal, planeD);
                    var u20 = IntersectionTests.lineSegmentPlaneIntersection(p2, p0, planeNormal, planeD);

                    return [
                        // Behind
                        p1,
                        p2,
                        u20,
                        u10,

                        // In front
                        p0,
                        u10,
                        u20
                    ];
                } else if (!p1Behind) {
                    var u21 = IntersectionTests.lineSegmentPlaneIntersection(p2, p1, planeNormal, planeD);
                    var u01 = IntersectionTests.lineSegmentPlaneIntersection(p0, p1, planeNormal, planeD);

                    return [
                        // Behind
                        p2,
                        p0,
                        u01,
                        u21,

                        // In front
                        p1,
                        u21,
                        u01
                    ];
                } else if (!p2Behind) {
                    var u02 = IntersectionTests.lineSegmentPlaneIntersection(p0, p2, planeNormal, planeD);
                    var u12 = IntersectionTests.lineSegmentPlaneIntersection(p1, p2, planeNormal, planeD);

                    return [
                        // Behind
                        p0,
                        p1,
                        u12,
                        u02,

                        // In front
                        p2,
                        u02,
                        u12
                    ];
                }
            }

            // if numBehind is 3, the triangle is completely behind the plane;
            // otherwise, it is completely in front (numBehind is 0).
            return undefined;
        }
    };

    return IntersectionTests;
});
