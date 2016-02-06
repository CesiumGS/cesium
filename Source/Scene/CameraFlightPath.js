/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/EasingFunction',
        '../Core/Math',
        './PerspectiveFrustum',
        './PerspectiveOffCenterFrustum',
        './SceneMode'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartographic,
        defaultValue,
        defined,
        DeveloperError,
        EasingFunction,
        CesiumMath,
        PerspectiveFrustum,
        PerspectiveOffCenterFrustum,
        SceneMode) {
    'use strict';

    /**
     * Creates tweens for camera flights.
     * <br /><br />
     * Mouse interaction is disabled during flights.
     *
     * @private
     */
    var CameraFlightPath = {
    };

    function getAltitude(frustum, dx, dy) {
        var near;
        var top;
        var right;
        if (frustum instanceof PerspectiveFrustum) {
            var tanTheta = Math.tan(0.5 * frustum.fovy);
            near = frustum.near;
            top = frustum.near * tanTheta;
            right = frustum.aspectRatio * top;
            return Math.max(dx * near / right, dy * near / top);
        } else if (frustum instanceof PerspectiveOffCenterFrustum) {
            near = frustum.near;
            top = frustum.top;
            right = frustum.right;
            return Math.max(dx * near / right, dy * near / top);
        }

        return Math.max(dx, dy);
    }

    var scratchCart = new Cartesian3();
    var scratchCart2 = new Cartesian3();

    function createHeightFunction(camera, destination, startHeight, endHeight, optionAltitude) {
        var altitude = optionAltitude;
        var maxHeight;

        if (!defined(optionAltitude)) {
            var start = camera.position;
            var end = destination;
            var up = camera.up;
            var right = camera.right;
            var frustum = camera.frustum;

            var diff = Cartesian3.subtract(start, end, scratchCart);
            var verticalDistance = Cartesian3.magnitude(Cartesian3.multiplyByScalar(up, Cartesian3.dot(diff, up), scratchCart2));
            var horizontalDistance = Cartesian3.magnitude(Cartesian3.multiplyByScalar(right, Cartesian3.dot(diff, right), scratchCart2));

            maxHeight = Math.max(startHeight, endHeight);
            altitude = Math.min(getAltitude(frustum, verticalDistance, horizontalDistance) * 0.20, 1000000000.0);
        }

        if ((defined(optionAltitude) && optionAltitude < altitude) || maxHeight < altitude) {
            var power = 8.0;
            var factor = 1000000.0;

            var s = -Math.pow((altitude - startHeight) * factor, 1.0 / power);
            var e = Math.pow((altitude - endHeight) * factor, 1.0 / power);

            return function(t) {
                var x = t * (e - s) + s;
                return -Math.pow(x, power) / factor + altitude;
            };
        }

        return function(t) {
            return CesiumMath.lerp(startHeight, endHeight, t);
        };
    }

    function adjustAngleForLERP(startAngle, endAngle) {
        if (CesiumMath.equalsEpsilon(startAngle, CesiumMath.TWO_PI, CesiumMath.EPSILON11)) {
            startAngle = 0.0;
        }

        if (endAngle > startAngle + Math.PI) {
            startAngle += CesiumMath.TWO_PI;
        } else if (endAngle < startAngle - Math.PI) {
            startAngle -= CesiumMath.TWO_PI;
        }

        return startAngle;
    }

    var scratchStart = new Cartesian3();

    function createUpdateCV(scene, duration, destination, heading, pitch, roll, optionAltitude) {
        var camera = scene.camera;

        var start = Cartesian3.clone(camera.position, scratchStart);
        var startPitch = camera.pitch;
        var startHeading = adjustAngleForLERP(camera.heading, heading);
        var startRoll = adjustAngleForLERP(camera.roll, roll);

        var heightFunction = createHeightFunction(camera, destination, start.z, destination.z, optionAltitude);

        function update(value) {
            var time = value.time / duration;

            camera.setView({
                orientation: {
                    heading : CesiumMath.lerp(startHeading, heading, time),
                    pitch : CesiumMath.lerp(startPitch, pitch, time),
                    roll : CesiumMath.lerp(startRoll, roll, time)
                }
            });

            Cartesian2.lerp(start, destination, time, camera.position);
            camera.position.z = heightFunction(time);
        }
        return update;
    }

    var scratchStartCart = new Cartographic();
    var scratchEndCart = new Cartographic();

    function createUpdate3D(scene, duration, destination, heading, pitch, roll, optionAltitude) {
        var camera = scene.camera;
        var projection = scene.mapProjection;
        var ellipsoid = projection.ellipsoid;

        var startCart = Cartographic.clone(camera.positionCartographic, scratchStartCart);
        var startPitch = camera.pitch;
        var startHeading = adjustAngleForLERP(camera.heading, heading);
        var startRoll = adjustAngleForLERP(camera.roll, roll);

        var destCart = ellipsoid.cartesianToCartographic(destination, scratchEndCart);
        if (destCart.height <= 0.0) {
            destCart.height = startCart.height;
        }

        startCart.longitude = CesiumMath.zeroToTwoPi(startCart.longitude);
        destCart.longitude = CesiumMath.zeroToTwoPi(destCart.longitude);

        var diff = startCart.longitude - destCart.longitude;
        if (diff < -CesiumMath.PI) {
            startCart.longitude += CesiumMath.TWO_PI;
        } else if (diff > CesiumMath.PI) {
            destCart.longitude += CesiumMath.TWO_PI;
        }

        var heightFunction = createHeightFunction(camera, destination, startCart.height, destCart.height, optionAltitude);

        function update(value) {
            var time = value.time / duration;

            var position = Cartesian3.fromRadians(
                CesiumMath.lerp(startCart.longitude, destCart.longitude, time),
                CesiumMath.lerp(startCart.latitude, destCart.latitude, time),
                heightFunction(time)
            );

            camera.setView({
                destination : position,
                orientation: {
                    heading : CesiumMath.lerp(startHeading, heading, time),
                    pitch : CesiumMath.lerp(startPitch, pitch, time),
                    roll : CesiumMath.lerp(startRoll, roll, time)
                }
            });
        }
        return update;
    }

    function createUpdate2D(scene, duration, destination, heading, pitch, roll, optionAltitude) {
        var camera = scene.camera;

        var start = Cartesian3.clone(camera.position, scratchStart);
        var startHeading = adjustAngleForLERP(camera.heading, heading);

        var startHeight = camera.frustum.right - camera.frustum.left;
        var heightFunction = createHeightFunction(camera, destination, startHeight, destination.z, optionAltitude);

        function update(value) {
            var time = value.time / duration;

            camera.setView({
                orientation: {
                    heading : CesiumMath.lerp(startHeading, heading, time)
                }
            });

            Cartesian2.lerp(start, destination, time, camera.position);

            var zoom = heightFunction(time);

            var frustum = camera.frustum;
            var ratio = frustum.top / frustum.right;

            var incrementAmount = (zoom - (frustum.right - frustum.left)) * 0.5;
            frustum.right += incrementAmount;
            frustum.left -= incrementAmount;
            frustum.top = ratio * frustum.right;
            frustum.bottom = -frustum.top;
        }
        return update;
    }

    var scratchCartographic = new Cartographic();
    var scratchDestination = new Cartesian3();

    function emptyFlight(complete, cancel) {
        return {
            startObject : {},
            stopObject : {},
            duration : 0.0,
            complete : complete,
            cancel : cancel
        };
    }

    function wrapCallback(controller, cb) {
        function wrapped() {
            if (typeof cb === 'function') {
                cb();
            }

            controller.enableInputs = true;
        }
        return wrapped;
    }

    CameraFlightPath.createTween = function(scene, options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var destination = options.destination;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(destination)) {
            throw new DeveloperError('destination is required.');
        }
        //>>includeEnd('debug');
        var mode = scene.mode;

        if (mode === SceneMode.MORPHING) {
            return emptyFlight();
        }

        var convert = defaultValue(options.convert, true);
        var projection = scene.mapProjection;
        var ellipsoid = projection.ellipsoid;
        var maximumHeight = options.maximumHeight;
        var easingFunction = options.easingFunction;

        if (convert && mode !== SceneMode.SCENE3D) {
            ellipsoid.cartesianToCartographic(destination, scratchCartographic);
            destination = projection.project(scratchCartographic, scratchDestination);
        }

        var camera = scene.camera;
        var transform = options.endTransform;
        if (defined(transform)) {
            camera._setTransform(transform);
        }

        var duration = options.duration;
        if (!defined(duration)) {
            duration = Math.ceil(Cartesian3.distance(camera.position, destination) / 1000000.0) + 2.0;
            duration = Math.min(duration, 3.0);
        }

        var heading = defaultValue(options.heading, 0.0);
        var pitch = defaultValue(options.pitch, -CesiumMath.PI_OVER_TWO);
        var roll = defaultValue(options.roll, 0.0);

        var controller = scene.screenSpaceCameraController;
        controller.enableInputs = false;

        var complete = wrapCallback(controller, options.complete);
        var cancel = wrapCallback(controller, options.cancel);

        var frustum = camera.frustum;

        var empty = scene.mode === SceneMode.SCENE2D;
        empty = empty && Cartesian2.equalsEpsilon(camera.position, destination, CesiumMath.EPSILON6);
        empty = empty && CesiumMath.equalsEpsilon(Math.max(frustum.right - frustum.left, frustum.top - frustum.bottom), destination.z, CesiumMath.EPSILON6);

        empty = empty || (scene.mode !== SceneMode.SCENE2D &&
            Cartesian3.equalsEpsilon(destination, camera.position, CesiumMath.EPSILON10));

        empty = empty &&
            CesiumMath.equalsEpsilon(CesiumMath.negativePiToPi(heading), CesiumMath.negativePiToPi(camera.heading), CesiumMath.EPSILON10) &&
            CesiumMath.equalsEpsilon(CesiumMath.negativePiToPi(pitch), CesiumMath.negativePiToPi(camera.pitch), CesiumMath.EPSILON10) &&
            CesiumMath.equalsEpsilon(CesiumMath.negativePiToPi(roll), CesiumMath.negativePiToPi(camera.roll), CesiumMath.EPSILON10);

        if (empty) {
            return emptyFlight(complete, cancel);
        }

        var updateFunctions = new Array(4);
        updateFunctions[SceneMode.SCENE2D] = createUpdate2D;
        updateFunctions[SceneMode.SCENE3D] = createUpdate3D;
        updateFunctions[SceneMode.COLUMBUS_VIEW] = createUpdateCV;

        if (duration <= 0.0) {
            var newOnComplete = function() {
                var update = updateFunctions[mode](scene, 1.0, destination, heading, pitch, roll, maximumHeight);
                update({ time: 1.0 });

                if (typeof complete === 'function') {
                    complete();
                }
            };
            return emptyFlight(newOnComplete, cancel);
        }

        var update = updateFunctions[mode](scene, duration, destination, heading, pitch, roll, maximumHeight);

        if (!defined(easingFunction)) {
            var startHeight = camera.positionCartographic.height;
            var endHeight = mode === SceneMode.SCENE3D ? ellipsoid.cartesianToCartographic(destination).height : destination.z;

            if (startHeight > endHeight && startHeight > 11500.0) {
                easingFunction = EasingFunction.CUBIC_OUT;
            } else {
                easingFunction = EasingFunction.QUINTIC_IN_OUT;
            }
        }

        return {
            duration : duration,
            easingFunction : easingFunction,
            startObject : {
                time : 0.0
            },
            stopObject : {
                time : duration
            },
            update : update,
            complete : complete,
            cancel: cancel
        };
    };

    return CameraFlightPath;
});
