/*global define*/
define([
        './DeveloperError',
        './Math',
        './Matrix3',
        './Matrix4',
        './Cartesian3',
        './TimeStandard',
        './TimeConstants',
        './Ellipsoid'
    ],
    function(
        DeveloperError,
        CesiumMath,
        Matrix3,
        Matrix4,
        Cartesian3,
        TimeStandard,
        TimeConstants,
        Ellipsoid) {
    "use strict";

    /**
     * @exports Transforms
     *
     * DOC_TBA
     */
    var Transforms = {
        /**
         * Creates a 4x4 transformation matrix from a reference frame center at <code>position</code>
         * with local east-north-up axes to the ellipsoid's fixed reference frame, e.g., WGS84 coordinates
         * for Earth.  The local axes are defined as:
         * <ul>
         * <li>The <code>x</code> axis points in the local east direction.</li>
         * <li>The <code>y</code> axis points in the local north direction.</li>
         * <li>The <code>z</code> axis points in the direction of the ellipsoid surface normal which passes through the position.</li>
         * </ul>
         *
         * DOC_TBA:  Add images
         *
         * @param {Cartesian3} position The center point of the local reference frame.
         * @param {Ellipsoid} [ellipsoid] The ellipsoid whose fixed frame is used in the transform.
         *
         * @see Transforms.northEastDownToFixedFrame
         *
         * @exception {DeveloperError} position is required.
         *
         * @example
         * // Get the transform from local east-north-up at cartographic (0.0, 0.0) to Earth's fixed frame.
         * var ellipsoid = Ellipsoid.getWgs84();
         * var center = ellipsoid.cartographicDegreesToCartesian(Cartographic2.getZero());
         * var transform = Transforms.eastNorthUpToFixedFrame(center);
         */
        eastNorthUpToFixedFrame : function(position, ellipsoid) {
            if (!position) {
                throw new DeveloperError("position is required.", "position");
            }

            ellipsoid = ellipsoid || Ellipsoid.getWgs84();

            if (CesiumMath.equalsEpsilon(position.x, 0.0, CesiumMath.EPSILON14) &&
                    CesiumMath.equalsEpsilon(position.y, 0.0, CesiumMath.EPSILON14)) {
                // The poles are special cases.  If x and y are zero, assume position is at a pole.
                var sign = CesiumMath.sign(position.z);
                return new Matrix4(
                    0.0, sign * -1.0,        0.0, position.x,
                    1.0,         0.0,        0.0, position.y,
                    0.0,         0.0, sign * 1.0, position.z,
                    0.0,         0.0,        0.0, 1.0);
            }

            var normal = ellipsoid.geodeticSurfaceNormal(position);
            var tangent = new Cartesian3(-position.y, position.x, 0.0).normalize();
            var bitangent = normal.cross(tangent);

            return new Matrix4(
                tangent.x, bitangent.x, normal.x, position.x,
                tangent.y, bitangent.y, normal.y, position.y,
                tangent.z, bitangent.z, normal.z, position.z,
                0.0,       0.0,         0.0,      1.0);
        },

        /**
         * Creates a 4x4 transformation matrix from a reference frame center at <code>position</code>
         * with local north-east-down axes to the ellipsoid's fixed reference frame, e.g., WGS84 coordinates
         * for Earth.  The local axes are defined as:
         * <ul>
         * <li>The <code>x</code> axis points in the local north direction.</li>
         * <li>The <code>y</code> axis points in the local east direction.</li>
         * <li>The <code>z</code> axis points in the opposite direction of the ellipsoid surface normal which passes through the position.</li>
         * </ul>
         *
         * DOC_TBA:  Add images
         *
         * @param {Cartesian3} position The center point of the local reference frame.
         * @param {Ellipsoid} [ellipsoid] The ellipsoid whose fixed frame is used in the transform.
         *
         * @see Transforms.eastNorthUpToFixedFrame
         *
         * @exception {DeveloperError} position is required.
         *
         * @example
         * // Get the transform from local north-east-down at cartographic (0.0, 0.0) to Earth's fixed frame.
         * var ellipsoid = Ellipsoid.getWgs84();
         * var center = ellipsoid.cartographicDegreesToCartesian(Cartographic2.getZero());
         * var transform = Transforms.northEastDownToFixedFrame(center);
         */
        northEastDownToFixedFrame : function(position, ellipsoid) {
            if (!position) {
                throw new DeveloperError("position is required.", "position");
            }

            ellipsoid = ellipsoid || Ellipsoid.getWgs84();

            if (CesiumMath.equalsEpsilon(position.x, 0.0, CesiumMath.EPSILON14) &&
                    CesiumMath.equalsEpsilon(position.y, 0.0, CesiumMath.EPSILON14)) {
                // The poles are special cases.  If x and y are zero, assume position is at a pole.
                var sign = CesiumMath.sign(position.z);
                return new Matrix4(
                    sign * -1.0, 0.0, 0.0, position.x,
                    0.0, 1.0,         0.0, position.y,
                    0.0, 0.0, sign * -1.0, position.z,
                    0.0, 0.0,         0.0, 1.0);
            }

            var normal = ellipsoid.geodeticSurfaceNormal(position);
            var tangent = new Cartesian3(-position.y, position.x, 0.0).normalize();
            var bitangent = normal.cross(tangent);

            return new Matrix4(
                bitangent.x, tangent.x, -normal.x, position.x,
                bitangent.y, tangent.y, -normal.y, position.y,
                bitangent.z, tangent.z, -normal.z, position.z,
                0.0,         0.0,        0.0,      1.0);
        }
    };

    return Transforms;
});
