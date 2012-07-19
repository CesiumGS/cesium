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

// TODO
// equals, etc. for Plane?
// Should ray constructor normalize?
// Make EllipsoidTangentPlane contain plane?
// Does extent triangulator work over IDL?
// Tests for new wrapLongitude.

    function lineSegmentPlaneIntersection(p0, p1, plane) {
        var direction;
        direction = Cartesian3.subtract(p1, p0);
        Cartesian3.normalize(direction, direction);
        return IntersectionTests.rayPlane(new Ray(p0, direction), plane);
    }

    /**
     * DOC_TBA
     *
     * @exports IntersectionTests
     */
    var IntersectionTests = {
        /**
         * DOC_TBA
         *
         * @param {Ray} ray DOC_TBA
         * @param {Plane} plane DOC_TBA
         *
         * @exception {DeveloperError} ray is required.
         * @exception {DeveloperError} plane is required.
         */
        rayPlane : function(ray, plane) {
            if (typeof ray === 'undefined') {
                throw new DeveloperError('ray is required.');
            }

            if (typeof plane === 'undefined') {
                throw new DeveloperError('plane is required.');
            }

            var origin = Cartesian3.clone(ray.origin);
            var direction = Cartesian3.clone(ray.direction);
            var normal = Cartesian3.clone(plane.normal);

            var denominator = normal.dot(direction);

            if (Math.abs(denominator) < CesiumMath.EPSILON15) {
                // Ray is parallel to plane.  The ray may be in the polygon's plane.
                return undefined;
            }

            var t = (-plane.distance - normal.dot(origin)) / denominator;

            if (t < 0) {
                return undefined;
            }

            return origin.add(direction.multiplyByScalar(t));
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
         * @param {Cartesian3} p2 DOC_TBA
         * @param {Plane} plane DOC_TBA
         *
         * @exception {DeveloperError} p0, p1, p2, and plane are required.
         */
        trianglePlaneIntersection : function(p0, p1, p2, plane) {
            if ((typeof p0 === 'undefined') ||
                (typeof p1 === 'undefined') ||
                (typeof p2 === 'undefined') ||
                (typeof plane === 'undefined')) {
                throw new DeveloperError('p0, p1, p2, and plane are required.');
            }

            // TODO: returning triangle strips or fans?
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

            if (numBehind === 1) {
                if (p0Behind) {
                    var u01 = lineSegmentPlaneIntersection(p0, p1, plane);
                    var u02 = lineSegmentPlaneIntersection(p0, p2, plane);

                    return {
                        positions : [p0, p1, p2, u01, u02 ],
                        indices : [
                            // Behind
                            0, 3, 4,

                            // In front
                            1, 2, 4,
                            1, 4, 3
                        ]
                    };
                } else if (p1Behind) {
                    var u12 = lineSegmentPlaneIntersection(p1, p2, plane);
                    var u10 = lineSegmentPlaneIntersection(p1, p0, plane);

                    return {
                        positions : [p0, p1, p2, u12, u10 ],
                        indices : [
                            // Behind
                            1, 3, 4,

                            // In front
                            2, 0, 4,
                            2, 4, 3
                        ]
                    };
                } else if (p2Behind) {
                    var u20 = lineSegmentPlaneIntersection(p2, p0, plane);
                    var u21 = lineSegmentPlaneIntersection(p2, p1, plane);

                    return {
                        positions : [p0, p1, p2, u20, u21 ],
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
                    var u10 = lineSegmentPlaneIntersection(p1, p0, plane);
                    var u20 = lineSegmentPlaneIntersection(p2, p0, plane);

                    return {
                        positions : [p0, p1, p2, u10, u20 ],
                        indices : [
                            // Behind
                            1, 2, 4,
                            1, 4, 3,

                            // In front
                            0, 3, 4
                        ]
                    };
                } else if (!p1Behind) {
                    var u21 = lineSegmentPlaneIntersection(p2, p1, plane);
                    var u01 = lineSegmentPlaneIntersection(p0, p1, plane);

                    return {
                        positions : [p0, p1, p2, u21, u01 ],
                        indices : [
                            // Behind
                            2, 0, 4,
                            2, 4, 3,

                            // In front
                            1, 3, 4
                        ]
                    };
                } else if (!p2Behind) {
                    var u02 = lineSegmentPlaneIntersection(p0, p2, plane);
                    var u12 = lineSegmentPlaneIntersection(p1, p2, plane);

                    return {
                        positions : [p0, p1, p2, u02, u12 ],
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
        }
    };

    return IntersectionTests;
});
