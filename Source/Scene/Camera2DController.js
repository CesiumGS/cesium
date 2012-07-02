/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/FAR',
        '../Core/Math',
        '../Core/Quaternion',
        '../Core/Ellipsoid',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        './CameraEventHandler',
        './CameraEventType',
        './CameraHelpers',
        './AnimationCollection',
        '../ThirdParty/Tween'
    ], function(
        DeveloperError,
        destroyObject,
        FAR,
        CesiumMath,
        Quaternion,
        Ellipsoid,
        Cartesian2,
        Cartesian3,
        CameraEventHandler,
        CameraEventType,
        CameraHelpers,
        AnimationCollection,
        Tween) {
    "use strict";

    var move = CameraHelpers.move;
    var maintainInertia = CameraHelpers.maintainInertia;
    var handleZoom = CameraHelpers.handleZoom;

    /**
     * A type that defines camera behavior: movement of the position in the direction
     * of the camera's axes and manipulating a camera's orthographic frustum for a zooming effect.
     *
     * @alias Camera2DController
     *
     * @param {HTMLCanvasElement} canvas An HTML canvas element used for its dimensions
     * and for listening on user events.
     * @param {Camera} camera The camera to use.
     * @param {Ellipsoid} [ellipsoid=WGS84 Ellipsoid] DOC_TBA.
     *
     * @internalConstructor
     */
    var Camera2DController = function(canvas, camera, ellipsoid) {
        ellipsoid = ellipsoid || Ellipsoid.WGS84;

        this._canvas = canvas;
        this._camera = camera;
        this._ellipsoid = ellipsoid;
        this._zoomRate = 100000.0;
        this._moveRate = 100000.0;

        /**
         * A parameter in the range <code>[0, 1)</code> used to determine how long
         * the camera will continue to translate because of inertia.
         * With value of zero, the camera will have no inertia.
         *
         * @type Number
         */
        this.inertiaTranslate = 0.9;

        /**
         * A parameter in the range <code>[0, 1)</code> used to determine how long
         * the camera will continue to zoom because of inertia.
         * With value of zero, the camera will have no inertia.
         *
         * @type Number
         */
        this.inertiaZoom = 0.8;

        this._zoomFactor = 1.5;
        this._translateFactor = 1.0;
        this._minimumZoomRate = 20.0;
        this._maximumZoomRate = FAR;

        this._translateHandler = new CameraEventHandler(canvas, CameraEventType.LEFT_DRAG);
        this._zoomHandler = new CameraEventHandler(canvas, CameraEventType.RIGHT_DRAG);
        this._zoomWheel = new CameraEventHandler(canvas, CameraEventType.WHEEL);
        this._twistHandler = new CameraEventHandler(canvas, CameraEventType.MIDDLE_DRAG);

        this._lastInertiaZoomMovement = undefined;
        this._lastInertiaTranslateMovement = undefined;
        this._lastInertiaWheelZoomMovement = undefined;

        this._frustum = this._camera.frustum.clone();
        this._animationCollection = new AnimationCollection();
        this._zoomAnimation = undefined;
        this._translateAnimation = undefined;

        var maxZoomOut = 2.0;
        this._frustum.right *= maxZoomOut;
        this._frustum.left *= maxZoomOut;
        this._frustum.top *= maxZoomOut;
        this._frustum.bottom *= maxZoomOut;

        this._cameraMaxX = this._ellipsoid.getRadii().x * Math.PI;
        this._cameraMaxY = this._ellipsoid.getRadii().y * CesiumMath.PI_OVER_TWO;

        this._maxZoomFactor = 2.5;
        this._maxTranslateFactor = 1.5;
    };

    /**
     * DOC_TBA
     *
     * @memberof Camera2DController
     *
     * @param {Matrix4} transform DOC_TBA
     * @param {Ellipsoid} ellipsoid DOC_TBA
     *
     * @example
     * // Example 1.
     * // Change the reference frame to one centered at a point on the ellipsoid's surface.
     * // Set the 2D controller's ellipsoid to a unit sphere for easy rotation around that point.
     * var center = ellipsoid.cartographicDegreesToCartesian(new Cartographic2(-75.59777, 40.03883));
     * var transform = Transforms.eastNorthUpToFixedFrame(center);
     * scene.getCamera().getControllers().get(0).setReferenceFrame(transform, Ellipsoid.UNIT_SPHERE);
     *
     * // Example 2.
     * // Reset to the defaults.
     * scene.getCamera().getControllers().get(0).setReferenceFrame(Matrix4.IDENTITY);
     *
     */
    Camera2DController.prototype.setReferenceFrame = function (transform, ellipsoid) {
        this._camera.transform = transform;
        this.setEllipsoid(ellipsoid);
    };

    /**
     * Returns the ellipsoid that the camera is moving around.
     *
     * @memberof Camera2DController
     *
     * @returns {Ellipsoid} The ellipsoid that the camera is moving around.
     *
     * @see Camera2DController#setEllipsoid
     */
    Camera2DController.prototype.getEllipsoid = function() {
        return this._ellipsoid;
    };

    /**
     * Sets the ellipsoid that the camera is moving around.
     *
     * @memberof Camera2DController
     *
     * @param {Ellipsoid} [ellipsoid] The ellipsoid that the camera is moving around.
     *
     * @see Camera2DController#getEllipsoid
     */
    Camera2DController.prototype.setEllipsoid = function(ellipsoid) {
        ellipsoid = ellipsoid || Ellipsoid.WGS84;

        var radius = ellipsoid.getRadii().getMaximumComponent();
        this._ellipsoid = ellipsoid;
        this._rateAdjustment = radius;
    };

    /**
     * Translates the camera's position by <code>rate</code> along the camera's up vector.
     *
     * @memberof Camera2DController
     *
     * @param {Number} rate The rate to move.
     *
     * @see Camera2DController#moveDown
     */
    Camera2DController.prototype.moveUp = function(rate) {
        move(this._camera, this._camera.up, rate || this._moveRate);
    };

    /**
     * Translates the camera's position by <code>rate</code> along the opposite direction
     * of the camera's up vector.
     *
     * @memberof Camera2DController
     *
     * @param {Number} rate The rate to move.
     *
     * @see Camera2DController#moveUp
     */
    Camera2DController.prototype.moveDown = function(rate) {
        move(this._camera, this._camera.up, -rate || -this._moveRate);
    };

    /**
     * Translates the camera's position by <code>rate</code> along the camera's right vector.
     *
     * @memberof Camera2DController
     *
     * @param {Number} rate The rate to move.
     *
     * @see Camera2DController#moveLeft
     */
    Camera2DController.prototype.moveRight = function(rate) {
        move(this._camera, this._camera.right, rate || this._moveRate);
    };

    /**
     * Translates the camera's position by <code>rate</code> along the opposite direction
     * of the camera's right vector.
     *
     * @memberof Camera2DController
     *
     * @param {Number} rate The rate to move.
     *
     * @see Camera2DController#moveRight
     */
    Camera2DController.prototype.moveLeft = function(rate) {
        move(this._camera, this._camera.right, -rate || -this._moveRate);
    };

    /**
     * DOC_TBA
     *
     * @memberof Camera2DController
     *
     * @param {Number} rate The rate to move.
     *
     * @see Camera2DController#zoomOut
     */
    Camera2DController.prototype.zoomIn = function(rate) {
        var moveRate = rate || this._zoomRate;
        var frustum = this._camera.frustum;

        if (frustum.left === null || frustum.right === null ||
            frustum.top === null || frustum.bottom === null) {
                throw new DeveloperError('The camera frustum is expected to be orthographic for 2D camera control.');
        }

        var newRight = frustum.right - moveRate;
        var newLeft = frustum.left + moveRate;

        var maxRight = this._cameraMaxX * this._maxZoomFactor;
        if (newRight > maxRight) {
            newRight = maxRight;
            newLeft = -newRight;
        }

        if (newRight > newLeft) {
            var ratio = frustum.top / frustum.right;
            frustum.right = newRight;
            frustum.left = newLeft;
            frustum.top = frustum.right * ratio;
            frustum.bottom = -frustum.top;
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof Camera2DController
     *
     * @param {Number} rate The rate to move.
     *
     * @see Camera2DController#zoomIn
     */
    Camera2DController.prototype.zoomOut = function(rate) {
        this.zoomIn(-rate || -this._zoomRate);
    };

    Camera2DController.prototype._addCorrectZoomAnimation = function() {
        var camera = this._camera;
        var frustum = camera.frustum;
        var top = frustum.top;
        var bottom = frustum.bottom;
        var right = frustum.right;
        var left = frustum.left;

        var startFrustum = this._frustum;

        var update2D = function(value) {
            camera.frustum.top = CesiumMath.lerp(top, startFrustum.top, value.time);
            camera.frustum.bottom = CesiumMath.lerp(bottom, startFrustum.bottom, value.time);
            camera.frustum.right = CesiumMath.lerp(right, startFrustum.right, value.time);
            camera.frustum.left = CesiumMath.lerp(left, startFrustum.left, value.time);
        };

        this._zoomAnimation = this._animationCollection.add({
            easingFunction : Tween.Easing.Exponential.EaseOut,
            startValue : {
                time : 0.0
            },
            stopValue : {
                time : 1.0
            },
            onUpdate : update2D
        });
    };

    Camera2DController.prototype._addCorrectTranslateAnimation = function() {
        var camera = this._camera;
        var currentPosition = camera.position;
        var translatedPosition = currentPosition.clone();

        if (translatedPosition.x > this._cameraMaxX) {
            translatedPosition.x = this._cameraMaxX;
        } else if (translatedPosition.x < -this._cameraMaxX) {
            translatedPosition.x = -this._cameraMaxX;
        }

        if (translatedPosition.y > this._cameraMaxY) {
            translatedPosition.y = this._cameraMaxY;
        } else if (translatedPosition.y < -this._cameraMaxY) {
            translatedPosition.y = -this._cameraMaxY;
        }

        var update2D = function(value) {
            camera.position = currentPosition.lerp(translatedPosition, value.time);
        };

        this._translateAnimation = this._animationCollection.add({
            easingFunction : Tween.Easing.Exponential.EaseOut,
            startValue : {
                time : 0.0
            },
            stopValue : {
                time : 1.0
            },
            onUpdate : update2D
        });
    };

    /**
     * @private
     */
    Camera2DController.prototype.update = function() {
        var translate = this._translateHandler;
        var rightZoom = this._zoomHandler;
        var wheelZoom = this._zoomWheel;
        var translating = translate.isMoving() && translate.getMovement();
        var rightZooming = rightZoom.isMoving();
        var wheelZooming = wheelZoom.isMoving();

        if (translate.isButtonDown() || rightZoom.isButtonDown() || wheelZooming) {
            this._animationCollection.removeAll();
        }

        if (translating) {
            this._translate(translate.getMovement());
        }

        if (!translating && this.inertiaTranslate < 1.0) {
            maintainInertia(translate, this.inertiaTranslate, this._translate, this, '_lastInertiaTranslateMovement');
        }

        if (rightZooming) {
            this._zoom(rightZoom.getMovement());
        } else if (wheelZooming) {
            this._zoom(wheelZoom.getMovement());
        }

        if (!rightZooming && this.inertiaZoom < 1.0) {
            maintainInertia(rightZoom, this.inertiaZoom, this._zoom, this, '_lastInertiaZoomMovement');
        }

        if (!wheelZooming && this.inertiaZoom < 1.0) {
            maintainInertia(wheelZoom, this.inertiaZoom, this._zoom, this, '_lastInertiaWheelZoomMovement');
        }

        if (this._twistHandler.isMoving()) {
            this._twist(this._twistHandler.getMovement());
        }

        if (!translate.isButtonDown() && !rightZoom.isButtonDown()) {
            if (this._camera.frustum.right > this._frustum.right &&
                !this._lastInertiaZoomMovement && !this._animationCollection.contains(this._zoomAnimation)) {
                this._addCorrectZoomAnimation();
            }

            var position = this._camera.position;
            var translateX = position.x < -this._cameraMaxX || position.x > this._cameraMaxX;
            var translateY = position.y < -this._cameraMaxY || position.y > this._cameraMaxY;
            if ((translateX || translateY) && !this._lastInertiaTranslateMovement &&
                    !this._animationCollection.contains(this._translateAnimation)) {
                this._addCorrectTranslateAnimation();
            }
        }

        this._animationCollection.update();

        return true;
    };

    Camera2DController.prototype._translate = function(movement) {
       var frustum = this._camera.frustum;

       if (frustum.left === null || frustum.right === null ||
           frustum.top === null || frustum.bottom === null) {
               throw new DeveloperError('The camera frustum is expected to be orthographic for 2D camera control.');
       }

       var width = this._canvas.clientWidth;
       var height = this._canvas.clientHeight;

       var start = new Cartesian2();
       start.x = (2.0 / width) * movement.startPosition.x - 1.0;
       start.x = (start.x * (frustum.right - frustum.left) + frustum.right + frustum.left) * 0.5;
       start.y = (2.0 / height) * (height - movement.startPosition.y) - 1.0;
       start.y = (start.y * (frustum.top - frustum.bottom) + frustum.top + frustum.bottom) * 0.5;

       var end = new Cartesian2();
       end.x = (2.0 / width) * movement.endPosition.x - 1.0;
       end.x = (end.x * (frustum.right - frustum.left) + frustum.right + frustum.left) * 0.5;
       end.y = (2.0 / height) * (height - movement.endPosition.y) - 1.0;
       end.y = (end.y * (frustum.top - frustum.bottom) + frustum.top + frustum.bottom) * 0.5;

       var camera = this._camera;
       var right = camera.right;
       var up = camera.up;
       var position;
       var newPosition;

       var distance = start.subtract(end);
       if (distance.x !== 0) {
           position = camera.position;
           newPosition = position.add(right.multiplyWithScalar(distance.x));

           var maxX = this._cameraMaxX * this._maxTranslateFactor;
           if (newPosition.x > maxX) {
               newPosition.x = maxX;
           }
           if (newPosition.x < -maxX) {
               newPosition.x = -maxX;
           }

           camera.position = newPosition;
       }
       if (distance.y !== 0) {
           position = camera.position;
           newPosition = position.add(up.multiplyWithScalar(distance.y));

           var maxY = this._cameraMaxY * this._maxTranslateFactor;
           if (newPosition.y > maxY) {
               newPosition.y = maxY;
           }
           if (newPosition.y < -maxY) {
               newPosition.y = -maxY;
           }

           camera.position = newPosition;
       }
   };

   Camera2DController.prototype._zoom = function(movement) {
       var camera = this._camera;
       var mag = Math.max(camera.frustum.right - camera.frustum.left, camera.frustum.top - camera.frustum.bottom);
       handleZoom(this, movement, mag);
   };

   Camera2DController.prototype._twist = function(movement) {
       var width = this._canvas.clientWidth;
       var height = this._canvas.clientHeight;

       var start = new Cartesian2();
       start.x = (2.0 / width) * movement.startPosition.x - 1.0;
       start.y = (2.0 / height) * (height - movement.startPosition.y) - 1.0;
       start = start.normalize();

       var end = new Cartesian2();
       end.x = (2.0 / width) * movement.endPosition.x - 1.0;
       end.y = (2.0 / height) * (height - movement.endPosition.y) - 1.0;
       end = end.normalize();

       var startTheta = Math.acos(start.x);
       if (start.y < 0) {
           startTheta = CesiumMath.TWO_PI - startTheta;
       }
       var endTheta = Math.acos(end.x);
       if (end.y < 0) {
           endTheta = CesiumMath.TWO_PI - endTheta;
       }
       var theta = endTheta - startTheta;

       var camera = this._camera;
       var rotation = Quaternion.fromAxisAngle(camera.direction, theta).toRotationMatrix();
       camera.up = rotation.multiplyWithVector(camera.up);
       camera.right = camera.direction.cross(camera.up);
   };

   /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof Camera2DController
     *
     * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see Camera2DController#destroy
     */
    Camera2DController.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes mouse listeners held by this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof Camera2DController
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Camera2DController#isDestroyed
     *
     * @example
     * controller = controller && controller.destroy();
     */
    Camera2DController.prototype.destroy = function() {
        this._translateHandler = this._translateHandler && this._translateHandler.destroy();
        this._zoomHandler = this._zoomHandler && this._zoomHandler.destroy();
        this._zoomWheel = this._zoomWheel && this._zoomWheel.destroy();
        this._twistHandler = this._twistHandler && this._twistHandler.destroy();
        return destroyObject(this);
    };

    return Camera2DController;
});