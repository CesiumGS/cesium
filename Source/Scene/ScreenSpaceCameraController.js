/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Cartographic',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/FAR',
        '../Core/IntersectionTests',
        '../Core/isArray',
        '../Core/KeyboardEventModifier',
        '../Core/Math',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/Plane',
        '../Core/Quaternion',
        '../Core/Ray',
        '../Core/Transforms',
        './AnimationCollection',
        './CameraEventAggregator',
        './CameraEventType',
        './SceneMode'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartesian4,
        Cartographic,
        defaultValue,
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        Ellipsoid,
        FAR,
        IntersectionTests,
        isArray,
        KeyboardEventModifier,
        CesiumMath,
        Matrix3,
        Matrix4,
        Plane,
        Quaternion,
        Ray,
        Transforms,
        AnimationCollection,
        CameraEventAggregator,
        CameraEventType,
        SceneMode) {
    "use strict";

    /**
     * Modifies the camera position and orientation based on mouse input to a canvas.
     * @alias ScreenSpaceCameraController
     * @constructor
     *
     * @param {Canvas} canvas The canvas to listen for events.
     * @param {Camera} camera The camera.
     * @param {Globe|Ellipsoid} [globeOrEllipsoid=Ellipsoid.WGS84] The globe or ellipsoid to use to determine camera movement direction and speed.
     */
    var ScreenSpaceCameraController = function(canvas, camera, globeOrEllipsoid) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(canvas)) {
            throw new DeveloperError('canvas is required.');
        }
        if (!defined(camera)) {
            throw new DeveloperError('camera is required.');
        }
        //>>includeEnd('debug');

        /**
         * If true, inputs are allowed conditionally with the flags enableTranslate, enableZoom,
         * enableRotate, enableTilt, and enableLook.  If false, all inputs are disabled.
         *
         * NOTE: This setting is for temporary use cases, such as camera flights and
         * drag-selection of regions (see Picking demo).  It is typically set to false at the
         * start of such events, and set true on completion.  To keep inputs disabled
         * past the end of camera flights, you must use the other booleans (enableTranslate,
         * enableZoom, enableRotate, enableTilt, and enableLook).
         * @type {Boolean}
         * @default true
         */
        this.enableInputs = true;
        /**
         * If true, allows the user to pan around the map.  If false, the camera stays locked at the current position.
         * This flag only applies in 2D and Columbus view modes.
         * @type {Boolean}
         * @default true
         */
        this.enableTranslate = true;
        /**
         * If true, allows the user to zoom in and out.  If false, the camera is locked to the current distance from the ellipsoid.
         * @type {Boolean}
         * @default true
         */
        this.enableZoom = true;
        /**
         * If true, allows the user to rotate the camera.  If false, the camera is locked to the current heading.
         * This flag only applies in 2D and 3D.
         * @type {Boolean}
         * @default true
         */
        this.enableRotate = true;
        /**
         * If true, allows the user to tilt the camera.  If false, the camera is locked to the current heading.
         * This flag only applies in 3D and Columbus view.
         * @type {Boolean}
         * @default true
         */
        this.enableTilt = true;
        /**
         * If true, allows the user to use free-look. If false, the camera view direction can only be changed through translating
         * or rotating. This flag only applies in 3D and Columbus view modes.
         * @type {Boolean}
         * @default true
         */
        this.enableLook = true;
        /**
         * A parameter in the range <code>[0, 1)</code> used to determine how long
         * the camera will continue to spin because of inertia.
         * With value of zero, the camera will have no inertia.
         * @type {Number}
         * @default 0.9
         */
        this.inertiaSpin = 0.9;
        /**
         * A parameter in the range <code>[0, 1)</code> used to determine how long
         * the camera will continue to translate because of inertia.
         * With value of zero, the camera will have no inertia.
         * @type {Number}
         * @default 0.9
         */
        this.inertiaTranslate = 0.9;
        /**
         * A parameter in the range <code>[0, 1)</code> used to determine how long
         * the camera will continue to zoom because of inertia.
         * With value of zero, the camera will have no inertia.
         * @type {Number}
         * @default 0.8
         */
        this.inertiaZoom = 0.8;
        /**
         * A parameter in the range <code>[0, 1)</code> used to limit the range
         * of various user inputs to a percentage of the window width/height per animation frame.
         * This helps keep the camera under control in low-frame-rate situations.
         * @type {Number}
         * @default 0.1
         */
        this.maximumMovementRatio = 0.1;
        /**
         * Sets the duration, in milliseconds, of the bounce back animations in 2D and Columbus view. The default value is 3000.
         * @type {Number}
         * @default 3000.0
         */
        this.bounceAnimationTime = 3000.0;
        /**
         * The minimum magnitude, in meters, of the camera position when zooming. Defaults to 20.0.
         * @type {Number}
         * @default 20.0
         */
        this.minimumZoomDistance = 20.0;
        /**
         * The maximum magnitude, in meters, of the camera position when zooming. Defaults to positive infinity.
         * @type {Number}
         * @default {@link Number.POSITIVE_INFINITY}
         */
        this.maximumZoomDistance = Number.POSITIVE_INFINITY;
        /**
         * The input that allows the user to pan around the map. This only applies in 2D and Columbus view modes.
         * <p>
         * The type came be a {@link CameraEventType}, <code>undefined</code>, an object with <code>eventType</code>
         * and <code>modifier</code> properties with types <code>CameraEventType</code> and {@link KeyboardEventModifier},
         * or an array of any of the preceding.
         * </p>
         * @type {CameraEventType|Array|undefined}
         * @default {@link CameraEventType.LEFT_DRAG}
         */
        this.translateEventTypes = CameraEventType.LEFT_DRAG;
        /**
         * The input that allows the user to zoom in/out.
         * <p>
         * The type came be a {@link CameraEventType}, <code>undefined</code>, an object with <code>eventType</code>
         * and <code>modifier</code> properties with types <code>CameraEventType</code> and {@link KeyboardEventModifier},
         * or an array of any of the preceding.
         * </p>
         * @type {CameraEventType|Array|undefined}
         * @default [{@link CameraEventType.RIGHT_DRAG}, {@link CameraEventType.WHEEL}, {@link CameraEventType.PINCH}]
         */
        this.zoomEventTypes = [CameraEventType.RIGHT_DRAG, CameraEventType.WHEEL, CameraEventType.PINCH];
        /**
         * The input that allows the user to rotate around the globe or another object. This only applies in 3D and Columbus view modes.
         * <p>
         * The type came be a {@link CameraEventType}, <code>undefined</code>, an object with <code>eventType</code>
         * and <code>modifier</code> properties with types <code>CameraEventType</code> and {@link KeyboardEventModifier},
         * or an array of any of the preceding.
         * </p>
         * @type {CameraEventType|Array|undefined}
         * @default {@link CameraEventType.LEFT_DRAG}
         */
        this.rotateEventTypes = CameraEventType.LEFT_DRAG;
        /**
         * The input that allows the user to tilt in 3D and Columbus view or twist in 2D.
         * <p>
         * The type came be a {@link CameraEventType}, <code>undefined</code>, an object with <code>eventType</code>
         * and <code>modifier</code> properties with types <code>CameraEventType</code> and {@link KeyboardEventModifier},
         * or an array of any of the preceding.
         * </p>
         * @type {CameraEventType|Array|undefined}
         * @default [{@link CameraEventType.MIDDLE_DRAG}, {@link CameraEventType.PINCH}, {
         *     eventType : {@link CameraEventType.LEFT_DRAG},
         *     modifier : {@link KeyboardEventModifier.CTRL}
         * }]
         */
        this.tiltEventTypes = [CameraEventType.MIDDLE_DRAG, CameraEventType.PINCH, {
            eventType : CameraEventType.LEFT_DRAG,
            modifier : KeyboardEventModifier.CTRL
        }];
        /**
         * The input that allows the user to change the direction the camera is viewing. This only applies in 3D and Columbus view modes.
         * <p>
         * The type came be a {@link CameraEventType}, <code>undefined</code>, an object with <code>eventType</code>
         * and <code>modifier</code> properties with types <code>CameraEventType</code> and {@link KeyboardEventModifier},
         * or an array of any of the preceding.
         * </p>
         * @type {CameraEventType|Array|undefined}
         * @default { eventType : {@link CameraEventType.LEFT_DRAG}, modifier : {@link KeyboardEventModifier.SHIFT} }
         */
        this.lookEventTypes = {
            eventType : CameraEventType.LEFT_DRAG,
            modifier : KeyboardEventModifier.SHIFT
        };
        /**
         * The minimum height the camera must be before testing for intersection with the terrain instead of the ellipsoid.
         * @type {Number}
         * @default 150000.0
         */
        this.minimumTerrainHeight = 150000.0;

        this._camera = camera;
        this._canvas = canvas;

        var globe;
        var ellipsoid;

        globeOrEllipsoid = defaultValue(globeOrEllipsoid, Ellipsoid.WGS84);
        if (defined(globeOrEllipsoid.ellipsoid)) {
            globe = globeOrEllipsoid;
            ellipsoid = globe.ellipsoid;
        } else {
            ellipsoid = globeOrEllipsoid;
        }

        this._globe = globe;
        this._ellipsoid = ellipsoid;

        this._aggregator = new CameraEventAggregator(this._canvas);

        this._lastInertiaSpinMovement = undefined;
        this._lastInertiaZoomMovement = undefined;
        this._lastInertiaTranslateMovement = undefined;
        this._lastInertiaWheelZoomMovement = undefined;
        this._lastInertiaTiltMovement = undefined;

        this._animationCollection = new AnimationCollection();
        this._animation = undefined;

        this._horizontalRotationAxis = undefined;

        this._tiltCenterMousePosition = new Cartesian2();
        this._tiltCenter = new Cartesian3();

        // Constants, Make any of these public?
        var radius = this._ellipsoid.maximumRadius;
        this._zoomFactor = 5.0;
        this._rotateFactor = 1.0 / radius;
        this._rotateRateRangeAdjustment = radius;
        this._maximumRotateRate = 1.77;
        this._minimumRotateRate = 1.0 / 5000.0;
        this._translateFactor = 1.0;
        this._minimumZoomRate = 20.0;
        this._maximumZoomRate = FAR;
    };

    defineProperties(ScreenSpaceCameraController.prototype, {
        /**
         * Gets and sets the globe. The globe is used to determine the size of the map in 2D and Columbus view
         * as well as how fast to rotate the camera based on the distance to its surface.
         * @memberof ScreenSpaceCameraController.prototype
         * @type {Globe|Ellipsoid}
         */
        globe : {
            get : function() {
                if (defined(this._globe)) {
                    return this._globe;
                }

                return this._ellipsoid;
            },
            set : function(globe) {
                //>>includeStart('debug', pragmas.debug);
                if (!defined(globe)) {
                    throw new DeveloperError('globe is required');
                }
                //>>includeEnd('debug');

                var ellipsoid = globe.ellipsoid;
                if (!defined(ellipsoid)) {
                    ellipsoid = globe;
                    globe = undefined;
                }

                this._globe = globe;
                this._ellipsoid = ellipsoid;

                var radius = ellipsoid.maximumRadius;
                this._rotateFactor = 1.0 / radius;
                this._rotateRateRangeAdjustment = radius;
            }
        }
    });

    function decay(time, coefficient) {
        if (time < 0) {
            return 0.0;
        }

        var tau = (1.0 - coefficient) * 25.0;
        return Math.exp(-tau * time);
    }

    function sameMousePosition(movement) {
        return Cartesian2.equalsEpsilon(movement.startPosition, movement.endPosition, CesiumMath.EPSILON14);
    }

    // If the time between mouse down and mouse up is not between
    // these thresholds, the camera will not move with inertia.
    // This value is probably dependent on the browser and/or the
    // hardware. Should be investigated further.
    var inertiaMaxClickTimeThreshold = 0.4;

    function maintainInertia(aggregator, frameState, type, modifier, decayCoef, action, object, lastMovementName) {
        var movementState = object[lastMovementName];
        if (!defined(movementState)) {
            movementState = object[lastMovementName] = {
                startPosition : new Cartesian2(),
                endPosition : new Cartesian2(),
                motion : new Cartesian2(),
                active : false
            };
        }

        var ts = aggregator.getButtonPressTime(type, modifier);
        var tr = aggregator.getButtonReleaseTime(type, modifier);

        var threshold = ts && tr && ((tr.getTime() - ts.getTime()) / 1000.0);
        var now = new Date();
        var fromNow = tr && ((now.getTime() - tr.getTime()) / 1000.0);

        if (ts && tr && threshold < inertiaMaxClickTimeThreshold) {
            var d = decay(fromNow, decayCoef);

            if (!movementState.active) {
                var lastMovement = aggregator.getLastMovement(type, modifier);
                if (!defined(lastMovement) || sameMousePosition(lastMovement)) {
                    return;
                }

                movementState.motion.x = (lastMovement.endPosition.x - lastMovement.startPosition.x) * 0.5;
                movementState.motion.y = (lastMovement.endPosition.y - lastMovement.startPosition.y) * 0.5;

                Cartesian2.clone(lastMovement.startPosition, movementState.startPosition);

                Cartesian2.multiplyByScalar(movementState.motion, d, movementState.endPosition);
                Cartesian2.add(movementState.startPosition, movementState.endPosition, movementState.endPosition);

                movementState.active = true;
            } else {
                Cartesian2.clone(movementState.endPosition, movementState.startPosition);

                Cartesian2.multiplyByScalar(movementState.motion, d, movementState.endPosition);
                Cartesian2.add(movementState.startPosition, movementState.endPosition, movementState.endPosition);

                Cartesian3.clone(Cartesian2.ZERO, movementState.motion);
            }

            // If value from the decreasing exponential function is close to zero,
            // the end coordinates may be NaN.
            if (isNaN(movementState.endPosition.x) || isNaN(movementState.endPosition.y) || sameMousePosition(movementState)) {
                movementState.active = false;
                return;
            }

            if (!aggregator.isButtonDown(type, modifier)) {
                var startPosition = aggregator.getStartMousePosition(type, modifier);
                action(object, startPosition, movementState, frameState);
            }
        } else {
            movementState.active = false;
        }
    }

    var scratchEventTypeArray = [];

    function reactToInput(controller, frameState, enabled, eventTypes, action, inertiaConstant, inertiaStateName) {
        if (!defined(eventTypes)) {
            return;
        }

        var aggregator = controller._aggregator;

        if (!isArray(eventTypes)) {
            scratchEventTypeArray[0] = eventTypes;
            eventTypes = scratchEventTypeArray;
        }

        var length = eventTypes.length;
        for (var i = 0; i < length; ++i) {
            var eventType = eventTypes[i];
            var type = defined(eventType.eventType) ? eventType.eventType : eventType;
            var modifier = eventType.modifier;

            var movement = aggregator.isMoving(type, modifier) && aggregator.getMovement(type, modifier);
            var startPosition = aggregator.getStartMousePosition(type, modifier);

            if (controller.enableInputs && enabled) {
                if (movement) {
                    action(controller, startPosition, movement, frameState);
                } else if (inertiaConstant < 1.0) {
                    maintainInertia(aggregator, frameState, type, modifier, inertiaConstant, action, controller, inertiaStateName);
                }
            }
        }
    }

    var adjustForTerrainRay = new Ray();
    var adjustForTerrainCartesian3 = new Cartesian3();

    function adjustForTerrain(controller, frameState, distance, direction) {
        if (!defined(controller._globe)) {
            return distance;
        }

        var camera = controller._camera;

        var ray = adjustForTerrainRay;
        Cartesian3.clone(camera.position, ray.origin);
        if (distance < 0.0) {
            Cartesian3.negate(direction, ray.direction);
        } else {
            Cartesian3.clone(direction, ray.direction);
        }

        var intersection = controller._globe.intersect(ray, frameState, adjustForTerrainCartesian3);
        if (!defined(intersection)) {
            return distance;
        }

        var dist = Cartesian3.distance(ray.origin, intersection) - controller.minimumZoomDistance;
        if (dist <= 0.0 || distance === 0.0) {
            return 0.0;
        }

        var ratio = CesiumMath.clamp(dist / Math.abs(distance), 0.0, 1.0);
        return distance * ratio;
    }

    function adjustRotateForTerrain(controller, frameState, center, radius, axis, angle, globeOverride) {
        var globe = defaultValue(globeOverride, controller._globe);
        if (!defined(globe)) {
            return angle;
        }

        var camera = controller._camera;

        var numRays = Math.min(Math.ceil(radius * Math.abs(angle) / 1000.0), 1.0);
        var rotation = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(axis, angle / numRays));
        var start = Cartesian3.subtract(camera.position, center);

        var rays = [];
        for (var i = 0; i < numRays; ++i) {
            var stop = Matrix3.multiplyByVector(rotation, start);
            var direction = Cartesian3.subtract(stop, start);
            var origin = Cartesian3.add(center, start);
            rays.push(new Ray(origin, direction));
            start = stop;
        }

        var intersection = globe.intersect(rays, frameState, adjustForTerrainCartesian3);
        if (!defined(intersection)) {
            return angle;
        }

        var startDirection = Cartesian3.normalize(Cartesian3.subtract(camera.position, center));
        var endDirection = Cartesian3.normalize(Cartesian3.subtract(intersection, center));
        var newAngle = Math.acos(Cartesian3.dot(startDirection, endDirection));
        return CesiumMath.sign(angle) * CesiumMath.clamp(newAngle - controller.minimumZoomDistance / radius, 0.0, Math.abs(angle));
    }

    function handleZoom(object, startPosition, movement, frameState, zoomFactor, distanceMeasure, unitPositionDotDirection) {
        var percentage = 1.0;
        if (defined(unitPositionDotDirection)) {
            percentage = CesiumMath.clamp(Math.abs(unitPositionDotDirection), 0.25, 1.0);
        }

        // distanceMeasure should be the height above the ellipsoid.
        // The zoomRate slows as it approaches the surface and stops minimumZoomDistance above it.
        var minHeight = object.minimumZoomDistance * percentage;
        var maxHeight = object.maximumZoomDistance;

        var minDistance = distanceMeasure - minHeight;
        var zoomRate = zoomFactor * minDistance;
        zoomRate = CesiumMath.clamp(zoomRate, object._minimumZoomRate, object._maximumZoomRate);

        var diff = movement.endPosition.y - movement.startPosition.y;
        var rangeWindowRatio = diff / object._canvas.clientHeight;
        rangeWindowRatio = Math.min(rangeWindowRatio, object.maximumMovementRatio);
        var distance = zoomRate * rangeWindowRatio;

        if (distance > 0.0 && Math.abs(distanceMeasure - minHeight) < 1.0) {
            return;
        }

        if (distance < 0.0 && Math.abs(distanceMeasure - maxHeight) < 1.0) {
            return;
        }

        if (distanceMeasure - distance < minHeight) {
            distance = distanceMeasure - minHeight - 1.0;
        } else if (distanceMeasure - distance > maxHeight) {
            distance = distanceMeasure - maxHeight;
        }

        distance = adjustForTerrain(object, frameState, distance, object._camera.direction);
        object._camera.zoomIn(distance);
    }

    var translate2DStart = new Ray();
    var translate2DEnd = new Ray();
    var scratchTranslateP0 = new Cartesian3();
    var scratchTranslateP1 = new Cartesian3();

    function translate2D(controller, startPosition, movement, frameState) {
        var camera = controller._camera;
        var start = camera.getPickRay(movement.startPosition, translate2DStart).origin;
        var end = camera.getPickRay(movement.endPosition, translate2DEnd).origin;

        var position = camera.position;
        var p0 = Cartesian3.subtract(start, position, scratchTranslateP0);
        var p1 = Cartesian3.subtract(end, position, scratchTranslateP1);
        var direction = Cartesian3.subtract(p0, p1, scratchTranslateP0);
        var distance = Cartesian3.magnitude(direction);

        if (distance > 0.0) {
            Cartesian3.normalize(direction, direction);
            camera.move(direction, distance);
        }
    }

    function zoom2D(controller, startPosition, movement, frameState) {
        if (defined(movement.distance)) {
            movement = movement.distance;
        }

        handleZoom(controller, startPosition, movement, frameState, controller._zoomFactor, controller._camera.getMagnitude());
    }

    var twist2DStart = new Cartesian2();
    var twist2DEnd = new Cartesian2();
    function twist2D(controller, startPosition, movement, frameState) {
        if (defined(movement.angleAndHeight)) {
            singleAxisTwist2D(controller, startPosition, movement.angleAndHeight, frameState);
            return;
        }

        var width = controller._canvas.clientWidth;
        var height = controller._canvas.clientHeight;

        var start = twist2DStart;
        start.x = (2.0 / width) * movement.startPosition.x - 1.0;
        start.y = (2.0 / height) * (height - movement.startPosition.y) - 1.0;
        Cartesian2.normalize(start, start);

        var end = twist2DEnd;
        end.x = (2.0 / width) * movement.endPosition.x - 1.0;
        end.y = (2.0 / height) * (height - movement.endPosition.y) - 1.0;
        Cartesian2.normalize(end, end);

        var startTheta = Math.acos(start.x);
        if (start.y < 0) {
            startTheta = CesiumMath.TWO_PI - startTheta;
        }
        var endTheta = Math.acos(end.x);
        if (end.y < 0) {
            endTheta = CesiumMath.TWO_PI - endTheta;
        }
        var theta = endTheta - startTheta;

        controller._camera.twistRight(theta);
    }

    function singleAxisTwist2D(controller, startPosition, movement, frameState) {
        var rotateRate = controller._rotateFactor * controller._rotateRateRangeAdjustment;

        if (rotateRate > controller._maximumRotateRate) {
            rotateRate = controller._maximumRotateRate;
        }

        if (rotateRate < controller._minimumRotateRate) {
            rotateRate = controller._minimumRotateRate;
        }

        var phiWindowRatio = (movement.endPosition.x - movement.startPosition.x) / controller._canvas.clientWidth;
        phiWindowRatio = Math.min(phiWindowRatio, controller.maximumMovementRatio);

        var deltaPhi = rotateRate * phiWindowRatio * Math.PI * 4.0;

        controller._camera.twistRight(deltaPhi);
    }

    function update2D(controller, frameState) {
        if (controller._aggregator.anyButtonDown()) {
            controller._animationCollection.removeAll();
        }

        if (!Matrix4.equals(Matrix4.IDENTITY, controller._camera.transform)) {
            reactToInput(controller, frameState, controller.enableRotate, controller.translateEventTypes, twist2D, controller.inertiaSpin, '_lastInertiaSpinMovement');
            reactToInput(controller, frameState, controller.enableZoom, controller.zoomEventTypes, zoom3D, controller.inertiaZoom, '_lastInertiaZoomMovement');
        } else {
            reactToInput(controller, frameState, controller.enableTranslate, controller.translateEventTypes, translate2D, controller.inertiaTranslate, '_lastInertiaTranslateMovement');
            reactToInput(controller, frameState, controller.enableZoom, controller.zoomEventTypes, zoom2D, controller.inertiaZoom, '_lastInertiaZoomMovement');
            reactToInput(controller, frameState, controller.enableRotate, controller.tiltEventTypes, twist2D, controller.inertiaSpin, '_lastInertiaTiltMovement');
        }

        if (!controller._aggregator.anyButtonDown() &&
                (!defined(controller._lastInertiaZoomMovement) || !controller._lastInertiaZoomMovement.active) &&
                (!defined(controller._lastInertiaTranslateMovement) || !controller._lastInertiaTranslateMovement.active) &&
                !controller._animationCollection.contains(controller._animation)) {
            var animation = controller._camera.createCorrectPositionAnimation(controller.bounceAnimationTime);
            if (defined(animation)) {
                controller._animation = controller._animationCollection.add(animation);
            }
        }

        controller._animationCollection.update();
    }

    var translateCVStartRay = new Ray();
    var translateCVEndRay = new Ray();
    var translateCVStartPos = new Cartesian3();
    var translateCVEndPos = new Cartesian3();
    var translatCVDifference = new Cartesian3();
    var translateCVOrigin = new Cartesian3();
    var translateCVPlane = new Plane(Cartesian3.ZERO, 0.0);

    function translateCV(controller, startPosition, movement, frameState) {
        var camera = controller._camera;
        var startRay = camera.getPickRay(movement.startPosition, translateCVStartRay);
        var endRay = camera.getPickRay(movement.endPosition, translateCVEndRay);

        var origin = Cartesian3.clone(Cartesian3.ZERO, translateCVOrigin);
        var normal = Cartesian3.UNIT_X;

        var startPlanePos;

        if (defined(controller._globe) && controller._camera.position.z < controller.minimumTerrainHeight) {
            startPlanePos = controller._globe.pickRenderedSurface(startRay, frameState, translateCVStartPos);
            if (defined(startPlanePos)) {
                origin.x = startPlanePos.x;
            }
        }

        if (!defined(startPlanePos)) {
            var position = startRay.origin;
            var direction = startRay.direction;

            var scalar = -Cartesian3.dot(normal, position) / Cartesian3.dot(normal, direction);
            startPlanePos = Cartesian3.multiplyByScalar(direction, scalar, translateCVStartPos);
            Cartesian3.add(position, startPlanePos, startPlanePos);
        }

        var plane = Plane.fromPointNormal(origin, normal, translateCVPlane);
        var endPlanePos = IntersectionTests.rayPlane(endRay, plane, translateCVEndPos);

        if (!defined(startPlanePos) || !defined(endPlanePos)) {
            return;
        }

        var diff = Cartesian3.subtract(startPlanePos, endPlanePos, translatCVDifference);
        var temp = diff.x;
        diff.x = diff.y;
        diff.y = diff.z;
        diff.z = temp;
        var mag = Cartesian3.magnitude(diff);
        if (mag > CesiumMath.EPSILON6) {
            Cartesian3.normalize(diff, diff);
            camera.move(diff, mag);
        }
    }

    var rotateCVWindowPos = new Cartesian2();
    var rotateCVWindowRay = new Ray();
    var rotateCVCenter = new Cartesian3();
    var rotateCVVerticalCenter = new Cartesian3();
    var rotateCVTransform = new Matrix4();
    var rotateCVVerticalTransform = new Matrix4();
    var rotateCVOrigin = new Cartesian3();
    var rotateCVPlane = new Plane(Cartesian3.ZERO, 0.0);
    var rotateCVCartesian3 = new Cartesian3();
    var rotateCVCart = new Cartographic();

    function rotateCV(controller, startPosition, movement, frameState) {
        if (defined(movement.angleAndHeight)) {
            movement = movement.angleAndHeight;
        }

        var ellipsoid = controller._ellipsoid;
        var camera = controller._camera;

        var center;
        var ray;
        var intersection;

        if (Cartesian2.equals(startPosition, controller._tiltCenterMousePosition)) {
            center = Cartesian3.clone(controller._tiltCenter, rotateCVCenter);
        } else {
            ray = camera.getPickRay(startPosition, rotateCVWindowRay);
            if (defined(controller._globe)) {
                center = controller._globe.pickRenderedSurface(ray, frameState, rotateCVCenter);
            }

            if (!defined(center)) {
                intersection = IntersectionTests.rayEllipsoid(ray, ellipsoid);
                if (!defined(intersection)) {
                    return;
                }
                center = Ray.getPoint(ray, intersection.start, rotateCVCenter);
            }

            Cartesian2.clone(startPosition, controller._tiltCenterMousePosition);
            Cartesian3.clone(center, controller._tiltCenter);
        }

        var normal = Cartesian3.UNIT_X;

        if (!defined(center)) {
            var position = ray.origin;
            var direction = ray.direction;
            var scalar = -Cartesian3.dot(normal, position) / Cartesian3.dot(normal, direction);
            center = Cartesian3.multiplyByScalar(direction, scalar, rotateCVCenter);
            Cartesian3.add(position, center, center);
        }

        var windowPosition = rotateCVWindowPos;
        windowPosition.x = controller._canvas.clientWidth / 2;
        windowPosition.y = controller._tiltCenterMousePosition.y;
        ray = camera.getPickRay(windowPosition, rotateCVWindowRay);

        var origin = Cartesian3.clone(Cartesian3.ZERO, rotateCVOrigin);
        origin.x = center.x;

        var plane = Plane.fromPointNormal(origin, normal, rotateCVPlane);
        var verticalCenter = IntersectionTests.rayPlane(ray, plane, rotateCVVerticalCenter);

        var projection = controller._camera._projection;
        ellipsoid = projection.ellipsoid;

        Cartesian3.fromElements(center.y, center.z, center.x, center);
        var cart = projection.unproject(center, rotateCVCart);
        ellipsoid.cartographicToCartesian(cart, center);

        var transform = Transforms.eastNorthUpToFixedFrame(center, ellipsoid, rotateCVTransform);

        Cartesian3.fromElements(verticalCenter.y, verticalCenter.z, verticalCenter.x, verticalCenter);
        cart = projection.unproject(verticalCenter, rotateCVCart);
        ellipsoid.cartographicToCartesian(cart, verticalCenter);

        var verticalTransform = Transforms.eastNorthUpToFixedFrame(verticalCenter, ellipsoid, rotateCVVerticalTransform);

        var oldGlobe = controller.globe;
        controller.globe = Ellipsoid.UNIT_SPHERE;

        var constrainedAxis = Cartesian3.UNIT_Z;
        rotate3D(controller, startPosition, movement, frameState, transform, constrainedAxis, undefined, false, true);

        var tangent = Cartesian3.cross(Cartesian3.UNIT_Z, Cartesian3.normalize(camera.position, rotateCVCartesian3), rotateCVCartesian3);
        if (Cartesian3.dot(camera.right, tangent) < 0.0) {

            if (movement.startPosition.y > movement.endPosition.y) {
                constrainedAxis = undefined;
            }

            var oldConstrainedAxis = camera.constrainedAxis;
            camera.constrainedAxis = undefined;

            rotate3D(controller, startPosition, movement, frameState, verticalTransform, constrainedAxis, undefined, true, false);

            camera.constrainedAxis = oldConstrainedAxis;
        } else {
            rotate3D(controller, startPosition, movement, frameState, verticalTransform, constrainedAxis, undefined, true, false);
        }

        controller.globe = oldGlobe;
    }

    var zoomCVWindowPos = new Cartesian2();
    var zoomCVWindowRay = new Ray();
    function zoomCV(controller, startPosition, movement, frameState) {
        if (defined(movement.distance)) {
            movement = movement.distance;
        }

        var windowPosition = zoomCVWindowPos;
        windowPosition.x = controller._canvas.clientWidth / 2;
        windowPosition.y = controller._canvas.clientHeight / 2;
        var ray = controller._camera.getPickRay(windowPosition, zoomCVWindowRay);
        var normal = Cartesian3.UNIT_X;

        var position = ray.origin;
        var direction = ray.direction;
        var scalar = -Cartesian3.dot(normal, position) / Cartesian3.dot(normal, direction);

        handleZoom(controller, startPosition, movement, frameState, controller._zoomFactor, scalar);
    }

    function updateCV(controller, frameState) {
        if (!Matrix4.equals(Matrix4.IDENTITY, controller._camera.transform)) {
                reactToInput(controller, frameState, controller.enableRotate, controller.rotateEventTypes, rotate3D, controller.inertiaSpin, '_lastInertiaSpinMovement');
                reactToInput(controller, frameState, controller.enableZoom, controller.zoomEventTypes, zoom3D, controller.inertiaZoom, '_lastInertiaZoomMovement');
        } else {
            if (controller._aggregator.anyButtonDown()) {
                controller._animationCollection.removeAll();
            }

            reactToInput(controller, frameState, controller.enableTilt, controller.tiltEventTypes, rotateCV, controller.inertiaSpin, '_lastInertiaTiltMovement');
            reactToInput(controller, frameState, controller.enableTranslate, controller.translateEventTypes, translateCV, controller.inertiaTranslate, '_lastInertiaTranslateMovement');
            reactToInput(controller, frameState, controller.enableZoom, controller.zoomEventTypes, zoomCV, controller.inertiaZoom, '_lastInertiaZoomMovement');
            reactToInput(controller, frameState, controller.enableLook, controller.lookEventTypes, look3D);

            if (!controller._aggregator.anyButtonDown() && (!defined(controller._lastInertiaZoomMovement) || !controller._lastInertiaZoomMovement.active) &&
                    (!defined(controller._lastInertiaTranslateMovement) || !controller._lastInertiaTranslateMovement.active) &&
                    !controller._animationCollection.contains(controller._animation)) {
                var animation = controller._camera.createCorrectPositionAnimation(controller.bounceAnimationTime);
                if (defined(animation)) {
                    controller._animation = controller._animationCollection.add(animation);
                }
            }

            controller._animationCollection.update();
        }
    }

    var spin3DPick = new Cartesian3();
    var scratchStartRay = new Ray();
    var scratchCartographic = new Cartographic();
    var scratchMousePos = new Cartesian3();
    var scratchRadii = new Cartesian3();
    var scratchEllipsoid = new Ellipsoid();

    function spin3D(controller, startPosition, movement, frameState) {
        if (defined(controller._camera.pickEllipsoid(movement.startPosition, controller._ellipsoid, spin3DPick))) {
            var height = controller._ellipsoid.cartesianToCartographic(controller._camera.positionWC, scratchCartographic).height;
            if (defined(controller._globe) && height < controller.minimumTerrainHeight) {
                var startRay = controller._camera.getPickRay(movement.startPosition, scratchStartRay);
                var mousePos = controller._globe.pickRenderedSurface(startRay, frameState, scratchMousePos);
                if (!defined(mousePos)) {
                    pan3D(controller, startPosition, movement, frameState, controller._ellipsoid);
                } else {
                    var magnitude = Cartesian3.magnitude(mousePos);
                    var radii = scratchRadii;
                    radii.x = radii.y = radii.z = magnitude;
                    var ellipsoid = Ellipsoid.fromCartesian3(radii, scratchEllipsoid);
                    pan3D(controller, startPosition, movement, frameState, ellipsoid);
                }
            } else {
                pan3D(controller, startPosition, movement, frameState, controller._ellipsoid);
            }
        } else {
            rotate3D(controller, startPosition, movement, frameState);
        }
    }

    var rotate3DRestrictedDirection = Cartesian3.clone(Cartesian3.ZERO);
    var rotate3DScratchCartesian3 = new Cartesian3();
    var rotate3DNegateScratch = new Cartesian3();
    var rotate3DInverseMatrixScratch = new Matrix4();

    function rotate3D(controller, startPosition, movement, frameState, transform, constrainedAxis, restrictedAngle, rotateOnlyVertical, rotateOnlyHorizontal, globeOverride) {
        rotateOnlyVertical = defaultValue(rotateOnlyVertical, false);
        rotateOnlyHorizontal = defaultValue(rotateOnlyHorizontal, false);

        var camera = controller._camera;
        var oldAxis = camera.constrainedAxis;
        if (defined(constrainedAxis)) {
            camera.constrainedAxis = constrainedAxis;
        }

        var rho = Cartesian3.magnitude(camera.position);
        var rotateRate = controller._rotateFactor * (rho - controller._rotateRateRangeAdjustment);

        if (rotateRate > controller._maximumRotateRate) {
            rotateRate = controller._maximumRotateRate;
        }

        if (rotateRate < controller._minimumRotateRate) {
            rotateRate = controller._minimumRotateRate;
        }

        var phiWindowRatio = (movement.startPosition.x - movement.endPosition.x) / controller._canvas.clientWidth;
        var thetaWindowRatio = (movement.startPosition.y - movement.endPosition.y) / controller._canvas.clientHeight;
        phiWindowRatio = Math.min(phiWindowRatio, controller.maximumMovementRatio);
        thetaWindowRatio = Math.min(thetaWindowRatio, controller.maximumMovementRatio);

        var deltaPhi = rotateRate * phiWindowRatio * Math.PI * 2.0;
        var deltaTheta = rotateRate * thetaWindowRatio * Math.PI;

        var center = !defined(transform) ? Cartesian3.ZERO : Matrix4.getColumn(transform, 3);
        var radius = Cartesian3.distance(camera.position, center);

        if (!rotateOnlyVertical) {
            deltaPhi = adjustRotateForTerrain(controller, frameState, center, radius, camera.up, deltaPhi, globeOverride);
            camera.rotateRight(deltaPhi, transform);
        }

        if (!rotateOnlyHorizontal) {
            deltaTheta = adjustRotateForTerrain(controller, frameState, center, radius, camera.right, deltaTheta, globeOverride);
            camera.rotateUp(deltaTheta, transform);
        }

        if (defined(restrictedAngle)) {
            var direction = Cartesian3.clone(camera.directionWC, rotate3DRestrictedDirection);
            var invTransform = Matrix4.inverseTransformation(transform, rotate3DInverseMatrixScratch);
            direction = Matrix4.multiplyByPointAsVector(invTransform, direction, direction);

            var dot = -Cartesian3.dot(direction, constrainedAxis);
            var angle = Math.acos(dot);
            if (angle > restrictedAngle) {
                angle -= restrictedAngle;
                camera.rotateUp(-angle, transform);
            }
        }

        camera.constrainedAxis = oldAxis;
    }

    var pan3DP0 = Cartesian4.clone(Cartesian4.UNIT_W);
    var pan3DP1 = Cartesian4.clone(Cartesian4.UNIT_W);
    var pan3DTemp0 = new Cartesian3();
    var pan3DTemp1 = new Cartesian3();
    var pan3DTemp2 = new Cartesian3();
    var pan3DTemp3 = new Cartesian3();

    function pan3D(controller, startPosition, movement, frameState, ellipsoid) {
        var camera = controller._camera;
        var p0 = camera.pickEllipsoid(movement.startPosition, ellipsoid, pan3DP0);
        var p1 = camera.pickEllipsoid(movement.endPosition, ellipsoid, pan3DP1);

        if (!defined(p0) || !defined(p1)) {
            return;
        }

        p0 = camera.worldToCameraCoordinates(p0, p0);
        p1 = camera.worldToCameraCoordinates(p1, p1);

        var cameraPosMag = Cartesian3.magnitude(camera.position);

        if (!defined(camera.constrainedAxis)) {
            Cartesian3.normalize(p0, p0);
            Cartesian3.normalize(p1, p1);
            var dot = Cartesian3.dot(p0, p1);
            var axis = Cartesian3.cross(p0, p1, pan3DTemp0);

            if (dot < 1.0 && !Cartesian3.equalsEpsilon(axis, Cartesian3.ZERO, CesiumMath.EPSILON14)) { // dot is in [0, 1]
                var angle = Math.acos(dot);
                angle = adjustRotateForTerrain(controller, frameState, Cartesian3.ZERO, cameraPosMag, axis, angle);
                camera.rotate(axis, angle);
            }
        } else {
            var basis0 = camera.constrainedAxis;
            var basis1 = Cartesian3.mostOrthogonalAxis(basis0, pan3DTemp0);
            Cartesian3.cross(basis1, basis0, basis1);
            Cartesian3.normalize(basis1, basis1);
            var basis2 = Cartesian3.cross(basis0, basis1, pan3DTemp1);

            var startRho = Cartesian3.magnitude(p0);
            var startDot = Cartesian3.dot(basis0, p0);
            var startTheta = Math.acos(startDot / startRho);
            var startRej = Cartesian3.multiplyByScalar(basis0, startDot, pan3DTemp2);
            Cartesian3.subtract(p0, startRej, startRej);
            Cartesian3.normalize(startRej, startRej);

            var endRho = Cartesian3.magnitude(p1);
            var endDot = Cartesian3.dot(basis0, p1);
            var endTheta = Math.acos(endDot / endRho);
            var endRej = Cartesian3.multiplyByScalar(basis0, endDot, pan3DTemp3);
            Cartesian3.subtract(p1, endRej, endRej);
            Cartesian3.normalize(endRej, endRej);

            var startPhi = Math.acos(Cartesian3.dot(startRej, basis1));
            if (Cartesian3.dot(startRej, basis2) < 0) {
                startPhi = CesiumMath.TWO_PI - startPhi;
            }

            var endPhi = Math.acos(Cartesian3.dot(endRej, basis1));
            if (Cartesian3.dot(endRej, basis2) < 0) {
                endPhi = CesiumMath.TWO_PI - endPhi;
            }

            var deltaPhi = startPhi - endPhi;

            var east;
            if (Cartesian3.equalsEpsilon(basis0, camera.position, CesiumMath.EPSILON2)) {
                east = camera.right;
            } else {
                east = Cartesian3.cross(basis0, camera.position, pan3DTemp0);
            }

            var planeNormal = Cartesian3.cross(basis0, east, pan3DTemp0);
            var side0 = Cartesian3.dot(planeNormal, Cartesian3.subtract(p0, basis0, pan3DTemp1));
            var side1 = Cartesian3.dot(planeNormal, Cartesian3.subtract(p1, basis0, pan3DTemp1));

            var deltaTheta;
            if (side0 > 0 && side1 > 0) {
                deltaTheta = endTheta - startTheta;
            } else if (side0 > 0 && side1 <= 0) {
                if (Cartesian3.dot(camera.position, basis0) > 0) {
                    deltaTheta = -startTheta - endTheta;
                } else {
                    deltaTheta = startTheta + endTheta;
                }
            } else {
                deltaTheta = startTheta - endTheta;
            }

            deltaPhi = adjustRotateForTerrain(controller, frameState, Cartesian3.ZERO, cameraPosMag, camera.up, deltaPhi);
            camera.rotateRight(deltaPhi);

            deltaTheta = adjustRotateForTerrain(controller, frameState, Cartesian3.ZERO, cameraPosMag, camera.right, deltaTheta);
            camera.rotateUp(deltaTheta);
        }
    }

    var zoom3DUnitPosition = new Cartesian3();
    function zoom3D(controller, startPosition, movement, frameState) {
        if (defined(movement.distance)) {
            movement = movement.distance;
        }

        var camera = controller._camera;
        var ellipsoid = controller._ellipsoid;

        var height = ellipsoid.cartesianToCartographic(camera.position).height;
        var unitPosition = Cartesian3.normalize(camera.position, zoom3DUnitPosition);

        handleZoom(controller, startPosition, movement, frameState, controller._zoomFactor, height, Cartesian3.dot(unitPosition, camera.direction));
    }

    var tilt3DWindowPos = new Cartesian2();
    var tilt3DRay = new Ray();
    var tilt3DCenter = new Cartesian3();
    var tilt3DVerticalCenter = new Cartesian3();
    var tilt3DTransform = new Matrix4();
    var tilt3DVerticalTransform = new Matrix4();
    var tilt3DNormal = new Cartesian3();
    var tilt3DCartesian3 = new Cartesian3();

    function tilt3D(controller, startPosition, movement, frameState) {
        if (defined(movement.angleAndHeight)) {
            movement = movement.angleAndHeight;
        }

        var camera = controller._camera;

        var ellipsoid = controller._ellipsoid;
        var minHeight = controller.minimumZoomDistance * 0.25;
        var height = ellipsoid.cartesianToCartographic(camera.positionWC).height;
        if (height - minHeight - 1.0 < CesiumMath.EPSILON3 &&
                movement.endPosition.y - movement.startPosition.y < 0) {
            return;
        }

        var center;
        var ray;
        var intersection;

        if (Cartesian2.equals(startPosition, controller._tiltCenterMousePosition)) {
            center = Cartesian3.clone(controller._tiltCenter, tilt3DCenter);
        } else {
            ray = camera.getPickRay(startPosition, tilt3DRay);
            if (defined(controller._globe)) {
                center = controller._globe.pickRenderedSurface(ray, frameState, tilt3DCenter);
            }

            if (!defined(center)) {
                intersection = IntersectionTests.rayEllipsoid(ray, ellipsoid);
                if (!defined(intersection)) {
                    return;
                }
                center = Ray.getPoint(ray, intersection.start, tilt3DCenter);
            }

            Cartesian2.clone(startPosition, controller._tiltCenterMousePosition);
            Cartesian3.clone(center, controller._tiltCenter);
        }

        var verticalCenter;

        var windowPosition = tilt3DWindowPos;
        windowPosition.x = controller._canvas.clientWidth / 2;
        windowPosition.y = controller._tiltCenterMousePosition.y;
        ray = camera.getPickRay(windowPosition, tilt3DRay);

        var mag = Cartesian3.magnitude(center);
        var radii = Cartesian3.fromElements(mag, mag, mag, scratchRadii);
        var newEllipsoid = Ellipsoid.fromCartesian3(radii, scratchEllipsoid);

        intersection = IntersectionTests.rayEllipsoid(ray, newEllipsoid);
        if (!defined(intersection)) {
            return;
        }
        verticalCenter = Ray.getPoint(ray, intersection.start, tilt3DVerticalCenter);

        var transform = Transforms.eastNorthUpToFixedFrame(center, ellipsoid, tilt3DTransform);
        var verticalTransform = Transforms.eastNorthUpToFixedFrame(verticalCenter, newEllipsoid, tilt3DVerticalTransform);

        var globeOverride = controller._globe;
        var oldGlobe = controller.globe;
        controller.globe = Ellipsoid.UNIT_SPHERE;

        var angle = (minHeight * 0.25) / Cartesian3.distance(center, camera.position);
        var constrainedAxis = Cartesian3.UNIT_Z;
        var restrictedAngle = CesiumMath.PI_OVER_TWO - angle;
        rotate3D(controller, startPosition, movement, frameState, transform, constrainedAxis, restrictedAngle, false, true, globeOverride);

        var tangent = Cartesian3.cross(Matrix4.getColumn(verticalTransform, 2, tilt3DNormal), Cartesian3.normalize(camera.position, tilt3DCartesian3), tilt3DCartesian3);
        if (Cartesian3.dot(camera.right, tangent) < 0.0) {

            if (movement.startPosition.y > movement.endPosition.y) {
                constrainedAxis = undefined;
                restrictedAngle = undefined;
            }

            var oldConstrainedAxis = camera.constrainedAxis;
            camera.constrainedAxis = undefined;

            rotate3D(controller, startPosition, movement, frameState, verticalTransform, constrainedAxis, restrictedAngle, true, false, globeOverride);

            camera.constrainedAxis = oldConstrainedAxis;
        } else {
            rotate3D(controller, startPosition, movement, frameState, verticalTransform, constrainedAxis, restrictedAngle, true, false, globeOverride);
        }

        controller.globe = oldGlobe;
    }

    var look3DStartPos = new Cartesian2();
    var look3DEndPos = new Cartesian2();
    var look3DStartRay = new Ray();
    var look3DEndRay = new Ray();
    function look3D(controller, startPosition, movement, frameState) {
        var camera = controller._camera;

        var startPos = look3DStartPos;
        startPos.x = movement.startPosition.x;
        startPos.y = 0.0;
        var endPos = look3DEndPos;
        endPos.x = movement.endPosition.x;
        endPos.y = 0.0;
        var start = camera.getPickRay(startPos, look3DStartRay).direction;
        var end = camera.getPickRay(endPos, look3DEndRay).direction;

        var angle = 0.0;
        var dot = Cartesian3.dot(start, end);
        if (dot < 1.0) { // dot is in [0, 1]
            angle = Math.acos(dot);
        }
        angle = (movement.startPosition.x > movement.endPosition.x) ? -angle : angle;
        var rotationAxis = controller._horizontalRotationAxis;
        if (defined(rotationAxis)) {
            camera.look(rotationAxis, angle);
        } else {
            camera.lookLeft(angle);
        }

        startPos.x = 0.0;
        startPos.y = movement.startPosition.y;
        endPos.x = 0.0;
        endPos.y = movement.endPosition.y;
        start = camera.getPickRay(startPos, look3DStartRay).direction;
        end = camera.getPickRay(endPos, look3DEndRay).direction;

        angle = 0.0;
        dot = Cartesian3.dot(start, end);
        if (dot < 1.0) { // dot is in [0, 1]
            angle = Math.acos(dot);
        }
        angle = (movement.startPosition.y > movement.endPosition.y) ? -angle : angle;
        camera.lookUp(angle);
    }

    function update3D(controller, frameState) {
        reactToInput(controller, frameState, controller.enableRotate, controller.rotateEventTypes, spin3D, controller.inertiaSpin, '_lastInertiaSpinMovement');
        reactToInput(controller, frameState, controller.enableZoom, controller.zoomEventTypes, zoom3D, controller.inertiaZoom, '_lastInertiaZoomMovement');
        reactToInput(controller, frameState, controller.enableTilt, controller.tiltEventTypes, tilt3D, controller.inertiaSpin, '_lastInertiaTiltMovement');
        reactToInput(controller, frameState, controller.enableLook, controller.lookEventTypes, look3D);
    }

    /**
     * @private
     */
    ScreenSpaceCameraController.prototype.update = function(frameState) {
        var mode = frameState.mode;
        if (mode === SceneMode.SCENE2D) {
            update2D(this, frameState);
        } else if (mode === SceneMode.COLUMBUS_VIEW) {
            this._horizontalRotationAxis = Cartesian3.UNIT_Z;
            updateCV(this, frameState);
        } else if (mode === SceneMode.SCENE3D) {
            this._horizontalRotationAxis = undefined;
            update3D(this, frameState);
        }

        this._aggregator.reset();
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see ScreenSpaceCameraController#destroy
     */
    ScreenSpaceCameraController.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Removes mouse listeners held by this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see ScreenSpaceCameraController#isDestroyed
     *
     * @example
     * controller = controller && controller.destroy();
     */
    ScreenSpaceCameraController.prototype.destroy = function() {
        this._animationCollection.removeAll();
        this._spinHandler = this._spinHandler && this._spinHandler.destroy();
        this._translateHandler = this._translateHandler && this._translateHandler.destroy();
        this._lookHandler = this._lookHandler && this._lookHandler.destroy();
        this._rotateHandler = this._rotateHandler && this._rotateHandler.destroy();
        this._zoomHandler = this._zoomHandler && this._zoomHandler.destroy();
        this._zoomWheelHandler = this._zoomWheelHandler && this._zoomWheelHandler.destroy();
        this._pinchHandler = this._pinchHandler && this._pinchHandler.destroy();
        return destroyObject(this);
    };

    return ScreenSpaceCameraController;
});
