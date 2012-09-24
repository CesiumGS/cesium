/*global define*/
define([
        './defaultValue',
        './DeveloperError',
        './Math',
        './Cartesian3',
        './Visibility',
        './Ellipsoid',
        './BoundingSphere'
    ], function(
        defaultValue,
        DeveloperError,
        CesiumMath,
        Cartesian3,
        Visibility,
        Ellipsoid,
        BoundingSphere) {
    "use strict";

    /**
     * Determine whether or not other objects are visible or hidden behind the visible horizon defined by the
     * an {@link Ellipsoid} and a camera position.  The ellipsoid is assumed to be located at the
     * origin of the coordinate system.
     *
     * @alias EllipsoidalOccluder
     *
     * @param {Ellipsoid} ellipsoid The ellipsoid to use as an occluder.
     * @param {Cartesian3} cameraPosition The coordinate of the viewer/camera.
     *
     * @exception {DeveloperError} <code>ellipsoid</code> is required.
     * @exception {DeveloperError} <code>cameraPosition</code> is required.
     *
     * @constructor
     *
     * @example
     * // Construct an ellipsoidal occluder with radii 1.0, 1.1, and 0.9.
     * var cameraPosition = new Cartesian3(5.0, 6.0, 7.0);
     * var occluderEllipsoid = new Ellipsoid(1.0, 1.1, 0.9);
     * var occluder = new Occluder(occluderEllipsoid, cameraPosition);
     */
    var EllipsoidalOccluder = function(ellipsoid, cameraPosition) {
        if (!ellipsoid) {
            throw new DeveloperError('ellipsoid is required.');
        }

        if (!cameraPosition) {
            throw new DeveloperError('camera position is required.');
        }

        this._ellipsoid = ellipsoid;

        // setCameraPosition fills in the above values
        this.setCameraPosition(cameraPosition);
    };

    /**
     * Returns the occluding ellipsoid.
     *
     * @memberof EllipsoidalOccluder
     *
     * @return {Ellipsoid} The ellipsoid.
     */
    EllipsoidalOccluder.prototype.getEllipsoid = function() {
        return this._ellipsoid;
    };

    /**
     * Sets the position of the camera.
     *
     * @memberof EllipsoidalOccluder
     *
     * @param {Cartesian3} cameraPosition The new position of the camera.
     */
    EllipsoidalOccluder.prototype.setCameraPosition = function(cameraPosition) {
        this._cameraPosition = cameraPosition;
    };

    /**
     * Determines whether or not a point, the <code>occludee</code>, is hidden from view by the occluder.
     *
     * @memberof EllipsoidalOccluder
     *
     * @param {Cartesian3} occludee The point surrounding the occludee object.
     *
     * @return {boolean} <code>true</code> if the occludee is visible; otherwise <code>false</code>.
     *
     * @example
     * var cameraPosition = new Cartesian3(0, 0, 1.5);
     * var ellipsoid = new Ellipsoid(1.0, 1.1, 0.9);
     * var occluder = new EllipsoidalOccluder(ellipsoid, cameraPosition);
     * var point = new Cartesian3(0, -3, -3);
     * occluder.isPointVisible(point); //returns true
     *
     * @see Occluder#getVisibility
     */
    EllipsoidalOccluder.prototype.isPointVisible = function(occludee) {
        // Based on Cozzi and Stoner's paper, "GPU Ray Casting of Virtual Globes Supplement"
        var q = this._cameraPosition.multiplyComponents(this._ellipsoid.getOneOverRadii());
        var qMagnitude = q.magnitude();
        var wMagnitudeSquared = qMagnitude * qMagnitude - 1.0;
        var b = occludee.subtract(this._cameraPosition).multiplyComponents(this._ellipsoid.getOneOverRadii());
        var bUnit = b.normalize();
        var t = -bUnit.dot(q);
        var tSquared = t * t;
        var u = -b.dot(q.normalize());
        if (u >= (qMagnitude - 1 / qMagnitude) &&
            tSquared >= wMagnitudeSquared) {
            return false;
        }
        return true;
    };

    return EllipsoidalOccluder;
});