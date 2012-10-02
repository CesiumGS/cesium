/*global define*/
define([
        '../Core/destroyObject',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/EventModifier',
        '../Core/FAR',
        '../Core/IntersectionTests',
        '../Core/Math',
        '../Core/Matrix3',
        '../Core/Quaternion',
        '../Core/Ray',
        '../Core/Transforms',
        './AnimationCollection',
        './CameraEventHandler',
        './CameraEventType',
        './SceneMode',
        '../ThirdParty/Tween'
    ], function(
        destroyObject,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Cartographic,
        DeveloperError,
        Ellipsoid,
        EventModifier,
        FAR,
        IntersectionTests,
        CesiumMath,
        Matrix3,
        Quaternion,
        Ray,
        Transforms,
        AnimationCollection,
        CameraEventHandler,
        CameraEventType,
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
        this._ellipsoid = Ellipsoid.WGS84; // CAMERA TODO: need ellipsoid?
        this._projection = undefined;

        // 2D
        this._zoomFactor = 1.5;
        this._translateFactor = 1.0;
        this._minimumZoomRate = 20.0;
        this._maximumZoomRate = FAR;

        this._translateHandler = new CameraEventHandler(canvas, CameraEventType.LEFT_DRAG);
        this._zoomHandler = new CameraEventHandler(canvas, CameraEventType.RIGHT_DRAG);
        this._zoomWheel = new CameraEventHandler(canvas, CameraEventType.WHEEL);
        this._rotateHandler = new CameraEventHandler(canvas, CameraEventType.MIDDLE_DRAG);

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

        // added for Columbus View
        this._transform = this._camera.transform.clone();

        this._mapWidth = this._ellipsoid.getRadii().x * Math.PI;
        this._mapHeight = this._ellipsoid.getRadii().y * CesiumMath.PI_OVER_TWO;

        // added for spindle
        /**
         * A parameter in the range <code>[0, 1]</code> used to determine how long
         * the camera will continue to spin because of inertia.
         * With a value of one, the camera will spin forever and
         * with value of zero, the camera will have no inertia.
         *
         * @type Number
         */
        this.inertiaSpin = 0.9;

        /**
         * If set, the camera will not be able to rotate past this axis in either direction.
         * If this is set while in pan mode, the position clicked on the ellipsoid
         * will not always map directly to the cursor.
         *
         * @type Cartesian3
         */
        this.constrainedAxis = undefined;

        var radius = this._ellipsoid.getMaximumRadius();
        this._zoomFactor = 5.0; // Camera TODO: What about 2D?
        this._rotateFactor = 1.0 / radius;
        this._rotateRateRangeAdjustment = radius;
        this._maximumRotateRate = 1.77;
        this._minimumRotateRate = 1.0 / 5000.0;

        this._spinHandler = new CameraEventHandler(canvas, CameraEventType.LEFT_DRAG);

        this._lastInertiaSpinMovement = undefined;

        // add for free look
        this._lookHandler = new CameraEventHandler(canvas, CameraEventType.LEFT_DRAG, EventModifier.SHIFT);
        this.horizontalRotationAxis = undefined;
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
            if (controller._rotateHandler.isMoving()) {
                twist2D(controller, controller._rotateHandler.getMovement());
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

    function addCorrectTranslateAnimationCV(controller, position, center, maxX, maxY) {
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

        controller._translateAnimation = controller._animationCollection.add({
            easingFunction : Tween.Easing.Exponential.EaseOut,
            startValue : {
                time : 0.0
            },
            stopValue : {
                time : 1.0
            },
            onUpdate : updateCV
        });
    }

    function translateCV(controller, movement) {
        var camera = controller._camera;
        var sign = (camera.direction.dot(Cartesian3.UNIT_Z) >= 0) ? 1.0 : -1.0;

        var startRay = camera.getPickRay(movement.startPosition);
        var endRay = camera.getPickRay(movement.endPosition);

        var normal = Cartesian3.fromCartesian4(camera.getInverseTransform().multiplyByVector(Cartesian4.UNIT_X));

        var position = new Cartesian4(startRay.origin.x, startRay.origin.y, startRay.origin.z, 1.0);
        position = Cartesian3.fromCartesian4(camera.getInverseTransform().multiplyByVector(position));
        var direction = new Cartesian4(startRay.direction.x, startRay.direction.y, startRay.direction.z, 0.0);
        direction = Cartesian3.fromCartesian4(camera.getInverseTransform().multiplyByVector(direction));
        var scalar = sign * normal.dot(position) / normal.dot(direction);
        var startPlanePos = position.add(direction.multiplyByScalar(scalar));

        position = new Cartesian4(endRay.origin.x, endRay.origin.y, endRay.origin.z, 1.0);
        position = Cartesian3.fromCartesian4(camera.getInverseTransform().multiplyByVector(position));
        direction = new Cartesian4(endRay.direction.x, endRay.direction.y, endRay.direction.z, 0.0);
        direction = Cartesian3.fromCartesian4(camera.getInverseTransform().multiplyByVector(direction));
        scalar = sign * normal.dot(position) / normal.dot(direction);
        var endPlanePos = position.add(direction.multiplyByScalar(scalar));

        var diff = startPlanePos.subtract(endPlanePos);
        camera.position = camera.position.add(diff);
    }

    function correctPositionCV(controller)
    {
        var camera = controller._camera;
        var position = camera.position;
        var direction = camera.direction;

        var normal = Cartesian3.fromCartesian4(camera.getInverseTransform().multiplyByVector(Cartesian4.UNIT_X));
        var scalar = -normal.dot(position) / normal.dot(direction);
        var center = position.add(direction.multiplyByScalar(scalar));
        center = new Cartesian4(center.x, center.y, center.z, 1.0);
        var centerWC = camera.transform.multiplyByVector(center);
        controller._transform.setColumn(3, centerWC, controller._transform);

        var cameraPosition = new Cartesian4(camera.position.x, camera.position.y, camera.position.z, 1.0);
        var positionWC = camera.transform.multiplyByVector(cameraPosition);

        var tanPhi = Math.tan(controller._camera.frustum.fovy * 0.5);
        var tanTheta = controller._camera.frustum.aspectRatio * tanPhi;
        var distToC = positionWC.subtract(centerWC).magnitude();
        var dWidth = tanTheta * distToC;
        var dHeight = tanPhi * distToC;

        var maxX = Math.max(dWidth - controller._mapWidth, controller._mapWidth);
        var maxY = Math.max(dHeight - controller._mapHeight, controller._mapHeight);

        if (positionWC.x < -maxX || positionWC.x > maxX || positionWC.y < -maxY || positionWC.y > maxY) {
            if (!controller._translateHandler.isButtonDown()) {
                var translateX = centerWC.y < -maxX || centerWC.y > maxX;
                var translateY = centerWC.z < -maxY || centerWC.z > maxY;
                if ((translateX || translateY) && !controller._lastInertiaTranslateMovement &&
                        !controller._animationCollection.contains(controller._translateAnimation)) {
                    addCorrectTranslateAnimationCV(controller, Cartesian3.fromCartesian4(positionWC), Cartesian3.fromCartesian4(centerWC), maxX, maxY);
                }
            }

            maxX = maxX + controller._mapWidth * 0.5;
            if (centerWC.y > maxX) {
                positionWC.y -= centerWC.y - maxX;
            } else if (centerWC.y < -maxX) {
                positionWC.y += -maxX - centerWC.y;
            }

            maxY = maxY + controller._mapHeight * 0.5;
            if (centerWC.z > maxY) {
                positionWC.z -= centerWC.z - maxY;
            } else if (centerWC.z < -maxY) {
                positionWC.z += -maxY - centerWC.z;
            }
        }

        camera.position = Cartesian3.fromCartesian4(camera.getInverseTransform().multiplyByVector(positionWC));
    }

    function rotateCV(controller, movement) {
        var camera = controller._camera;

        var position = camera.getPositionWC();
        var up = camera.getUpWC();
        var right = camera.getRightWC();
        var direction = camera.getDirectionWC();

        var oldTransform = camera.transform;
        camera.transform = controller._transform;

        var invTransform = camera.getInverseTransform();
        camera.position = Cartesian3.fromCartesian4(invTransform.multiplyByVector(new Cartesian4(position.x, position.y, position.z, 1.0)));
        camera.up = Cartesian3.fromCartesian4(invTransform.multiplyByVector(new Cartesian4(up.x, up.y, up.z, 0.0)));
        camera.right = Cartesian3.fromCartesian4(invTransform.multiplyByVector(new Cartesian4(right.x, right.y, right.z, 0.0)));
        camera.direction = Cartesian3.fromCartesian4(invTransform.multiplyByVector(new Cartesian4(direction.x, direction.y, direction.z, 0.0)));

        rotate3D(controller, movement);

        position = camera.getPositionWC();
        up = camera.getUpWC();
        right = camera.getRightWC();
        direction = camera.getDirectionWC();

        camera.transform = oldTransform;
        var transform = camera.getInverseTransform();

        camera.position = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(position.x, position.y, position.z, 1.0)));
        camera.up = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(up.x, up.y, up.z, 0.0)));
        camera.right = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(right.x, right.y, right.z, 0.0)));
        camera.direction = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(direction.x, direction.y, direction.z, 0.0)));
    }

    function zoomCV(controller, movement) {
        handleZoom(controller, movement, controller._camera.position.z);
    }

    function updateCV(controller) {
        var translate = controller._translateHandler;
        var translating = translate.isMoving() && translate.getMovement();
        var rotate = controller._rotateHandler;
        var rotating = rotate.isMoving() && rotate.getMovement();
        var zoom = controller._zoomHandler;
        var zoomimg = zoom && zoom.isMoving();

        if (rotating) {
            rotateCV(controller, rotate.getMovement());
        }

        var buttonDown = translate.isButtonDown() || rotate.isButtonDown() ||
            rotate.isButtonDown() || controller._lookHandler.isButtonDown();
        if (buttonDown) {
            controller._animationCollection.removeAll();
        }

        if (translating) {
            translateCV(controller, translate.getMovement());
        }

        if (!translating && controller.inertiaTranslate < 1.0) {
            maintainInertia(translate, controller.inertiaTranslate, translateCV, controller, '_lastInertiaTranslateMovement');
        }

        if (zoomimg) {
            zoomCV(controller, zoom.getMovement());
        }

        if (zoom && !zoomimg && controller.inertiaZoom < 1.0) {
            maintainInertia(zoom, controller.inertiaZoom, zoomCV, controller, '_lastInertiaZoomMovement');
        }

        if (controller._lookHandler.isMoving()) {
            look3D(controller, controller._lookHandler.getMovement());
        }

        if (!buttonDown) {
            correctPositionCV(controller);
        }

        controller._animationCollection.update();

        return true;
    }

    function spin3D(controller, movement) {
        if (typeof controller._camera.controller.pickEllipsoid(movement.startPosition, controller._ellipsoid) !== 'undefined') {
            pan3D(controller, movement);
        } else {
            rotate3D(controller, movement);
        }
    }

    function rotate3D(controller, movement) {
        controller._camera.controller.constrainedAxis = controller.constrainedAxis;
        var position = controller._camera.position;
        var rho = position.magnitude();
        var rotateRate = controller._rotateFactor * (rho - controller._rotateRateRangeAdjustment);

        if (rotateRate > controller._maximumRotateRate) {
            rotateRate = controller._maximumRotateRate;
        }

        if (rotateRate < controller._minimumRotateRate) {
            rotateRate = controller._minimumRotateRate;
        }

        var phiWindowRatio = (movement.endPosition.x - movement.startPosition.x) / controller._canvas.clientWidth;
        var thetaWindowRatio = (movement.endPosition.y - movement.startPosition.y) / controller._canvas.clientHeight;

        var deltaPhi = -rotateRate * phiWindowRatio * Math.PI * 2.0;
        var deltaTheta = -rotateRate * thetaWindowRatio * Math.PI;

        controller._camera.controller.rotateRight(deltaPhi);
        controller._camera.controller.rotateUp(deltaTheta);
    }

    function pan3D(controller, movement) {
        var camera = controller._camera;
        camera.controller.constrainedAxis = controller.constrainedAxis;
        var p0 = camera.controller.pickEllipsoid(movement.startPosition, controller._ellipsoid);
        var p1 = camera.controller.pickEllipsoid(movement.endPosition, controller._ellipsoid);

        if (typeof p0 === 'undefined' || typeof p1 === 'undefined') {
            return;
        }

        var transform = camera.getInverseTransform();
        p0 = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(p0.x, p0.y, p0.z, 1.0)));
        p1 = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(p1.x, p1.y, p1.z, 1.0)));

        if (typeof controller.constrainedAxis === 'undefined') {
            p0 = p0.normalize();
            p1 = p1.normalize();
            var dot = p0.dot(p1);
            var axis = p0.cross(p1);

            if (dot < 1.0 && !axis.equalsEpsilon(Cartesian3.ZERO, CesiumMath.EPSILON14)) { // dot is in [0, 1]
                var angle = -Math.acos(dot);
                camera.controller.rotate(axis, angle);
            }
        } else {
            var startRho = p0.magnitude();
            var startPhi = Math.atan2(p0.y, p0.x);
            var startTheta = Math.acos(p0.z / startRho);

            var endRho = p1.magnitude();
            var endPhi = Math.atan2(p1.y, p1.x);
            var endTheta = Math.acos(p1.z / endRho);

            var deltaPhi = startPhi - endPhi;
            var deltaTheta = startTheta - endTheta;

            var theta = Math.acos(camera.position.z / camera.position.magnitude()) + deltaTheta;
            if (theta < 0 || theta > Math.PI) {
                deltaTheta = 0;
            }

            camera.controller.rotateRight(deltaPhi);
            camera.controller.rotateUp(deltaTheta);
        }
    }

    function zoom3D(controller, movement) {
        handleZoom(controller, movement, controller._ellipsoid.cartesianToCartographic(controller._camera.position).height);
    }

    function tilt3D(controller, movement) {
        var camera = controller._camera;

        var ellipsoid = controller._ellipsoid;
        var position = camera.position;
        if (ellipsoid.cartesianToCartographic(position).height - maxHeight - 1.0 < CesiumMath.EPSILON3 &&
                movement.endPosition.y - movement.startPosition.y < 0) {
            return;
        }

        var up = camera.up;
        var right = camera.right;
        var direction = camera.direction;

        var oldTransform = camera.transform;
        var oldConstrainedZ = controller._spindleController.constrainedAxis;

        var ray = new Ray(controller._camera.getPositionWC(), controller._camera.getDirectionWC());
        var intersection = IntersectionTests.rayEllipsoid(ray, ellipsoid);
        if (typeof intersection === 'undefined') {
            return;
        }

        var center = ray.getPoint(intersection.start);
        center = Cartesian3.fromCartesian4(camera.getInverseTransform().multiplyByVector(new Cartesian4(center.x, center.y, center.z, 1.0)));
        var localTransform = Transforms.eastNorthUpToFixedFrame(center);
        var transform = localTransform.multiply(oldTransform);

        controller.constrainedAxis = Cartesian3.UNIT_Z;
        controller._camera.transform = transform;
        controller._ellipsoid = Ellipsoid.UNIT_SPHERE;

        var invTransform = camera.getInverseTransform();
        camera.position = Cartesian3.fromCartesian4(invTransform.multiplyByVector(new Cartesian4(position.x, position.y, position.z, 1.0)));
        camera.up = Cartesian3.fromCartesian4(invTransform.multiplyByVector(new Cartesian4(up.x, up.y, up.z, 0.0)));
        camera.right = Cartesian3.fromCartesian4(invTransform.multiplyByVector(new Cartesian4(right.x, right.y, right.z, 0.0)));
        camera.direction = Cartesian3.fromCartesian4(invTransform.multiplyByVector(new Cartesian4(direction.x, direction.y, direction.z, 0.0)));

        var yDiff = movement.startPosition.y - movement.endPosition.y;
        if (!camera.position.normalize().equalsEpsilon(Cartesian3.UNIT_Z, CesiumMath.EPSILON2) || yDiff > 0) {
            rotate3D(controller, movement);
        }

        position = camera.position;
        up = camera.up;
        right = camera.right;
        direction = camera.direction;

        controller.constrainedAxis = oldConstrainedZ;
        controller._camera.transform = oldTransform;
        controller._ellipsoid = ellipsoid;

        camera.position = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(position.x, position.y, position.z, 1.0)));
        camera.up = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(up.x, up.y, up.z, 0.0)));
        camera.right = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(right.x, right.y, right.z, 0.0)));
        camera.direction = Cartesian3.fromCartesian4(transform.multiplyByVector(new Cartesian4(direction.x, direction.y, direction.z, 0.0)));

        position = ellipsoid.cartesianToCartographic(camera.position);
        if (position.height < maxHeight + 1.0) {
            position.height = maxHeight + 1.0;
            camera.position = ellipsoid.cartographicToCartesian(position);
            camera.direction = Cartesian3.fromCartesian4(transform.getColumn(3).subtract(camera.position)).normalize();
            camera.right = camera.position.negate().cross(camera.direction).normalize();
            camera.up = camera.right.cross(camera.direction);
        }
    }

    function look3D(controller, movement) {
        var camera = controller._camera;

        var width = controller._canvas.clientWidth;
        var height = controller._canvas.clientHeight;

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
        var axis = (typeof controller.horizontalRotationAxis !== 'undefined') ? controller.horizontalRotationAxis : camera.up;
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
    }

    function update3D(controller) {
        var spin = controller._spinHandler;
        var rightZoom = controller._zoomHandler;
        var wheelZoom = controller._zoomWheel;
        var spinning = spin && spin.isMoving() && spin.getMovement();
        var rightZooming = rightZoom && rightZoom.isMoving();
        var wheelZooming = wheelZoom && wheelZoom.isMoving();
        var rotate = controller._rotateHandler;
        var rotating = rotate.isMoving() && rotate.getMovement();

        if (spinning) {
            spin3D(controller, spin.getMovement());
        }

        if (spin && !spinning && controller.inertiaSpin < 1.0) {
            maintainInertia(spin, controller.inertiaSpin, spin3D, controller, '_lastInertiaSpinMovement');
        }

        if (rotating) {
            tilt3D(controller, rotate.getMovement());
        }

        if (rightZooming) {
            zoom3D(controller, rightZoom.getMovement());
        } else if (wheelZooming) {
            zoom3D(controller, wheelZoom.getMovement());
        }

        if (rightZoom && !rightZooming && controller.inertiaZoom < 1.0) {
            maintainInertia(rightZoom, controller.inertiaZoom, zoom3D, controller, '_lastInertiaZoomMovement');
        }

        if (wheelZoom && !wheelZooming && controller.inertiaZoom < 1.0) {
            maintainInertia(wheelZoom, controller.inertiaZoom, zoom3D, controller, '_lastInertiaWheelZoomMovement');
        }

        if (controller._lookHandler.isMoving()) {
            look3D(controller, controller._lookHandler.getMovement());
        }

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
        } else if (mode === SceneMode.COLUMBUS_VIEW) {
            this._ellipsoid = Ellipsoid.UNIT_SPHERE;
            this.constrainedAxis = Cartesian3.UNIT_X;
            this.horizontalRotationAxis = Cartesian3.UNIT_Z;
            updateCV(this);
        } else if (mode === SceneMode.SCENE3D) {
            this._ellipsoid = Ellipsoid.WGS84;
            this.constrainedAxis = undefined;
            this.horizontalRotationAxis = undefined;
            update3D(this);
        }
    };

    return CameraMouseController;
});