/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/clone',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/EasingFunction',
        '../Core/HermiteSpline',
        '../Core/LinearSpline',
        '../Core/Math',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/Quaternion',
        '../Core/QuaternionSpline',
        './PerspectiveFrustum',
        './PerspectiveOffCenterFrustum',
        './SceneMode'
    ], function(
        Cartesian2,
        Cartesian3,
        Cartographic,
        clone,
        defaultValue,
        defined,
        DeveloperError,
        EasingFunction,
        HermiteSpline,
        LinearSpline,
        CesiumMath,
        Matrix3,
        Matrix4,
        Quaternion,
        QuaternionSpline,
        PerspectiveFrustum,
        PerspectiveOffCenterFrustum,
        SceneMode) {
    "use strict";

    /**
     * Creates tweens for camera flights.
     * <br /><br />
     * Mouse interaction is disabled during flights.
     *
     * @private
     */
    var CameraFlightPath = {
    };

    var c3destination = new Cartesian3();
    var rotMatrix = new Matrix3();
    var viewMat = new Matrix3();

    var cqRight = new Cartesian3();
    var cqUp = new Cartesian3();
    function createQuaternion(direction, up, result) {
        Cartesian3.cross(direction, up, cqRight);
        Cartesian3.cross(cqRight, direction, cqUp);
        viewMat[0] = cqRight.x;
        viewMat[1] = cqUp.x;
        viewMat[2] = -direction.x;
        viewMat[3] = cqRight.y;
        viewMat[4] = cqUp.y;
        viewMat[5] = -direction.y;
        viewMat[6] = cqRight.z;
        viewMat[7] = cqUp.z;
        viewMat[8] = -direction.z;

        return Quaternion.fromRotationMatrix(viewMat, result);
    }

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

    function createUpdateCV(scene, duration, destination, heading, pitch, roll) {
        var camera = scene.camera;

        var start = Cartesian3.clone(camera.position, scratchStart);
        var startPitch = camera.pitch;
        var startHeading = adjustAngleForLERP(camera.heading, heading);
        var startRoll = adjustAngleForLERP(camera.roll, roll);

        if (destination.z <= 0.0) {
            destination.z = start.z;
        }

        var update = function(value) {
            var time = value.time / duration;

            camera.setView({
                heading : CesiumMath.lerp(startHeading, heading, time),
                pitch : CesiumMath.lerp(startPitch, pitch, time),
                roll : CesiumMath.lerp(startRoll, roll, time)
            });

            Cartesian3.lerp(start, destination, time, camera.position);
        };

        return update;
    }

    var scratchStartPosition = new Cartesian3();
    var scratchStartCart = new Cartographic();
    var scratchEndCart = new Cartographic();
    var scratchCurrentPositionCart = new Cartographic();
    var currentFrame = new Matrix4();

    //var scratchCart = new Cartesian3();
    //var scratchCart2 = new Cartesian3();

    function createUpdate3D(scene, duration, destination, heading, pitch, roll, maxHeight) {
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

        /*
        var start = camera.position;
        var end = destination;
        var up = camera.up;
        var right = camera.right;
        var frustum = camera.frustum;

        diff = Cartesian3.subtract(start, end, scratchCart);
        var altitude = Cartesian3.magnitude(Cartesian3.add(Cartesian3.multiplyByScalar(diff, 0.5, scratchCart2), end, scratchCart2));
        var verticalDistance = Cartesian3.magnitude(Cartesian3.multiplyByScalar(up, Cartesian3.dot(diff, up), scratchCart2));
        var horizontalDistance = Cartesian3.magnitude(Cartesian3.multiplyByScalar(right, Cartesian3.dot(diff, right), scratchCart2));
        altitude += getAltitude(frustum, verticalDistance, horizontalDistance);

        maxHeight = altitude;
        */

        var heightFunction;
        if (defined(maxHeight)) {
            var a = -2.0 * maxHeight;
            var b = -maxHeight;
            var c = maxHeight - startCart.height;

            var q = (-b + Math.sqrt(b * b - 4.0 * a * c)) / (2 * a);
            var p = (-b - Math.sqrt(b * b - 4.0 * a * c)) / (2 * a);

            var s = Math.min(q, p);

            c = maxHeight - destCart.height;

            q = (-b + Math.sqrt(b * b - 4.0 * a * c)) / (2 * a);
            p = (-b - Math.sqrt(b * b - 4.0 * a * c)) / (2 * a);

            var e = Math.max(q, p);

            c = maxHeight;

            heightFunction = function(t) {
                var x = t * (e - s) + s;
                return c + x * (b + x * a);
            };
        }

        var update = function(value) {
            var time = value.time / duration;

            var position = scratchCurrentPositionCart;
            position.longitude = CesiumMath.lerp(startCart.longitude, destCart.longitude, time);
            position.latitude = CesiumMath.lerp(startCart.latitude, destCart.latitude, time);

            if (defined(heightFunction)) {
                position.height = heightFunction(time);
            } else {
                position.height = CesiumMath.lerp(startCart.height, destCart.height, time);
            }

            camera.setView({
                positionCartographic : position,
                heading : CesiumMath.lerp(startHeading, heading, time),
                pitch : CesiumMath.lerp(startPitch, pitch, time),
                roll : CesiumMath.lerp(startRoll, roll, time)
            });
        };

        return update;
    }

    var cartScratch1 = new Cartesian3();
    function createPath2D(camera, ellipsoid, start, end, duration) {
        if (CesiumMath.equalsEpsilon(Cartesian2.magnitude(start), Cartesian2.magnitude(end), 10000.0)) {
            return new LinearSpline({
                points : [start, end],
                times : [0.0, duration]
            });
        }

        // get minimum altitude from which the whole map is visible
        var radius = ellipsoid.maximumRadius;
        var frustum = camera.frustum;
        var maxStartAlt = getAltitude(frustum, Math.PI * radius,  CesiumMath.PI_OVER_TWO * radius);

        var points;
        var altitude;
        var incrementPercentage = 0.5;
        if (start.z > maxStartAlt) {
            altitude = 0.6 * maxStartAlt;
        } else {
            var diff = Cartesian3.subtract(start, end, cartScratch1);
            altitude = getAltitude(frustum, Math.abs(diff.y), Math.abs(diff.x));
        }

        var aboveEnd = Cartesian3.clone(end);
        aboveEnd.z = altitude;
        var afterStart = Cartesian3.clone(start);
        afterStart.z = altitude;

        var middle = new Cartesian3();
        if (end.z > maxStartAlt) {
            middle = Cartesian3.add(Cartesian3.multiplyByScalar(Cartesian3.subtract(start, end, middle), 0.5, middle), end, middle);
            points = [ start, middle, end ];
        } else if (start.z > maxStartAlt) {
            middle = Cartesian3.add(Cartesian3.multiplyByScalar(Cartesian3.subtract(start, aboveEnd, middle), 0.5, middle), aboveEnd, middle);
            points = [ start, middle, end ];
        } else {
            points = [ start ];

            var v = Cartesian3.subtract(afterStart, aboveEnd, cartScratch1);
            var distance = Cartesian3.magnitude(v);
            Cartesian3.normalize(v, v);

            var increment = incrementPercentage * distance;
            var startCondition = distance - increment;
            for ( var i = startCondition; i > 0.0; i = i - increment) {
                var p = new Cartesian3();
                points.push(Cartesian3.add(Cartesian3.multiplyByScalar(v, i, p), aboveEnd, p));
            }

            points.push(end);
        }

        var times = new Array(points.length);
        var scalar = duration / (points.length - 1);
        for ( var k = 0; k < points.length; ++k) {
            times[k] = k * scalar;
        }

        return HermiteSpline.createNaturalCubic({
            points : points,
            times : times
        });
    }

    var direction2D = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
    var right2D = new Cartesian3();
    right2D = Cartesian3.normalize(Cartesian3.cross(direction2D, Cartesian3.UNIT_Y, right2D), right2D);
    var up2D = Cartesian3.cross(right2D, direction2D, new Cartesian3());
    var quat = createQuaternion(direction2D, up2D);

    function createOrientations2D(camera, path, endDirection, endUp) {
        var points = path.points;
        var orientations = new Array(points.length);
        orientations[0] = createQuaternion(camera.direction, camera.up);

        var length = points.length - 1;
        for (var i = 1; i < length; ++i) {
            orientations[i] = quat;
        }

        if (defined(endDirection) && defined(endUp)) {
            orientations[length] = createQuaternion(endDirection, endUp);
        } else {
            orientations[length] = quat;
        }

        return new QuaternionSpline({
            points : orientations,
            times : path.times
        });
    }

    function createUpdate2D(scene, destination, duration, direction, up) {
        var camera = scene.camera;
        var ellipsoid = scene.mapProjection.ellipsoid;

        var start = Cartesian3.clone(camera.position);
        start.z = camera.frustum.right - camera.frustum.left;

        var path = createPath2D(camera, ellipsoid, start, destination, duration);
        var orientations = createOrientations2D(camera, path, Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()), up);

        var height = camera.position.z;

        var update = function(value) {
            var time = value.time;
            var orientation = orientations.evaluate(time);
            Matrix3.fromQuaternion(orientation, rotMatrix);

            camera.position = path.evaluate(time);
            var zoom = camera.position.z;
            camera.position.z = height;

            camera.right = Matrix3.getRow(rotMatrix, 0, camera.right);
            camera.up = Matrix3.getRow(rotMatrix, 1, camera.up);
            camera.direction = Cartesian3.negate(Matrix3.getRow(rotMatrix, 2, camera.direction), camera.direction);

            var frustum = camera.frustum;
            var ratio = frustum.top / frustum.right;

            var incrementAmount = (zoom - (frustum.right - frustum.left)) * 0.5;
            frustum.right += incrementAmount;
            frustum.left -= incrementAmount;
            frustum.top = ratio * frustum.right;
            frustum.bottom = -frustum.top;
        };

        return update;
    }

    var dirScratch = new Cartesian3();
    var rightScratch = new Cartesian3();
    var upScratch = new Cartesian3();
    var scratchCartographic = new Cartographic();
    var scratchDestination = new Cartesian3();

    CameraFlightPath.createTween = function(scene, options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var destination = options.destination;
        var direction = options.direction;
        var up = options.up;

        var projection = scene.mapProjection;
        var ellipsoid = projection.ellipsoid;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(destination)) {
            throw new DeveloperError('destination is required.');
        }
        //>>includeEnd('debug');

        if (scene.mode === SceneMode.MORPHING) {
            return {
                startObject : {},
                stopObject: {},
                duration : 0.0
            };
        }

        var convert = defaultValue(options.convert, true);

        if (convert && scene.mode !== SceneMode.SCENE3D) {
            ellipsoid.cartesianToCartographic(destination, scratchCartographic);
            destination = projection.project(scratchCartographic, scratchDestination);
        }

        var duration = defaultValue(options.duration, 3.0);
        var controller = scene.screenSpaceCameraController;
        controller.enableInputs = false;

        var wrapCallback = function(cb) {
            var wrapped = function() {
                if (typeof cb === 'function') {
                    cb();
                }

                controller.enableInputs = true;
            };
            return wrapped;
        };
        var complete = wrapCallback(options.complete);
        var cancel = wrapCallback(options.cancel);

        var camera = scene.camera;
        var transform = options.endTransform;
        if (defined(transform)) {
            camera._setTransform(transform);
        }

        var frustum = camera.frustum;
        if (scene.mode === SceneMode.SCENE2D) {
            if (Cartesian2.equalsEpsilon(camera.position, destination, CesiumMath.EPSILON6) && (CesiumMath.equalsEpsilon(Math.max(frustum.right - frustum.left, frustum.top - frustum.bottom), destination.z, CesiumMath.EPSILON6))) {
                return {
                    startObject : {},
                    stopObject: {},
                    duration : 0.0,
                    complete : complete,
                    cancel: cancel
                };
            }
        } else if (Cartesian3.equalsEpsilon(destination, camera.position, CesiumMath.EPSILON6)) {
            return {
                startObject : {},
                stopObject: {},
                duration : 0.0,
                complete : complete,
                cancel: cancel
            };
        }

        if (duration <= 0.0) {
            var newOnComplete = function() {
                var position = destination;
                if (scene.mode === SceneMode.SCENE3D) {
                    if (!defined(options.direction) && !defined(options.up)){
                        dirScratch = Cartesian3.normalize(Cartesian3.negate(position, dirScratch), dirScratch);
                        rightScratch = Cartesian3.normalize(Cartesian3.cross(dirScratch, Cartesian3.UNIT_Z, rightScratch), rightScratch);
                    } else {
                        dirScratch = options.direction;
                        rightScratch = Cartesian3.normalize(Cartesian3.cross(dirScratch, options.up, rightScratch), rightScratch);
                    }
                    upScratch = defaultValue(options.up, Cartesian3.cross(rightScratch, dirScratch, upScratch));
                } else {
                    if (!defined(options.direction) && !defined(options.up)){
                        dirScratch = Cartesian3.negate(Cartesian3.UNIT_Z, dirScratch);
                        rightScratch = Cartesian3.normalize(Cartesian3.cross(dirScratch, Cartesian3.UNIT_Y, rightScratch), rightScratch);
                    } else {
                        dirScratch = options.direction;
                        rightScratch = Cartesian3.normalize(Cartesian3.cross(dirScratch, options.up, rightScratch), rightScratch);
                    }
                    upScratch = defaultValue(options.up, Cartesian3.cross(rightScratch, dirScratch, upScratch));
                }

                Cartesian3.clone(position, camera.position);
                Cartesian3.clone(dirScratch, camera.direction);
                Cartesian3.clone(upScratch, camera.up);
                Cartesian3.clone(rightScratch, camera.right);

                if (scene.mode === SceneMode.SCENE2D) {
                    var zoom = camera.position.z;
                    var ratio = frustum.top / frustum.right;

                    var incrementAmount = (zoom - (frustum.right - frustum.left)) * 0.5;
                    frustum.right += incrementAmount;
                    frustum.left -= incrementAmount;
                    frustum.top = ratio * frustum.right;
                    frustum.bottom = -frustum.top;
                }

                if (typeof complete === 'function') {
                    complete();
                }
            };
            return {
                startObject : {},
                stopObject: {},
                duration : 0.0,
                complete : newOnComplete,
                cancel: cancel
            };
        }

        var heading;
        var pitch;
        var roll;

        var update;
        if (scene.mode === SceneMode.SCENE3D) {
            heading = defaultValue(heading, 0.0);
            pitch = defaultValue(pitch, -CesiumMath.PI_OVER_TWO);
            roll = defaultValue(roll, 0.0);

            update = createUpdate3D(scene, duration, destination, heading, pitch, roll);
        } else if (scene.mode === SceneMode.COLUMBUS_VIEW) {
            heading = defaultValue(heading, 0.0);
            pitch = defaultValue(pitch, -CesiumMath.PI_OVER_TWO);
            roll = defaultValue(roll, 0.0);

            update = createUpdateCV(scene, duration, destination, heading, pitch, roll);
        } else {
            update = createUpdate2D(scene, destination, duration, direction, up);
        }

        return {
            duration : duration,
            easingFunction : EasingFunction.QUINTIC_OUT,
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
