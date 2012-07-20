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
        './CameraEventType',
        './CameraHelpers'
    ], function(
        destroyObject,
        CesiumMath,
        EventModifier,
        Quaternion,
        Cartesian2,
        Cartesian3,
        Matrix3,
        CameraEventHandler,
        CameraEventType,
        CameraHelpers) {
    "use strict";

    var move = CameraHelpers.move;

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

        this._maximumMoveRate = 2000000.0;
        this._minimumMoveRate = 1.0 / 5000.0;
        this._maximumTurnRate = Math.PI / 8.0;
        this._minimumTurnRate = Math.PI / 120.0;

        this._moveRate = 100000.0;
        this._turnRate = Math.PI / 60.0;

        /**
         * DOC_TBD
         */
        this.horizontalRotationAxis = undefined;
    };

    /**
     * Translates the camera's position by <code>rate</code> along the camera's view vector.
     *
     * @memberof CameraFreeLookController
     *
     * @param {Number} rate The rate to move.
     *
     * @see CameraFreeLookController#moveBackward
     */
    CameraFreeLookController.prototype.moveForward = function(rate) {
        move(this._camera, this._camera.direction, rate || this._moveRate);
    };

    /**
     * Translates the camera's position by <code>rate</code> along the opposite direction
     * of the camera's view vector.
     *
     * @memberof CameraFreeLookController
     *
     * @param {Number} rate The rate to move.
     *
     * @see CameraFreeLookController#moveForward
     */
    CameraFreeLookController.prototype.moveBackward = function(rate) {
        move(this._camera, this._camera.direction, -rate || -this._moveRate);
    };

    /**
     * Translates the camera's position by <code>rate</code> along the camera's up vector.
     *
     * @memberof CameraFreeLookController
     *
     * @param {Number} rate The rate to move.
     *
     * @see CameraFreeLookController#moveDown
     */
    CameraFreeLookController.prototype.moveUp = function(rate) {
        move(this._camera, this._camera.up, rate || this._moveRate);
    };

    /**
     * Translates the camera's position by <code>rate</code> along the opposite direction
     * of the camera's up vector.
     *
     * @memberof CameraFreeLookController
     *
     * @param {Number} rate The rate to move.
     *
     * @see CameraFreeLookController#moveUp
     */
    CameraFreeLookController.prototype.moveDown = function(rate) {
        move(this._camera, this._camera.up, -rate || -this._moveRate);
    };

    /**
     * Translates the camera's position by <code>rate</code> along the camera's right vector.
     *
     * @memberof CameraFreeLookController
     *
     * @param {Number} rate The rate to move.
     *
     * @see CameraFreeLookController#moveLeft
     */
    CameraFreeLookController.prototype.moveRight = function(rate) {
        move(this._camera, this._camera.right, rate || this._moveRate);
    };

    /**
     * Translates the camera's position by <code>rate</code> along the opposite direction
     * of the camera's right vector.
     *
     * @memberof CameraFreeLookController
     *
     * @param {Number} rate The rate to move.
     *
     * @see CameraFreeLookController#moveRight
     */
    CameraFreeLookController.prototype.moveLeft = function(rate) {
        move(this._camera, this._camera.right, -rate || -this._moveRate);
    };

    /**
     * Rotates the camera around its up vector by rate, in radians, in the opposite direction
     * of its right vector.
     *
     * @memberof CameraFreeLookController
     *
     * @param {Number} rate The rate, in radians, to rotate by.
     *
     * @see CameraFreeLookController#lookRight
     */
    CameraFreeLookController.prototype.lookLeft = function(rate) {
        var turnRate = rate || this._turnRate;
        var rotated = this._rotateTwoAxes(this._camera.direction, this._camera.right, this._camera.up, turnRate);
        this._camera.direction = rotated[0];
        this._camera.right = rotated[1];
    };

    /**
     * Rotates the camera around its up vector by rate, in radians, in the direction
     * of its right vector.
     *
     * @memberof CameraFreeLookController
     *
     * @param {Number} rate The rate, in radians, to rotate by.
     *
     * @see CameraFreeLookController#lookLeft
     */
    CameraFreeLookController.prototype.lookRight = function(rate) {
        this.lookLeft(-rate || -this._turnRate);
    };

    /**
     * Rotates the camera around its right vector by rate, in radians, in the direction
     * of its up vector.
     *
     * @memberof CameraFreeLookController
     *
     * @param {Number} rate The rate, in radians, to rotate by.
     *
     * @see CameraFreeLookController#lookDown
     */
    CameraFreeLookController.prototype.lookUp = function(rate) {
        var turnRate = rate || this._turnRate;
        var rotated = this._rotateTwoAxes(this._camera.direction, this._camera.up, this._camera.right, turnRate);
        this._camera.direction = rotated[0];
        this._camera.up = rotated[1];
    };

    /**
     * Rotates the camera around its right vector by rate, in radians, in the opposite direction
     * of its up vector.
     *
     * @memberof CameraFreeLookController
     *
     * @param {Number} rate The rate, in radians, to rotate by.
     *
     * @see CameraFreeLookController#lookUp
     */
    CameraFreeLookController.prototype.lookDown = function(rate) {
        this.lookUp(-rate || -this._turnRate);
    };

    CameraFreeLookController.prototype._rotateTwoAxes = function(v0, v1, axis, angle) {
        var rotation = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(axis, angle));
        var u0 = rotation.multiplyByVector(v0);
        var u1 = rotation.multiplyByVector(v1);
        return [u0, u1];
    };

    /**
     * Rotate each of the camera's orientation vectors around <code>axis</code> by <code>angle</code>
     *
     * @memberof CameraFreeLookController
     *
     * @param {Cartesian3} axis The axis to rotate around.
     * @param {Number} angle The angle, in radians, to rotate by.
     *
     * @see CameraFreeLookController#lookUp
     * @see CameraFreeLookController#lookDown
     * @see CameraFreeLookController#lookLeft
     * @see CameraFreeLookController#lookRight
     */
    CameraFreeLookController.prototype.rotate = function(axis, angle) {
        var a = Cartesian3.clone(axis);
        var turnAngle = angle || this._moveRate;
        var rotation = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(a, turnAngle));
        var direction = rotation.multiplyByVector(this._camera.direction);
        var up = rotation.multiplyByVector(this._camera.up);
        var right = rotation.multiplyByVector(this._camera.right);
        this._camera.direction = direction;
        this._camera.up = up;
        this._camera.right = right;
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