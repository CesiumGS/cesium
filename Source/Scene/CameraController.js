/*global define*/
define([
        '../Core/defaultValue',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/GeographicProjection',
        '../Core/IntersectionTests',
        '../Core/Math',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/Quaternion',
        '../Core/Ray',
        './SceneMode',
        '../ThirdParty/Tween'
    ], function(
        defaultValue,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Cartographic,
        DeveloperError,
        Ellipsoid,
        GeographicProjection,
        IntersectionTests,
        CesiumMath,
        Matrix3,
        Matrix4,
        Quaternion,
        Ray,
        SceneMode,
        Tween) {
    "use strict";

    /**
     * Provides methods for common camera manipulations.
     *
     * @alias CameraController
     * @constructor
     *
     * @exception {DeveloperError} camera is required.
     */
    var CameraController = function(camera) {
        if (typeof camera === 'undefined') {
            throw new DeveloperError('camera is required.');
        }

        this._camera = camera;
        this._mode = SceneMode.SCENE3D;
        this._projection = new GeographicProjection();

        /**
         * The default amount to move the camera when an argument is not
         * provided to the move methods.
         * @type {Number}
         */
        this.defaultMoveAmount = 100000.0;
        /**
         * The default amount to rotate the camera when an argument is not
         * provided to the look methods.
         * @type {Number}
         */
        this.defaultLookAmount = Math.PI / 60.0;
        /**
         * The default amount to rotate the camera when an argument is not
         * provided to the rotate methods.
         * @type {Number}
         */
        this.defaultRotateAmount = Math.PI / 3600.0;
        /**
         * The default amount to move the camera when an argument is not
         * provided to the zoom methods.
         * @type {Number}
         */
        this.defaultZoomAmount = 100000.0;
        /**
         * If set, the camera will not be able to rotate past this axis in either direction.
         * @type Cartesian3
         */
        this.constrainedAxis = undefined;
        /**
         * The factor multiplied by the the map size used to determine where to clamp the camera position
         * when translating across the surface. The default is 1.5. Only valid for 2D and Columbus view.
         * @type Number
         */
        this.maximumTranslateFactor = 1.5;
        /**
         * The factor multiplied by the the map size used to determine where to clamp the camera position
         * when zooming out from the surface. The default is 2.5. Only valid for 2D.
         * @type Number
         */
        this.maximumZoomFactor = 2.5;

        this._maxCoord = new Cartesian3();
        this._frustum = undefined;
    };

    var scratchUpdateCartographic = new Cartographic(Math.PI, CesiumMath.PI_OVER_TWO);
    /**
     * @private
     */
    CameraController.prototype.update = function(mode, scene2D) {
        var updateFrustum = false;
        if (mode !== this._mode) {
            this._mode = mode;
            updateFrustum = this._mode === SceneMode.SCENE2D;
        }

        var projection = scene2D.projection;
        if (typeof projection !== 'undefined' && projection !== this._projection) {
            this._projection = projection;
            this._maxCoord = projection.project(scratchUpdateCartographic, this._maxCoord);
        }

        if (updateFrustum) {
            var frustum = this._frustum = this._camera.frustum.clone();
            if (typeof frustum.left === 'undefined' || typeof frustum.right === 'undefined' ||
               typeof frustum.top === 'undefined' || typeof frustum.bottom === 'undefined') {
                throw new DeveloperError('The camera frustum is expected to be orthographic for 2D camera control.');
            }

            var maxZoomOut = 2.0;
            var ratio = frustum.top / frustum.right;
            frustum.right = this._maxCoord.x * maxZoomOut;
            frustum.left = -frustum.right;
            frustum.top = ratio * frustum.right;
            frustum.bottom = -frustum.top;
        }
    };

    function clampMove2D(controller, position) {
        var maxX = controller._maxCoord.x * controller.maximumTranslateFactor;
        if (position.x > maxX) {
            position.x = maxX;
        }
        if (position.x < -maxX) {
            position.x = -maxX;
        }

        var maxY = controller._maxCoord.y * controller.maximumTranslateFactor;
        if (position.y > maxY) {
            position.y = maxY;
        }
        if (position.y < -maxY) {
            position.y = -maxY;
        }
    }

    var moveScratch = new Cartesian3();
    /**
     * Translates the camera's position by <code>amount</code> along <code>direction</code>.
     *
     * @memberof CameraController
     *
     * @param {Cartesian3} direction The direction to move.
     * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
     *
     * @exception {DeveloperError} direction is required.
     *
     * @see CameraController#moveBackward
     * @see CameraController#moveForward
     * @see CameraController#moveLeft
     * @see CameraController#moveRight
     * @see CameraController#moveUp
     * @see CameraController#moveDown
     */
    CameraController.prototype.move = function(direction, amount) {
        if (typeof direction === 'undefined') {
            throw new DeveloperError('direction is required.');
        }

        var cameraPosition = this._camera.position;
        Cartesian3.multiplyByScalar(direction, amount, moveScratch);
        Cartesian3.add(cameraPosition, moveScratch, cameraPosition);

        if (this._mode === SceneMode.SCENE2D) {
            clampMove2D(this, cameraPosition);
        }
    };

    /**
     * Translates the camera's position by <code>amount</code> along the camera's view vector.
     *
     * @memberof CameraController
     *
     * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
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
     * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
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
     * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
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
     * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
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
     * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
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
     * @param {Number} [amount] The amount, in meters, to move. Defaults to <code>defaultMoveAmount</code>.
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
     * @param {Number} [amount] The amount, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
     *
     * @see CameraController#lookRight
     */
    CameraController.prototype.lookLeft = function(amount) {
        amount = defaultValue(amount, this.defaultLookAmount);
        this.look(this._camera.up, -amount);
    };

    /**
     * Rotates the camera around its up vector by amount, in radians, in the direction
     * of its right vector.
     *
     * @memberof CameraController
     *
     * @param {Number} [amount] The amount, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
     *
     * @see CameraController#lookLeft
     */
    CameraController.prototype.lookRight = function(amount) {
        amount = defaultValue(amount, this.defaultLookAmount);
        this.look(this._camera.up, amount);
    };

    /**
     * Rotates the camera around its right vector by amount, in radians, in the direction
     * of its up vector.
     *
     * @memberof CameraController
     *
     * @param {Number} [amount] The amount, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
     *
     * @see CameraController#lookDown
     */
    CameraController.prototype.lookUp = function(amount) {
        amount = defaultValue(amount, this.defaultLookAmount);
        this.look(this._camera.right, -amount);
    };

    /**
     * Rotates the camera around its right vector by amount, in radians, in the opposite direction
     * of its up vector.
     *
     * @memberof CameraController
     *
     * @param {Number} [amount] The amount, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
     *
     * @see CameraController#lookUp
     */
    CameraController.prototype.lookDown = function(amount) {
        amount = defaultValue(amount, this.defaultLookAmount);
        this.look(this._camera.right, amount);
    };

    var lookScratchQuaternion = new Quaternion();
    var lookScratchMatrix = new Matrix3();
    /**
     * Rotate each of the camera's orientation vectors around <code>axis</code> by <code>angle</code>
     *
     * @memberof CameraController
     *
     * @param {Cartesian3} axis The axis to rotate around.
     * @param {Number} [angle] The angle, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
     *
     * @exception {DeveloperError} axis is required.
     *
     * @see CameraController#lookUp
     * @see CameraController#lookDown
     * @see CameraController#lookLeft
     * @see CameraController#lookRight
     */
    CameraController.prototype.look = function(axis, angle) {
        if (typeof axis === 'undefined') {
            throw new DeveloperError('axis is required.');
        }

        var turnAngle = defaultValue(angle, this.defaultLookAmount);
        var rotation = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(axis, turnAngle, lookScratchQuaternion), lookScratchMatrix);

        var direction = this._camera.direction;
        var up = this._camera.up;
        var right = this._camera.right;

        Matrix3.multiplyByVector(rotation, direction, direction);
        Matrix3.multiplyByVector(rotation, up, up);
        Matrix3.multiplyByVector(rotation, right, right);
    };

    /**
     * Rotate the camera counter-clockwise around its direction vector by amount, in radians.
     *
     * @memberof CameraController
     *
     * @param {Number} [amount] The amount, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
     *
     * @see CameraController#twistRight
     */
    CameraController.prototype.twistLeft = function(amount) {
        amount = defaultValue(amount, this.defaultLookAmount);
        this.look(this._camera.direction, amount);
    };

    /**
     * Rotate the camera clockwise around its direction vector by amount, in radians.
     *
     * @memberof CameraController
     *
     * @param {Number} [amount] The amount, in radians, to rotate by. Defaults to <code>defaultLookAmount</code>.
     *
     * @see CameraController#twistLeft
     */
    CameraController.prototype.twistRight = function(amount) {
        amount = defaultValue(amount, this.defaultLookAmount);
        this.look(this._camera.direction, -amount);
    };

    var appendTransformPosition = Cartesian4.UNIT_W.clone();
    var appendTransformUp = Cartesian4.ZERO.clone();
    var appendTransformRight = Cartesian4.ZERO.clone();
    var appendTransformDirection = Cartesian4.ZERO.clone();
    function appendTransform(controller, transform) {
        var camera = controller._camera;
        var oldTransform;
        if (typeof transform !== 'undefined') {
            var position = Cartesian3.clone(camera.getPositionWC(), appendTransformPosition);
            var up = Cartesian3.clone(camera.getUpWC(), appendTransformUp);
            var right = Cartesian3.clone(camera.getRightWC(), appendTransformRight);
            var direction = Cartesian3.clone(camera.getDirectionWC(), appendTransformDirection);

            oldTransform = camera.transform;
            camera.transform = transform.multiply(oldTransform);

            var invTransform = camera.getInverseTransform();
            Cartesian3.clone(Matrix4.multiplyByVector(invTransform, position, position), camera.position);
            Cartesian3.clone(Matrix4.multiplyByVector(invTransform, up, up), camera.up);
            Cartesian3.clone(Matrix4.multiplyByVector(invTransform, right, right), camera.right);
            Cartesian3.clone(Matrix4.multiplyByVector(invTransform, direction, direction), camera.direction);
        }
        return oldTransform;
    }

    var revertTransformPosition = Cartesian4.UNIT_W.clone();
    var revertTransformUp = Cartesian4.ZERO.clone();
    var revertTransformRight = Cartesian4.ZERO.clone();
    var revertTransformDirection = Cartesian4.ZERO.clone();
    function revertTransform(controller, transform) {
        if (typeof transform !== 'undefined') {
            var camera = controller._camera;
            var position = Cartesian3.clone(camera.getPositionWC(), revertTransformPosition);
            var up = Cartesian3.clone(camera.getUpWC(), revertTransformUp);
            var right = Cartesian3.clone(camera.getRightWC(), revertTransformRight);
            var direction = Cartesian3.clone(camera.getDirectionWC(), revertTransformDirection);

            camera.transform = transform;
            transform = camera.getInverseTransform();

            position = Cartesian3.clone(Matrix4.multiplyByVector(transform, position, position), camera.position);
            up = Cartesian3.clone(Matrix4.multiplyByVector(transform, up, up), camera.up);
            right = Cartesian3.clone(Matrix4.multiplyByVector(transform, right, right), camera.right);
            direction = Cartesian3.clone(Matrix4.multiplyByVector(transform, direction, direction), camera.direction);
        }
    }

    var rotateScratchQuaternion = new Quaternion();
    var rotateScratchMatrix = new Matrix3();
    /**
     * Rotates the camera around <code>axis</code> by <code>angle</code>. The distance
     * of the camera's position to the center of the camera's reference frame remains the same.
     *
     * @memberof CameraController
     *
     * @param {Cartesian3} axis The axis to rotate around given in world coordinates.
     * @param {Number} [angle] The angle, in radians, to rotate by. Defaults to <code>defaultRotateAmount</code>.
     * @param {Matrix4} [transform] A transform to append to the camera transform before the rotation. Does not alter the camera's transform.
     *
     * @exception {DeveloperError} axis is required.
     *
     * @see CameraController#rotateUp
     * @see CameraController#rotateDown
     * @see CameraController#rotateLeft
     * @see CameraController#rotateRight
     *
     * @example
     * // Rotate about a point on the earth.
     * var center = ellipsoid.cartographicToCartesian(cartographic);
     * var transform = Matrix4.fromTranslation(center);
     * controller.rotate(axis, angle, transform);
    */
    CameraController.prototype.rotate = function(axis, angle, transform) {
        if (typeof axis === 'undefined') {
            throw new DeveloperError('axis is required.');
        }

        var camera = this._camera;

        var turnAngle = defaultValue(angle, this.defaultRotateAmount);
        var rotation = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(axis, turnAngle, rotateScratchQuaternion), rotateScratchMatrix);

        var oldTransform = appendTransform(this, transform);
        Matrix3.multiplyByVector(rotation, camera.position, camera.position);
        Matrix3.multiplyByVector(rotation, camera.direction, camera.direction);
        Matrix3.multiplyByVector(rotation, camera.up, camera.up);
        Cartesian3.cross(camera.direction, camera.up, camera.right);
        Cartesian3.cross(camera.right, camera.direction, camera.up);
        revertTransform(this, oldTransform);
    };

    /**
     * Rotates the camera around the center of the camera's reference frame by angle downwards.
     *
     * @memberof CameraController
     *
     * @param {Number} [angle] The angle, in radians, to rotate by. Defaults to <code>defaultRotateAmount</code>.
     * @param {Matrix4} [transform] A transform to append to the camera transform before the rotation. Does not alter the camera's transform.
     *
     * @see CameraController#rotateUp
     * @see CameraController#rotate
     */
    CameraController.prototype.rotateDown = function(angle, transform) {
        angle = defaultValue(angle, this.defaultRotateAmount);
        rotateVertical(this, angle, transform);
    };

    /**
     * Rotates the camera around the center of the camera's reference frame by angle upwards.
     *
     * @memberof CameraController
     *
     * @param {Number} [angle] The angle, in radians, to rotate by. Defaults to <code>defaultRotateAmount</code>.
     * @param {Matrix4} [transform] A transform to append to the camera transform before the rotation. Does not alter the camera's transform.
     *
     * @see CameraController#rotateDown
     * @see CameraController#rotate
     */
    CameraController.prototype.rotateUp = function(angle, transform) {
        angle = defaultValue(angle, this.defaultRotateAmount);
        rotateVertical(this, -angle, transform);
    };

    var rotateVertScratchP = new Cartesian3();
    var rotateVertScratchA = new Cartesian3();
    var rotateVertScratchTan = new Cartesian3();
    function rotateVertical(controller, angle, transform) {
        var camera = controller._camera;
        var oldTransform = appendTransform(controller, transform);

        var position = camera.position;
        var p = Cartesian3.normalize(position, rotateVertScratchP);
        if (typeof controller.constrainedAxis !== 'undefined') {
            var northParallel = p.equalsEpsilon(controller.constrainedAxis, CesiumMath.EPSILON2);
            var southParallel = p.equalsEpsilon(controller.constrainedAxis.negate(), CesiumMath.EPSILON2);
            if ((!northParallel && !southParallel)) {
                var constrainedAxis = Cartesian3.normalize(controller.constrainedAxis, rotateVertScratchA);

                var dot = p.dot(constrainedAxis);
                var angleToAxis = Math.acos(dot);
                if (angle > 0 && angle > angleToAxis) {
                    angle = angleToAxis;
                }

                dot = p.dot(constrainedAxis.negate());
                angleToAxis = Math.acos(dot);
                if (angle < 0 && -angle > angleToAxis) {
                    angle = -angleToAxis;
                }

                var tangent = Cartesian3.cross(constrainedAxis, p, rotateVertScratchTan);
                controller.rotate(tangent, angle);
            } else if ((northParallel && angle < 0) || (southParallel && angle > 0)) {
                controller.rotate(camera.right, angle);
            }
        } else {
            controller.rotate(camera.right, angle);
        }

        revertTransform(controller, oldTransform);
    }

    /**
     * Rotates the camera around the center of the camera's reference frame by angle to the right.
     *
     * @memberof CameraController
     *
     * @param {Number} [angle] The angle, in radians, to rotate by. Defaults to <code>defaultRotateAmount</code>.
     * @param {Matrix4} [transform] A transform to append to the camera transform before the rotation. Does not alter the camera's transform.
     *
     * @see CameraController#rotateLeft
     * @see CameraController#rotate
     */
    CameraController.prototype.rotateRight = function(angle, transform) {
        angle = defaultValue(angle, this.defaultRotateAmount);
        rotateHorizontal(this, -angle, transform);
    };

    /**
     * Rotates the camera around the center of the camera's reference frame by angle to the left.
     *
     * @memberof CameraController
     *
     * @param {Number} [angle] The angle, in radians, to rotate by. Defaults to <code>defaultRotateAmount</code>.
     * @param {Matrix4} [transform] A transform to append to the camera transform before the rotation. Does not alter the camera's transform.
     *
     * @see CameraController#rotateRight
     * @see CameraController#rotate
     */
    CameraController.prototype.rotateLeft = function(angle, transform) {
        angle = defaultValue(angle, this.defaultRotateAmount);
        rotateHorizontal(this, angle, transform);
    };

    function rotateHorizontal(controller, angle, transform) {
        if (typeof controller.constrainedAxis !== 'undefined') {
            controller.rotate(controller.constrainedAxis, angle, transform);
        } else {
            controller.rotate(controller._camera.up, angle, transform);
        }
    }

    function zoom2D(controller, amount) {
        var frustum = controller._camera.frustum;

        if (typeof frustum.left === 'undefined' || typeof frustum.right === 'undefined' ||
            typeof frustum.top === 'undefined' || typeof frustum.bottom === 'undefined') {
            throw new DeveloperError('The camera frustum is expected to be orthographic for 2D camera control.');
        }

        amount = amount * 0.5;
        var newRight = frustum.right - amount;
        var newLeft = frustum.left + amount;

        var maxRight = controller._maxCoord.x * controller.maximumZoomFactor;
        if (newRight > maxRight) {
            newRight = maxRight;
            newLeft = -maxRight;
        }

        var ratio = frustum.top / frustum.right;
        frustum.right = newRight;
        frustum.left = newLeft;
        frustum.top = frustum.right * ratio;
        frustum.bottom = -frustum.top;
    }

    function zoom3D(controller, amount) {
        var camera = controller._camera;
        controller.move(camera.direction, amount);
    }

    /**
     * Zooms <code>amount</code> along the camera's view vector.
     *
     * @memberof CameraController
     *
     * @param {Number} [amount] The amount to move. Defaults to <code>defaultZoomAmount</code>.
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
     * @param {Number} [amount] The amount to move. Defaults to <code>defaultZoomAmount</code>.
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

    /**
     * Gets the magnitude of the camera position. In 3D, this is the vector magnitude. In 2D and
     * Columbus view, this is the distance to the map.
     * @memberof CameraController
     * @returns {Number} The magnitude of the position.
     */
    CameraController.prototype.getMagnitude = function() {
        var camera = this._camera;
        if (this._mode === SceneMode.SCENE3D) {
            return camera.position.magnitude();
        } else if (this._mode === SceneMode.COLUMBUS_VIEW) {
            return Math.abs(camera.position.z);
        } else if (this._mode === SceneMode.SCENE2D) {
            return  Math.max(camera.frustum.right - camera.frustum.left, camera.frustum.top - camera.frustum.bottom);
        }
    };

    function setPositionCartographic2D(controller, cartographic) {
        var camera = controller._camera;
        var newLeft = -cartographic.height * 0.5;
        var newRight = -newLeft;

        var frustum = camera.frustum;
        if (newRight > newLeft) {
            var ratio = frustum.top / frustum.right;
            frustum.right = newRight;
            frustum.left = newLeft;
            frustum.top = frustum.right * ratio;
            frustum.bottom = -frustum.top;
        }

        //We use Cartesian2 instead of 3 here because Z must be constant in 2D mode.
        Cartesian2.clone(controller._projection.project(cartographic), camera.position);
        Cartesian3.negate(Cartesian3.UNIT_Z, camera.direction);
        Cartesian3.clone(Cartesian3.UNIT_Y, camera.up);
        Cartesian3.clone(Cartesian3.UNIT_X, camera.right);
    }

    function setPositionCartographicCV(controller, cartographic) {
        var camera = controller._camera;
        var projection = controller._projection;
        camera.position = projection.project(cartographic);
        Cartesian3.negate(Cartesian3.UNIT_Z, camera.direction);
        Cartesian3.clone(Cartesian3.UNIT_Y, camera.up);
        Cartesian3.clone(Cartesian3.UNIT_X, camera.right);
    }

    function setPositionCartographic3D(controller, cartographic) {
        var camera = controller._camera;
        var ellipsoid = controller._projection.getEllipsoid();

        ellipsoid.cartographicToCartesian(cartographic, camera.position);
        Cartesian3.negate(camera.position, camera.direction);
        Cartesian3.normalize(camera.direction, camera.direction);
        Cartesian3.cross(camera.direction, Cartesian3.UNIT_Z, camera.right);
        Cartesian3.cross(camera.right, camera.direction, camera.up);
        Cartesian3.cross(camera.direction, camera.up, camera.right);
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
            setPositionCartographic2D(this, cartographic);
        } else if (this._mode === SceneMode.COLUMBUS_VIEW) {
            setPositionCartographicCV(this, cartographic);
        } else if (this._mode === SceneMode.SCENE3D) {
            setPositionCartographic3D(this, cartographic);
        }
    };

    /**
     * Sets the camera position and orientation with an eye position, target, and up vector.
     * This method is not supported in 2D mode because there is only one direction to look.
     *
     * @memberof CameraController
     *
     * @param {Cartesian3} eye The position of the camera.
     * @param {Cartesian3} target The position to look at.
     * @param {Cartesian3} up The up vector.
     *
     * @exception {DeveloperError} eye is required.
     * @exception {DeveloperError} target is required.
     * @exception {DeveloperError} up is required.
     * @exception {DeveloperError} lookAt is not supported in 2D mode because there is only one direction to look.
     * @exception {DeveloperError} lookAt is not supported while morphing.
     */
    CameraController.prototype.lookAt = function(eye, target, up) {
        if (typeof eye === 'undefined') {
            throw new DeveloperError('eye is required');
        }
        if (typeof target === 'undefined') {
            throw new DeveloperError('target is required');
        }
        if (typeof up === 'undefined') {
            throw new DeveloperError('up is required');
        }
        if (this._mode === SceneMode.SCENE2D) {
            throw new DeveloperError('lookAt is not supported in 2D mode because there is only one direction to look.');
        }
        if (this._mode === SceneMode.MORPHING) {
            throw new DeveloperError('lookAt is not supported while morphing.');
        }

        var camera = this._camera;
        camera.position = Cartesian3.clone(eye, camera.position);
        camera.direction = Cartesian3.subtract(target, eye, camera.direction).normalize(camera.direction);
        camera.right = Cartesian3.cross(camera.direction, up, camera.right).normalize(camera.right);
        camera.up = Cartesian3.cross(camera.right, camera.direction, camera.up);
    };

    var viewExtent3DCartographic = new Cartographic();
    var viewExtent3DNorthEast = new Cartesian3();
    var viewExtent3DSouthWest = new Cartesian3();
    var viewExtent3DNorthWest = new Cartesian3();
    var viewExtent3DSouthEast = new Cartesian3();
    var viewExtent3DCenter = new Cartesian3();
    function viewExtent3D(camera, extent, ellipsoid) {
        var north = extent.north;
        var south = extent.south;
        var east = extent.east;
        var west = extent.west;

        // If we go across the International Date Line
        if (west > east) {
            east += CesiumMath.TWO_PI;
        }

        var cart = viewExtent3DCartographic;
        cart.longitude = east;
        cart.latitude = north;
        var northEast = ellipsoid.cartographicToCartesian(cart, viewExtent3DNorthEast);
        cart.latitude = south;
        var southEast = ellipsoid.cartographicToCartesian(cart, viewExtent3DSouthEast);
        cart.longitude = west;
        var southWest = ellipsoid.cartographicToCartesian(cart, viewExtent3DSouthWest);
        cart.latitude = north;
        var northWest = ellipsoid.cartographicToCartesian(cart, viewExtent3DNorthWest);

        var center = Cartesian3.subtract(northEast, southWest, viewExtent3DCenter);
        Cartesian3.multiplyByScalar(center, 0.5, center);
        Cartesian3.add(southWest, center, center);

        Cartesian3.subtract(northWest, center, northWest);
        Cartesian3.subtract(southEast, center, southEast);
        Cartesian3.subtract(northEast, center, northEast);
        Cartesian3.subtract(southWest, center, southWest);

        var direction = ellipsoid.geodeticSurfaceNormal(center, camera.direction);
        Cartesian3.negate(direction, direction);
        Cartesian3.normalize(direction, direction);
        var right = Cartesian3.cross(direction, Cartesian3.UNIT_Z, camera.right);
        Cartesian3.normalize(right, right);
        var up = Cartesian3.cross(right, direction, camera.up);

        var height = Math.max(Math.abs(up.dot(northWest)), Math.abs(up.dot(southEast)), Math.abs(up.dot(northEast)), Math.abs(up.dot(southWest)));
        var width = Math.max(Math.abs(right.dot(northWest)), Math.abs(right.dot(southEast)), Math.abs(right.dot(northEast)), Math.abs(right.dot(southWest)));

        var tanPhi = Math.tan(camera.frustum.fovy * 0.5);
        var tanTheta = camera.frustum.aspectRatio * tanPhi;
        var d = Math.max(width / tanTheta, height / tanPhi);

        var scalar = center.magnitude() + d;
        Cartesian3.normalize(center, center);
        Cartesian3.multiplyByScalar(center, scalar, camera.position);
    }

    var viewExtentCVCartographic = new Cartographic();
    var viewExtentCVNorthEast = Cartesian4.UNIT_W.clone();
    var viewExtentCVSouthWest = Cartesian4.UNIT_W.clone();
    var viewExtentCVTransform = new Matrix4();
    function viewExtentColumbusView(camera, extent, projection) {
        var north = extent.north;
        var south = extent.south;
        var east = extent.east;
        var west = extent.west;

        var transform = Matrix4.clone(camera.transform, viewExtentCVTransform);
        transform.setColumn(3, Cartesian4.UNIT_W);
        var invTransform = camera.getInverseTransform();

        var cart = viewExtentCVCartographic;
        cart.longitude = east;
        cart.latitude = north;
        var position = projection.project(cart);
        var northEast = Cartesian3.clone(position, viewExtentCVNorthEast);
        Matrix4.multiplyByVector(transform, northEast, northEast);
        Matrix4.multiplyByVector(invTransform, northEast, northEast);

        cart.longitude = west;
        cart.latitude = south;
        position = projection.project(cart);
        var southWest = Cartesian3.clone(position, viewExtentCVSouthWest);
        Matrix4.multiplyByVector(transform, southWest, southWest);
        Matrix4.multiplyByVector(invTransform, southWest, southWest);

        var tanPhi = Math.tan(camera.frustum.fovy * 0.5);
        var tanTheta = camera.frustum.aspectRatio * tanPhi;

        position = camera.position;
        position.x = (northEast.x - southWest.x) * 0.5 + southWest.x;
        position.y = (northEast.y - southWest.y) * 0.5 + southWest.y;
        position.z = Math.max((northEast.x - southWest.x) / tanTheta, (northEast.y - southWest.y) / tanPhi) * 0.5;

        var direction = Cartesian3.clone(Cartesian3.UNIT_Z, camera.direction);
        Cartesian3.negate(direction, direction);
        var right = Cartesian3.clone(Cartesian3.UNIT_X, camera.right);
        Cartesian3.cross(right, direction, camera.up);
    }

    var viewExtent2DCartographic = new Cartographic();
    function viewExtent2D(camera, extent, projection) {
        var north = extent.north;
        var south = extent.south;
        var east = extent.east;
        var west = extent.west;

        var cart = viewExtent2DCartographic;
        cart.longitude = east;
        cart.latitude = north;
        var northEast = projection.project(cart);
        cart.longitude = west;
        cart.latitude = south;
        var southWest = projection.project(cart);

        var width = Math.abs(northEast.x - southWest.x) * 0.5;
        var height = Math.abs(northEast.y - southWest.y) * 0.5;

        var right, top;
        var ratio = camera.frustum.right / camera.frustum.top;
        var heightRatio = height * ratio;
        if (width > heightRatio) {
            right = width;
            top = right / ratio;
        } else {
            top = height;
            right = heightRatio;
        }

        camera.frustum.right = right;
        camera.frustum.left = -right;
        camera.frustum.top = top;
        camera.frustum.bottom = -top;

        camera.position.x = (northEast.x - southWest.x) * 0.5 + southWest.x;
        camera.position.y = (northEast.y - southWest.y) * 0.5 + southWest.y;

        //Orient the camera north.
        var cameraRight = Cartesian3.clone(Cartesian3.UNIT_X, camera.right);
        Cartesian3.cross(cameraRight, camera.direction, camera.up);
    }

    /**
     * View an extent on an ellipsoid or map.
     * @memberof CameraController
     *
     * @param {Extent} extent The extent to view.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to view.
     *
     * @exception {DeveloperError} extent is required.
     */
    CameraController.prototype.viewExtent = function(extent, ellipsoid) {
        if (typeof extent === 'undefined') {
            throw new DeveloperError('extent is required.');
        }
        ellipsoid = (typeof ellipsoid === 'undefined') ? Ellipsoid.WGS84 : ellipsoid;

        if (this._mode === SceneMode.SCENE3D) {
            viewExtent3D(this._camera, extent, ellipsoid);
        } else if (this._mode === SceneMode.COLUMBUS_VIEW) {
            viewExtentColumbusView(this._camera, extent, this._projection);
        } else if (this._mode === SceneMode.SCENE2D) {
            viewExtent2D(this._camera, extent, this._projection);
        }
    };

    var pickEllipsoid3DRay = new Ray();
    function pickEllipsoid3D(controller, windowPosition, ellipsoid, result) {
        ellipsoid = ellipsoid || Ellipsoid.WGS84;
        var ray = controller.getPickRay(windowPosition, pickEllipsoid3DRay);
        var intersection = IntersectionTests.rayEllipsoid(ray, ellipsoid);
        if (!intersection) {
            return undefined;
        }

        return ray.getPoint(intersection.start, result);
    }

    var pickEllipsoid2DRay = new Ray();
    function pickMap2D(controller, windowPosition, projection, result) {
        var ray = controller.getPickRay(windowPosition, pickEllipsoid2DRay);
        var position = ray.origin;
        position.z = 0.0;
        var cart = projection.unproject(position);

        if (cart.latitude < -CesiumMath.PI_OVER_TWO || cart.latitude > CesiumMath.PI_OVER_TWO ||
                cart.longitude < - Math.PI || cart.longitude > Math.PI) {
            return undefined;
        }

        return projection.getEllipsoid().cartographicToCartesian(cart, result);
    }

    var pickEllipsoidCVRay = new Ray();
    function pickMapColumbusView(controller, windowPosition, projection, result) {
        var ray = controller.getPickRay(windowPosition, pickEllipsoidCVRay);
        var scalar = -ray.origin.x / ray.direction.x;
        ray.getPoint(scalar, result);

        var cart = projection.unproject(new Cartesian3(result.y, result.z, 0.0));

        if (cart.latitude < -CesiumMath.PI_OVER_TWO || cart.latitude > CesiumMath.PI_OVER_TWO ||
                cart.longitude < - Math.PI || cart.longitude > Math.PI) {
            return undefined;
        }

        return projection.getEllipsoid().cartographicToCartesian(cart, result);
    }

    /**
     * Pick an ellipsoid or map.
     * @memberof CameraController
     *
     * @param {Cartesian2} windowPosition The x and y coordinates of a pixel.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to pick.
     * @param {Cartesian3} [result] The object onto which to store the result.
     *
     * @exception {DeveloperError} windowPosition is required.
     *
     * @return {Cartesian3} If the ellipsoid or map was picked, returns the point on the surface of the ellipsoid or map
     * in world coordinates. If the ellipsoid or map was not picked, returns undefined.
     */
    CameraController.prototype.pickEllipsoid = function(windowPosition, ellipsoid, result) {
        if (typeof windowPosition === 'undefined') {
            throw new DeveloperError('windowPosition is required.');
        }

        if (typeof result === 'undefined') {
            result = new Cartesian3();
        }

        ellipsoid = ellipsoid || Ellipsoid.WGS84;

        if (this._mode === SceneMode.SCENE3D) {
            result = pickEllipsoid3D(this, windowPosition, ellipsoid, result);
        } else if (this._mode === SceneMode.SCENE2D) {
            result = pickMap2D(this, windowPosition, this._projection, result);
        } else if (this._mode === SceneMode.COLUMBUS_VIEW) {
            result = pickMapColumbusView(this, windowPosition, this._projection, result);
        }

        return result;
    };

    var pickPerspCenter = new Cartesian3();
    var pickPerspXDir = new Cartesian3();
    var pickPerspYDir = new Cartesian3();
    function getPickRayPerspective(camera, windowPosition, result) {
        var width = camera._canvas.clientWidth;
        var height = camera._canvas.clientHeight;

        var tanPhi = Math.tan(camera.frustum.fovy * 0.5);
        var tanTheta = camera.frustum.aspectRatio * tanPhi;
        var near = camera.frustum.near;

        var x = (2.0 / width) * windowPosition.x - 1.0;
        var y = (2.0 / height) * (height - windowPosition.y) - 1.0;

        var position = camera.getPositionWC();
        Cartesian3.clone(position, result.origin);

        var nearCenter = Cartesian3.multiplyByScalar(camera.getDirectionWC(), near, pickPerspCenter);
        Cartesian3.add(position, nearCenter, nearCenter);
        var xDir = Cartesian3.multiplyByScalar(camera.getRightWC(), x * near * tanTheta, pickPerspXDir);
        var yDir = Cartesian3.multiplyByScalar(camera.getUpWC(), y * near * tanPhi, pickPerspYDir);
        var direction = Cartesian3.add(nearCenter, xDir, result.direction);
        Cartesian3.add(direction, yDir, direction);
        Cartesian3.subtract(direction, position, direction);
        Cartesian3.normalize(direction, direction);

        return result;
    }

    function getPickRayOrthographic(camera, windowPosition, result) {
        var width = camera._canvas.clientWidth;
        var height = camera._canvas.clientHeight;

        var x = (2.0 / width) * windowPosition.x - 1.0;
        x *= (camera.frustum.right - camera.frustum.left) * 0.5;
        var y = (2.0 / height) * (height - windowPosition.y) - 1.0;
        y *= (camera.frustum.top - camera.frustum.bottom) * 0.5;

        var origin = result.origin;
        Cartesian3.clone(camera.position, origin);
        origin.x += x;
        origin.y += y;

        Cartesian3.clone(camera.getDirectionWC(), result.direction);

        return result;
    }

    /**
     * Create a ray from the camera position through the pixel at <code>windowPosition</code>
     * in world coordinates.
     *
     * @memberof CameraController
     *
     * @param {Cartesian2} windowPosition The x and y coordinates of a pixel.
     * @param {Ray} [result] The object onto which to store the result.
     *
     * @exception {DeveloperError} windowPosition is required.
     *
     * @return {Object} Returns the {@link Cartesian3} position and direction of the ray.
     */
    CameraController.prototype.getPickRay = function(windowPosition, result) {
        if (typeof windowPosition === 'undefined') {
            throw new DeveloperError('windowPosition is required.');
        }

        if (typeof result === 'undefined') {
            result = new Ray();
        }

        var camera = this._camera;
        var frustum = camera.frustum;
        if (typeof frustum.aspectRatio !== 'undefined' && typeof frustum.fovy !== 'undefined' && typeof frustum.near !== 'undefined') {
            return getPickRayPerspective(camera, windowPosition, result);
        }

        return getPickRayOrthographic(camera, windowPosition, result);
    };

    function createAnimation2D(controller, duration) {
        var camera = controller._camera;

        var position = camera.position;
        var translateX = position.x < -controller._maxCoord.x || position.x > controller._maxCoord.x;
        var translateY = position.y < -controller._maxCoord.y || position.y > controller._maxCoord.y;
        var animatePosition = translateX || translateY;

        var frustum = camera.frustum;
        var top = frustum.top;
        var bottom = frustum.bottom;
        var right = frustum.right;
        var left = frustum.left;
        var startFrustum = controller._frustum;
        var animateFrustum = right > controller._frustum.right;

        if (animatePosition || animateFrustum) {
            var translatedPosition = position.clone();

            if (translatedPosition.x > controller._maxCoord.x) {
                translatedPosition.x = controller._maxCoord.x;
            } else if (translatedPosition.x < -controller._maxCoord.x) {
                translatedPosition.x = -controller._maxCoord.x;
            }

            if (translatedPosition.y > controller._maxCoord.y) {
                translatedPosition.y = controller._maxCoord.y;
            } else if (translatedPosition.y < -controller._maxCoord.y) {
                translatedPosition.y = -controller._maxCoord.y;
            }

            var update2D = function(value) {
                if (animatePosition) {
                    camera.position = position.lerp(translatedPosition, value.time);
                }
                if (animateFrustum) {
                    camera.frustum.top = CesiumMath.lerp(top, startFrustum.top, value.time);
                    camera.frustum.bottom = CesiumMath.lerp(bottom, startFrustum.bottom, value.time);
                    camera.frustum.right = CesiumMath.lerp(right, startFrustum.right, value.time);
                    camera.frustum.left = CesiumMath.lerp(left, startFrustum.left, value.time);
                }
            };

            return {
                easingFunction : Tween.Easing.Exponential.Out,
                startValue : {
                    time : 0.0
                },
                stopValue : {
                    time : 1.0
                },
                duration : duration,
                onUpdate : update2D
            };
        }

        return undefined;
    }

    function createAnimationTemplateCV(controller, position, center, maxX, maxY, duration) {
        var newPosition = position.clone();

        if (center.y > maxX) {
            newPosition.y -= center.y - maxX;
        } else if (center.y < -maxX) {
            newPosition.y += -maxX - center.y;
        }

        if (center.z > maxY) {
            newPosition.z -= center.z - maxY;
        } else if (center.z < -maxY) {
            newPosition.z += -maxY - center.z;
        }

        var camera = controller._camera;
        var updateCV = function(value) {
            var interp = position.lerp(newPosition, value.time);
            var pos = new Cartesian4(interp.x, interp.y, interp.z, 1.0);
            camera.position = Cartesian3.fromCartesian4(camera.getInverseTransform().multiplyByVector(pos));
        };

        return {
            easingFunction : Tween.Easing.Exponential.Out,
            startValue : {
                time : 0.0
            },
            stopValue : {
                time : 1.0
            },
            duration : duration,
            onUpdate : updateCV
        };
    }

    function createAnimationCV(controller, duration) {
        var camera = controller._camera;
        var position = camera.position;
        var direction = camera.direction;

        var normal = Cartesian3.fromCartesian4(camera.getInverseTransform().multiplyByVector(Cartesian4.UNIT_X));
        var scalar = -normal.dot(position) / normal.dot(direction);
        var center = position.add(direction.multiplyByScalar(scalar));
        center = new Cartesian4(center.x, center.y, center.z, 1.0);
        var centerWC = camera.transform.multiplyByVector(center);

        var cameraPosition = new Cartesian4(camera.position.x, camera.position.y, camera.position.z, 1.0);
        var positionWC = camera.transform.multiplyByVector(cameraPosition);

        var tanPhi = Math.tan(controller._camera.frustum.fovy * 0.5);
        var tanTheta = controller._camera.frustum.aspectRatio * tanPhi;
        var distToC = positionWC.subtract(centerWC).magnitude();
        var dWidth = tanTheta * distToC;
        var dHeight = tanPhi * distToC;

        var mapWidth = controller._maxCoord.x;
        var mapHeight = controller._maxCoord.y;

        var maxX = Math.max(dWidth - mapWidth, mapWidth);
        var maxY = Math.max(dHeight - mapHeight, mapHeight);

        if (positionWC.z < -maxX || positionWC.z > maxX || positionWC.y < -maxY || positionWC.y > maxY) {
            var translateX = centerWC.y < -maxX || centerWC.y > maxX;
            var translateY = centerWC.z < -maxY || centerWC.z > maxY;
            if (translateX || translateY) {
                return createAnimationTemplateCV(controller, Cartesian3.fromCartesian4(positionWC), Cartesian3.fromCartesian4(centerWC), maxX, maxY, duration);
            }
        }

        return undefined;
    }

    /**
     * Create an animation to move the map into view. This method is only valid for 2D and Columbus modes.
     * @memberof CameraController
     * @param {Number} duration The duration, in milliseconds, of the animation.
     * @exception {DeveloperException} duration is required.
     * @returns {Object} The animation or undefined if the scene mode is 3D or the map is already ion view.
     */
    CameraController.prototype.createCorrectPositionAnimation = function(duration) {
        if (typeof duration === 'undefined') {
            throw new DeveloperError('duration is required.');
        }

        if (this._mode === SceneMode.SCENE2D) {
            return createAnimation2D(this, duration);
        } else if (this._mode === SceneMode.COLUMBUS_VIEW) {
            return createAnimationCV(this, duration);
        }

        return undefined;
    };

    return CameraController;
});