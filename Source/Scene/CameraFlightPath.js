/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/clone',
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/HermiteSpline',
        '../Core/IntersectionTests',
        '../Core/Math',
        '../Core/Matrix3',
        '../Core/OrientationInterpolator',
        '../Core/Quaternion',
        '../Core/Ray',
        '../Scene/PerspectiveFrustum',
        '../Scene/PerspectiveOffCenterFrustum',
        '../Scene/SceneMode',
        '../ThirdParty/Tween'
    ], function(
        Cartesian3,
        Cartographic,
        clone,
        defaultValue,
        DeveloperError,
        Ellipsoid,
        HermiteSpline,
        IntersectionTests,
        CesiumMath,
        Matrix3,
        OrientationInterpolator,
        Quaternion,
        Ray,
        PerspectiveFrustum,
        PerspectiveOffCenterFrustum,
        SceneMode,
        Tween) {
    "use strict";

    /**
     * Creates animations for camera flights.
     * @exports CameraFlightPath
     */
    var CameraFlightPath = {
    };

    function createQuaternion(direction, up) {
        var right = direction.cross(up);
        up = right.cross(direction);
        var viewMat = new Matrix3( right.x,      right.y,      right.z,
                                   up.x,         up.y,         up.z,
                                  -direction.x, -direction.y, -direction.z);
        return Quaternion.fromRotationMatrix(viewMat);
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

            evaluate : function(time) {
                time = CesiumMath.clamp(time, p.time, q.time);
                var t = (time - p.time) / (q.time - p.time);
                return Cartesian3.lerp(p.point, q.point, t);
            }
        };
    }

    function createPath3D(camera, ellipsoid, start, end, duration) {
        // get minimum altitude from which the whole ellipsoid is visible
        var radius = ellipsoid.getMaximumRadius();
        var frustum = camera.frustum;
        var maxStartAlt = getAltitude(frustum, radius, radius);

        var dot = start.normalize().dot(end.normalize());

        var points;
        var altitude;
        var incrementPercentage;
        if (start.magnitude() > maxStartAlt) {
            altitude = radius + 0.6 * (maxStartAlt - radius);
            incrementPercentage = 0.35;
        } else {
            var diff = start.subtract(end);
            altitude = diff.multiplyByScalar(0.5).add(end).magnitude();
            var verticalDistance = camera.up.multiplyByScalar(diff.dot(camera.up)).magnitude();
            var horizontalDistance = camera.right.multiplyByScalar(diff.dot(camera.right)).magnitude();
            altitude += getAltitude(frustum, verticalDistance, horizontalDistance);
            incrementPercentage = CesiumMath.clamp(dot + 1.0, 0.25, 0.5);
        }

        var aboveEnd = end.normalize().multiplyByScalar(altitude);
        var afterStart = start.normalize().multiplyByScalar(altitude);

        var axis, angle, rotation, middle;
        if (end.magnitude() > maxStartAlt && dot > 0.75) {
            middle = start.subtract(end).multiplyByScalar(0.5).add(end);

            points = [{
                point : start
            }, {
                point : middle
            }, {
                point : end
            }];
        } else if (start.magnitude() > maxStartAlt && dot > 0) {
            middle = start.subtract(aboveEnd).multiplyByScalar(0.5).add(aboveEnd);

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

            angle = Math.acos(afterStart.normalize().dot(aboveEnd.normalize()));
            axis = afterStart.cross(aboveEnd);
            if (axis.equalsEpsilon(Cartesian3.ZERO, CesiumMath.EPSILON6)) {
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

    function createOrientations3D(camera, points, endDirection, endUp) {
        points[0].orientation = createQuaternion(camera.direction, camera.up);

        var point;
        var direction;
        var right;
        var up;

        var length = points.length - 1;
        for (var i = 1; i < length; ++i) {
            point = points[i];
            direction = point.point.negate().normalize();
            right = direction.cross(Cartesian3.UNIT_Z).normalize();
            up = right.cross(direction);
            point.orientation = createQuaternion(direction, up);
        }

        point = points[length];
        if (typeof endDirection !== 'undefined' && typeof endUp !== 'undefined') {
            point.orientation = createQuaternion(endDirection, endUp);
        } else {
            direction = point.point.negate().normalize();
            right = direction.cross(Cartesian3.UNIT_Z).normalize();
            up = right.cross(direction);
            point.orientation = createQuaternion(direction, up);
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
            var rotationMatrix = Matrix3.fromQuaternion(orientation);

            camera.position = path.evaluate(time);
            camera.right = rotationMatrix.getRow(0);
            camera.up = rotationMatrix.getRow(1);
            camera.direction = rotationMatrix.getRow(2).negate();
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
            var diff = start.subtract(end);
            altitude = getAltitude(frustum, Math.abs(diff.y), Math.abs(diff.x));
        }

        var aboveEnd = end.clone();
        aboveEnd.z = altitude;
        var afterStart = start.clone();
        afterStart.z = altitude;

        var middle;
        if (end.z > maxStartAlt) {
            middle = start.subtract(end).multiplyByScalar(0.5).add(end);

            points = [{
                point : start
            }, {
                point : middle
            }, {
                point : end
            }];
        } else if (start.z > maxStartAlt) {
            middle = start.subtract(aboveEnd).multiplyByScalar(0.5).add(aboveEnd);

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

            var v = afterStart.subtract(aboveEnd);
            var distance = v.magnitude();
            Cartesian3.normalize(v, v);

            var increment = incrementPercentage * distance;
            var startCondition = distance - increment;
            for ( var i = startCondition; i > 0.0; i = i - increment) {
                points.push({
                    point : v.multiplyByScalar(i).add(aboveEnd)
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

    function createOrientations2D(camera, points, endDirection, endUp) {
        points[0].orientation = createQuaternion(camera.direction, camera.up);

        var point;
        var direction;
        var right;
        var up;

        var length = points.length - 1;
        for (var i = 1; i < length; ++i) {
            point = points[i];
            direction = Cartesian3.UNIT_Z.negate();
            right = direction.cross(Cartesian3.UNIT_Y).normalize();
            up = right.cross(direction);
            point.orientation = createQuaternion(direction, up);
        }

        point = points[length];
        if (typeof endDirection !== 'undefined' && typeof endUp !== 'undefined') {
            point.orientation = createQuaternion(endDirection, endUp);
        } else {
            direction = Cartesian3.UNIT_Z.negate();
            right = direction.cross(Cartesian3.UNIT_Y).normalize();
            up = right.cross(direction);
            point.orientation = createQuaternion(direction, up);
        }

        return new OrientationInterpolator(points);
    }

    function createUpdateCV(frameState, destination, duration, direction, up) {
        var camera = frameState.camera;
        var ellipsoid = frameState.scene2D.projection.getEllipsoid();

        var path = createPath2D(camera, ellipsoid, camera.position.clone(), destination, duration);
        var orientations = createOrientations2D(camera, path.getControlPoints(), direction, up);

        var update = function(value) {
            var time = value.time;
            var orientation = orientations.evaluate(time);
            var rotationMatrix = Matrix3.fromQuaternion(orientation);

            camera.position = path.evaluate(time);
            camera.right = rotationMatrix.getRow(0);
            camera.up = rotationMatrix.getRow(1);
            camera.direction = rotationMatrix.getRow(2).negate();
        };

        return update;
    }

    function createUpdate2D(frameState, destination, duration, direction, up) {
        var camera = frameState.camera;
        var ellipsoid = frameState.scene2D.projection.getEllipsoid();

        var start = camera.position.clone();
        start.z = camera.frustum.right - camera.frustum.left;

        var path = createPath2D(camera, ellipsoid, start, destination, duration);
        var points = path.getControlPoints();
        var orientations = createOrientations2D(camera, points, Cartesian3.UNIT_Z.negate(), up);

        var height = camera.position.z;

        var update = function(value) {
            var time = value.time;
            var orientation = orientations.evaluate(time);
            var rotationMatrix = Matrix3.fromQuaternion(orientation);

            camera.position = path.evaluate(time);
            var zoom = camera.position.z;
            camera.position.z = height;

            camera.right = rotationMatrix.getRow(0);
            camera.up = rotationMatrix.getRow(1);
            camera.direction = rotationMatrix.getRow(2).negate();

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
     * be in the current camera reference frame.
     *
     * @param {FrameState} frameState The current frame state.
     * @param {Cartesian3} description.destination The final position of the camera.
     * @param {Cartesian3} [description.direction] The final direction of the camera. By default, the direction will point towards the center of the frame in 3D and in the negative z direction in Columbus view or 2D.
     * @param {Cartesian3} [description.up] The final up direction. By default, the up direction will point towards local north in 3D and in the positive y direction in Columbus view or 2D.
     * @param {Number} [description.duration=3000] The duration of the animation in milliseconds.
     * @param {Function} [onComplete] The function to execute when the animation has completed.
     *
     * @returns {Object} An Object that can be added to an {@link AnimationCollection} for animation.
     *
     * @exception {DeveloperError} frameState is required.
     * @exception {DeveloperError} description.destination is required.
     *
     * @see Scene#getFrameState
     * @see Scene#getAnimationCollection
     * @see CameraFlightPath#createAnimationCartographic
     */
    CameraFlightPath.createAnimation = function(frameState, description) {
        description = defaultValue(description, defaultValue.EMPTY_OBJECT);
        var destination = description.destination;
        var direction = description.direction;
        var up = description.up;

        if (typeof frameState === 'undefined') {
            throw new DeveloperError('frameState is required.');
        }

        if (typeof destination === 'undefined') {
            throw new DeveloperError('destination is required.');
        }

        var duration = defaultValue(description.duration, 3000.0);
        var onComplete = description.onComplete;

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
            onComplete : onComplete
        };
    };

    /**
     * Creates an animation to fly the camera from it's current position to a position given by a Cartographic. Keep in mind that the animation
     * will happen in the camera's current reference frame.
     *
     * @param {FrameState} frameState The current frame state.
     * @param {Cartesian3} description.destination The final position of the camera.
     * @param {Cartesian3} [description.direction] The final direction of the camera. By default, the direction will point towards the center of the frame in 3D and in the negative z direction in Columbus view or 2D.
     * @param {Cartesian3} [description.up] The final up direction. By default, the up direction will point towards local north in 3D and in the positive y direction in Columbus view or 2D.
     * @param {Number} [description.duration=3000] The duration of the animation in milliseconds.
     * @param {Function} [onComplete] The function to execute when the animation has completed.
     *
     * @returns {Object} An Object that can be added to an {@link AnimationCollection} for animation.
     *
     * @exception {DeveloperError} frameState is required.
     * @exception {DeveloperError} description.destination is required.
     *
     * @see Scene#getFrameState
     * @see Scene#getAnimationCollection
     * @see CameraFlightPath#createAnimationCartographic
     */
    CameraFlightPath.createAnimationCartographic = function(frameState, description) {
        description = defaultValue(description, defaultValue.EMPTY_OBJECT);
        var destination = description.destination;

        if (typeof frameState === 'undefined') {
            throw new DeveloperError('frameState is required.');
        }

        if (typeof destination === 'undefined') {
            throw new DeveloperError('description.destination is required.');
        }

        var end;
        var projection = frameState.scene2D.projection;
        if (frameState.mode === SceneMode.SCENE3D) {
            var ellipsoid = projection.getEllipsoid();
            end = ellipsoid.cartographicToCartesian(destination);
        } else {
            end = projection.project(destination);
        }

        var createAnimationDescription = clone(description);
        createAnimationDescription.destination = end;
        return this.createAnimation(frameState, createAnimationDescription);
    };

    return CameraFlightPath;
});