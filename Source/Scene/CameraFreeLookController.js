/*global define*/
define([
        '../Core/destroyObject',
        '../Core/Math',
        '../Core/EventModifier',
        '../Core/Quaternion',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Matrix3',
        './CameraEventHandler',
        './CameraEventType'
    ], function(
        destroyObject,
        CesiumMath,
        EventModifier,
        Quaternion,
        Cartesian2,
        Cartesian3,
        Matrix3,
        CameraEventHandler,
        CameraEventType) {
    "use strict";

    /**
     * A type that defines camera behavior: movement of the position in the direction
     * of the camera's axes and rotation of the axes keeping the position stationary.
     *
     * @alias CameraFreeLookController
     *
     * @param {HTMLCanvasElement} canvas An HTML canvas element used for its dimensions
     * and for listening on user events.
     * @param {Camera} camera The camera to use.
     *
     * @internalConstructor
     */
    var CameraFreeLookController = function(canvas, camera) {
        this._canvas = canvas;
        this._camera = camera;
        this._handler = new CameraEventHandler(canvas, CameraEventType.LEFT_DRAG, EventModifier.SHIFT);

        /**
         * DOC_TBD
         */
        this.horizontalRotationAxis = undefined;
    };

    /**
     * @private
     */
    CameraFreeLookController.prototype.update = function(time) {
        if (this._handler.isMoving()) {
            this._look(this._handler.getMovement());
        }

        return true;
    };

    CameraFreeLookController.prototype._look = function(movement) {
        var camera = this._camera;

        var width = this._canvas.clientWidth;
        var height = this._canvas.clientHeight;

        var tanPhi = Math.tan(camera.frustum.fovy * 0.5);
        var tanTheta = camera.frustum.aspectRatio * tanPhi;
        var near = camera.frustum.near;

        var startNDC = new Cartesian2((2.0 / width) * movement.startPosition.x - 1.0, (2.0 / height) * (height - movement.startPosition.y) - 1.0);
        var endNDC = new Cartesian2((2.0 / width) * movement.endPosition.x - 1.0, (2.0 / height) * (height - movement.endPosition.y) - 1.0);

        var nearCenter = camera.position.add(camera.direction.multiplyByScalar(near));

        var startX = camera.right.multiplyByScalar(startNDC.x * near * tanTheta);
        startX = nearCenter.add(startX).subtract(camera.position).normalize();
        var endX = camera.right.multiplyByScalar(endNDC.x * near * tanTheta);
        endX = nearCenter.add(endX).subtract(camera.position).normalize();

        var dot = startX.dot(endX);
        var angle = 0.0;
        var axis = (typeof this.horizontalRotationAxis !== 'undefined') ? this.horizontalRotationAxis : camera.up;
        axis = (movement.startPosition.x > movement.endPosition.x) ? axis : axis.negate();
        axis = axis.normalize();
        if (dot < 1.0) { // dot is in [0, 1]
            angle = -Math.acos(dot);
        }
        var rotation = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(axis, angle));

        if (1.0 - Math.abs(camera.direction.dot(axis)) > CesiumMath.EPSILON6) {
            camera.direction = rotation.multiplyByVector(camera.direction);
        }

        if (1.0 - Math.abs(camera.up.dot(axis)) > CesiumMath.EPSILON6) {
            camera.up = rotation.multiplyByVector(camera.up);
        }

        var startY = camera.up.multiplyByScalar(startNDC.y * near * tanPhi);
        startY = nearCenter.add(startY).subtract(camera.position).normalize();
        var endY = camera.up.multiplyByScalar(endNDC.y * near * tanPhi);
        endY = nearCenter.add(endY).subtract(camera.position).normalize();

        dot = startY.dot(endY);
        angle = 0.0;
        axis = startY.cross(endY);
        if (dot < 1.0 && !axis.equalsEpsilon(Cartesian3.ZERO, CesiumMath.EPSILON14)) { // dot is in [0, 1]
            angle = -Math.acos(dot);
        } else { // no rotation
            axis = Cartesian3.UNIT_X;
        }
        rotation = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(axis, angle));

        if (1.0 - Math.abs(camera.direction.dot(axis)) > CesiumMath.EPSILON6) {
            camera.direction = rotation.multiplyByVector(camera.direction);
        }

        if (1.0 - Math.abs(camera.up.dot(axis)) > CesiumMath.EPSILON6) {
            camera.up = rotation.multiplyByVector(camera.up);
        }

        camera.right = camera.direction.cross(camera.up);
    };

    /**
      * Returns true if this object was destroyed; otherwise, false.
      * <br /><br />
      * If this object was destroyed, it should not be used; calling any function other than
      * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
      *
      * @memberof CameraFreeLookController
      *
      * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
      *
      * @see CameraFreeLookController#destroy
      */
    CameraFreeLookController.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes mouse listeners held by this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof CameraFreeLookController
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CameraFreeLookController#isDestroyed
     *
     * @example
     * controller = controller && controller.destroy();
     */
    CameraFreeLookController.prototype.destroy = function() {
        this._handler = this._handler && this._handler.destroy();
        return destroyObject(this);
    };

    return CameraFreeLookController;
});