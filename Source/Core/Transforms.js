/*global define*/
define([
        './DeveloperError',
        './Math',
        './Matrix3',
        './Matrix4',
        './Cartesian3',
        './Cartesian4',
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
        Cartesian4,
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
         * var ellipsoid = Ellipsoid.WGS84;
         * var center = ellipsoid.cartographicDegreesToCartesian(Cartographic2.ZERO);
         * var transform = Transforms.eastNorthUpToFixedFrame(center);
         */
        eastNorthUpToFixedFrame : function(position, ellipsoid) {
            if (!position) {
                throw new DeveloperError('position is required.');
            }

            ellipsoid = ellipsoid || Ellipsoid.WGS84;

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
         * var ellipsoid = Ellipsoid.WGS84;
         * var center = ellipsoid.cartographicDegreesToCartesian(Cartographic2.ZERO);
         * var transform = Transforms.northEastDownToFixedFrame(center);
         */
        northEastDownToFixedFrame : function(position, ellipsoid) {
            if (!position) {
                throw new DeveloperError('position is required.');
            }

            ellipsoid = ellipsoid || Ellipsoid.WGS84;

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
        },

        /**
         * Transform a point from model coordinates to window coordinates.
         *
         * @param {Matrix4} modelViewProjectionMatrix The 4x4 model-view-projection matrix.
         * @param {Matrix4} viewportTransformation The 4x4 viewport transformation.
         * @param {Cartesian3} point The point to transform.
         *
         * @returns {Cartesian2} The point in window coordinates.
         *
         * @see UniformState#getModelViewProjection
         * @see agi_modelViewProjection
         * @see UniformState#getViewportTransformation
         * @see agi_viewportTransformation
         *
         * @exception {DeveloperError} modelViewProjectionMatrix is required.
         * @exception {DeveloperError} viewportTransformation is required.
         * @exception {DeveloperError} point is required.
         */
        pointToWindowCoordinates : function (modelViewProjectionMatrix, viewportTransformation, point) {
            if (typeof modelViewProjectionMatrix === 'undefined') {
                throw new DeveloperError('modelViewProjectionMatrix is required.');
            }

            if (typeof viewportTransformation === 'undefined') {
                throw new DeveloperError('viewportTransformation is required.');
            }

            if (typeof point === 'undefined') {
                throw new DeveloperError('point is required.');
            }

            var pnt = new Cartesian4(point.x, point.y, point.z, 1.0);
            pnt = modelViewProjectionMatrix.multiplyWithVector(pnt);
            pnt = pnt.multiplyWithScalar(1.0 / pnt.w);
            pnt = viewportTransformation.multiplyWithVector(pnt);
            return pnt.getXY();
        }
    };

    return Transforms;
});
