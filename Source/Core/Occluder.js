/*global define*/
define([
        './BoundingSphere',
        './Cartesian3',
        './defaultValue',
        './defined',
        './defineProperties',
        './DeveloperError',
        './Ellipsoid',
        './Math',
        './Rectangle',
        './Visibility'
    ], function(
        BoundingSphere,
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        CesiumMath,
        Rectangle,
        Visibility) {
    'use strict';

    /**
     * Creates an Occluder derived from an object's position and radius, as well as the camera position.
     * The occluder can be used to determine whether or not other objects are visible or hidden behind the
     * visible horizon defined by the occluder and camera position.
     *
     * @alias Occluder
     *
     * @param {BoundingSphere} occluderBoundingSphere The bounding sphere surrounding the occluder.
     * @param {Cartesian3} cameraPosition The coordinate of the viewer/camera.
     *
     * @constructor
     *
     * @example
     * // Construct an occluder one unit away from the origin with a radius of one.
     * var cameraPosition = Cesium.Cartesian3.ZERO;
     * var occluderBoundingSphere = new Cesium.BoundingSphere(new Cesium.Cartesian3(0, 0, -1), 1);
     * var occluder = new Cesium.Occluder(occluderBoundingSphere, cameraPosition);
     */
    function Occluder(occluderBoundingSphere, cameraPosition) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(occluderBoundingSphere)) {
            throw new DeveloperError('occluderBoundingSphere is required.');
        }
        if (!defined(cameraPosition)) {
            throw new DeveloperError('camera position is required.');
        }
        //>>includeEnd('debug');

        this._occluderPosition = Cartesian3.clone(occluderBoundingSphere.center);
        this._occluderRadius = occluderBoundingSphere.radius;

        this._horizonDistance = 0.0;
        this._horizonPlaneNormal = undefined;
        this._horizonPlanePosition = undefined;
        this._cameraPosition = undefined;

        // cameraPosition fills in the above values
        this.cameraPosition = cameraPosition;
    }

    var scratchCartesian3 = new Cartesian3();

    defineProperties(Occluder.prototype, {
        /**
         * The position of the occluder.
         * @memberof Occluder.prototype
         * @type {Cartesian3}
         */
        position: {
            get: function() {
                return this._occluderPosition;
            }
        },

        /**
         * The radius of the occluder.
         * @memberof Occluder.prototype
         * @type {Number}
         */
        radius: {
            get: function() {
                return this._occluderRadius;
            }
        },

        /**
         * The position of the camera.
         * @memberof Occluder.prototype
         * @type {Cartesian3}
         */
        cameraPosition: {
            set: function(cameraPosition) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(cameraPosition)) {
                    throw new DeveloperError('cameraPosition is required.');
                }
                //>>includeEnd('debug');

                cameraPosition = Cartesian3.clone(cameraPosition, this._cameraPosition);

                var cameraToOccluderVec = Cartesian3.subtract(this._occluderPosition, cameraPosition, scratchCartesian3);
                var invCameraToOccluderDistance = Cartesian3.magnitudeSquared(cameraToOccluderVec);
                var occluderRadiusSqrd = this._occluderRadius * this._occluderRadius;

                var horizonDistance;
                var horizonPlaneNormal;
                var horizonPlanePosition;
                if (invCameraToOccluderDistance > occluderRadiusSqrd) {
                    horizonDistance = Math.sqrt(invCameraToOccluderDistance - occluderRadiusSqrd);
                    invCameraToOccluderDistance = 1.0 / Math.sqrt(invCameraToOccluderDistance);
                    horizonPlaneNormal = Cartesian3.multiplyByScalar(cameraToOccluderVec, invCameraToOccluderDistance, scratchCartesian3);
                    var nearPlaneDistance = horizonDistance * horizonDistance * invCameraToOccluderDistance;
                    horizonPlanePosition = Cartesian3.add(cameraPosition, Cartesian3.multiplyByScalar(horizonPlaneNormal, nearPlaneDistance, scratchCartesian3), scratchCartesian3);
                } else {
                    horizonDistance = Number.MAX_VALUE;
                }

                this._horizonDistance = horizonDistance;
                this._horizonPlaneNormal = horizonPlaneNormal;
                this._horizonPlanePosition = horizonPlanePosition;
                this._cameraPosition = cameraPosition;
            }
        }
    });

    /**
     * Creates an occluder from a bounding sphere and the camera position.
     *
     * @param {BoundingSphere} occluderBoundingSphere The bounding sphere surrounding the occluder.
     * @param {Cartesian3} cameraPosition The coordinate of the viewer/camera.
     * @param {Occluder} [result] The object onto which to store the result.
     * @returns {Occluder} The occluder derived from an object's position and radius, as well as the camera position.
     */
    Occluder.fromBoundingSphere = function(occluderBoundingSphere, cameraPosition, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(occluderBoundingSphere)) {
            throw new DeveloperError('occluderBoundingSphere is required.');
        }

        if (!defined(cameraPosition)) {
            throw new DeveloperError('camera position is required.');
        }
        //>>includeEnd('debug');

        if (!defined(result)) {
            return new Occluder(occluderBoundingSphere, cameraPosition);
        }

        Cartesian3.clone(occluderBoundingSphere.center, result._occluderPosition);
        result._occluderRadius = occluderBoundingSphere.radius;
        result.cameraPosition = cameraPosition;

        return result;
    };


    var tempVecScratch = new Cartesian3();

    /**
     * Determines whether or not a point, the <code>occludee</code>, is hidden from view by the occluder.
     *
     * @param {Cartesian3} occludee The point surrounding the occludee object.
     * @returns {Boolean} <code>true</code> if the occludee is visible; otherwise <code>false</code>.
     *
     *
     * @example
     * var cameraPosition = new Cesium.Cartesian3(0, 0, 0);
     * var littleSphere = new Cesium.BoundingSphere(new Cesium.Cartesian3(0, 0, -1), 0.25);
     * var occluder = new Cesium.Occluder(littleSphere, cameraPosition);
     * var point = new Cesium.Cartesian3(0, 0, -3);
     * occluder.isPointVisible(point); //returns true
     * 
     * @see Occluder#computeVisibility
     */
    Occluder.prototype.isPointVisible = function(occludee) {
        if (this._horizonDistance !== Number.MAX_VALUE) {
            var tempVec = Cartesian3.subtract(occludee, this._occluderPosition, tempVecScratch);
            var temp = this._occluderRadius;
            temp = Cartesian3.magnitudeSquared(tempVec) - (temp * temp);
            if (temp > 0.0) {
                temp = Math.sqrt(temp) + this._horizonDistance;
                tempVec = Cartesian3.subtract(occludee, this._cameraPosition, tempVec);
                return temp * temp > Cartesian3.magnitudeSquared(tempVec);
            }
        }
        return false;
    };

    var occludeePositionScratch = new Cartesian3();

    /**
    * Determines whether or not a sphere, the <code>occludee</code>, is hidden from view by the occluder.
    *
    * @param {BoundingSphere} occludee The bounding sphere surrounding the occludee object.
    * @returns {Boolean} <code>true</code> if the occludee is visible; otherwise <code>false</code>.
    *
    *
    * @example
    * var cameraPosition = new Cesium.Cartesian3(0, 0, 0);
    * var littleSphere = new Cesium.BoundingSphere(new Cesium.Cartesian3(0, 0, -1), 0.25);
    * var occluder = new Cesium.Occluder(littleSphere, cameraPosition);
    * var bigSphere = new Cesium.BoundingSphere(new Cesium.Cartesian3(0, 0, -3), 1);
    * occluder.isBoundingSphereVisible(bigSphere); //returns true
    * 
    * @see Occluder#computeVisibility
    */
    Occluder.prototype.isBoundingSphereVisible = function(occludee) {
        var occludeePosition = Cartesian3.clone(occludee.center, occludeePositionScratch);
        var occludeeRadius = occludee.radius;

        if (this._horizonDistance !== Number.MAX_VALUE) {
            var tempVec = Cartesian3.subtract(occludeePosition, this._occluderPosition, tempVecScratch);
            var temp = this._occluderRadius - occludeeRadius;
            temp = Cartesian3.magnitudeSquared(tempVec) - (temp * temp);
            if (occludeeRadius < this._occluderRadius) {
                if (temp > 0.0) {
                    temp = Math.sqrt(temp) + this._horizonDistance;
                    tempVec = Cartesian3.subtract(occludeePosition, this._cameraPosition, tempVec);
                    return ((temp * temp) + (occludeeRadius * occludeeRadius)) > Cartesian3.magnitudeSquared(tempVec);
                }
                return false;
            }

            // Prevent against the case where the occludee radius is larger than the occluder's; since this is
            // an uncommon case, the following code should rarely execute.
            if (temp > 0.0) {
                tempVec = Cartesian3.subtract(occludeePosition, this._cameraPosition, tempVec);
                var tempVecMagnitudeSquared = Cartesian3.magnitudeSquared(tempVec);
                var occluderRadiusSquared = this._occluderRadius * this._occluderRadius;
                var occludeeRadiusSquared = occludeeRadius * occludeeRadius;
                if ((((this._horizonDistance * this._horizonDistance) + occluderRadiusSquared) * occludeeRadiusSquared) >
                    (tempVecMagnitudeSquared * occluderRadiusSquared)) {
                    // The occludee is close enough that the occluder cannot possible occlude the occludee
                    return true;
                }
                temp = Math.sqrt(temp) + this._horizonDistance;
                return ((temp * temp) + occludeeRadiusSquared) > tempVecMagnitudeSquared;
            }

            // The occludee completely encompasses the occluder
            return true;
        }

        return false;
    };

    var tempScratch = new Cartesian3();
    /**
     * Determine to what extent an occludee is visible (not visible, partially visible,  or fully visible).
     *
     * @param {BoundingSphere} occludeeBS The bounding sphere of the occludee.
     * @returns {Number} Visibility.NONE if the occludee is not visible,
     *                       Visibility.PARTIAL if the occludee is partially visible, or
     *                       Visibility.FULL if the occludee is fully visible.
     *
     *
     * @example
     * var sphere1 = new Cesium.BoundingSphere(new Cesium.Cartesian3(0, 0, -1.5), 0.5);
     * var sphere2 = new Cesium.BoundingSphere(new Cesium.Cartesian3(0, 0, -2.5), 0.5);
     * var cameraPosition = new Cesium.Cartesian3(0, 0, 0);
     * var occluder = new Cesium.Occluder(sphere1, cameraPosition);
     * occluder.computeVisibility(sphere2); //returns Visibility.NONE
     * 
     * @see Occluder#isVisible
     */
    Occluder.prototype.computeVisibility = function(occludeeBS) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(occludeeBS)) {
            throw new DeveloperError('occludeeBS is required.');
        }
        //>>includeEnd('debug');

        // If the occludee radius is larger than the occluders, this will return that
        // the entire ocludee is visible, even though that may not be the case, though this should
        // not occur too often.
        var occludeePosition = Cartesian3.clone(occludeeBS.center);
        var occludeeRadius = occludeeBS.radius;

        if (occludeeRadius > this._occluderRadius) {
            return Visibility.FULL;
        }

        if (this._horizonDistance !== Number.MAX_VALUE) {
            // The camera is outside the occluder
            var tempVec = Cartesian3.subtract(occludeePosition, this._occluderPosition, tempScratch);
            var temp = this._occluderRadius - occludeeRadius;
            var occluderToOccludeeDistSqrd = Cartesian3.magnitudeSquared(tempVec);
            temp = occluderToOccludeeDistSqrd - (temp * temp);
            if (temp > 0.0) {
                // The occludee is not completely inside the occluder
                // Check to see if the occluder completely hides the occludee
                temp = Math.sqrt(temp) + this._horizonDistance;
                tempVec = Cartesian3.subtract(occludeePosition, this._cameraPosition, tempVec);
                var cameraToOccludeeDistSqrd = Cartesian3.magnitudeSquared(tempVec);
                if (((temp * temp) + (occludeeRadius * occludeeRadius)) < cameraToOccludeeDistSqrd) {
                    return Visibility.NONE;
                }

                // Check to see whether the occluder is fully or partially visible
                // when the occludee does not intersect the occluder
                temp = this._occluderRadius + occludeeRadius;
                temp = occluderToOccludeeDistSqrd - (temp * temp);
                if (temp > 0.0) {
                    // The occludee does not intersect the occluder.
                    temp = Math.sqrt(temp) + this._horizonDistance;
                    return (cameraToOccludeeDistSqrd < ((temp * temp)) + (occludeeRadius * occludeeRadius)) ? Visibility.FULL : Visibility.PARTIAL;
                }

                //Check to see if the occluder is fully or partially visible when the occludee DOES
                //intersect the occluder
                tempVec = Cartesian3.subtract(occludeePosition, this._horizonPlanePosition, tempVec);
                return (Cartesian3.dot(tempVec, this._horizonPlaneNormal) > -occludeeRadius) ? Visibility.PARTIAL : Visibility.FULL;
            }
        }
        return Visibility.NONE;
    };

    var occludeePointScratch = new Cartesian3();
    /**
     * Computes a point that can be used as the occludee position to the visibility functions.
     * Use a radius of zero for the occludee radius.  Typically, a user computes a bounding sphere around
     * an object that is used for visibility; however it is also possible to compute a point that if
     * seen/not seen would also indicate if an object is visible/not visible.  This function is better
     * called for objects that do not move relative to the occluder and is large, such as a chunk of
     * terrain.  You are better off not calling this and using the object's bounding sphere for objects
     * such as a satellite or ground vehicle.
     *
     * @param {BoundingSphere} occluderBoundingSphere The bounding sphere surrounding the occluder.
     * @param {Cartesian3} occludeePosition The point where the occludee (bounding sphere of radius 0) is located.
     * @param {Cartesian3[]} positions List of altitude points on the horizon near the surface of the occluder.
     * @returns {Object} An object containing two attributes: <code>occludeePoint</code> and <code>valid</code>
     * which is a boolean value.
     *
     * @exception {DeveloperError} <code>positions</code> must contain at least one element.
     * @exception {DeveloperError} <code>occludeePosition</code> must have a value other than <code>occluderBoundingSphere.center</code>.
     *
     * @example
     * var cameraPosition = new Cesium.Cartesian3(0, 0, 0);
     * var occluderBoundingSphere = new Cesium.BoundingSphere(new Cesium.Cartesian3(0, 0, -8), 2);
     * var occluder = new Cesium.Occluder(occluderBoundingSphere, cameraPosition);
     * var positions = [new Cesium.Cartesian3(-0.25, 0, -5.3), new Cesium.Cartesian3(0.25, 0, -5.3)];
     * var tileOccluderSphere = Cesium.BoundingSphere.fromPoints(positions);
     * var occludeePosition = tileOccluderSphere.center;
     * var occludeePt = Cesium.Occluder.computeOccludeePoint(occluderBoundingSphere, occludeePosition, positions);
     */
    Occluder.computeOccludeePoint = function(occluderBoundingSphere, occludeePosition, positions) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(occluderBoundingSphere)) {
            throw new DeveloperError('occluderBoundingSphere is required.');
        }
        if (!defined(positions)) {
            throw new DeveloperError('positions is required.');
        }
        if (positions.length === 0) {
            throw new DeveloperError('positions must contain at least one element');
        }
        //>>includeEnd('debug');

        var occludeePos = Cartesian3.clone(occludeePosition);
        var occluderPosition = Cartesian3.clone(occluderBoundingSphere.center);
        var occluderRadius = occluderBoundingSphere.radius;
        var numPositions = positions.length;

        //>>includeStart('debug', pragmas.debug);
        if (Cartesian3.equals(occluderPosition, occludeePosition)) {
            throw new DeveloperError('occludeePosition must be different than occluderBoundingSphere.center');
        }
        //>>includeEnd('debug');

        // Compute a plane with a normal from the occluder to the occludee position.
        var occluderPlaneNormal = Cartesian3.normalize(Cartesian3.subtract(occludeePos, occluderPosition, occludeePointScratch), occludeePointScratch);
        var occluderPlaneD = -(Cartesian3.dot(occluderPlaneNormal, occluderPosition));

        //For each position, determine the horizon intersection. Choose the position and intersection
        //that results in the greatest angle with the occcluder plane.
        var aRotationVector = Occluder._anyRotationVector(occluderPosition, occluderPlaneNormal, occluderPlaneD);
        var dot = Occluder._horizonToPlaneNormalDotProduct(occluderBoundingSphere, occluderPlaneNormal, occluderPlaneD, aRotationVector, positions[0]);
        if (!dot) {
            //The position is inside the mimimum radius, which is invalid
            return undefined;
        }
        var tempDot;
        for ( var i = 1; i < numPositions; ++i) {
            tempDot = Occluder._horizonToPlaneNormalDotProduct(occluderBoundingSphere, occluderPlaneNormal, occluderPlaneD, aRotationVector, positions[i]);
            if (!tempDot) {
                //The position is inside the minimum radius, which is invalid
                return undefined;
            }
            if (tempDot < dot) {
                dot = tempDot;
            }
        }
        //Verify that the dot is not near 90 degress
        if (dot < 0.00174532836589830883577820272085) {
            return undefined;
        }

        var distance = occluderRadius / dot;
        return Cartesian3.add(occluderPosition, Cartesian3.multiplyByScalar(occluderPlaneNormal, distance, occludeePointScratch), occludeePointScratch);
    };

    var computeOccludeePointFromRectangleScratch = [];
    /**
     * Computes a point that can be used as the occludee position to the visibility functions from an rectangle.
     *
     * @param {Rectangle} rectangle The rectangle used to create a bounding sphere.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid used to determine positions of the rectangle.
     * @returns {Object} An object containing two attributes: <code>occludeePoint</code> and <code>valid</code>
     * which is a boolean value.
     */
    Occluder.computeOccludeePointFromRectangle = function(rectangle, ellipsoid) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(rectangle)) {
            throw new DeveloperError('rectangle is required.');
        }
        //>>includeEnd('debug');

        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        var positions = Rectangle.subsample(rectangle, ellipsoid, 0.0, computeOccludeePointFromRectangleScratch);
        var bs = BoundingSphere.fromPoints(positions);

        // TODO: get correct ellipsoid center
        var ellipsoidCenter = Cartesian3.ZERO;
        if (!Cartesian3.equals(ellipsoidCenter, bs.center)) {
            return Occluder.computeOccludeePoint(new BoundingSphere(ellipsoidCenter, ellipsoid.minimumRadius), bs.center, positions);
        }

        return undefined;
    };

    var tempVec0Scratch = new Cartesian3();
    Occluder._anyRotationVector = function(occluderPosition, occluderPlaneNormal, occluderPlaneD) {
        var tempVec0 = Cartesian3.abs(occluderPlaneNormal, tempVec0Scratch);
        var majorAxis = tempVec0.x > tempVec0.y ? 0 : 1;
        if (((majorAxis === 0) && (tempVec0.z > tempVec0.x)) || ((majorAxis === 1) && (tempVec0.z > tempVec0.y))) {
            majorAxis = 2;
        }
        var tempVec = new Cartesian3();
        var tempVec1;
        if (majorAxis === 0) {
            tempVec0.x = occluderPosition.x;
            tempVec0.y = occluderPosition.y + 1.0;
            tempVec0.z = occluderPosition.z + 1.0;
            tempVec1 = Cartesian3.UNIT_X;
        } else if (majorAxis === 1) {
            tempVec0.x = occluderPosition.x + 1.0;
            tempVec0.y = occluderPosition.y;
            tempVec0.z = occluderPosition.z + 1.0;
            tempVec1 = Cartesian3.UNIT_Y;
        } else {
            tempVec0.x = occluderPosition.x + 1.0;
            tempVec0.y = occluderPosition.y + 1.0;
            tempVec0.z = occluderPosition.z;
            tempVec1 = Cartesian3.UNIT_Z;
        }
        var u = (Cartesian3.dot(occluderPlaneNormal, tempVec0) + occluderPlaneD) / -(Cartesian3.dot(occluderPlaneNormal, tempVec1));
        return Cartesian3.normalize(Cartesian3.subtract(Cartesian3.add(tempVec0, Cartesian3.multiplyByScalar(tempVec1, u, tempVec), tempVec0), occluderPosition, tempVec0), tempVec0);
    };

    var posDirectionScratch = new Cartesian3();
    Occluder._rotationVector = function(occluderPosition, occluderPlaneNormal, occluderPlaneD, position, anyRotationVector) {
        //Determine the angle between the occluder plane normal and the position direction
        var positionDirection = Cartesian3.subtract(position, occluderPosition, posDirectionScratch);
        positionDirection = Cartesian3.normalize(positionDirection, positionDirection);
        if (Cartesian3.dot(occluderPlaneNormal, positionDirection) < 0.99999998476912904932780850903444) {
            var crossProduct = Cartesian3.cross(occluderPlaneNormal, positionDirection, positionDirection);
            var length = Cartesian3.magnitude(crossProduct);
            if (length > CesiumMath.EPSILON13) {
                return Cartesian3.normalize(crossProduct, new Cartesian3());
            }
        }
        //The occluder plane normal and the position direction are colinear. Use any
        //vector in the occluder plane as the rotation vector
        return anyRotationVector;
    };

    var posScratch1 = new Cartesian3();
    var occluerPosScratch = new Cartesian3();
    var posScratch2 = new Cartesian3();
    var horizonPlanePosScratch = new Cartesian3();
    Occluder._horizonToPlaneNormalDotProduct = function(occluderBS, occluderPlaneNormal, occluderPlaneD, anyRotationVector, position) {
        var pos = Cartesian3.clone(position, posScratch1);
        var occluderPosition = Cartesian3.clone(occluderBS.center, occluerPosScratch);
        var occluderRadius = occluderBS.radius;

        //Verify that the position is outside the occluder
        var positionToOccluder = Cartesian3.subtract(occluderPosition, pos, posScratch2);
        var occluderToPositionDistanceSquared = Cartesian3.magnitudeSquared(positionToOccluder);
        var occluderRadiusSquared = occluderRadius * occluderRadius;
        if (occluderToPositionDistanceSquared < occluderRadiusSquared) {
            return false;
        }

        //Horizon parameters
        var horizonDistanceSquared = occluderToPositionDistanceSquared - occluderRadiusSquared;
        var horizonDistance = Math.sqrt(horizonDistanceSquared);
        var occluderToPositionDistance = Math.sqrt(occluderToPositionDistanceSquared);
        var invOccluderToPositionDistance = 1.0 / occluderToPositionDistance;
        var cosTheta = horizonDistance * invOccluderToPositionDistance;
        var horizonPlaneDistance = cosTheta * horizonDistance;
        positionToOccluder = Cartesian3.normalize(positionToOccluder, positionToOccluder);
        var horizonPlanePosition = Cartesian3.add(pos, Cartesian3.multiplyByScalar(positionToOccluder, horizonPlaneDistance, horizonPlanePosScratch), horizonPlanePosScratch);
        var horizonCrossDistance = Math.sqrt(horizonDistanceSquared - (horizonPlaneDistance * horizonPlaneDistance));

        //Rotate the position to occluder vector 90 degrees
        var tempVec = this._rotationVector(occluderPosition, occluderPlaneNormal, occluderPlaneD, pos, anyRotationVector);
        var horizonCrossDirection = Cartesian3.fromElements(
                (tempVec.x * tempVec.x * positionToOccluder.x) + ((tempVec.x * tempVec.y - tempVec.z) * positionToOccluder.y) + ((tempVec.x * tempVec.z + tempVec.y) * positionToOccluder.z),
                ((tempVec.x * tempVec.y + tempVec.z) * positionToOccluder.x) + (tempVec.y * tempVec.y * positionToOccluder.y) + ((tempVec.y * tempVec.z - tempVec.x) * positionToOccluder.z),
                ((tempVec.x * tempVec.z - tempVec.y) * positionToOccluder.x) + ((tempVec.y * tempVec.z + tempVec.x) * positionToOccluder.y) + (tempVec.z * tempVec.z * positionToOccluder.z),
                posScratch1);
        horizonCrossDirection = Cartesian3.normalize(horizonCrossDirection, horizonCrossDirection);

        //Horizon positions
        var offset = Cartesian3.multiplyByScalar(horizonCrossDirection, horizonCrossDistance, posScratch1);
        tempVec = Cartesian3.normalize(Cartesian3.subtract(Cartesian3.add(horizonPlanePosition, offset, posScratch2), occluderPosition, posScratch2), posScratch2);
        var dot0 = Cartesian3.dot(occluderPlaneNormal, tempVec);
        tempVec = Cartesian3.normalize(Cartesian3.subtract(Cartesian3.subtract(horizonPlanePosition, offset, tempVec), occluderPosition, tempVec), tempVec);
        var dot1 = Cartesian3.dot(occluderPlaneNormal, tempVec);
        return (dot0 < dot1) ? dot0 : dot1;
    };

    return Occluder;
});
