/*global define*/
define([
        '../Core/defaultValue',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/DeveloperError',
        '../Core/Math',
        '../Core/Matrix3',
        '../Core/Quaternion',
        './SceneMode'
    ], function(
        defaultValue,
        Cartesian2,
        Cartesian3,
        DeveloperError,
        CesiumMath,
        Matrix3,
        Quaternion,
        SceneMode) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias CameraController
     * @constructor
     */
    var CameraController = function(camera) {
        if (typeof camera === 'undefined') {
            throw new DeveloperError('camera is required.');
        }

        this._camera = camera;
        this._mode = SceneMode.SCENE3D;
        this._projection = undefined;

        this.defaultMoveAmount = 100000.0;
        this.defaultLookAmount = Math.PI / 60.0;
        this.defaultRotateAmount = Math.PI / 3600.0;
        this.defaultZoomAmount = 100000.0;
        this.constrainedAxis = undefined;
    };

    /**
     * @private
     */
    CameraController.prototype.update = function(frameState) {
        this._mode = frameState.mode;
        this._projection = frameState.scene2D.projection;
    };

    /**
     * Translates the camera's position by <code>amount</code> along <code>direction</code>.
     *
     * @memberof CameraController
     *
     * @param {Number} amount The amount to move.
     *
     * @see CameraController#moveBackward
     * @see CameraController#moveForward
     * @see CameraController#moveLeft
     * @see CameraController#moveRight
     * @see CameraController#moveUp
     * @see CameraController#moveDown
     */
    CameraController.prototype.move = function(direction, amount) {
        var newPosition = this._camera.position.add(direction.multiplyByScalar(amount));
        this._camera.position = newPosition;
    };

    /**
     * Translates the camera's position by <code>amount</code> along the camera's view vector.
     *
     * @memberof CameraController
     *
     * @param {Number} amount The amount to move.
     *
     * @see CameraController#moveBackward
     */
    CameraController.prototype.moveForward = function(amount) {
        amount = defaultValue(amount, this.defaultMoveAmount);
        this.move(this._camera.direction, amount);
    };

    /**
     * Translates the camera's position by <code>amount</code> along the opposite direction
     * of the camera's view vector.
     *
     * @memberof CameraController
     *
     * @param {Number} amount The amount to move.
     *
     * @see CameraController#moveForward
     */
    CameraController.prototype.moveBackward = function(amount) {
        amount = defaultValue(amount, this.defaultMoveAmount);
        this.move(this._camera.direction, -amount);
    };

    /**
     * Translates the camera's position by <code>amount</code> along the camera's up vector.
     *
     * @memberof CameraController
     *
     * @param {Number} amount The amount to move.
     *
     * @see CameraController#moveDown
     */
    CameraController.prototype.moveUp = function(amount) {
        amount = defaultValue(amount, this.defaultMoveAmount);
        this.move(this._camera.up, amount);
    };

    /**
     * Translates the camera's position by <code>amount</code> along the opposite direction
     * of the camera's up vector.
     *
     * @memberof CameraController
     *
     * @param {Number} amount The amount to move.
     *
     * @see CameraController#moveUp
     */
    CameraController.prototype.moveDown = function(amount) {
        amount = defaultValue(amount, this.defaultMoveAmount);
        this.move(this._camera.up, -amount);
    };

    /**
     * Translates the camera's position by <code>amount</code> along the camera's right vector.
     *
     * @memberof CameraController
     *
     * @param {Number} amount The amount to move.
     *
     * @see CameraController#moveLeft
     */
    CameraController.prototype.moveRight = function(amount) {
        amount = defaultValue(amount, this.defaultMoveAmount);
        this.move(this._camera.right, amount);
    };

    /**
     * Translates the camera's position by <code>amount</code> along the opposite direction
     * of the camera's right vector.
     *
     * @memberof CameraController
     *
     * @param {Number} amount The amount to move.
     *
     * @see CameraController#moveRight
     */
    CameraController.prototype.moveLeft = function(amount) {
        amount = defaultValue(amount, this.defaultMoveAmount);
        this.move(this._camera.right, -amount);
    };

    /**
     * Rotates the camera around its up vector by amount, in radians, in the opposite direction
     * of its right vector.
     *
     * @memberof CameraController
     *
     * @param {Number} amount The amount, in radians, to rotate by.
     *
     * @see CameraController#lookRight
     */
    CameraController.prototype.lookLeft = function(amount) {
        amount = defaultValue(amount, this.defaultLookAmount);
        this.look(this._camera.up, amount);
    };

    /**
     * Rotates the camera around its up vector by amount, in radians, in the direction
     * of its right vector.
     *
     * @memberof CameraController
     *
     * @param {Number} amount The amount, in radians, to rotate by.
     *
     * @see CameraController#lookLeft
     */
    CameraController.prototype.lookRight = function(amount) {
        amount = defaultValue(amount, this.defaultLookAmount);
        this.look(this._camera.up, -amount);
    };

    /**
     * Rotates the camera around its right vector by amount, in radians, in the direction
     * of its up vector.
     *
     * @memberof CameraController
     *
     * @param {Number} amount The amount, in radians, to rotate by.
     *
     * @see CameraController#lookDown
     */
    CameraController.prototype.lookUp = function(amount) {
        amount = defaultValue(amount, this.defaultLookAmount);
        this.look(this._camera.right, amount);
    };

    /**
     * Rotates the camera around its right vector by amount, in radians, in the opposite direction
     * of its up vector.
     *
     * @memberof CameraController
     *
     * @param {Number} amount The amount, in radians, to rotate by.
     *
     * @see CameraController#lookUp
     */
    CameraController.prototype.lookDown = function(amount) {
        amount = defaultValue(amount, this.defaultLookAmount);
        this.look(this._camera.right, -amount);
    };

    /**
     * Rotate each of the camera's orientation vectors around <code>axis</code> by <code>angle</code>
     *
     * @memberof CameraController
     *
     * @param {Cartesian3} axis The axis to rotate around.
     * @param {Number} angle The angle, in radians, to rotate by.
     *
     * @see CameraController#lookUp
     * @see CameraController#lookDown
     * @see CameraController#lookLeft
     * @see CameraController#lookRight
     */
    CameraController.prototype.look = function(axis, angle) {
        var a = Cartesian3.clone(axis);
        var turnAngle = defaultValue(angle, this.defaultLookAmount);
        var rotation = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(a, turnAngle));
        var direction = rotation.multiplyByVector(this._camera.direction);
        var up = rotation.multiplyByVector(this._camera.up);
        var right = rotation.multiplyByVector(this._camera.right);
        this._camera.direction = direction;
        this._camera.up = up;
        this._camera.right = right;
    };

    /**
     * Rotates the camera around <code>axis</code> by <code>angle</code>. The distance
     * of the camera's position to the center of the camera's reference frame remains the same.
     *
     * @memberof CameraController
     *
     * @param {Cartesian3} axis The axis to rotate around given in world coordinates.
     * @param {Number} angle The angle, in radians, to rotate by. The direction of rotation is
     * determined by the sign of the angle.
     *
     * @see CameraController#rotateUp
     * @see CameraController#rotateDown
     * @see CameraController#rotateLeft
     * @see CameraController#rotateRight
    */
    CameraController.prototype.rotate = function(axis, angle) {
        var a = Cartesian3.clone(axis);
        var turnAngle = defaultValue(angle, this.defaultRotateAmount);
        var rotation = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(a, turnAngle));

        var camera = this._camera;
        camera.position = rotation.multiplyByVector(camera.position);
        camera.direction = rotation.multiplyByVector(camera.direction);
        camera.up = rotation.multiplyByVector(camera.up);
        camera.right = camera.direction.cross(camera.up);
    };

    /**
     * Rotates the camera around the center of the camera's reference frame by angle downwards.
     *
     * @memberof CameraController
     *
     * @param {Number} angle The angle to rotate in radians.
     *
     * @see CameraController#rotateUp
     * @see CameraController#rotate
     */
    CameraController.prototype.rotateDown = function(angle) {
        angle = defaultValue(angle, this.defaultRotateAmount);
        moveVertical(this, -angle);
    };

    /**
     * Rotates the camera around the center of the camera's reference frame by angle upwards.
     *
     * @memberof CameraController
     *
     * @param {Number} angle The angle to rotate in radians.
     *
     * @see CameraController#rotateDown
     * @see CameraController#rotate
     */
    CameraController.prototype.rotateUp = function(angle) {
        angle = defaultValue(angle, this.defaultRotateAmount);
        moveVertical(this, angle);
    };

    function moveVertical(controller, angle) {
        var p = controller._camera.position.normalize();
        if (typeof controller.constrainedAxis !== 'undefined' && !p.equalsEpsilon(controller.constrainedAxis, CesiumMath.EPSILON2)) {
            var dot = p.dot(controller.constrainedAxis.normalize());
            if (CesiumMath.equalsEpsilon(1.0, Math.abs(dot), CesiumMath.EPSILON3) && dot * angle < 0.0) {
                return;
            }

            var angleToAxis = Math.acos(dot);
            if (Math.abs(angle) > Math.abs(angleToAxis)) {
                angle = angleToAxis;
            }

            var tangent = controller.constrainedAxis.cross(p).normalize();
            var bitangent = controller._camera.up.cross(tangent);
            tangent = bitangent.cross(controller._camera.up);
            controller.rotate(tangent, angle);
        } else {
            controller.rotate(controller._camera.right, angle);
        }
    }

    /**
     * Rotates the camera around the center of the camera's reference frame by angle to the right.
     *
     * @memberof CameraController
     *
     * @param {Number} angle The angle to rotate in radians.
     *
     * @see CameraController#rotateLeft
     * @see CameraController#rotate
     */
    CameraController.prototype.rotateRight = function(angle) {
        angle = defaultValue(angle, this.defaultRotateAmount);
        moveHorizontal(this, angle);
    };

    /**
     * Rotates the camera around the center of the camera's reference frame by angle to the left.
     *
     * @memberof CameraController
     *
     * @param {Number} angle The angle to rotate in radians.
     *
     * @see CameraController#rotateRight
     * @see CameraController#rotate
     */
    CameraController.prototype.rotateLeft = function(angle) {
        angle = defaultValue(angle, this.defaultRotateAmount);
        moveHorizontal(this, -angle);
    };

    function moveHorizontal(controller, angle) {
        if (typeof controller.constrainedAxis !== 'undefined') {
            controller.rotate(controller.constrainedAxis.normalize(), angle);
        } else {
            controller.rotate(controller._camera.up, angle);
        }
    }

    function zoom2D(controller, amount) {
        var frustum = controller._camera.frustum;

        if (typeof frustum.left === 'undefined' || typeof frustum.right === 'undefined' ||
            typeof frustum.top === 'undefined' || typeof frustum.bottom === 'undefined') {
            throw new DeveloperError('The camera frustum is expected to be orthographic for 2D camera control.');
        }

        var newRight = frustum.right - amount;
        var newLeft = frustum.left + amount;

        if (newRight > newLeft) {
            var ratio = frustum.top / frustum.right;
            frustum.right = newRight;
            frustum.left = newLeft;
            frustum.top = frustum.right * ratio;
            frustum.bottom = -frustum.top;
        }
    }

    function zoom3D(controller, amount) {
        controller.move(controller._camera.direction, amount);
    }

    /**
     * Zooms <code>amount</code> along the camera's view vector.
     *
     * @memberof CameraController
     *
     * @param {Number} amount The amount to move.
     *
     * @see CameraController#zoomOut
     */
    CameraController.prototype.zoomIn = function(amount) {
        amount = defaultValue(amount, this.defaultZoomAmount);
        if (this._mode === SceneMode.SCENE2D) {
            zoom2D(this, amount);
        } else {
            zoom3D(this, amount);
        }
    };

    /**
     * Zooms <code>amount</code> along the opposite direction of
     * the camera's view vector.
     *
     * @memberof CameraController
     *
     * @param {Number} amount The amount to move.
     *
     * @see CameraController#zoomIn
     */
    CameraController.prototype.zoomOut = function(amount) {
        amount = defaultValue(amount, this.defaultZoomAmount);
        if (this._mode === SceneMode.SCENE2D) {
            zoom2D(this, -amount);
        } else {
            zoom3D(this, -amount);
        }
    };

    function setPositionCartographic2D(controller, cartographic) {
        var newLeft = -cartographic.height * 0.5;
        var newRight = -newLeft;

        var frustum = controller._camera.frustum;
        if (newRight > newLeft) {
            var ratio = frustum.top / frustum.right;
            frustum.right = newRight;
            frustum.left = newLeft;
            frustum.top = frustum.right * ratio;
            frustum.bottom = -frustum.top;
        }

        //We use Cartesian2 instead of 3 here because Z must be constant in 2D mode.
        Cartesian2.clone(controller._projection.project(cartographic), controller._camera.position);
    }

    /**
     * Moves the camera to the provided cartographic position.
     * @memberof CameraController
     *
     * @param {Cartographic} cartographic The new camera position.
     *
     * @exception {DeveloperError} cartographic is required.
     */
    CameraController.prototype.setPositionCartographic = function(cartographic) {
        if (typeof cartographic === 'undefined') {
            throw new DeveloperError('cartographic is required.');
        }

        if (this._mode === SceneMode.SCENE2D) {
            setPositionCartographic2D(cartographic);
        }
        // TODO: add for other modes
    };

    return CameraController;
});