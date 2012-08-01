/*global define*/
define([
        '../Core/destroyObject',
        '../Core/EventHandler',
        '../Core/MouseEventType',
        '../Core/Quaternion',
        '../Core/Matrix3',
        '../Core/Cartesian3',
        '../Core/HermiteSpline'
    ], function(
        destroyObject,
        EventHandler,
        MouseEventType,
        Quaternion,
        Matrix3,
        Cartesian3,
        HermiteSpline) {
    "use strict";

    /**
     * A type that defines camera behavior: the camera will follow a path from the
     * current position of the camera to an end point around an ellipsoid.
     *
     * @alias CameraFlightController
     * @internalConstructor
     *
     * @param {HTMLCanvasElement} canvas An HTML canvas element used to listen for user events.
     * @param {Camera} camera The camera to use.
     * @param {Ellipsoid} ellipsoid The ellipsoid to move the camera around.
     * @param {Cartesian} destination The Cartesian point that is the end of the path.
     * @param {Number} duration The time, in seconds, to travel along the path.
     *
     * @see CameraControllerCollection#addFlight
     */
    var CameraFlightController = function(canvas, camera, ellipsoid, destination, duration, complete) {
        // get minimum altitude from which the whole ellipsoid is visible
        var radius = ellipsoid.getRadii().getMaximumComponent();

        var frustum = camera.frustum;
        var near = frustum.near;
        var top = frustum.near * Math.tan(0.5 * frustum.fovy);
        var right = frustum.aspectRatio * top;

        var dx = radius * near / right;
        var dy = radius * near / top;
        var dm = Math.max(dx, dy);
        var altitude = dm - radius;

        this._camera = camera;
        this._start = new Date();
        this._end = new Date(this._start.getTime() + duration * 1000);
        this._path = this._createPath(ellipsoid, altitude, destination, duration);
        this._canceled = false;
        this._complete = complete;

        var that = this;
        var cancelFlight = function() {
            that._canceled = true;
        };

        this._handler = new EventHandler(canvas);
        this._handler.setMouseAction(cancelFlight, MouseEventType.LEFT_DOWN);
        this._handler.setMouseAction(cancelFlight, MouseEventType.RIGHT_DOWN);
        this._handler.setMouseAction(cancelFlight, MouseEventType.MIDDLE_DOWN);
    };

    CameraFlightController.prototype._createPath = function(ellipsoid, altitude, endPoint, duration) {
        var start = this._camera.position;

        var maxStartAlt = ellipsoid.getMaximumRadius() + altitude;
        var dot = start.normalize().dot(endPoint.normalize());

        var abovePercentage, incrementPercentage;
        var startAboveMaxAlt = (start.magnitude() > maxStartAlt);
        if (startAboveMaxAlt) {
            abovePercentage = 0.6;
            incrementPercentage = 0.35;
        } else {
            // TODO: revisit when hi-res imagery is implemented.
            abovePercentage = Math.max(0.1, 1.0 - Math.abs(dot));
            incrementPercentage = 0.5;
        }

        maxStartAlt = ellipsoid.getMaximumRadius() + abovePercentage * altitude;

        var aboveEnd = endPoint.normalize().multiplyByScalar(maxStartAlt);
        var afterStart = start.normalize().multiplyByScalar(maxStartAlt);

        var points, axis, angle, rotation;
        if (start.magnitude() > maxStartAlt && dot > 0) {
            var middle = start.subtract(aboveEnd).multiplyByScalar(0.5).add(aboveEnd);

            points = [{
                point : start
            }, {
                point : middle
            }, {
                point : aboveEnd
            }, {
                point : endPoint
            }];
        } else {
            points = [{
                point : start
            }];

            angle = Math.acos(afterStart.normalize().dot(aboveEnd.normalize()));
            axis = aboveEnd.cross(afterStart);

            var increment = incrementPercentage * angle;
            var startCondition = (startAboveMaxAlt) ? angle - increment : angle;
            for ( var i = startCondition; i > 0.0; i = i - increment) {
                rotation = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(axis, i));
                points.push({
                    point : rotation.multiplyByVector(aboveEnd)
                });
            }

            points.push({
                point : aboveEnd
            }, {
                point : endPoint
            });
        }

        var scalar = duration / (points.length - 1);
        for ( var k = 0; k < points.length; ++k) {
            points[k].time = k * scalar;
        }

        return new HermiteSpline(points);
    };

    /**
     * @private
     */
    CameraFlightController.prototype.update = function() {
        var time = new Date(),
            diff,
            position,
            normal,
            tangent,
            target;

        var now = (time.getTime() > this._end.getTime()) ? this._end : time;

        diff = ( now.getTime() - this._start.getTime()) / 1000.0;
        position = this._path.evaluate(diff);
        normal = Cartesian3.UNIT_Z.cross(position).normalize();
        tangent = position.cross(normal).normalize();
        target = Cartesian3.ZERO;
        this._camera.lookAt(position, target, tangent);

        var isComplete = (now === this._end) || this._canceled;
        if(isComplete && !this._canceled && (typeof this._complete !== 'undefined')){
            this._complete();
        }
        return !isComplete;
    };

    /**
      * Returns true if this object was destroyed; otherwise, false.
      * <br /><br />
      * If this object was destroyed, it should not be used; calling any function other than
      * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
      *
      * @memberof CameraFlightController
      *
      * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
      *
      * @see CameraFlightController#destroy
      */
    CameraFlightController.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes mouse listeners held by this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof CameraFlightController
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CameraFlightControllerController#isDestroyed
     *
     * @example
     * controller = controller && controller.destroy();
     */
    CameraFlightController.prototype.destroy = function() {
        this._handler.destroy();
        return destroyObject(this);
    };

    return CameraFlightController;
});