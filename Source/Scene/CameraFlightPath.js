/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/clone',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/HermiteSpline',
        '../Core/Math',
        '../Core/Matrix3',
        '../Core/Matrix4',
        '../Core/Quaternion',
        '../Core/QuaternionSpline',
        '../Scene/PerspectiveFrustum',
        '../Scene/PerspectiveOffCenterFrustum',
        '../Scene/SceneMode',
        '../ThirdParty/Tween'
    ], function(
        Cartesian2,
        Cartesian3,
        clone,
        defaultValue,
        defined,
        DeveloperError,
        HermiteSpline,
        CesiumMath,
        Matrix3,
        Matrix4,
        Quaternion,
        QuaternionSpline,
        PerspectiveFrustum,
        PerspectiveOffCenterFrustum,
        SceneMode,
        Tween) {
    "use strict";

    /**
     * Creates animations for camera flights.
     * <br /><br />
     * Mouse interaction is disabled during flights.
     *
     * @exports CameraFlightPath
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

    function createPath3D(camera, ellipsoid, start, up, right, end, duration) {
        // get minimum altitude from which the whole ellipsoid is visible
        var radius = ellipsoid.maximumRadius;
        var frustum = camera.frustum;
        var maxStartAlt = getAltitude(frustum, radius, radius);

        var dot = Cartesian3.dot(Cartesian3.normalize(start), Cartesian3.normalize(end));

        var points;
        var altitude;
        var incrementPercentage;
        if (Cartesian3.magnitude(start) > maxStartAlt) {
            altitude = radius + 0.6 * (maxStartAlt - radius);
            incrementPercentage = 0.35;
        } else {
            var diff = Cartesian3.subtract(start, end);
            altitude = Cartesian3.magnitude(Cartesian3.add(Cartesian3.multiplyByScalar(diff, 0.5), end));
            var verticalDistance = Cartesian3.magnitude(Cartesian3.multiplyByScalar(up, Cartesian3.dot(diff, up)));
            var horizontalDistance = Cartesian3.magnitude(Cartesian3.multiplyByScalar(right, Cartesian3.dot(diff, right)));
            altitude += getAltitude(frustum, verticalDistance, horizontalDistance);
            incrementPercentage = CesiumMath.clamp(dot + 1.0, 0.25, 0.5);
        }

        var aboveEnd = Cartesian3.multiplyByScalar(Cartesian3.normalize(end), altitude);
        var afterStart = Cartesian3.multiplyByScalar(Cartesian3.normalize(start), altitude);

        var axis, angle, rotation, middle;
        if (Cartesian3.magnitude(end) > maxStartAlt && dot > 0.75) {
            middle = Cartesian3.add(Cartesian3.multiplyByScalar(Cartesian3.subtract(start, end), 0.5), end);
            points = [ start, middle, end ];
        } else if (Cartesian3.magnitude(start) > maxStartAlt && dot > 0) {
            middle = Cartesian3.add(Cartesian3.multiplyByScalar(Cartesian3.subtract(start, aboveEnd), 0.5), aboveEnd);
            points = [ start, middle, end ];
        } else {
            points = [ start ];

            angle = Math.acos(Cartesian3.dot(Cartesian3.normalize(afterStart), Cartesian3.normalize(aboveEnd)));
            axis = Cartesian3.cross(aboveEnd, afterStart);
            if (Cartesian3.equalsEpsilon(axis, Cartesian3.ZERO, CesiumMath.EPSILON6)) {
                axis = Cartesian3.UNIT_Z;
            }

            var increment = incrementPercentage * angle;
            var startCondition = angle - increment;
            for ( var i = startCondition; i > 0.0; i = i - increment) {
                rotation = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(axis, i));
                points.push(Matrix3.multiplyByVector(rotation, aboveEnd));
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

    function createUpdate3D(frameState, destination, duration, direction, up) {
        var camera = frameState.camera;
        var ellipsoid = frameState.scene2D.projection.ellipsoid;

        var start = Matrix4.multiplyByPoint(camera.transform, camera.position, scratchStartPosition);
        var startDirection = Matrix4.multiplyByPointAsVector(camera.transform, camera.direction, scratchStartDirection);
        var startUp = Matrix4.multiplyByPointAsVector(camera.transform, camera.up, scratchStartUp);
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

    function createPath2D(camera, ellipsoid, start, end, duration) {
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
            var diff = Cartesian3.subtract(start, end);
            altitude = getAltitude(frustum, Math.abs(diff.y), Math.abs(diff.x));
        }

        var aboveEnd = Cartesian3.clone(end);
        aboveEnd.z = altitude;
        var afterStart = Cartesian3.clone(start);
        afterStart.z = altitude;

        var middle;
        if (end.z > maxStartAlt) {
            middle = Cartesian3.add(Cartesian3.multiplyByScalar(Cartesian3.subtract(start, end), 0.5), end);
            points = [ start, middle, end ];
        } else if (start.z > maxStartAlt) {
            middle = Cartesian3.add(Cartesian3.multiplyByScalar(Cartesian3.subtract(start, aboveEnd), 0.5), aboveEnd);
            points = [ start, middle, end ];
        } else {
            points = [ start ];

            var v = Cartesian3.subtract(afterStart, aboveEnd);
            var distance = Cartesian3.magnitude(v);
            Cartesian3.normalize(v, v);

            var increment = incrementPercentage * distance;
            var startCondition = distance - increment;
            for ( var i = startCondition; i > 0.0; i = i - increment) {
                points.push(Cartesian3.add(Cartesian3.multiplyByScalar(v, i), aboveEnd));
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

    var direction2D = Cartesian3.negate(Cartesian3.UNIT_Z);
    var right2D = Cartesian3.normalize(Cartesian3.cross(direction2D, Cartesian3.UNIT_Y));
    var up2D = Cartesian3.cross(right2D, direction2D);
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

    var transform2D = new Matrix4(0, 0, 1, 0,
                                  1, 0, 0, 0,
                                  0, 1, 0, 0,
                                  0, 0, 0, 1);

    function createUpdateCV(frameState, destination, duration, direction, up) {
        var camera = frameState.camera;
        var ellipsoid = frameState.scene2D.projection.ellipsoid;

        var path = createPath2D(camera, ellipsoid, Cartesian3.clone(camera.position), destination, duration);
        var orientations = createOrientations2D(camera, path, direction, up);

        var update = function(value) {
            var time = value.time;
            var orientation = orientations.evaluate(time);
            Matrix3.fromQuaternion(orientation, rotMatrix);

            Matrix4.clone(camera.transform, currentFrame);
            Matrix4.clone(transform2D, camera.transform);

            camera.position = path.evaluate(time, camera.position);
            camera.right = Matrix3.getRow(rotMatrix, 0, camera.right);
            camera.up = Matrix3.getRow(rotMatrix, 1, camera.up);
            camera.direction = Cartesian3.negate(Matrix3.getRow(rotMatrix, 2, camera.direction), camera.direction);

            camera.setTransform(currentFrame);
        };

        return update;
    }

    function createUpdate2D(frameState, destination, duration, direction, up) {
        var camera = frameState.camera;
        var ellipsoid = frameState.scene2D.projection.ellipsoid;

        var start = Cartesian3.clone(camera.position);
        start.z = camera.frustum.right - camera.frustum.left;

        var path = createPath2D(camera, ellipsoid, start, destination, duration);
        var orientations = createOrientations2D(camera, path, Cartesian3.negate(Cartesian3.UNIT_Z), up);

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

    /**
     * Creates an animation to fly the camera from it's current position to a position given by a Cartesian. All arguments should
     * be given in world coordinates.
     *
     * @param {Scene} scene The scene instance to use.
     * @param {Cartesian3} description.destination The final position of the camera.
     * @param {Cartesian3} [description.direction] The final direction of the camera. By default, the direction will point towards the center of the frame in 3D and in the negative z direction in Columbus view or 2D.
     * @param {Cartesian3} [description.up] The final up direction. By default, the up direction will point towards local north in 3D and in the positive y direction in Columbus view or 2D.
     * @param {Number} [description.duration=3000] The duration of the animation in milliseconds.
     * @param {Function} [onComplete] The function to execute when the animation has completed.
     * @param {Function} [onCancel] The function to execute if the animation is cancelled.
     * @param {Matrix4} [endReferenceFrame] The reference frame the camera will be in when the flight is completed.
     *
     * @returns {Object} An Object that can be added to an {@link AnimationCollection} for animation.
     *
     * @exception {DeveloperError} frameState.mode cannot be SceneMode.MORPHING
     * @exception {DeveloperError} If either direction or up is given, then both are required.
     *
     * @see Scene#animations
     */
    var dirScratch = new Cartesian3();
    var rightScratch = new Cartesian3();
    var upScratch = new Cartesian3();
    CameraFlightPath.createAnimation = function(scene, description) {
        description = defaultValue(description, defaultValue.EMPTY_OBJECT);
        var destination = description.destination;
        var direction = description.direction;
        var up = description.up;

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
        if (scene.frameState.mode === SceneMode.MORPHING) {
            throw new DeveloperError('frameState.mode cannot be SceneMode.MORPHING');
        }
        //>>includeEnd('debug');

        var duration = defaultValue(description.duration, 3000.0);
        var frameState = scene.frameState;
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
        var onComplete = wrapCallback(description.onComplete);
        var onCancel = wrapCallback(description.onCancel);

        var referenceFrame = description.endReferenceFrame;
        if (defined(referenceFrame)) {
            scene.camera.setTransform(referenceFrame);
        }

        var frustum = frameState.camera.frustum;
        if (frameState.mode === SceneMode.SCENE2D) {
            if (Cartesian2.equalsEpsilon(frameState.camera.position, destination, CesiumMath.EPSILON6) && (CesiumMath.equalsEpsilon(Math.max(frustum.right - frustum.left, frustum.top - frustum.bottom), destination.z, CesiumMath.EPSILON6))) {
                return {
                    duration : 0,
                    onComplete : onComplete,
                    onCancel: onCancel
                };
            }
        } else if (Cartesian3.equalsEpsilon(destination, frameState.camera.position, CesiumMath.EPSILON6)) {
            return {
                duration : 0,
                onComplete : onComplete,
                onCancel: onCancel
            };
        }

        if (duration <= 0) {
            var newOnComplete = function() {
                var position = destination;
                if (frameState.mode === SceneMode.SCENE3D) {
                    if (!defined(description.direction) && !defined(description.up)){
                        dirScratch = Cartesian3.normalize(Cartesian3.negate(position, dirScratch), dirScratch);
                        rightScratch = Cartesian3.normalize(Cartesian3.cross(dirScratch, Cartesian3.UNIT_Z, rightScratch), rightScratch);
                    } else {
                        dirScratch = description.direction;
                        rightScratch = Cartesian3.normalize(Cartesian3.cross(dirScratch, description.up, rightScratch), rightScratch);
                    }
                    upScratch = defaultValue(description.up, Cartesian3.cross(rightScratch, dirScratch, upScratch));
                } else {
                    if (!defined(description.direction) && !defined(description.up)){
                        dirScratch = Cartesian3.negate(Cartesian3.UNIT_Z, dirScratch);
                        rightScratch = Cartesian3.normalize(Cartesian3.cross(dirScratch, Cartesian3.UNIT_Y, rightScratch), rightScratch);
                    } else {
                        dirScratch = description.direction;
                        rightScratch = Cartesian3.normalize(Cartesian3.cross(dirScratch, description.up, rightScratch), rightScratch);
                    }
                    upScratch = defaultValue(description.up, Cartesian3.cross(rightScratch, dirScratch, upScratch));
                }

                Cartesian3.clone(position, frameState.camera.position);
                Cartesian3.clone(dirScratch, frameState.camera.direction);
                Cartesian3.clone(upScratch, frameState.camera.up);
                Cartesian3.clone(rightScratch, frameState.camera.right);

                if (frameState.mode === SceneMode.SCENE2D) {
                    var zoom = frameState.camera.position.z;
                    var ratio = frustum.top / frustum.right;

                    var incrementAmount = (zoom - (frustum.right - frustum.left)) * 0.5;
                    frustum.right += incrementAmount;
                    frustum.left -= incrementAmount;
                    frustum.top = ratio * frustum.right;
                    frustum.bottom = -frustum.top;
                }

                if (typeof onComplete === 'function') {
                    onComplete();
                }
            };
            return {
                duration : 0,
                onComplete : newOnComplete,
                onCancel: onCancel
            };
        }

        var update;
        if (frameState.mode === SceneMode.SCENE3D) {
            update = createUpdate3D(frameState, destination, duration, direction, up);
        } else if (frameState.mode === SceneMode.SCENE2D) {
            update = createUpdate2D(frameState, destination, duration, direction, up);
        } else {
            update = createUpdateCV(frameState, destination, duration, direction, up);
        }

        return {
            duration : duration,
            easingFunction : Tween.Easing.Sinusoidal.InOut,
            startValue : {
                time : 0.0
            },
            stopValue : {
                time : duration
            },
            onUpdate : update,
            onComplete : onComplete,
            onCancel: onCancel
        };
    };

    /**
     * Creates an animation to fly the camera from it's current position to a position given by a Cartographic. All arguments should
     * be given in world coordinates.
     *
     * @param {Scene} scene The scene instance to use.
     * @param {Cartographic} description.destination The final position of the camera.
     * @param {Cartesian3} [description.direction] The final direction of the camera. By default, the direction will point towards the center of the frame in 3D and in the negative z direction in Columbus view or 2D.
     * @param {Cartesian3} [description.up] The final up direction. By default, the up direction will point towards local north in 3D and in the positive y direction in Columbus view or 2D.
     * @param {Number} [description.duration=3000] The duration of the animation in milliseconds.
     * @param {Function} [onComplete] The function to execute when the animation has completed.
     * @param {Function} [onCancel] The function to execute if the animation is cancelled.
     * @param {Matrix4} [endReferenceFrame] The reference frame the camera will be in when the flight is completed.
     *
     * @returns {Object} An Object that can be added to an {@link AnimationCollection} for animation.
     *
     * @exception {DeveloperError} frameState.mode cannot be SceneMode.MORPHING
     *
     * @see Scene#animations
     */
    CameraFlightPath.createAnimationCartographic = function(scene, description) {
        description = defaultValue(description, defaultValue.EMPTY_OBJECT);
        var destination = description.destination;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(destination)) {
            throw new DeveloperError('description.destination is required.');
        }
        //>>includeEnd('debug');

        var frameState = scene.frameState;
        var projection = frameState.scene2D.projection;
        if (frameState.mode === SceneMode.SCENE3D) {
            var ellipsoid = projection.ellipsoid;
            ellipsoid.cartographicToCartesian(destination, c3destination);
        } else if (frameState.mode === SceneMode.COLUMBUS_VIEW || frameState.mode === SceneMode.SCENE2D) {
            projection.project(destination, c3destination);
        } else {
            throw new DeveloperError('frameState.mode cannot be SceneMode.MORPHING');
        }

        var createAnimationDescription = clone(description);
        createAnimationDescription.destination = c3destination;
        return this.createAnimation(scene, createAnimationDescription);
    };

    /**
     * Creates an animation to fly the camera from it's current position to a position in which the entire extent will be visible. All arguments should
     * be given in world coordinates.
     *
     * @param {Scene} scene The scene instance to use.
     * @param {Extent} description.destination The final position of the camera.
     * @param {Number} [description.duration=3000] The duration of the animation in milliseconds.
     * @param {Function} [onComplete] The function to execute when the animation has completed.
     * @param {Function} [onCancel] The function to execute if the animation is cancelled.
     * @param {Matrix4} [endReferenceFrame] The reference frame the camera will be in when the flight is completed.
     *
     * @returns {Object} An Object that can be added to an {@link AnimationCollection} for animation.
     *
     * @exception {DeveloperError} frameState.mode cannot be SceneMode.MORPHING
     *
     * @see Scene#animations
     */
    CameraFlightPath.createAnimationExtent = function(scene, description) {
        description = defaultValue(description, defaultValue.EMPTY_OBJECT);
        var extent = description.destination;
        var frameState = scene.frameState;

        //>>includeStart('debug', pragmas.debug);
        if (!defined(frameState)) {
            throw new DeveloperError('frameState is required.');
        }
        if (!defined(extent)) {
            throw new DeveloperError('description.destination is required.');
        }
        if (frameState.mode === SceneMode.MORPHING) {
            throw new DeveloperError('frameState.mode cannot be SceneMode.MORPHING');
        }
        //>>includeEnd('debug');

        var createAnimationDescription = clone(description);
        var camera = frameState.camera;
        camera.getExtentCameraCoordinates(extent, c3destination);

        createAnimationDescription.destination = c3destination;
        return this.createAnimation(scene, createAnimationDescription);
    };

    return CameraFlightPath;
});
