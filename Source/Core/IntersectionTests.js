/*global define*/
define([
        './DeveloperError',
        './Math',
        './Cartesian3'
    ],
    function(
        DeveloperError,
        CesiumMath,
        Cartesian3) {
    "use strict";

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
        }
    };

    return IntersectionTests;
});
