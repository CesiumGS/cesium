/*global define*/
define([
        './DeveloperError',
        './Math',
        './Cartesian3',
        './Visibility'
    ], function(
        DeveloperError,
        CesiumMath,
        Cartesian3,
        Visibility) {
    "use strict";

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
     * @exception {DeveloperError} <code>occluderBoundingSphere</code> is required.
     * @exception {DeveloperError} <code>cameraPosition</code> is required.
     *
     * @constructor
     *
     * @example
     * // Construct an occluder one unit away from the origin with a radius of one.
     * var cameraPosition = new Cartesian3.ZERO;
     * var occluderBoundingSphere = new BoundingSphere(new Cartesian3(0, 0, -1), 1);
     * var occluder = new Occluder(occluderBoundingSphere, cameraPosition);
     */
    var Occluder = function(occluderBoundingSphere, cameraPosition) {
        if (!occluderBoundingSphere) {
            throw new DeveloperError('occluderBoundingSphere is required.');
        }

        if (!cameraPosition) {
            throw new DeveloperError('camera position is required.');
        }

        this._occluderPosition = occluderBoundingSphere.center.clone();
        this._occluderRadius = occluderBoundingSphere.radius;

        this._horizonDistance = 0.0;
        this._horizonPlaneNormal = undefined;
        this._horizonPlanePosition = undefined;
        this._cameraPosition = undefined;

        // setCameraPosition fills in the above values
        this.setCameraPosition(cameraPosition);
    };

    /**
     * Returns the position of the occluder.
     *
     * @memberof Occluder
     *
     * @return {Cartesian3} The position of the occluder.
     */
    Occluder.prototype.getPosition = function() {
        return this._occluderPosition;
    };

    /**
     * Returns the radius of the occluder.
     *
     * @return {Number} The radius of the occluder.
     */
    Occluder.prototype.getRadius = function() {
        return this._occluderRadius;
    };

    /**
     * Sets the position of the camera.
     *
     * @param {Cartesian3} cameraPosition The new position of the camera.
     */
    Occluder.prototype.setCameraPosition = function(cameraPosition) {
        cameraPosition = Cartesian3.clone(cameraPosition);

        var cameraToOccluderVec = this._occluderPosition.subtract(cameraPosition);
        var invCameraToOccluderDistance = cameraToOccluderVec.magnitudeSquared();
        var occluderRadiusSqrd = this._occluderRadius * this._occluderRadius;

        var horizonDistance;
        var horizonPlaneNormal;
        var horizonPlanePosition;
        if (invCameraToOccluderDistance > occluderRadiusSqrd) {
            horizonDistance = Math.sqrt(invCameraToOccluderDistance - occluderRadiusSqrd);
            invCameraToOccluderDistance = 1.0 / Math.sqrt(invCameraToOccluderDistance);
            horizonPlaneNormal = cameraToOccluderVec.multiplyByScalar(invCameraToOccluderDistance);
            var nearPlaneDistance = horizonDistance * horizonDistance * invCameraToOccluderDistance;
            horizonPlanePosition = cameraPosition.add(horizonPlaneNormal.multiplyByScalar(nearPlaneDistance));
        } else {
            horizonDistance = Number.MAX_VALUE;
        }

        this._horizonDistance = horizonDistance;
        this._horizonPlaneNormal = horizonPlaneNormal;
        this._horizonPlanePosition = horizonPlanePosition;
        this._cameraPosition = cameraPosition;
    };

    /**
    * Determines whether or not an object, the <code>occludee</code>, is hidden from view by the occluder.
    *
    * @memberof Occluder
    *
    * @param {BoundingSphere} occludeeBS The bounding sphere surrounding the occludee object.
    *
    * @return {boolean} <code>true</code> if the occludee is visible; otherwise <code>false</code>.
    *
    * @example
    * var cameraPosition = new Cartesian3(0, 0, 0);
    * var littleSphere = new BoundingSphere(new Cartesian3(0, 0, -1), 0.25);
    * var occluder = new Occluder(littleSphere, cameraPosition);
    * var bigSphere = new BoundingSphere(new Cartesian3(0, 0, -3), 1);
    * occluder.isVisible(bigSphere); //returns true
    *
    * @see Occluder#getVisibility
    */
    Occluder.prototype.isVisible = function(occludeeBS) {
        var occludeePosition = occludeeBS.center.clone();
        var occludeeRadius = occludeeBS.radius;

        if (this._horizonDistance !== Number.MAX_VALUE) {
            var tempVec = occludeePosition.subtract(this._occluderPosition);
            var temp = this._occluderRadius - occludeeRadius;
            temp = tempVec.magnitudeSquared() - (temp * temp);
            if (occludeeRadius < this._occluderRadius) {
                if (temp > 0.0) {
                    temp = Math.sqrt(temp) + this._horizonDistance;
                    tempVec = occludeePosition.subtract(this._cameraPosition);
                    return ((temp * temp) + (occludeeRadius * occludeeRadius)) > tempVec.magnitudeSquared();
                }
                return false;
            }

            // Prevent against the case where the occludee radius is larger than the occluder's; since this is
            // an uncommon case, the following code should rarely execute.
            if (temp > 0.0) {
                tempVec = occludeePosition.subtract(this._cameraPosition);
                var tempVecMagnitudeSquared = tempVec.magnitudeSquared();
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

    /**
     * Determine to what extent an occludee is visible (not visible, partially visible,  or fully visible).
     *
     * @memberof Occluder
     *
     * @param {BoundingSphere} occludeeBS
     *
     * @return {Enumeration} Visibility.NONE if the occludee is not visible,
     *                       Visibility.PARTIAL if the occludee is partially visible, or
     *                       Visibility.FULL if the occludee is fully visible.
     * @example
     * var sphere1 = new BoundingSphere(new Cartesian3(0, 0, -1.5), 0.5);
     * var sphere2 = new BoundingSphere(new Cartesian3(0, 0, -2.5), 0.5);
     * var cameraPosition = new Cartesian3(0, 0, 0);
     * var occluder = new Occluder(sphere1, cameraPosition);
     * occluder.getVisibility(sphere2); //returns Visibility.NONE
     *
     * @see Occluder#isVisible
     */
    Occluder.prototype.getVisibility = function(occludeeBS) {
        // If the occludee radius is larger than the occluders, this will return that
        // the entire ocludee is visible, even though that may not be the case, though this should
        // not occur too often.
        var occludeePosition = occludeeBS.center.clone();
        var occludeeRadius = occludeeBS.radius;

        if (occludeeRadius > this._occluderRadius) {
            return Visibility.FULL;
        }

        if (this._horizonDistance !== Number.MAX_VALUE) {
            // The camera is outside the occluder
            var tempVec = occludeePosition.subtract(this._occluderPosition);
            var temp = this._occluderRadius - occludeeRadius;
            var occluderToOccludeeDistSqrd = tempVec.magnitudeSquared();
            temp = occluderToOccludeeDistSqrd - (temp * temp);
            if (temp > 0.0) {
                // The occludee is not completely inside the occluder
                // Check to see if the occluder completely hides the occludee
                temp = Math.sqrt(temp) + this._horizonDistance;
                tempVec = occludeePosition.subtract(this._cameraPosition);
                var cameraToOccludeeDistSqrd = tempVec.magnitudeSquared();
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
                tempVec = occludeePosition.subtract(this._horizonPlanePosition);
                return (tempVec.dot(this._horizonPlaneNormal) > -occludeeRadius) ? Visibility.PARTIAL : Visibility.FULL;
            }
        }
        return Visibility.NONE;
    };

    /**
     * Computes a point that can be used as the occludee position to the visibility functions.
     * Use a radius of zero for the occludee radius.  Typically, a user computes a bounding sphere around
     * an object that is used for visibility; however it is also possible to compute a point that if
     * seen/not seen would also indicate if an object is visible/not visible.  This function is better
     * called for objects that do not move relative to the occluder and is large, such as a chunk of
     * terrain.  You are better off not calling this and using the object's bounding sphere for objects
     * such as a satellite or ground vehicle.
     *
     * @memberof Occluder
     *
     * @param {BoundingSphere} occluderBoundingSphere The bounding sphere surrounding the occluder.
     * @param {Cartesian3} occludeePosition The point where the occludee (bounding sphere of radius 0) is located.
     * @param {Array} positions List of altitude points on the horizon near the surface of the occluder.
     *
     * @exception {DeveloperError} <code>positions</code> is a required, non-empty array.
     * @exception {DeveloperError} <code>occluderBoundingSphere</code> is required.
     * @exception {DeveloperError} <code>occludeePosition</code> must have a value other than <code>occluderBoundingSphere.center</code>.
     *
     * @return {Object} An object containing two attributes: <code>occludeePoint</code> and <code>valid</code>
     * which is a boolean value.
     *
     * @example
     * var cameraPosition = new Cartesian3(0, 0, 0);
     * var occluderBoundingSphere = new BoundingSphere(new Cartesian3(0, 0, -8), 2);
     * var occluder = new Occluder(occluderBoundingSphere, cameraPosition);
     * var positions = [new Cartesian3(-0.25, 0, -5.3), new Cartesian3(0.25, 0, -5.3)];
     * var tileOccluderSphere = new BoundingSphere(positions);
     * var occludeePosition = tileOccluderSphere.center;
     * var occludeePt = occluder.getOccludeePoint(occluderBoundingSphere, occludeePosition, positions);
     *
     */
    Occluder.getOccludeePoint = function(occluderBoundingSphere, occludeePosition, positions) {
        // Validate input data
        if (!occluderBoundingSphere) {
            throw new DeveloperError('occluderBoundingSphere is required.');
        }

        if (!positions) {
            throw new DeveloperError('positions is required.');
        }

        if (positions.length === 0) {
            throw new DeveloperError('positions must contain at least one element');
        }

        var occludeePos = Cartesian3.clone(occludeePosition);
        var occluderPosition = occluderBoundingSphere.center.clone();
        var occluderRadius = occluderBoundingSphere.radius;
        var numPositions = positions.length;

        if (occluderPosition.equals(occludeePosition)) {
            throw new DeveloperError('occludeePosition must be different than occluderBoundingSphere.center');
        }

        var valid = true;

        // Compute a plane with a normal from the occluder to the occludee position.
        var occluderPlaneNormal = occludeePos.subtract(occluderPosition).normalize();
        var occluderPlaneD = -(occluderPlaneNormal.dot(occluderPosition));

        //For each position, determine the horizon intersection. Choose the position and intersection
        //that results in the greatest angle with the occcluder plane.
        var aRotationVector = Occluder._anyRotationVector(occluderPosition, occluderPlaneNormal, occluderPlaneD);
        var dot = Occluder._horizonToPlaneNormalDotProduct(occluderBoundingSphere, occluderPlaneNormal, occluderPlaneD, aRotationVector, positions[0]);
        if (!dot) {
            //The position is inside the mimimum radius, which is invalid
            valid = false;
        }
        var tempDot;
        for ( var i = 1; i < numPositions; ++i) {
            tempDot = Occluder._horizonToPlaneNormalDotProduct(occluderBoundingSphere, occluderPlaneNormal, occluderPlaneD, aRotationVector, positions[i]);
            if (!tempDot) {
                //The position is inside the minimum radius, which is invalid
                valid = false;
                break;
            }
            if (tempDot < dot) {
                dot = tempDot;
            }
        }
        //Verify that the dot is not near 90 degress
        if (dot < 0.00174532836589830883577820272085) {
            valid = false;
        }

        var distance = occluderRadius / dot;
        var occludeePoint = occluderPosition.add(occluderPlaneNormal.multiplyByScalar(distance));
        return {
            occludeePoint : occludeePoint,
            valid : valid
        };
    };

    Occluder._anyRotationVector = function(occluderPosition, occluderPlaneNormal, occluderPlaneD) {
        var tempVec0 = occluderPlaneNormal.clone().abs();
        var majorAxis = tempVec0.x > tempVec0.y ? 0 : 1;
        if (((majorAxis === 0) && (tempVec0.z > tempVec0.x)) || ((majorAxis === 1) && (tempVec0.z > tempVec0.y))) {
            majorAxis = 2;
        }
        var tempVec1 = new Cartesian3();
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
        var u = ((occluderPlaneNormal.dot(tempVec0)) + occluderPlaneD) / -(occluderPlaneNormal.dot(tempVec1));
        return ((tempVec0.add(tempVec1.multiplyByScalar(u))).subtract(occluderPosition)).normalize();
    };

    Occluder._rotationVector = function(occluderPosition, occluderPlaneNormal, occluderPlaneD, position, anyRotationVector) {
        //Determine the angle between the occluder plane normal and the position direction
        var positionDirection = position.subtract(occluderPosition);
        positionDirection = positionDirection.normalize();
        if (occluderPlaneNormal.dot(positionDirection) < 0.99999998476912904932780850903444) {
            var crossProduct = occluderPlaneNormal.cross(positionDirection);
            var length = crossProduct.magnitude();
            if (length > CesiumMath.EPSILON13) {
                return crossProduct.normalize();
            }
        }
        //The occluder plane normal and the position direction are colinear. Use any
        //vector in the occluder plane as the rotation vector
        return anyRotationVector;
    };

    Occluder._horizonToPlaneNormalDotProduct = function(occluderBS, occluderPlaneNormal, occluderPlaneD, anyRotationVector, position) {
        var pos = Cartesian3.clone(position);
        var occluderPosition = occluderBS.center.clone();
        var occluderRadius = occluderBS.radius;

        //Verify that the position is outside the occluder
        var positionToOccluder = occluderPosition.subtract(pos);
        var occluderToPositionDistanceSquared = positionToOccluder.magnitudeSquared();
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
        positionToOccluder = positionToOccluder.normalize();
        var horizonPlanePosition = pos.add(positionToOccluder.multiplyByScalar(horizonPlaneDistance));
        var horizonCrossDistance = Math.sqrt(horizonDistanceSquared - (horizonPlaneDistance * horizonPlaneDistance));

        //Rotate the position to occluder vector 90 degrees
        var tempVec = this._rotationVector(occluderPosition, occluderPlaneNormal, occluderPlaneD, pos, anyRotationVector);
        var horizonCrossDirection = new Cartesian3(
                (tempVec.x * tempVec.x * positionToOccluder.x) + ((tempVec.x * tempVec.y - tempVec.z) * positionToOccluder.y) + ((tempVec.x * tempVec.z + tempVec.y) * positionToOccluder.z),
                ((tempVec.x * tempVec.y + tempVec.z) * positionToOccluder.x) + (tempVec.y * tempVec.y * positionToOccluder.y) + ((tempVec.y * tempVec.z - tempVec.x) * positionToOccluder.z),
                ((tempVec.x * tempVec.z - tempVec.y) * positionToOccluder.x) + ((tempVec.y * tempVec.z + tempVec.x) * positionToOccluder.y) + (tempVec.z * tempVec.z * positionToOccluder.z));
        horizonCrossDirection = horizonCrossDirection.normalize();

        //Horizon positions
        var offset = horizonCrossDirection.multiplyByScalar(horizonCrossDistance);
        tempVec = ((horizonPlanePosition.add(offset)).subtract(occluderPosition)).normalize();
        var dot0 = occluderPlaneNormal.dot(tempVec);
        tempVec = ((horizonPlanePosition.subtract(offset)).subtract(occluderPosition)).normalize();
        var dot1 = occluderPlaneNormal.dot(tempVec);
        return (dot0 < dot1) ? dot0 : dot1;
    };

    return Occluder;
});