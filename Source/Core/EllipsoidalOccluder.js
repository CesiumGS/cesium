/*global define*/
define([
        './BoundingSphere',
        './Cartesian3',
        './defaultValue',
        './defined',
        './defineProperties',
        './DeveloperError',
        './Rectangle'
    ], function(
        BoundingSphere,
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Rectangle) {
    'use strict';

    /**
     * Determine whether or not other objects are visible or hidden behind the visible horizon defined by
     * an {@link Ellipsoid} and a camera position.  The ellipsoid is assumed to be located at the
     * origin of the coordinate system.  This class uses the algorithm described in the
     * {@link http://cesiumjs.org/2013/04/25/Horizon-culling/|Horizon Culling} blog post.
     *
     * @alias EllipsoidalOccluder
     *
     * @param {Ellipsoid} ellipsoid The ellipsoid to use as an occluder.
     * @param {Cartesian3} [cameraPosition] The coordinate of the viewer/camera.  If this parameter is not
     *        specified, {@link EllipsoidalOccluder#cameraPosition} must be called before
     *        testing visibility.
     *
     * @constructor
     *
     * @example
     * // Construct an ellipsoidal occluder with radii 1.0, 1.1, and 0.9.
     * var cameraPosition = new Cesium.Cartesian3(5.0, 6.0, 7.0);
     * var occluderEllipsoid = new Cesium.Ellipsoid(1.0, 1.1, 0.9);
     * var occluder = new Cesium.EllipsoidalOccluder(occluderEllipsoid, cameraPosition);
     *
     * @private
     */
    function EllipsoidalOccluder(ellipsoid, cameraPosition) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(ellipsoid)) {
            throw new DeveloperError('ellipsoid is required.');
        }
        //>>includeEnd('debug');

        this._ellipsoid = ellipsoid;
        this._cameraPosition = new Cartesian3();
        this._cameraPositionInScaledSpace = new Cartesian3();
        this._distanceToLimbInScaledSpaceSquared = 0.0;

        // cameraPosition fills in the above values
        if (defined(cameraPosition)) {
            this.cameraPosition = cameraPosition;
        }
    }

    defineProperties(EllipsoidalOccluder.prototype, {
        /**
         * Gets the occluding ellipsoid.
         * @memberof EllipsoidalOccluder.prototype
         * @type {Ellipsoid}
         */
        ellipsoid : {
            get: function() {
                return this._ellipsoid;
            }
        },
        /**
         * Gets or sets the position of the camera.
         * @memberof EllipsoidalOccluder.prototype
         * @type {Cartesian3}
         */
        cameraPosition : {
            get : function() {
                return this._cameraPosition;
            },
            set : function(cameraPosition) {
                // See http://cesiumjs.org/2013/04/25/Horizon-culling/
                var ellipsoid = this._ellipsoid;
                var cv = ellipsoid.transformPositionToScaledSpace(cameraPosition, this._cameraPositionInScaledSpace);
                var vhMagnitudeSquared = Cartesian3.magnitudeSquared(cv) - 1.0;

                Cartesian3.clone(cameraPosition, this._cameraPosition);
                this._cameraPositionInScaledSpace = cv;
                this._distanceToLimbInScaledSpaceSquared = vhMagnitudeSquared;
            }
        }
    });

    var scratchCartesian = new Cartesian3();

    /**
     * Determines whether or not a point, the <code>occludee</code>, is hidden from view by the occluder.
     *
     * @param {Cartesian3} occludee The point to test for visibility.
     * @returns {Boolean} <code>true</code> if the occludee is visible; otherwise <code>false</code>.
     *
     * @example
     * var cameraPosition = new Cesium.Cartesian3(0, 0, 2.5);
     * var ellipsoid = new Cesium.Ellipsoid(1.0, 1.1, 0.9);
     * var occluder = new Cesium.EllipsoidalOccluder(ellipsoid, cameraPosition);
     * var point = new Cesium.Cartesian3(0, -3, -3);
     * occluder.isPointVisible(point); //returns true
     */
    EllipsoidalOccluder.prototype.isPointVisible = function(occludee) {
        var ellipsoid = this._ellipsoid;
        var occludeeScaledSpacePosition = ellipsoid.transformPositionToScaledSpace(occludee, scratchCartesian);
        return this.isScaledSpacePointVisible(occludeeScaledSpacePosition);
    };

    /**
     * Determines whether or not a point expressed in the ellipsoid scaled space, is hidden from view by the
     * occluder.  To transform a Cartesian X, Y, Z position in the coordinate system aligned with the ellipsoid
     * into the scaled space, call {@link Ellipsoid#transformPositionToScaledSpace}.
     *
     * @param {Cartesian3} occludeeScaledSpacePosition The point to test for visibility, represented in the scaled space.
     * @returns {Boolean} <code>true</code> if the occludee is visible; otherwise <code>false</code>.
     *
     * @example
     * var cameraPosition = new Cesium.Cartesian3(0, 0, 2.5);
     * var ellipsoid = new Cesium.Ellipsoid(1.0, 1.1, 0.9);
     * var occluder = new Cesium.EllipsoidalOccluder(ellipsoid, cameraPosition);
     * var point = new Cesium.Cartesian3(0, -3, -3);
     * var scaledSpacePoint = ellipsoid.transformPositionToScaledSpace(point);
     * occluder.isScaledSpacePointVisible(scaledSpacePoint); //returns true
     */
    EllipsoidalOccluder.prototype.isScaledSpacePointVisible = function(occludeeScaledSpacePosition) {
        // See http://cesiumjs.org/2013/04/25/Horizon-culling/
        var cv = this._cameraPositionInScaledSpace;
        var vhMagnitudeSquared = this._distanceToLimbInScaledSpaceSquared;
        var vt = Cartesian3.subtract(occludeeScaledSpacePosition, cv, scratchCartesian);
        var vtDotVc = -Cartesian3.dot(vt, cv);
        // If vhMagnitudeSquared < 0 then we are below the surface of the ellipsoid and
        // in this case, set the culling plane to be on V.
        var isOccluded = vhMagnitudeSquared < 0 ? vtDotVc > 0 : (vtDotVc > vhMagnitudeSquared &&
                         vtDotVc * vtDotVc / Cartesian3.magnitudeSquared(vt) > vhMagnitudeSquared);
        return !isOccluded;
    };

    /**
     * Computes a point that can be used for horizon culling from a list of positions.  If the point is below
     * the horizon, all of the positions are guaranteed to be below the horizon as well.  The returned point
     * is expressed in the ellipsoid-scaled space and is suitable for use with
     * {@link EllipsoidalOccluder#isScaledSpacePointVisible}.
     *
     * @param {Cartesian3} directionToPoint The direction that the computed point will lie along.
     *                     A reasonable direction to use is the direction from the center of the ellipsoid to
     *                     the center of the bounding sphere computed from the positions.  The direction need not
     *                     be normalized.
     * @param {Cartesian3[]} positions The positions from which to compute the horizon culling point.  The positions
     *                       must be expressed in a reference frame centered at the ellipsoid and aligned with the
     *                       ellipsoid's axes.
     * @param {Cartesian3} [result] The instance on which to store the result instead of allocating a new instance.
     * @returns {Cartesian3} The computed horizon culling point, expressed in the ellipsoid-scaled space.
     */
    EllipsoidalOccluder.prototype.computeHorizonCullingPoint = function(directionToPoint, positions, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(directionToPoint)) {
            throw new DeveloperError('directionToPoint is required');
        }
        if (!defined(positions)) {
            throw new DeveloperError('positions is required');
        }
        //>>includeEnd('debug');

        if (!defined(result)) {
            result = new Cartesian3();
        }

        var ellipsoid = this._ellipsoid;
        var scaledSpaceDirectionToPoint = computeScaledSpaceDirectionToPoint(ellipsoid, directionToPoint);
        var resultMagnitude = 0.0;

        for (var i = 0, len = positions.length; i < len; ++i) {
            var position = positions[i];
            var candidateMagnitude = computeMagnitude(ellipsoid, position, scaledSpaceDirectionToPoint);
            resultMagnitude = Math.max(resultMagnitude, candidateMagnitude);
        }

        return magnitudeToPoint(scaledSpaceDirectionToPoint, resultMagnitude, result);
    };

    var positionScratch = new Cartesian3();

    /**
     * Computes a point that can be used for horizon culling from a list of positions.  If the point is below
     * the horizon, all of the positions are guaranteed to be below the horizon as well.  The returned point
     * is expressed in the ellipsoid-scaled space and is suitable for use with
     * {@link EllipsoidalOccluder#isScaledSpacePointVisible}.
     *
     * @param {Cartesian3} directionToPoint The direction that the computed point will lie along.
     *                     A reasonable direction to use is the direction from the center of the ellipsoid to
     *                     the center of the bounding sphere computed from the positions.  The direction need not
     *                     be normalized.
     * @param {Number[]} vertices  The vertices from which to compute the horizon culling point.  The positions
     *                   must be expressed in a reference frame centered at the ellipsoid and aligned with the
     *                   ellipsoid's axes.
     * @param {Number} [stride=3]
     * @param {Cartesian3} [center=Cartesian3.ZERO]
     * @param {Cartesian3} [result] The instance on which to store the result instead of allocating a new instance.
     * @returns {Cartesian3} The computed horizon culling point, expressed in the ellipsoid-scaled space.
     */
    EllipsoidalOccluder.prototype.computeHorizonCullingPointFromVertices = function(directionToPoint, vertices, stride, center, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(directionToPoint)) {
            throw new DeveloperError('directionToPoint is required');
        }
        if (!defined(vertices)) {
            throw new DeveloperError('vertices is required');
        }
        if (!defined(stride)) {
            throw new DeveloperError('stride is required');
        }
        //>>includeEnd('debug');

        if (!defined(result)) {
            result = new Cartesian3();
        }

        center = defaultValue(center, Cartesian3.ZERO);
        var ellipsoid = this._ellipsoid;
        var scaledSpaceDirectionToPoint = computeScaledSpaceDirectionToPoint(ellipsoid, directionToPoint);
        var resultMagnitude = 0.0;

        for (var i = 0, len = vertices.length; i < len; i += stride) {
            positionScratch.x = vertices[i] + center.x;
            positionScratch.y = vertices[i + 1] + center.y;
            positionScratch.z = vertices[i + 2] + center.z;

            var candidateMagnitude = computeMagnitude(ellipsoid, positionScratch, scaledSpaceDirectionToPoint);
            resultMagnitude = Math.max(resultMagnitude, candidateMagnitude);
        }

        return magnitudeToPoint(scaledSpaceDirectionToPoint, resultMagnitude, result);
    };

    var subsampleScratch = [];

    /**
     * Computes a point that can be used for horizon culling of an rectangle.  If the point is below
     * the horizon, the ellipsoid-conforming rectangle is guaranteed to be below the horizon as well.
     * The returned point is expressed in the ellipsoid-scaled space and is suitable for use with
     * {@link EllipsoidalOccluder#isScaledSpacePointVisible}.
     *
     * @param {Rectangle} rectangle The rectangle for which to compute the horizon culling point.
     * @param {Ellipsoid} ellipsoid The ellipsoid on which the rectangle is defined.  This may be different from
     *                    the ellipsoid used by this instance for occlusion testing.
     * @param {Cartesian3} [result] The instance on which to store the result instead of allocating a new instance.
     * @returns {Cartesian3} The computed horizon culling point, expressed in the ellipsoid-scaled space.
     */
    EllipsoidalOccluder.prototype.computeHorizonCullingPointFromRectangle = function(rectangle, ellipsoid, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(rectangle)) {
            throw new DeveloperError('rectangle is required.');
        }
        //>>includeEnd('debug');

        var positions = Rectangle.subsample(rectangle, ellipsoid, 0.0, subsampleScratch);
        var bs = BoundingSphere.fromPoints(positions);

        // If the bounding sphere center is too close to the center of the occluder, it doesn't make
        // sense to try to horizon cull it.
        if (Cartesian3.magnitude(bs.center) < 0.1 * ellipsoid.minimumRadius) {
            return undefined;
        }

        return this.computeHorizonCullingPoint(bs.center, positions, result);
    };

    var scaledSpaceScratch = new Cartesian3();
    var directionScratch = new Cartesian3();

    function computeMagnitude(ellipsoid, position, scaledSpaceDirectionToPoint) {
        var scaledSpacePosition = ellipsoid.transformPositionToScaledSpace(position, scaledSpaceScratch);
        var magnitudeSquared = Cartesian3.magnitudeSquared(scaledSpacePosition);
        var magnitude = Math.sqrt(magnitudeSquared);
        var direction = Cartesian3.divideByScalar(scaledSpacePosition, magnitude, directionScratch);

        // For the purpose of this computation, points below the ellipsoid are consider to be on it instead.
        magnitudeSquared = Math.max(1.0, magnitudeSquared);
        magnitude = Math.max(1.0, magnitude);

        var cosAlpha = Cartesian3.dot(direction, scaledSpaceDirectionToPoint);
        var sinAlpha = Cartesian3.magnitude(Cartesian3.cross(direction, scaledSpaceDirectionToPoint, direction));
        var cosBeta = 1.0 / magnitude;
        var sinBeta = Math.sqrt(magnitudeSquared - 1.0) * cosBeta;

        return 1.0 / (cosAlpha * cosBeta - sinAlpha * sinBeta);
    }

    function magnitudeToPoint(scaledSpaceDirectionToPoint, resultMagnitude, result) {
        // The horizon culling point is undefined if there were no positions from which to compute it,
        // the directionToPoint is pointing opposite all of the positions,  or if we computed NaN or infinity.
        if (resultMagnitude <= 0.0 || resultMagnitude === 1.0 / 0.0 || resultMagnitude !== resultMagnitude) {
            return undefined;
        }

        return Cartesian3.multiplyByScalar(scaledSpaceDirectionToPoint, resultMagnitude, result);
    }

    var directionToPointScratch = new Cartesian3();

    function computeScaledSpaceDirectionToPoint(ellipsoid, directionToPoint) {
        if (Cartesian3.equals(directionToPoint, Cartesian3.ZERO)) {
            return directionToPoint;
        }

        ellipsoid.transformPositionToScaledSpace(directionToPoint, directionToPointScratch);
        return Cartesian3.normalize(directionToPointScratch, directionToPointScratch);
    }

    return EllipsoidalOccluder;
});
