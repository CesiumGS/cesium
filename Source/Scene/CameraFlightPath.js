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
        '../Core/OrientationInterpolator',
        '../Core/Quaternion',
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
        OrientationInterpolator,
        Quaternion,
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

    function createSpline(points) {
        if (points.length > 2) {
            return new HermiteSpline(points);
        }

        // only two points, use linear interpolation
        var p = points[0];
        var q = points[1];

        return {
            getControlPoints : function() {
                return points;
            },

            evaluate : function(time, result) {
                time = CesiumMath.clamp(time, p.time, q.time);
                var t = (time - p.time) / (q.time - p.time);
                return Cartesian3.lerp(p.point, q.point, t, result);
            }
        };
    }

    function createPath3D(camera, ellipsoid, start, end, duration) {
        // get minimum altitude from which the whole ellipsoid is visible
        var radius = ellipsoid.getMaximumRadius();
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
            var verticalDistance = Cartesian3.magnitude(Cartesian3.multiplyByScalar(camera.up, Cartesian3.dot(diff, camera.up)));
            var horizontalDistance = Cartesian3.magnitude(Cartesian3.multiplyByScalar(camera.right, Cartesian3.dot(diff, camera.right)));
            altitude += getAltitude(frustum, verticalDistance, horizontalDistance);
            incrementPercentage = CesiumMath.clamp(dot + 1.0, 0.25, 0.5);
        }

        var aboveEnd = Cartesian3.multiplyByScalar(Cartesian3.normalize(end), altitude);
        var afterStart = Cartesian3.multiplyByScalar(Cartesian3.normalize(start), altitude);

        var axis, angle, rotation, middle;
        if (Cartesian3.magnitude(end) > maxStartAlt && dot > 0.75) {
            middle = Cartesian3.add(Cartesian3.multiplyByScalar(Cartesian3.subtract(start, end), 0.5), end);

            points = [{
                point : start
            }, {
                point : middle
            }, {
                point : end
            }];
        } else if (Cartesian3.magnitude(start) > maxStartAlt && dot > 0) {
            middle = Cartesian3.add(Cartesian3.multiplyByScalar(Cartesian3.subtract(start, aboveEnd), 0.5), aboveEnd);

            points = [{
                point : start
            }, {
                point : middle
            }, {
                point : end
            }];
        } else {
            points = [{
                point : start
            }];

            angle = Math.acos(Cartesian3.dot(Cartesian3.normalize(afterStart), Cartesian3.normalize(aboveEnd)));
            axis = Cartesian3.cross(afterStart, aboveEnd);
            if (Cartesian3.equalsEpsilon(axis, Cartesian3.ZERO, CesiumMath.EPSILON6)) {
                axis = Cartesian3.UNIT_Z;
            }

            var increment = incrementPercentage * angle;
            var startCondition = angle - increment;
            for ( var i = startCondition; i > 0.0; i = i - increment) {
                rotation = Matrix3.fromQuaternion(Quaternion.fromAxisAngle(axis, i));
                points.push({
                    point : rotation.multiplyByVector(aboveEnd)
                });
            }

            points.push({
                point : end
            });
        }

        var scalar = duration / (points.length - 1);
        for ( var k = 0; k < points.length; ++k) {
            points[k].time = k * scalar;
        }

        return createSpline(points);
    }
    var direction3D = new Cartesian3();
    var right3D = new Cartesian3();
    var up3D = new Cartesian3();
    var quat3D = new Quaternion();
    function createOrientations3D(camera, points, endDirection, endUp) {
        points[0].orientation = createQuaternion(camera.direction, camera.up);
        var point;
        var length = points.length - 1;
        for (var i = 1; i < length; ++i) {
            point = points[i];
            Cartesian3.normalize(Cartesian3.negate(point.point, direction3D), direction3D);
            Cartesian3.normalize(Cartesian3.cross(direction3D, Cartesian3.UNIT_Z, right3D), right3D);
            Cartesian3.cross(right3D, direction3D, up3D);
            point.orientation = createQuaternion(direction3D, up3D, quat3D);
        }

        point = points[length];
        if (defined(endDirection) && defined(endUp)) {
            point.orientation = createQuaternion(endDirection, endUp);
        } else {
            Cartesian3.normalize(Cartesian3.negate(point.point, direction3D), direction3D);
            Cartesian3.normalize(Cartesian3.cross(direction3D, Cartesian3.UNIT_Z, right3D), right3D);
            Cartesian3.cross(right3D, direction3D, up3D);
            point.orientation = createQuaternion(direction3D, up3D, quat3D);
        }

        return new OrientationInterpolator(points);
    }

    function createUpdate3D(frameState, destination, duration, direction, up) {
        var camera = frameState.camera;
        var ellipsoid = frameState.scene2D.projection.getEllipsoid();

        var path = createPath3D(camera, ellipsoid, camera.position, destination, duration);
        var orientations = createOrientations3D(camera, path.getControlPoints(), direction, up);

        var update = function(value) {
            var time = value.time;
            var orientation = orientations.evaluate(time);
            Matrix3.fromQuaternion(orientation, rotMatrix);

            camera.position = path.evaluate(time, camera.position);
            camera.right = rotMatrix.getRow(0, camera.right);
            camera.up = rotMatrix.getRow(1, camera.up);
            camera.direction = Cartesian3.negate(rotMatrix.getRow(2, camera.direction), camera.direction);
        };

        return update;
    }

    function createPath2D(camera, ellipsoid, start, end, duration) {
        // get minimum altitude from which the whole map is visible
        var radius = ellipsoid.getMaximumRadius();
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

            points = [{
                point : start
            }, {
                point : middle
            }, {
                point : end
            }];
        } else if (start.z > maxStartAlt) {
            middle = Cartesian3.add(Cartesian3.multiplyByScalar(Cartesian3.subtract(start, aboveEnd), 0.5), aboveEnd);

            points = [{
                point : start
            }, {
                point : middle
            }, {
                point : end
            }];
        } else {
            points = [{
                point : start
            }];

            var v = Cartesian3.subtract(afterStart, aboveEnd);
            var distance = Cartesian3.magnitude(v);
            Cartesian3.normalize(v, v);

            var increment = incrementPercentage * distance;
            var startCondition = distance - increment;
            for ( var i = startCondition; i > 0.0; i = i - increment) {
                points.push({
                    point : Cartesian3.add(Cartesian3.multiplyByScalar(v, i), aboveEnd)
                });
            }

            points.push({
                point : end
            });
        }

        var scalar = duration / (points.length - 1);
        for ( var k = 0; k < points.length; ++k) {
            points[k].time = k * scalar;
        }

        return createSpline(points);
    }

    var direction2D = Cartesian3.negate(Cartesian3.UNIT_Z);
    var right2D = Cartesian3.normalize(Cartesian3.cross(direction2D, Cartesian3.UNIT_Y));
    var up2D = Cartesian3.cross(right2D, direction2D);
    var quat = createQuaternion(direction2D, up2D);
    function createOrientations2D(camera, points, endDirection, endUp) {
        points[0].orientation = createQuaternion(camera.direction, camera.up);
        var point;
        var length = points.length - 1;
        for (var i = 1; i < length; ++i) {
            point = points[i];
            point.orientation = quat;
        }

        point = points[length];
        if (defined(endDirection) && defined(endUp)) {
            point.orientation = createQuaternion(endDirection, endUp);
        } else {
            point.orientation = quat;
        }

        return new OrientationInterpolator(points);
    }

    function createUpdateCV(frameState, destination, duration, direction, up) {
        var camera = frameState.camera;
        var ellipsoid = frameState.scene2D.projection.getEllipsoid();

        var path = createPath2D(camera, ellipsoid, Cartesian3.clone(camera.position), destination, duration);
        var orientations = createOrientations2D(camera, path.getControlPoints(), direction, up);

        var update = function(value) {
            var time = value.time;
            var orientation = orientations.evaluate(time);
            Matrix3.fromQuaternion(orientation, rotMatrix);

            camera.position = path.evaluate(time, camera.position);
            camera.right = rotMatrix.getRow(0, camera.right);
            camera.up = rotMatrix.getRow(1, camera.up);
            camera.direction = Cartesian3.negate(rotMatrix.getRow(2, camera.direction), camera.direction);
        };

        return update;
    }

    function createUpdate2D(frameState, destination, duration, direction, up) {
        var camera = frameState.camera;
        var ellipsoid = frameState.scene2D.projection.getEllipsoid();

        var start = Cartesian3.clone(camera.position);
        start.z = camera.frustum.right - camera.frustum.left;

        var path = createPath2D(camera, ellipsoid, start, destination, duration);
        var points = path.getControlPoints();
        var orientations = createOrientations2D(camera, points, Cartesian3.negate(Cartesian3.UNIT_Z), up);

        var height = camera.position.z;

        var update = function(value) {
            var time = value.time;
            var orientation = orientations.evaluate(time);
            Matrix3.fromQuaternion(orientation, rotMatrix);

            camera.position = path.evaluate(time, camera.position);
            var zoom = camera.position.z;
            camera.position.z = height;

            camera.right = rotMatrix.getRow(0, camera.right);
            camera.up = rotMatrix.getRow(1, camera.up);
            camera.direction = Cartesian3.negate(rotMatrix.getRow(2, camera.direction), camera.direction);

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

    function disableInput(controller) {
      var backup = {
          enableTranslate: controller.enableTranslate,
          enableZoom: controller.enableZoom,
          enableRotate: controller.enableRotate,
          enableTilt: controller.enableTilt,
          enableLook: controller.enableLook
      };
      controller.enableTranslate = false;
      controller.enableZoom = false;
      controller.enableRotate = false;
      controller.enableTilt = false;
      controller.enableLook = false;
      return backup;
    }

    function restoreInput(controller, backup) {
      controller.enableTranslate = backup.enableTranslate;
      controller.enableZoom = backup.enableZoom;
      controller.enableRotate = backup.enableRotate;
      controller.enableTilt = backup.enableTilt;
      controller.enableLook = backup.enableLook;
    }

    /**
     * Creates an animation to fly the camera from it's current position to a position given by a Cartesian. All arguments should
     * be in the current camera reference frame.
     *
     * @param {Scene} scene The scene instance to use.
     * @param {Cartesian3} description.destination The final position of the camera.
     * @param {Cartesian3} [description.direction] The final direction of the camera. By default, the direction will point towards the center of the frame in 3D and in the negative z direction in Columbus view or 2D.
     * @param {Cartesian3} [description.up] The final up direction. By default, the up direction will point towards local north in 3D and in the positive y direction in Columbus view or 2D.
     * @param {Number} [description.duration=3000] The duration of the animation in milliseconds.
     * @param {Function} [onComplete] The function to execute when the animation has completed.
     * @param {Function} [onCancel] The function to execute if the animation is cancelled.
     *
     * @returns {Object} An Object that can be added to an {@link AnimationCollection} for animation.
     *
     * @exception {DeveloperError} scene is required.
     * @exception {DeveloperError} description.destination is required.
     * @exception {DeveloperError} frameState.mode cannot be SceneMode.MORPHING
     *
     * @see Scene#getAnimations
     */
    var dirScratch = new Cartesian3();
    var rightScratch = new Cartesian3();
    var upScratch = new Cartesian3();
    CameraFlightPath.createAnimation = function(scene, description) {
        description = defaultValue(description, defaultValue.EMPTY_OBJECT);
        var destination = description.destination;

        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(destination)) {
            throw new DeveloperError('destination is required.');
        }
        var frameState = scene.getFrameState();
        if (frameState.mode === SceneMode.MORPHING) {
            throw new DeveloperError('frameState.mode cannot be SceneMode.MORPHING');
        }

        var direction = description.direction;
        var up = description.up;
        var duration = defaultValue(description.duration, 3000.0);

        var controller = scene.getScreenSpaceCameraController();
        var backup = disableInput(controller);
        var wrapCallback = function(cb) {
            var wrapped = function() {
                if (typeof cb === 'function') {
                    cb();
                }
                restoreInput(controller, backup);
            };
            return wrapped;
        };
        var onComplete = wrapCallback(description.onComplete);
        var onCancel = wrapCallback(description.onCancel);

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
     * Creates an animation to fly the camera from it's current position to a position given by a Cartographic. Keep in mind that the animation
     * will happen in the camera's current reference frame.
     *
     * @param {Scene} scene The scene instance to use.
     * @param {Cartographic} description.destination The final position of the camera.
     * @param {Cartesian3} [description.direction] The final direction of the camera. By default, the direction will point towards the center of the frame in 3D and in the negative z direction in Columbus view or 2D.
     * @param {Cartesian3} [description.up] The final up direction. By default, the up direction will point towards local north in 3D and in the positive y direction in Columbus view or 2D.
     * @param {Number} [description.duration=3000] The duration of the animation in milliseconds.
     * @param {Function} [onComplete] The function to execute when the animation has completed.
     * @param {Function} [onCancel] The function to execute if the animation is cancelled.
     *
     * @returns {Object} An Object that can be added to an {@link AnimationCollection} for animation.
     *
     * @exception {DeveloperError} scene is required.
     * @exception {DeveloperError} description.destination is required.
     * @exception {DeveloperError} frameState.mode cannot be SceneMode.MORPHING
     *
     * @see Scene#getAnimations
     */
    CameraFlightPath.createAnimationCartographic = function(scene, description) {
        description = defaultValue(description, defaultValue.EMPTY_OBJECT);
        var destination = description.destination;

        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        if (!defined(destination)) {
            throw new DeveloperError('description.destination is required.');
        }

        var frameState = scene.getFrameState();
        var projection = frameState.scene2D.projection;
        if (frameState.mode === SceneMode.SCENE3D) {
            var ellipsoid = projection.getEllipsoid();
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
     * Creates an animation to fly the camera from it's current position to a position in which the entire extent will be visible. Keep in mind that the animation
     * will happen in the camera's current reference frame.
     *
     * @param {Scene} scene The scene instance to use.
     * @param {Extent} description.destination The final position of the camera.
     * @param {Number} [description.duration=3000] The duration of the animation in milliseconds.
     * @param {Function} [onComplete] The function to execute when the animation has completed.
     * @param {Function} [onCancel] The function to execute if the animation is cancelled.
     *
     * @returns {Object} An Object that can be added to an {@link AnimationCollection} for animation.
     *
     * @exception {DeveloperError} scene is required.
     * @exception {DeveloperError} description.destination is required.
     * @exception {DeveloperError} frameState.mode cannot be SceneMode.MORPHING
     *
     * @see Scene#getAnimations
     */
    CameraFlightPath.createAnimationExtent = function(scene, description) {
        description = defaultValue(description, defaultValue.EMPTY_OBJECT);
        var extent = description.destination;
        var frameState = scene.getFrameState();
        if (!defined(frameState)) {
            throw new DeveloperError('frameState is required.');
        }
        if (!defined(extent)) {
            throw new DeveloperError('description.destination is required.');
        }
        if (frameState.mode === SceneMode.MORPHING) {
            throw new DeveloperError('frameState.mode cannot be SceneMode.MORPHING');
        }

        var createAnimationDescription = clone(description);
        var camera = frameState.camera;
        camera.controller.getExtentCameraCoordinates(extent, c3destination);

        createAnimationDescription.destination = c3destination;
        return this.createAnimation(scene, createAnimationDescription);
    };



    // -- PROTOTYPE PART - Animate KML gx:Tour sequence -- //


    /**
     * Calculates default camera direction matrix based on input location
     * By default a cinematic camera should look exactly at the center of ellipsoid
     * Its up vector always points towards geograpic North.
     *
     * @param {Geographic} loc Actual geographic location
     * @param {Ellipsoid} ell Ellipsoid
     *
     * @returns {Matrix3} Matrix containing three column vectors: right, up and direction
     */
    var generateOrientationMatrix = function(loc, ell) {
        // Surface Normal
        var sNorm = ell.geodeticSurfaceNormalCartographic(loc);


        // calculate cinematic camera up and dir vectors
        // i.  sNorm X North => Left
        var myLeft = sNorm.cross( Cartesian3.UNIT_Z ).normalize();
        // ii. Left X Up => dir (north)
        var upp = myLeft.cross(sNorm);  // upp should point to North
        var dirr = sNorm.negate();      // dirr should point to the center

        var myRight = myLeft.negate();

        // prepare rotation matrix (R U D)
        var mat1 = new Matrix3(
            myRight.x, upp.x, dirr.x,
            myRight.y, upp.y, dirr.y,
            myRight.z, upp.z, dirr.z
        );
        return mat1;
    };


    /**
     * Apply rotations to cam orientation matrix
     * - Heading
     * - Tilt
     * - Rotation
     *
     * @see https://developers.google.com/kml/documentation/cameras
     *  
     * @param {Matrix3} mat Cam orientation matrix (R U D)
     * @param {number} h Heading as compass angle in degrees (0 < h < 360), 0 = North
     * @param {number} t Tilt Horizontal tilting angle in degrees. (-180 < t < 180), 0 = Down, 90 = Head forward
     * @param {number} r Left-right rotation angle in degrees. (-180 < t < 180)
     *
     * @returns {Matrix3} Matrix having rotations applied to.
     */
    var rotCameraMatrix = function(mat, h, t, r){
        var mh, mt, mr;

        // Heading
        if (h === 0) {
            mh = Matrix3.IDENTITY;
        } else {
            mh = Matrix3.fromRotationZ(CesiumMath.toRadians( 360-h ));
        }

        // Tilt
        if (t >= 0) {
            mt = Matrix3.fromRotationX(CesiumMath.toRadians( -t ));
        } else {
            // TBD
            mt = Matrix3.IDENTITY;
        }
        
        // Roll (-180 < 0 < 180)
        if (r === 0) {
            mr = Matrix3.IDENTITY;
        } else {
            mr = Matrix3.fromRotationY(CesiumMath.toRadians( -r ));
        }
        
        // mat = mat.multiply(mx).multiply(my).multiply(mz);

        Matrix3.multiply(mat, mh, mat);
        Matrix3.multiply(mat, mt, mat);
        // FIXME - this is bogus!
        Matrix3.multiply(mat, mr, mat);

        return mat;
    };



    /**
     * Creates an animation to fly the camera from it's current position through a complete tour route to its final position.
     * Keep in mind that the animation will happen in the camera's current reference frame.
     *
     * Note: although it should work, the function lack some features, such as
     * - processing 'wait' items. Currently they are skipped.
     *
     * Known issues:
     * - left-right rotation is bogus. It interferes with heading although it should not.
     * - never reaches end location.
     *
     * @param {FrameState} frameState The current frame state.
     * @param {Object} tour gxTour structure.
     * @param {Object} options TBD
     *
     * @exception {DeveloperError} frameState parameter is required.
     * @exception {DeveloperError} tour parameter is required.
     * 
     * @see processGxTour.js
     */
    CameraFlightPath.createGxTourAnimation = function(frameState, tour, options) {
        var locations = [];         // sequence of geographic locations
        var orientations = [];      // sequence of {direction, up} objects
        var durations = [];         // sequence of anim durations
        var totalDuration = 0;


        var i,j;
        var node;
        var mat1;
        var rmat;
        var v1, v2, v11, v22;


        if (typeof frameState === 'undefined') {
            throw new DeveloperError('frameState is required.');
        }
        if (typeof tour === 'undefined') {
            throw new DeveloperError('tour is required.');
        }

        if (frameState.mode !== SceneMode.SCENE3D) {
            throw new DeveloperError('Only 3D mode is supported.');
        }

        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var speed = defaultValue(options.speed, 1);

        var _ellipsoid = frameState.scene2D.projection.getEllipsoid();





        // Main Loop: Process Tour Nodes
        // expects objects having structure:
        //   {type: 'flyTo', camera:{location: {Cartographic}, orientation:[...], time: {number} }}
        for (i=0; i<tour.length; i++) {
            node = defaultValue(tour[i], defaultValue.EMPTY_OBJECT);

            if (node.type === 'flyTo') {
                // generate camera orientation matrix (Right,Up,Dir)
                mat1 = generateOrientationMatrix(node.camera.location, _ellipsoid);
                // apply camera rotations
                mat1 = rotCameraMatrix(mat1,
                    node.camera.orientation[0],
                    node.camera.orientation[1],
                    node.camera.orientation[2]
                );

                v1 = mat1.getColumn(1); /*rmat.multiplyByVector(mat1.getColumn(1), v1);*/ // up
                v2 = mat1.getColumn(2); /* rmat.multiplyByVector(mat1.getColumn(2), v2); */ // dir
                // v11 = rmat.multiplyByVector(v1); // up
                // v22 = rmat.multiplyByVector(v2); // dir

                // Store results
                // Cartograpic!
                locations.push( node.camera.location );
                orientations.push({
                    direction: v2,
                    up: v1
                });
                durations.push( node.duration / speed );
            } else {
                // TBD handle 'wait' nodes
            }
        }


        // Generate the animation route

        var myUpdate = (function(_frameState) {
            var camera = _frameState.camera;
            var rotMatrix = new Matrix3();
            var _ell = _frameState.scene2D.projection.getEllipsoid();

            var _pts = [];   // route control points
            var k;
            var t=0;         // time offset
            var pt, ori;
            for (k=0; k<locations.length; k++) {
                pt = _ell.cartographicToCartesian(locations[k]);
                // set orientations too
                ori = createQuaternion(orientations[k].direction, orientations[k].up);

                _pts.push({point: pt, time: t, orientation: ori});
                t += durations[k];
            }
            var path = createSpline(_pts);



            var _orientations = new OrientationInterpolator(_pts);

            return function(value) {
                var time = value.time;
                var orientation = _orientations.evaluate(time);
                Matrix3.fromQuaternion(orientation, rotMatrix);

                camera.position = path.evaluate(time, camera.position);
                camera.right = rotMatrix.getRow(0, camera.right);
                camera.up = rotMatrix.getRow(1, camera.up);
                camera.direction = rotMatrix.getRow(2, camera.direction).negate(camera.direction);
            };
        })(frameState);


        // calculate total duration
        totalDuration = 0;
        for (i=0; i<durations.length; i++) {
            totalDuration += durations[i];
        }

        // finally, construct animation object
        return {
            duration : totalDuration,
            easingFunction : Tween.Easing.Linear.None,
            startValue : {
                time : 0.0
            },
            stopValue : {
                time : totalDuration
            },
            onUpdate : myUpdate,
            onComplete : options.onCompleteCallback
        };
    };



    return CameraFlightPath;
});
