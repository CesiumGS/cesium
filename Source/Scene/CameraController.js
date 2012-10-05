/*global define*/
define([
        '../Core/defaultValue',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
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
        this._projection = undefined;

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

        this._maxCoord = undefined;
        this._frustum = undefined;
        this._maxTranslateFactor = 1.5;
        this._maxZoomFactor = 2.5;
        this._maxHeight = 20.0;
    };

    /**
     * @private
     */
    CameraController.prototype.update = function(frameState) {
        this._mode = frameState.mode;
        var projection = frameState.scene2D.projection;
        if (projection !== this._projection) {
            this._projection = projection;
            this._maxCoord = projection.project(new Cartographic(Math.PI, CesiumMath.toRadians(85.05112878)));
        }

        if (this._mode === SceneMode.SCENE2D) {
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
        var maxX = controller._maxCoord.x * controller._maxTranslateFactor;
        if (position.x > maxX) {
            position.x = maxX;
        }
        if (position.x < -maxX) {
            position.x = -maxX;
        }

        var maxY = controller._maxCoord.y * controller._maxTranslateFactor;
        if (position.y > maxY) {
            position.y = maxY;
        }
        if (position.y < -maxY) {
            position.y = -maxY;
        }
    }

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
        var camera = this._camera;
        var newPosition = camera.position.add(direction.multiplyByScalar(amount));
        camera.position = newPosition;

        if (this._mode === SceneMode.SCENE2D) {
            clampMove2D(this, camera.position);
        }
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
        var turnAngle = defaultValue(angle, this.defaultLookAmount);
        var rotation = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(axis, turnAngle));
        var direction = rotation.multiplyByVector(this._camera.direction);
        var up = rotation.multiplyByVector(this._camera.up);
        var right = rotation.multiplyByVector(this._camera.right);
        this._camera.direction = direction;
        this._camera.up = up;
        this._camera.right = right;
    };

    /**
     * Rotate the camera counter-clockwise around its direction vector by amount, in radians.
     *
     * @memberof CameraController
     *
     * @param {Number} amount The amount, in radians, to rotate by.
     *
     * @see CameraController#twistRight
     */
    CameraController.prototype.twistLeft = function(amount) {
        amount = defaultValue(amount, this.defaultLookAmount);
        this.look(this._camera.direction, -amount);
    };

    /**
     * Rotate the camera clockwise around its direction vector by amount, in radians.
     *
     * @memberof CameraController
     *
     * @param {Number} amount The amount, in radians, to rotate by.
     *
     * @see CameraController#twistLeft
     */
    CameraController.prototype.twistRight = function(amount) {
        amount = defaultValue(amount, this.defaultLookAmount);
        this.look(this._camera.direction, amount);
    };

    function setTransform(controller, transform) {
        var camera = controller._camera;
        var oldTransform;
        if (typeof transform !== 'undefined') {
            var position = camera.getPositionWC();
            var up = camera.getUpWC();
            var right = camera.getRightWC();
            var direction = camera.getDirectionWC();

            oldTransform = camera.transform;
            camera.transform = transform.multiply(oldTransform);

            var invTransform = camera.getInverseTransform();
            camera.position = Cartesian3.fromCartesian4(invTransform.multiplyByVector(new Cartesian4(position.x, position.y, position.z, 1.0)));
            camera.up = Cartesian3.fromCartesian4(invTransform.multiplyByVector(new Cartesian4(up.x, up.y, up.z, 0.0)));
            camera.right = Cartesian3.fromCartesian4(invTransform.multiplyByVector(new Cartesian4(right.x, right.y, right.z, 0.0)));
            camera.direction = Cartesian3.fromCartesian4(invTransform.multiplyByVector(new Cartesian4(direction.x, direction.y, direction.z, 0.0)));
        }
        return oldTransform;
    }

    function revertTransform(controller, transform) {
        if (typeof transform !== 'undefined') {
            var camera = controller._camera;
            var position = camera.getPositionWC();
            var up = camera.getUpWC();
            var right = camera.getRightWC();
            var direction = camera.getDirectionWC();

            camera.transform = transform;
            transform = camera.getInverseTransform();

            camera.position = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(position.x, position.y, position.z, 1.0)));
            camera.up = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(up.x, up.y, up.z, 0.0)));
            camera.right = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(right.x, right.y, right.z, 0.0)));
            camera.direction = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(direction.x, direction.y, direction.z, 0.0)));

            var ellipsoid = controller._projection.getEllipsoid();
            position = ellipsoid.cartesianToCartographic(camera.position);
            if (position.height < controller._maxHeight + 1.0) {
                position.height = controller._maxHeight + 1.0;
                camera.position = ellipsoid.cartographicToCartesian(position);
                camera.direction = Cartesian3.fromCartesian4(transform.getColumn(3).subtract(camera.position)).normalize();
                camera.right = camera.position.negate().cross(camera.direction).normalize();
                camera.up = camera.right.cross(camera.direction);
            }
        }
    }

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
    CameraController.prototype.rotate = function(axis, angle, transform) {
        var camera = this._camera;

        var a = Cartesian3.clone(axis);
        var turnAngle = defaultValue(angle, this.defaultRotateAmount);
        var rotation = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(a, turnAngle));

        var oldTransform = setTransform(this, transform);
        camera.position = rotation.multiplyByVector(camera.position);
        camera.direction = rotation.multiplyByVector(camera.direction);
        camera.up = rotation.multiplyByVector(camera.up);
        camera.right = camera.direction.cross(camera.up);
        camera.up = camera.right.cross(camera.direction);
        revertTransform(this, oldTransform);
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
    CameraController.prototype.rotateDown = function(angle, transform) {
        angle = defaultValue(angle, this.defaultRotateAmount);
        rotateVertical(this, -angle, transform);
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
    CameraController.prototype.rotateUp = function(angle, transform) {
        angle = defaultValue(angle, this.defaultRotateAmount);
        rotateVertical(this, angle, transform);
    };

    function rotateVertical(controller, angle, transform) {
        var camera = controller._camera;
        var oldTransform = setTransform(controller, transform);

        var position = camera.position;
        var p = position.normalize();
        if (typeof controller.constrainedAxis !== 'undefined' &&
                !p.equalsEpsilon(controller.constrainedAxis, CesiumMath.EPSILON2) &&
                !p.equalsEpsilon(controller.constrainedAxis.negate(), CesiumMath.EPSILON2)) {
            var dot = p.dot(controller.constrainedAxis.normalize());
            if (!(CesiumMath.equalsEpsilon(1.0, Math.abs(dot), CesiumMath.EPSILON3) && dot * angle < 0.0)) {
                var angleToAxis = Math.acos(dot);
                if (Math.abs(angle) > Math.abs(angleToAxis)) {
                    angle = angleToAxis;
                }

                var tangent = controller.constrainedAxis.cross(p).normalize();
                var bitangent = controller._camera.up.cross(tangent);
                tangent = bitangent.cross(controller._camera.up);
                controller.rotate(tangent, angle);
            }
        } else {
            controller.rotate(controller._camera.right, angle);
        }

        revertTransform(controller, oldTransform);
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
    CameraController.prototype.rotateRight = function(angle, transform) {
        angle = defaultValue(angle, this.defaultRotateAmount);
        rotateHorizontal(this, angle, transform);
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
    CameraController.prototype.rotateLeft = function(angle, transform) {
        angle = defaultValue(angle, this.defaultRotateAmount);
        rotateHorizontal(this, -angle, transform);
    };

    function rotateHorizontal(controller, angle, transform) {
        if (typeof controller.constrainedAxis !== 'undefined') {
            controller.rotate(controller.constrainedAxis.normalize(), angle, transform);
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

        var newRight = frustum.right - amount;
        var newLeft = frustum.left + amount;

        var maxRight = controller._maxCoord.x * controller._maxZoomFactor;
        if (frustum.right > maxRight) {
            newRight = maxRight;
            newLeft = -maxRight;
        }

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
            return camera.position.z;
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
        camera.direction = Cartesian3.UNIT_Z.negate();
        camera.up = Cartesian3.UNIT_Y.clone();
        camera.right = Cartesian3.UNIT_X.clone();
    }

    function setPositionCartographicCV(controller, cartographic) {
        var camera = controller._camera;
        var projection = controller._projection;
        camera.position = projection.project(cartographic);
        camera.direction = Cartesian3.UNIT_Z.negate();
        camera.up = Cartesian3.UNIT_Y.clone();
        camera.right = Cartesian3.UNIT_X.clone();
    }

    function setPositionCartographic3D(controller, cartographic) {
        var camera = controller._camera;
        var ellipsoid = controller._projection.getEllipsoid();
        camera.position = ellipsoid.cartographicToCartesian(cartographic);
        camera.direction = camera.position.negate().normalize();
        camera.right = camera.direction.cross(Cartesian3.UNIT_Z);
        camera.up = camera.right.cross(camera.direction);
        camera.right = camera.direction.cross(camera.up);
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

        if (this._mode === SceneMode.SCENE3D || this._mode === SceneMode.COLUMBUS_VIEW) {
            var camera = this._camera;
            camera.position = Cartesian3.clone(eye, camera.position);
            camera.direction = Cartesian3.subtract(target, eye, camera.direction).normalize(camera.direction);
            camera.right = Cartesian3.cross(camera.direction, up, camera.right).normalize(camera.right);
            camera.up = Cartesian3.cross(camera.right, camera.direction, camera.up);
        }
        // lookAt is not supported in 2D because there is only one direction to look
    };

    function viewExtent3D(camera, extent, ellipsoid) {
        var north = extent.north;
        var south = extent.south;
        var east = extent.east;
        var west = extent.west;

        // If we go across the International Date Line
        if (west > east) {
            east += CesiumMath.TWO_PI;
        }

        var northEast = ellipsoid.cartographicToCartesian(new Cartographic(east, north));
        var southWest = ellipsoid.cartographicToCartesian(new Cartographic(west, south));
        var diagonal = northEast.subtract(southWest);
        var center = southWest.add(diagonal.normalize().multiplyByScalar(diagonal.magnitude() * 0.5));

        var northWest = ellipsoid.cartographicToCartesian(new Cartographic(west, north)).subtract(center);
        var southEast = ellipsoid.cartographicToCartesian(new Cartographic(east, south)).subtract(center);
        northEast = northEast.subtract(center);
        southWest = southWest.subtract(center);

        camera.direction = center.negate().normalize();
        camera.right = camera.direction.cross(Cartesian3.UNIT_Z).normalize();
        camera.up = camera.right.cross(camera.direction);

        var height = Math.max(Math.abs(camera.up.dot(northWest)), Math.abs(camera.up.dot(southEast)), Math.abs(camera.up.dot(northEast)), Math.abs(camera.up.dot(southWest)));
        var width = Math.max(Math.abs(camera.right.dot(northWest)), Math.abs(camera.right.dot(southEast)), Math.abs(camera.right.dot(northEast)), Math.abs(camera.right.dot(southWest)));

        var tanPhi = Math.tan(camera.frustum.fovy * 0.5);
        var tanTheta = camera.frustum.aspectRatio * tanPhi;
        var d = Math.max(width / tanTheta, height / tanPhi);

        camera.position = center.normalize().multiplyByScalar(center.magnitude() + d);
    }

    function viewExtentColumbusView(camera, extent, projection) {
        var north = extent.north;
        var south = extent.south;
        var east = extent.east;
        var west = extent.west;

        var transform = camera.transform.setColumn(3, Cartesian4.UNIT_W);

        var northEast = projection.project(new Cartographic(east, north));
        northEast = transform.multiplyByVector(new Cartesian4(northEast.x, northEast.y, northEast.z, 1.0));
        northEast = Cartesian3.fromCartesian4(camera.getInverseTransform().multiplyByVector(northEast));

        var southWest = projection.project(new Cartographic(west, south));
        southWest = transform.multiplyByVector(new Cartesian4(southWest.x, southWest.y, southWest.z, 1.0));
        southWest = Cartesian3.fromCartesian4(camera.getInverseTransform().multiplyByVector(southWest));

        var tanPhi = Math.tan(camera.frustum.fovy * 0.5);
        var tanTheta = camera.frustum.aspectRatio * tanPhi;
        var d = Math.max((northEast.x - southWest.x) / tanTheta, (northEast.y - southWest.y) / tanPhi) * 0.5;

        var position = projection.project(new Cartographic(0.5 * (west + east), 0.5 * (north + south), d));
        position = transform.multiplyByVector(new Cartesian4(position.x, position.y, position.z, 1.0));
        camera.position = Cartesian3.fromCartesian4(camera.getInverseTransform().multiplyByVector(position));

        // Not exactly -z direction because that would lock the camera in place with a constrained z axis.
        camera.direction = new Cartesian3(0.0, 0.0001, -0.999);
        Cartesian3.UNIT_X.clone(camera.right);
        camera.up = camera.right.cross(camera.direction);
    }

    function viewExtent2D(camera, extent, projection) {
        var north = extent.north;
        var south = extent.south;
        var east = extent.east;
        var west = extent.west;
        var lla = new Cartographic(0.5 * (west + east), 0.5 * (north + south));

        var northEast = projection.project(new Cartographic(east, north));
        var southWest = projection.project(new Cartographic(west, south));

        var width = Math.abs(northEast.x - southWest.x) * 0.5;
        var height = Math.abs(northEast.y - southWest.y) * 0.5;

        var position = projection.project(lla);
        camera.position.x = position.x;
        camera.position.y = position.y;

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

        //Orient the camera north.
        Cartesian3.UNIT_X.clone(camera.right);
        camera.up = camera.right.cross(camera.direction);
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

    function pickEllipsoid3D(controller, windowPosition, ellipsoid) {
        ellipsoid = ellipsoid || Ellipsoid.WGS84;
        var ray = controller.getPickRay(windowPosition);
        var intersection = IntersectionTests.rayEllipsoid(ray, ellipsoid);
        if (!intersection) {
            return undefined;
        }

        var iPt = ray.getPoint(intersection.start);
        return iPt;
    }

    function pickMap2D(controller, windowPosition, projection) {
        var ray = controller.getPickRay(windowPosition);
        var position = ray.origin;
        position.z = 0.0;
        var cart = projection.unproject(position);

        if (cart.latitude < -CesiumMath.PI_OVER_TWO || cart.latitude > CesiumMath.PI_OVER_TWO ||
                cart.longitude < - Math.PI || cart.longitude > Math.PI) {
            return undefined;
        }

        return projection.getEllipsoid().cartographicToCartesian(cart);
    }

    function pickMapColumbusView(controller, windowPosition, projection) {
        var ray = controller.getPickRay(windowPosition);
        var scalar = -ray.origin.x / ray.direction.x;
        var position = ray.getPoint(scalar);

        var cart = projection.unproject(new Cartesian3(position.y, position.z, 0.0));

        if (cart.latitude < -CesiumMath.PI_OVER_TWO || cart.latitude > CesiumMath.PI_OVER_TWO ||
                cart.longitude < - Math.PI || cart.longitude > Math.PI) {
            return undefined;
        }

        position = projection.getEllipsoid().cartographicToCartesian(cart);
        return position;
    }

    /**
     * Pick an ellipsoid or map.
     * @memberof CameraController
     *
     * @param {Cartesian2} windowPosition The x and y coordinates of a pixel.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to pick.
     *
     * @exception {DeveloperError} windowPosition is required.
     *
     * @return {Cartesian3} If the ellipsoid or map was picked, returns the point on the surface of the ellipsoid or map
     * in world coordinates. If the ellipsoid or map was not picked, returns undefined.
     */
    CameraController.prototype.pickEllipsoid = function(windowPosition, ellipsoid) {
        if (typeof windowPosition === 'undefined') {
            throw new DeveloperError('windowPosition is required.');
        }
        ellipsoid = ellipsoid || Ellipsoid.WGS84;

        var p;
        if (this._mode === SceneMode.SCENE3D) {
            p = pickEllipsoid3D(this, windowPosition, ellipsoid);
        } else if (this._mode === SceneMode.SCENE2D) {
            p = pickMap2D(this, windowPosition, this._projection);
        } else if (this._mode === SceneMode.COLUMBUS_VIEW) {
            p = pickMapColumbusView(this, windowPosition, this._projection);
        }

        return p;
    };

    function getPickRayPerspective(camera, windowPosition) {
        var width = camera._canvas.clientWidth;
        var height = camera._canvas.clientHeight;

        var tanPhi = Math.tan(camera.frustum.fovy * 0.5);
        var tanTheta = camera.frustum.aspectRatio * tanPhi;
        var near = camera.frustum.near;

        var x = (2.0 / width) * windowPosition.x - 1.0;
        var y = (2.0 / height) * (height - windowPosition.y) - 1.0;

        var position = camera.getPositionWC();
        var nearCenter = position.add(camera.getDirectionWC().multiplyByScalar(near));
        var xDir = camera.getRightWC().multiplyByScalar(x * near * tanTheta);
        var yDir = camera.getUpWC().multiplyByScalar(y * near * tanPhi);
        var direction = nearCenter.add(xDir).add(yDir).subtract(position).normalize();

        return new Ray(position, direction);
    }

    function getPickRayOrthographic(camera, windowPosition) {
        var width = camera._canvas.clientWidth;
        var height = camera._canvas.clientHeight;

        var x = (2.0 / width) * windowPosition.x - 1.0;
        x *= (camera.frustum.right - camera.frustum.left) * 0.5;
        var y = (2.0 / height) * (height - windowPosition.y) - 1.0;
        y *= (camera.frustum.top - camera.frustum.bottom) * 0.5;

        var position = camera.position.clone();
        position.x += x;
        position.y += y;

        return new Ray(position, camera.getDirectionWC());
    }

    /**
     * Create a ray from the camera position through the pixel at <code>windowPosition</code>
     * in world coordinates.
     *
     * @memberof CameraController
     *
     * @param {Cartesian2} windowPosition The x and y coordinates of a pixel.
     *
     * @exception {DeveloperError} windowPosition is required.
     *
     * @return {Object} Returns the {@link Cartesian3} position and direction of the ray.
     */
    CameraController.prototype.getPickRay = function(windowPosition) {
        if (typeof windowPosition === 'undefined') {
            throw new DeveloperError('windowPosition is required.');
        }

        var camera = this._camera;
        var frustum = camera.frustum;
        if (typeof frustum.aspectRatio !== 'undefined' && typeof frustum.fovy !== 'undefined' && typeof frustum.near !== 'undefined') {
            return getPickRayPerspective(camera, windowPosition);
        }

        return getPickRayOrthographic(camera, windowPosition);
    };

    /**
     * Transform a vector or point from world coordinates to the camera's reference frame.
     * @memberof CameraController
     * @param {Cartesian4} vector The vector or point to transform.
     * @returns {Cartesian4} The transformed vector or point.
     */
    CameraController.prototype.worldToCameraCoordinates = function(vector) {
        var transform = this._camera.getInverseTransform();
        return transform.multiplyByVector(vector);
    };

    /**
     * Transform a vector or point from the camera's reference frame to world coordinates .
     * @memberof CameraController
     * @param {Cartesian4} vector The vector or point to transform.
     * @returns {Cartesian4} The transformed vector or point.
     */
    CameraController.prototype.cameraToWorldCoordinates = function(vector) {
        var transform = this._camera.transform;
        return transform.multiplyByVector(vector);
    };

    function createAnimation2D(controller) {
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
                easingFunction : Tween.Easing.Exponential.EaseOut,
                startValue : {
                    time : 0.0
                },
                stopValue : {
                    time : 1.0
                },
                onUpdate : update2D
            };
        }

        return undefined;
    }

    function createAnimationTemplateCV(controller, position, center, maxX, maxY) {
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
            easingFunction : Tween.Easing.Exponential.EaseOut,
            startValue : {
                time : 0.0
            },
            stopValue : {
                time : 1.0
            },
            onUpdate : updateCV
        };
    }

    function createAnimationCV(controller) {
        var camera = controller._camera;
        var ellipsoid = controller._projection.getEllipsoid();
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

        var mapWidth = ellipsoid.getRadii().x * Math.PI;
        var mapHeight = ellipsoid.getRadii().y * CesiumMath.PI_OVER_TWO;

        var maxX = Math.max(dWidth - mapWidth, mapWidth);
        var maxY = Math.max(dHeight - mapHeight, mapHeight);

        if (positionWC.x < -maxX || positionWC.x > maxX || positionWC.y < -maxY || positionWC.y > maxY) {
            var translateX = centerWC.y < -maxX || centerWC.y > maxX;
            var translateY = centerWC.z < -maxY || centerWC.z > maxY;
            if (translateX || translateY) {
                return createAnimationTemplateCV(controller, Cartesian3.fromCartesian4(positionWC), Cartesian3.fromCartesian4(centerWC), maxX, maxY);
            }
        }

        return undefined;
    }

    /**
     * Create an animation to move the map into view. This method is only valid for 2D and Columbus modes.
     * @memberof CameraController
     * @returns {Object} The animation or undefined if the scene mode is 3D or the map is already ion view.
     */
    CameraController.prototype.createCorrectPositionAnimation = function() {
        if (this._mode === SceneMode.SCENE2D) {
            return createAnimation2D(this);
        } else if (this._mode === SceneMode.COLUMBUS_VIEW) {
            return createAnimationCV(this);
        }

        return undefined;
    };

    return CameraController;
});