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
        '../Core/Matrix4',
        '../Core/Quaternion',
        '../Core/Ray',
        '../Core/Transforms',
        './AnimationCollection',
        './CameraEventHandler',
        './CameraEventType',
        './SceneMode'
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
        Matrix4,
        Quaternion,
        Ray,
        Transforms,
        AnimationCollection,
        CameraEventHandler,
        CameraEventType,
        SceneMode) {
    "use strict";

    /**
     * Modifies the camera position and orientation based on mouse input to a canvas.
     * @alias CameraMouseController
     * @constructor
     *
     * @param {HTMLCanvasElement} canvas The canvas to listen for events.
     * @param {CameraController} cameraController The camera controller used to modify the camera.
     *
     * @exception {DeveloperError} canvas is required.
     * @exception {DeveloperError} cameraController is required.
     */
    var CameraMouseController = function(canvas, cameraController) {
        if (typeof canvas === 'undefined') {
            throw new DeveloperError('canvas is required.');
        }

        if (typeof cameraController === 'undefined') {
            throw new DeveloperError('cameraController is required.');
        }

        /**
         * If true, allows the user to pan around the map.  If false, the camera stays locked at the current position.
         * This flag is only valid in 2D and Columbus view modes.
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
         * If true, allows the user to use free-look. If false, the camera view direction can only be changed through translating
         * or rotating. This flag is only valid in 3D and Columbus view modes.
         */
        this.enableLook = true;
        /**
         * A parameter in the range <code>[0, 1]</code> used to determine how long
         * the camera will continue to spin because of inertia.
         * With a value of one, the camera will spin forever and
         * with value of zero, the camera will have no inertia.
         * @type Number
         */
        this.inertiaSpin = 0.9;
        /**
         * A parameter in the range <code>[0, 1)</code> used to determine how long
         * the camera will continue to translate because of inertia.
         * With value of zero, the camera will have no inertia.
         * @type Number
         */
        this.inertiaTranslate = 0.9;
        /**
         * A parameter in the range <code>[0, 1)</code> used to determine how long
         * the camera will continue to zoom because of inertia.
         * With value of zero, the camera will have no inertia.
         * @type Number
         */
        this.inertiaZoom = 0.8;
        /**
         * If set, the camera will not be able to rotate past this axis in either direction.
         * If this is set while in pan mode, the position clicked on the ellipsoid
         * will not always map directly to the cursor.
         * @type Cartesian3
         */
        this.constrainedAxis = undefined;

        this._canvas = canvas;
        this._cameraController = cameraController;
        this._ellipsoid = Ellipsoid.WGS84;

        this._spinHandler = new CameraEventHandler(canvas, CameraEventType.LEFT_DRAG);
        this._translateHandler = new CameraEventHandler(canvas, CameraEventType.LEFT_DRAG);
        this._lookHandler = new CameraEventHandler(canvas, CameraEventType.LEFT_DRAG, EventModifier.SHIFT);
        this._rotateHandler = new CameraEventHandler(canvas, CameraEventType.MIDDLE_DRAG);
        this._zoomHandler = new CameraEventHandler(canvas, CameraEventType.RIGHT_DRAG);
        this._zoomWheel = new CameraEventHandler(canvas, CameraEventType.WHEEL);

        this._lastInertiaSpinMovement = undefined;
        this._lastInertiaZoomMovement = undefined;
        this._lastInertiaTranslateMovement = undefined;
        this._lastInertiaWheelZoomMovement = undefined;

        this._animationCollection = new AnimationCollection();
        this._animation = undefined;

        this._horizontalRotationAxis = undefined;

        // Constants, Make any of these public?
        var radius = this._ellipsoid.getMaximumRadius();
        this._zoomFactor = 5.0;
        this._rotateFactor = 1.0 / radius;
        this._rotateRateRangeAdjustment = radius;
        this._maximumRotateRate = 1.77;
        this._minimumRotateRate = 1.0 / 5000.0;
        this._zoomFactor2D = 1.5;
        this._translateFactor = 1.0;
        this._minimumZoomRate = 20.0;
        this._maximumZoomRate = FAR;
    };

    /**
     * Returns the ellipsoid. The ellipsoid is used to determine the size of the map in 2D and Columbus view
     * as well as how fast to rotate the camera based on the distance to its surface.
     * @returns {Ellipsoid} The ellipsoid.
     */
    CameraMouseController.prototype.getEllipsoid = function() {
        return this._ellipsoid;
    };

    /**
     * Returns the ellipsoid. The ellipsoid is used to determine the size of the map in 2D and Columbus view
     * as well as how fast to rotate the camera based on the distance to its surface.
     * @param {Ellipsoid} [ellipsoid=WGS84] The ellipsoid.
     */
    CameraMouseController.prototype.setEllipsoid = function(ellipsoid) {
        ellipsoid = ellipsoid || Ellipsoid.WGS84;
        var radius = ellipsoid.getMaximumRadius();
        this._ellipsoid = ellipsoid;
        this._rotateFactor = 1.0 / radius;
        this._rotateRateRangeAdjustment = radius;
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
    function handleZoom(object, movement, zoomFactor, distanceMeasure) {
        // distanceMeasure should be the height above the ellipsoid.
        // The zoomRate slows as it approaches the surface and stops maxHeight above it.
        var zoomRate = zoomFactor * (distanceMeasure - maxHeight);

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
            object._cameraController.zoomIn(dist);
        } else {
            object._cameraController.zoomOut(-dist);
        }
    }

    function translate2D(controller, movement) {
        var cameraController = controller._cameraController;
        var start = cameraController.getPickRay(movement.startPosition).origin;
        var end = cameraController.getPickRay(movement.endPosition).origin;

        var distance = start.subtract(end);
        cameraController.moveRight(distance.x);
        cameraController.moveUp(distance.y);
    }

    function zoom2D(controller, movement) {
        handleZoom(controller, movement, controller._zoomFactor2D, controller._cameraController.getMagnitude());
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

        controller._cameraController.twistLeft(theta);
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

        if (!translate.isButtonDown() && !rightZoom.isButtonDown() &&
                !controller._lastInertiaZoomMovement && !controller._lastInertiaTranslateMovement &&
                !controller._animationCollection.contains(controller._animation)) {
            var animation = controller._cameraController.createCorrectPositionAnimation();
            if (typeof animation !== 'undefined') {
                controller._animation = controller._animationCollection.add(animation);
            }
        }

        controller._animationCollection.update();

        return true;
    }

    function translateCV(controller, movement) {
        var cameraController = controller._cameraController;
        var startRay = cameraController.getPickRay(movement.startPosition);
        var endRay = cameraController.getPickRay(movement.endPosition);
        var normal = Cartesian3.UNIT_X;

        var position = startRay.origin;
        var direction = startRay.direction;
        var scalar = -normal.dot(position) / normal.dot(direction);
        var startPlanePos = position.add(direction.multiplyByScalar(scalar));

        position = endRay.origin;
        direction = endRay.direction;
        scalar = -normal.dot(position) / normal.dot(direction);
        var endPlanePos = position.add(direction.multiplyByScalar(scalar));

        var diff = startPlanePos.subtract(endPlanePos);
        diff = new Cartesian3(diff.y, diff.z, diff.x);
        var mag = diff.magnitude();
        if (mag > CesiumMath.EPSILON6) {
            cameraController.move(diff.normalize(), mag);
        }
    }

    function rotateCV(controller, movement) {
        var ray = controller._cameraController.getPickRay(new Cartesian2(controller._canvas.clientWidth / 2, controller._canvas.clientHeight / 2));
        var normal = Cartesian3.UNIT_X;

        var position = ray.origin;
        var direction = ray.direction;
        var scalar = -normal.dot(position) / normal.dot(direction);
        var center = position.add(direction.multiplyByScalar(scalar));
        var transform = Matrix4.fromTranslation(center);

        var oldEllipsoid = controller._ellipsoid;
        var oldAxis = controller.constrainedAxis;

        controller.setEllipsoid(Ellipsoid.UNIT_SPHERE);
        controller.constrainedAxis = Cartesian3.UNIT_Z;

        rotate3D(controller, movement, transform);

        controller.constrainedAxis = oldAxis;
        controller.setEllipsoid(oldEllipsoid);
    }

    function zoomCV(controller, movement) {
        handleZoom(controller, movement, controller._zoomFactor2D, controller._cameraController.getMagnitude());
    }

    function updateCV(controller) {
        var translate = controller._translateHandler;
        var translating = translate.isMoving() && translate.getMovement();
        var rotate = controller._rotateHandler;
        var rotating = rotate.isMoving() && rotate.getMovement();
        var zoom = controller._zoomHandler;
        var zoomimg = zoom && zoom.isMoving();
        var wheelZoom = controller._zoomWheel;
        var wheelZooming = wheelZoom.isMoving();

        var buttonDown = translate.isButtonDown() || rotate.isButtonDown() ||
            rotate.isButtonDown() || controller._lookHandler.isButtonDown();
        if (buttonDown) {
            controller._animationCollection.removeAll();
        }

        if (controller.enableRotate) {
            if (rotating) {
                rotateCV(controller, rotate.getMovement());
            }
        }

        if (controller.enableTranslate) {
            if (translating) {
                translateCV(controller, translate.getMovement());
            }

            if (!translating && controller.inertiaTranslate < 1.0) {
                maintainInertia(translate, controller.inertiaTranslate, translateCV, controller, '_lastInertiaTranslateMovement');
            }
        }

        if (controller.enableZoom) {
            if (zoomimg) {
                zoomCV(controller, zoom.getMovement());
            } else if (wheelZooming) {
                zoomCV(controller, wheelZoom.getMovement());
            }

            if (zoom && !zoomimg && controller.inertiaZoom < 1.0) {
                maintainInertia(zoom, controller.inertiaZoom, zoomCV, controller, '_lastInertiaZoomMovement');
            }

            if (!wheelZooming && controller.inertiaZoom < 1.0) {
                maintainInertia(wheelZoom, controller.inertiaZoom, zoomCV, controller, '_lastInertiaWheelZoomMovement');
            }
        }

        if (controller.enableLook && controller._lookHandler.isMoving()) {
                look3D(controller, controller._lookHandler.getMovement());
        }

        if (!buttonDown && !controller._lastInertiaZoomMovement && !controller._lastInertiaTranslateMovement &&
                !controller._animationCollection.contains(controller._animation)) {
            var animation = controller._cameraController.createCorrectPositionAnimation();
            if (typeof animation !== 'undefined') {
                controller._animation = controller._animationCollection.add(animation);
            }
        }

        controller._animationCollection.update();

        return true;
    }

    function spin3D(controller, movement) {
        if (typeof controller._cameraController.pickEllipsoid(movement.startPosition, controller._ellipsoid) !== 'undefined') {
            pan3D(controller, movement);
        } else {
            rotate3D(controller, movement);
        }
    }

    function rotate3D(controller, movement, transform) {
        var cameraController = controller._cameraController;
        cameraController.constrainedAxis = controller.constrainedAxis;
        var rho = cameraController.getMagnitude();
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

        cameraController.rotateRight(deltaPhi, transform);
        cameraController.rotateUp(deltaTheta, transform);
    }

    function pan3D(controller, movement) {
        var cameraController = controller._cameraController;
        cameraController.constrainedAxis = controller.constrainedAxis;
        var p0 = cameraController.pickEllipsoid(movement.startPosition, controller._ellipsoid);
        var p1 = cameraController.pickEllipsoid(movement.endPosition, controller._ellipsoid);

        if (typeof p0 === 'undefined' || typeof p1 === 'undefined') {
            return;
        }

        p0 = Cartesian3.fromCartesian4(cameraController.worldToCameraCoordinates(new Cartesian4(p0.x, p0.y, p0.z, 1.0)));
        p1 = Cartesian3.fromCartesian4(cameraController.worldToCameraCoordinates(new Cartesian4(p1.x, p1.y, p1.z, 1.0)));

        if (typeof controller.constrainedAxis === 'undefined') {
            p0 = p0.normalize();
            p1 = p1.normalize();
            var dot = p0.dot(p1);
            var axis = p0.cross(p1);

            if (dot < 1.0 && !axis.equalsEpsilon(Cartesian3.ZERO, CesiumMath.EPSILON14)) { // dot is in [0, 1]
                var angle = -Math.acos(dot);
                cameraController.rotate(axis, angle);
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

            cameraController.rotateRight(deltaPhi);
            cameraController.rotateUp(deltaTheta);
        }
    }

    function zoom3D(controller, movement) {
        var magnitude = controller._cameraController.getMagnitude();
        handleZoom(controller, movement, controller._zoomFactor, magnitude - controller._ellipsoid.getMaximumRadius());
    }

    function tilt3D(controller, movement) {
        var cameraController = controller._cameraController;

        var ellipsoid = controller._ellipsoid;
        var height = cameraController.getMagnitude() - ellipsoid.getMaximumRadius()
        if (height - maxHeight - 1.0 < CesiumMath.EPSILON3 &&
                movement.endPosition.y - movement.startPosition.y < 0) {
            return;
        }

        var ray = cameraController.getPickRay(new Cartesian2(controller._canvas.clientWidth / 2, controller._canvas.clientHeight / 2));
        var intersection = IntersectionTests.rayEllipsoid(ray, ellipsoid);
        if (typeof intersection === 'undefined') {
            return;
        }

        var center = ray.getPoint(intersection.start);
        center = cameraController.worldToCameraCoordinates(new Cartesian4(center.x, center.y, center.z, 1.0));
        center = Cartesian3.fromCartesian4(center);
        var transform = Transforms.eastNorthUpToFixedFrame(center);

        var oldEllipsoid = controller._ellipsoid;
        var oldAxis = controller.constrainedAxis;

        controller.setEllipsoid(Ellipsoid.UNIT_SPHERE);
        controller.constrainedAxis = Cartesian3.UNIT_Z;

        // CAMERA TODO: Remove the need for camera access
        var yDiff = movement.startPosition.y - movement.endPosition.y;
        var camera = cameraController._camera;
        var position = camera.position;
        var direction = camera.direction;
        if (!position.negate().normalize().equalsEpsilon(direction, CesiumMath.EPSILON2) || yDiff > 0) {
            rotate3D(controller, movement, transform);
        }

        controller.constrainedAxis = oldAxis;
        controller.setEllipsoid(oldEllipsoid);
    }

    function look3D(controller, movement) {
        var cameraController = controller._cameraController;

        var start = new Cartesian2(movement.startPosition.x, 0);
        var end = new Cartesian2(movement.endPosition.x, 0);
        start = cameraController.getPickRay(start).direction;
        end = cameraController.getPickRay(end).direction;

        var angle = 0.0;
        var dot = start.dot(end);
        if (dot < 1.0) { // dot is in [0, 1]
            angle = Math.acos(dot);
        }
        angle = (movement.startPosition.x > movement.endPosition.x) ? -angle : angle;
        var rotationAxis = controller._horizontalRotationAxis;
        if (typeof rotationAxis !== 'undefined') {
            cameraController.look(rotationAxis, angle);
        } else {
            cameraController.lookLeft(angle);
        }

        start = new Cartesian2(0, movement.startPosition.y);
        end = new Cartesian2(0, movement.endPosition.y);
        start = cameraController.getPickRay(start).direction;
        end = cameraController.getPickRay(end).direction;

        angle = 0.0;
        dot = start.dot(end);
        if (dot < 1.0) { // dot is in [0, 1]
            angle = Math.acos(dot);
        }
        angle = (movement.startPosition.y > movement.endPosition.y) ? -angle : angle;
        cameraController.lookUp(angle);
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

        if (controller.enableRotate) {
            if (spinning) {
                spin3D(controller, spin.getMovement());
            }

            if (spin && !spinning && controller.inertiaSpin < 1.0) {
                maintainInertia(spin, controller.inertiaSpin, spin3D, controller, '_lastInertiaSpinMovement');
            }

            if (rotating) {
                tilt3D(controller, rotate.getMovement());
            }
        }

        if (controller.enableZoom) {
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
        }

        if (controller.enableLook) {
            if (controller._lookHandler.isMoving()) {
                look3D(controller, controller._lookHandler.getMovement());
            }
        }

        return true;
    }

    /**
     * @private
     */
    CameraMouseController.prototype.update = function(frameState) {
        var mode = frameState.mode;
        if (mode === SceneMode.SCENE2D) {
            update2D(this);
        } else if (mode === SceneMode.COLUMBUS_VIEW) {
            this._horizontalRotationAxis = Cartesian3.UNIT_Z;
            updateCV(this);
        } else if (mode === SceneMode.SCENE3D) {
            this._horizontalRotationAxis = undefined;
            update3D(this);
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof CameraMouseController
     *
     * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see CameraMouseController#destroy
     */
    CameraMouseController.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes mouse listeners held by this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof CameraMouseController
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see CameraMouseController#isDestroyed
     *
     * @example
     * controller = controller && controller.destroy();
     */
    CameraMouseController.prototype.destroy = function() {
        this._spinHandler = this._spinHandler && this._spinHandler.destroy();
        this._translateHandler = this._translateHandler && this._translateHandler.destroy();
        this._lookHandler = this._lookHandler && this._lookHandler.destroy();
        this._rotateHandler = this._rotateHandler && this._rotateHandler.destroy();
        this._zoomHandler = this._zoomHandler && this._zoomHandler.destroy();
        this._zoomWheel = this._zoomWheel && this._zoomWheel.destroy();
        return destroyObject(this);
    };

    return CameraMouseController;
});