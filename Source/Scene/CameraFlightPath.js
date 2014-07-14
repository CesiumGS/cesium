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

    var scratchCart = new Cartesian3();
    var scratchCart2 = new Cartesian3();
    var scratchCart3 = new Cartesian3();
    var scratchCart4 = new Cartesian3();
    var rotMatrixScratch = new Matrix3();
    function createPath3D(camera, ellipsoid, start, up, right, end, duration) {
        // get minimum altitude from which the whole ellipsoid is visible
        var radius = ellipsoid.maximumRadius;
        var frustum = camera.frustum;
        var maxStartAlt = getAltitude(frustum, radius, radius);

        var dot = Cartesian3.dot(Cartesian3.normalize(start, scratchCart), Cartesian3.normalize(end, scratchCart2));

        var points;
        var altitude;
        var incrementPercentage;
        if (Cartesian3.magnitude(start) > maxStartAlt) {
            altitude = radius + 0.6 * (maxStartAlt - radius);
            incrementPercentage = 0.35;
        } else {
            var diff = Cartesian3.subtract(start, end, scratchCart);
            altitude = Cartesian3.magnitude(Cartesian3.add(Cartesian3.multiplyByScalar(diff, 0.5, scratchCart2), end, scratchCart2));
            var verticalDistance = Cartesian3.magnitude(Cartesian3.multiplyByScalar(up, Cartesian3.dot(diff, up), scratchCart2));
            var horizontalDistance = Cartesian3.magnitude(Cartesian3.multiplyByScalar(right, Cartesian3.dot(diff, right), scratchCart2));
            altitude += getAltitude(frustum, verticalDistance, horizontalDistance);
            incrementPercentage = CesiumMath.clamp(dot + 1.0, 0.25, 0.5);
        }

        var aboveEnd = Cartesian3.multiplyByScalar(Cartesian3.normalize(end, scratchCart2), altitude, scratchCart2);
        var afterStart = Cartesian3.multiplyByScalar(Cartesian3.normalize(start, scratchCart), altitude, scratchCart);

        var axis, angle, rotation;
        var middle = new Cartesian3();
        if (Cartesian3.magnitude(end) > maxStartAlt && dot > 0.75) {
            middle = Cartesian3.add(Cartesian3.multiplyByScalar(Cartesian3.subtract(start, end, middle), 0.5, middle), end, middle);
            points = [ start, middle, end ];
        } else if (Cartesian3.magnitude(start) > maxStartAlt && dot > 0) {
            middle = Cartesian3.add(Cartesian3.multiplyByScalar(Cartesian3.subtract(start, aboveEnd, middle), 0.5, middle), aboveEnd, middle);
            points = [ start, middle, end ];
        } else {
            points = [ start ];

            angle = CesiumMath.acosClamped(Cartesian3.dot(Cartesian3.normalize(afterStart, scratchCart3), Cartesian3.normalize(aboveEnd, scratchCart4)));
            axis = Cartesian3.cross(aboveEnd, afterStart, scratchCart3);
            if (Cartesian3.equalsEpsilon(axis, Cartesian3.ZERO, CesiumMath.EPSILON6)) {
                axis = Cartesian3.UNIT_Z;
            }

            var increment = incrementPercentage * angle;
            var startCondition = angle - increment;
            for ( var i = startCondition; i > 0.0; i = i - increment) {
                rotation = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(axis, i), rotMatrixScratch);
                points.push(Matrix3.multiplyByVector(rotation, aboveEnd, new Cartesian3()));
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

    var direction3D = new Cartesian3();
    var right3D = new Cartesian3();
    var up3D = new Cartesian3();
    var quat3D = new Quaternion();

    function createOrientations3D(path, startDirection, startUp, endDirection, endUp) {
        var points = path.points;
        var orientations = new Array(points.length);
        orientations[0] = createQuaternion(startDirection, startUp);

        var point;
        var length = points.length - 1;
        for (var i = 1; i < length; ++i) {
            point = points[i];
            Cartesian3.normalize(Cartesian3.negate(point, direction3D), direction3D);
            Cartesian3.normalize(Cartesian3.cross(direction3D, Cartesian3.UNIT_Z, right3D), right3D);
            Cartesian3.cross(right3D, direction3D, up3D);
            orientations[i] = createQuaternion(direction3D, up3D, quat3D);
        }

        point = points[length];
        if (defined(endDirection) && defined(endUp)) {
            orientations[length] = createQuaternion(endDirection, endUp);
        } else {
            Cartesian3.normalize(Cartesian3.negate(point, direction3D), direction3D);
            Cartesian3.normalize(Cartesian3.cross(direction3D, Cartesian3.UNIT_Z, right3D), right3D);
            Cartesian3.cross(right3D, direction3D, up3D);
            orientations[length] = createQuaternion(direction3D, up3D, quat3D);
        }

        return new QuaternionSpline({
            points : orientations,
            times : path.times
        });
    }

    var scratchStartPosition = new Cartesian3();
    var scratchStartDirection = new Cartesian3();
    var scratchStartUp = new Cartesian3();
    var scratchStartRight = new Cartesian3();
    var currentFrame = new Matrix4();

    function createUpdate3D(scene, destination, duration, direction, up) {
        var camera = scene.camera;
        var ellipsoid = scene.mapProjection.ellipsoid;

        var start = camera.cameraToWorldCoordinatesPoint(camera.position, scratchStartPosition);
        var startDirection = camera.cameraToWorldCoordinatesVector(camera.direction, scratchStartDirection);
        var startUp = camera.cameraToWorldCoordinatesVector(camera.up, scratchStartUp);
        var startRight = Cartesian3.cross(startDirection, startUp, scratchStartRight);

        var path = createPath3D(camera, ellipsoid, start, startUp, startRight, destination, duration);
        var orientations = createOrientations3D(path, startDirection, startUp, direction, up);

        var update = function(value) {
            var time = value.time;
            var orientation = orientations.evaluate(time);
            Matrix3.fromQuaternion(orientation, rotMatrix);

            Matrix4.clone(camera.transform, currentFrame);
            Matrix4.clone(Matrix4.IDENTITY, camera.transform);

            camera.position = path.evaluate(time, camera.position);
            camera.right = Matrix3.getRow(rotMatrix, 0, camera.right);
            camera.up = Matrix3.getRow(rotMatrix, 1, camera.up);
            camera.direction = Cartesian3.negate(Matrix3.getRow(rotMatrix, 2, camera.direction), camera.direction);

            camera.setTransform(currentFrame);
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

    function createUpdateCV(scene, destination, duration, direction, up) {
        var camera = scene.camera;
        var ellipsoid = scene.mapProjection.ellipsoid;

        var path = createPath2D(camera, ellipsoid, Cartesian3.clone(camera.position), destination, duration);
        var orientations = createOrientations2D(camera, path, direction, up);

        var update = function(value) {
            var time = value.time;
            var orientation = orientations.evaluate(time);
            Matrix3.fromQuaternion(orientation, rotMatrix);

            Matrix4.clone(camera.transform, currentFrame);
            Matrix4.clone(Matrix4.IDENTITY, camera.transform);

            camera.position = path.evaluate(time, camera.position);
            camera.right = Matrix3.getRow(rotMatrix, 0, camera.right);
            camera.up = Matrix3.getRow(rotMatrix, 1, camera.up);
            camera.direction = Cartesian3.negate(Matrix3.getRow(rotMatrix, 2, camera.direction), camera.direction);

            camera.setTransform(currentFrame);
        };

        return update;
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

        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(destination)) {
            throw new DeveloperError('destination is required.');
        }
        if ((defined(direction) && !defined(up)) || (defined(up) && !defined(direction))) {
            throw new DeveloperError('If either direction or up is given, then both are required.');
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
            var projection = scene.mapProjection;
            var ellipsoid = projection.ellipsoid;
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
            camera.setTransform(transform);
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

        var update;
        if (scene.mode === SceneMode.SCENE3D) {
            update = createUpdate3D(scene, destination, duration, direction, up);
        } else if (scene.mode === SceneMode.SCENE2D) {
            update = createUpdate2D(scene, destination, duration, direction, up);
        } else {
            update = createUpdateCV(scene, destination, duration, direction, up);
        }

        return {
            duration : duration,
            easingFunction : EasingFunction.SINUSOIDAL_IN_OUT,
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

    CameraFlightPath.createTweenRectangle = function(scene, options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var rectangle = options.destination;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(rectangle)) {
            throw new DeveloperError('options.destination is required.');
        }
        //>>includeEnd('debug');

        var createAnimationoptions = clone(options);
        scene.camera.getRectangleCameraCoordinates(rectangle, c3destination);

        createAnimationoptions.destination = c3destination;
        createAnimationoptions.convert = false;
        return this.createTween(scene, createAnimationoptions);
    };

    return CameraFlightPath;
});
