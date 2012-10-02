/*global define*/
define([
        '../Core/destroyObject',
        '../Core/Cartesian2',
        '../Core/Cartographic',
        '../Core/DeveloperError',
        '../Core/FAR',
        '../Core/Math',
        '../Core/Matrix3',
        '../Core/Quaternion',
        './AnimationCollection',
        './CameraEventHandler',
        './CameraEventType',
        './CameraHelpers',
        './SceneMode',
        '../ThirdParty/Tween'
    ], function(
        destroyObject,
        Cartesian2,
        Cartographic,
        DeveloperError,
        FAR,
        CesiumMath,
        Matrix3,
        Quaternion,
        AnimationCollection,
        CameraEventHandler,
        CameraEventType,
        CameraHelpers,
        SceneMode,
        Tween) {
    "use strict";

    var CameraMouseController = function(canvas, camera) {
        if (typeof canvas === 'undefined') {
            throw new DeveloperError('canvas is required.');
        }

        if (typeof camera === 'undefined') {
            throw new DeveloperError('camera is required.');
        }

        /**
         * If true, allows the user to pan around the map.  If false, the camera stays locked at the current position.
         * @type Boolean
         */
        this.enableTranslate = true;

        /**
         * If true, allows the user to zoom in and out.  If false, the camera is locked to the current distance from the ellipsoid.
         * @type Boolean
         */
        this.enableZoom = true;

        /**
         * If true, allows the user to rotate the camera.  If false, the camera is locked to the current heading.
         * @type Boolean
         */
        this.enableRotate = true;

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

        this._canvas = canvas;
        this._camera = camera;
        this._projection = undefined;

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

        this._frustum = undefined;
        this._maxCoord = undefined;

        this._maxZoomFactor = 2.5;
        this._maxTranslateFactor = 1.5;
    };

    function decay(time, coefficient) {
        if (time < 0) {
            return 0.0;
        }

        var tau = (1.0 - coefficient) * 25.0;
        return Math.exp(-tau * time);
    }

    function sameMousePosition(movement) {
        return movement.startPosition.equalsEpsilon(movement.endPosition, CesiumMath.EPSILON14);
    }

    // If the time between mouse down and mouse up is not between
    // these thresholds, the camera will not move with inertia.
    // This value is probably dependent on the browser and/or the
    // hardware. Should be investigated further.
    var inertiaMaxClickTimeThreshold = 0.4;
    var inertiaMaxTimeThreshold = 2.0;

    function maintainInertia(handler, decayCoef, action, object, lastMovementName) {
        var ts = handler.getButtonPressTime();
        var tr = handler.getButtonReleaseTime();
        var threshold = ts && tr && ((tr.getTime() - ts.getTime()) / 1000.0);
        var now = new Date();
        var fromNow = tr && ((now.getTime() - tr.getTime()) / 1000.0);
        if (ts && tr && threshold < inertiaMaxClickTimeThreshold && fromNow <= inertiaMaxTimeThreshold) {
            var d = decay(fromNow, decayCoef);

            if (!object[lastMovementName]) {
                var lastMovement = handler.getLastMovement();
                if (!lastMovement || sameMousePosition(lastMovement)) {
                    return;
                }

                var motionX = (lastMovement.endPosition.x - lastMovement.startPosition.x) * 0.5;
                var motionY = (lastMovement.endPosition.y - lastMovement.startPosition.y) * 0.5;
                object[lastMovementName] = {
                    startPosition : new Cartesian2(lastMovement.startPosition.x, lastMovement.startPosition.y),
                    endPosition : new Cartesian2(lastMovement.startPosition.x + motionX * d, lastMovement.startPosition.y + motionY * d),
                    motion : new Cartesian2(motionX, motionY)
                };
            } else {
                object[lastMovementName] = {
                    startPosition : object[lastMovementName].endPosition.clone(),
                    endPosition : new Cartesian2(
                            object[lastMovementName].endPosition.x + object[lastMovementName].motion.x * d,
                            object[lastMovementName].endPosition.y + object[lastMovementName].motion.y * d),
                    motion : new Cartesian2(0.0, 0.0)
                };
            }

            // If value from the decreasing exponential function is close to zero,
            // the end coordinates may be NaN.
            if (isNaN(object[lastMovementName].endPosition.x) || isNaN(object[lastMovementName].endPosition.y) || sameMousePosition(object[lastMovementName])) {
                object[lastMovementName] = undefined;
                return;
            }

            if (!handler.isButtonDown()) {
                action(object, object[lastMovementName]);
            }
        } else {
            object[lastMovementName] = undefined;
        }
    }

    var maxHeight = 20.0;

    function handleZoom(object, movement, distanceMeasure) {
        // distanceMeasure should be the height above the ellipsoid.
        // The zoomRate slows as it approaches the surface and stops maxHeight above it.
        var zoomRate = object._zoomFactor * (distanceMeasure - maxHeight);

        if (zoomRate > object._maximumZoomRate) {
            zoomRate = object._maximumZoomRate;
        }

        var diff = movement.endPosition.y - movement.startPosition.y;
        if (diff === 0) {
            return;
        }

        var rangeWindowRatio = diff / object._canvas.clientHeight;
        var dist = zoomRate * rangeWindowRatio;

        if (dist > 0.0 && Math.abs(distanceMeasure - maxHeight) < 1.0) {
            return;
        }

        if (distanceMeasure - dist < maxHeight) {
            dist = distanceMeasure - maxHeight - 1.0;
        }

        if (dist > 0.0) {
            object._camera.controller.zoomIn(dist);
        } else {
            object._camera.controller.zoomOut(-dist);
        }
    }

    function addCorrectZoomAnimation2D(controller) {
        var camera = controller._camera;
        var frustum = camera.frustum;
        var top = frustum.top;
        var bottom = frustum.bottom;
        var right = frustum.right;
        var left = frustum.left;

        var startFrustum = controller._frustum;

        var update2D = function(value) {
            camera.frustum.top = CesiumMath.lerp(top, startFrustum.top, value.time);
            camera.frustum.bottom = CesiumMath.lerp(bottom, startFrustum.bottom, value.time);
            camera.frustum.right = CesiumMath.lerp(right, startFrustum.right, value.time);
            camera.frustum.left = CesiumMath.lerp(left, startFrustum.left, value.time);
        };

        controller._zoomAnimation = controller._animationCollection.add({
            easingFunction : Tween.Easing.Exponential.EaseOut,
            startValue : {
                time : 0.0
            },
            stopValue : {
                time : 1.0
            },
            onUpdate : update2D
        });
    }

    function addCorrectTranslateAnimation2D(controller) {
        var camera = controller._camera;
        var currentPosition = camera.position;
        var translatedPosition = currentPosition.clone();

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
            camera.position = currentPosition.lerp(translatedPosition, value.time);
        };

        controller._translateAnimation = controller._animationCollection.add({
            easingFunction : Tween.Easing.Exponential.EaseOut,
            startValue : {
                time : 0.0
            },
            stopValue : {
                time : 1.0
            },
            onUpdate : update2D
        });
    }

    function translate2D(controller, movement) {
        var frustum = controller._camera.frustum;

        if (typeof frustum.left === 'undefined' || typeof frustum.right === 'undefined' ||
           typeof frustum.top === 'undefined' || typeof frustum.bottom === 'undefined') {
            throw new DeveloperError('The camera frustum is expected to be orthographic for 2D camera control.');
        }

        var width = controller._canvas.clientWidth;
        var height = controller._canvas.clientHeight;

        var start = new Cartesian2();
        start.x = (movement.startPosition.x / width) * (frustum.right - frustum.left) + frustum.left;
        start.y = ((height - movement.startPosition.y) / height) * (frustum.top - frustum.bottom) + frustum.bottom;

        var end = new Cartesian2();
        end.x = (movement.endPosition.x / width) * (frustum.right - frustum.left) + frustum.left;
        end.y = ((height - movement.endPosition.y) / height) * (frustum.top - frustum.bottom) + frustum.bottom;

        var camera = controller._camera;
        var right = camera.right;
        var up = camera.up;
        var position;
        var newPosition;

        var distance = start.subtract(end);
        if (distance.x !== 0) {
            position = camera.position;
            newPosition = position.add(right.multiplyByScalar(distance.x));

            var maxX = controller._maxCoord.x * controller._maxTranslateFactor;
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
            newPosition = position.add(up.multiplyByScalar(distance.y));

            var maxY = controller._maxCoord.y * controller._maxTranslateFactor;
            if (newPosition.y > maxY) {
                newPosition.y = maxY;
            }
            if (newPosition.y < -maxY) {
                newPosition.y = -maxY;
            }

            camera.position = newPosition;
        }
    }

    function zoom2D(controller, movement) {
        var camera = controller._camera;
        var mag = Math.max(camera.frustum.right - camera.frustum.left, camera.frustum.top - camera.frustum.bottom);
        handleZoom(controller, movement, mag);

        var maxRight = controller._maxCoord.x * controller._maxZoomFactor;
        if (camera.frustum.right > maxRight) {
            var frustum = camera.frustum;
            var ratio = frustum.top / frustum.right;
            frustum.right = maxRight;
            frustum.left = -maxRight;
            frustum.top = frustum.right * ratio;
            frustum.bottom = -frustum.top;
        }
    }

    function twist2D(controller, movement) {
        var width = controller._canvas.clientWidth;
        var height = controller._canvas.clientHeight;

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

        var camera = controller._camera;
        var rotation = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(camera.direction, theta));
        camera.up = rotation.multiplyByVector(camera.up);
        camera.right = camera.direction.cross(camera.up);
    }

    function update2D(controller) {
        var translate = controller._translateHandler;
        var rightZoom = controller._zoomHandler;
        var wheelZoom = controller._zoomWheel;
        var translating = translate.isMoving() && translate.getMovement();
        var rightZooming = rightZoom.isMoving();
        var wheelZooming = wheelZoom.isMoving();

        if (translate.isButtonDown() || rightZoom.isButtonDown() || wheelZooming) {
            controller._animationCollection.removeAll();
        }

        if (controller.enableTranslate) {
            if (translating) {
                translate2D(controller, translate.getMovement());
            }

            if (!translating && controller.inertiaTranslate < 1.0) {
                maintainInertia(translate, controller.inertiaTranslate, translate2D, controller, '_lastInertiaTranslateMovement');
            }
        }

        if (controller.enableZoom) {
            if (rightZooming) {
                zoom2D(controller, rightZoom.getMovement());
            } else if (wheelZooming) {
                zoom2D(controller, wheelZoom.getMovement());
            }

            if (!rightZooming && controller.inertiaZoom < 1.0) {
                maintainInertia(rightZoom, controller.inertiaZoom, zoom2D, controller, '_lastInertiaZoomMovement');
            }

            if (!wheelZooming && controller.inertiaZoom < 1.0) {
                maintainInertia(wheelZoom, controller.inertiaZoom, zoom2D, controller, '_lastInertiaWheelZoomMovement');
            }
        }

        if (controller.enableRotate) {
            if (controller._twistHandler.isMoving()) {
                twist2D(controller, controller._twistHandler.getMovement());
            }
        }

        if (!translate.isButtonDown() && !rightZoom.isButtonDown()) {
            if (controller._camera.frustum.right > controller._frustum.right &&
                !controller._lastInertiaZoomMovement && !controller._animationCollection.contains(controller._zoomAnimation)) {
                addCorrectZoomAnimation2D(controller);
            }

            var position = controller._camera.position;
            var translateX = position.x < -controller._maxCoord.x || position.x > controller._maxCoord.x;
            var translateY = position.y < -controller._maxCoord.y || position.y > controller._maxCoord.y;
            if ((translateX || translateY) && !controller._lastInertiaTranslateMovement &&
                 !controller._animationCollection.contains(controller._translateAnimation)) {
                addCorrectTranslateAnimation2D(controller);
            }
        }

        controller._animationCollection.update();

        return true;
    }

    CameraMouseController.prototype.update = function(frameState) {
        var mode = frameState.mode;
        if (mode === SceneMode.SCENE2D) {
            var projection = frameState.scene2D.projection;
            if (projection !== this._projection) {
                this._projection = projection;
                this._maxCoord = projection.project(new Cartographic(Math.PI, CesiumMath.toRadians(85.05112878)));
            }

            this._frustum = this._camera.frustum.clone();

            var maxZoomOut = 2.0;
            var ratio = this._frustum.top / this._frustum.right;
            this._frustum.right = this._maxCoord.x * maxZoomOut;
            this._frustum.left = -this._frustum.right;
            this._frustum.top = ratio * this._frustum.right;
            this._frustum.bottom = -this._frustum.top;

            update2D(this);
        }
    };

    return CameraMouseController;
});