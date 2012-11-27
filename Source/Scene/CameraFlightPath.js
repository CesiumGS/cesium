/*global define*/
define([
        '../Core/defaultValue',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/HermiteSpline',
        '../Core/IntersectionTests',
        '../Core/Math',
        '../Core/Matrix3',
        '../Core/OrientationInterpolator',
        '../Core/Quaternion',
        '../Core/Ray',
        '../Scene/SceneMode',
        '../ThirdParty/Tween'
    ], function(
        defaultValue,
        Cartesian3,
        Cartographic,
        DeveloperError,
        Ellipsoid,
        HermiteSpline,
        IntersectionTests,
        CesiumMath,
        Matrix3,
        OrientationInterpolator,
        Quaternion,
        Ray,
        SceneMode,
        Tween) {
    "use strict";

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

    function createPath3D(camera, ellipsoid, end, duration) {
        var start = camera.position;

        // get minimum altitude from which the whole ellipsoid is visible
        var radius = ellipsoid.getMaximumRadius();

        var frustum = camera.frustum;
        var near = frustum.near;
        var tanTheta = Math.tan(0.5 * frustum.fovy);
        var top = frustum.near * tanTheta;
        var right = frustum.aspectRatio * top;

        var dx = radius * near / right;
        var dy = radius * near / top;
        var maxStartAlt = Math.max(dx, dy);

        var dot = start.normalize().dot(end.normalize());

        var points;
        var altitude;
        var incrementPercentage;
        if (start.magnitude() > maxStartAlt) {
            altitude = radius + 0.6 * (maxStartAlt - radius);
            incrementPercentage = 0.35;
        } else {
            var tanPhi = frustum.aspectRatio * tanTheta;
            var diff = start.subtract(end);
            altitude = diff.multiplyByScalar(0.5).add(end).magnitude();
            var verticalDistance = camera.up.multiplyByScalar(diff.dot(camera.up)).magnitude();
            var horizontalDistance = camera.right.multiplyByScalar(diff.dot(camera.right)).magnitude();
            altitude += Math.max(verticalDistance / tanTheta, horizontalDistance / tanPhi);
            incrementPercentage = CesiumMath.clamp(dot + 1.0, 0.25, 0.5);
        }

        var aboveEnd = end.normalize().multiplyByScalar(altitude);
        var afterStart = start.normalize().multiplyByScalar(altitude);

        var axis, angle, rotation;
        if (start.magnitude() > maxStartAlt && dot > 0) {
            var middle = start.subtract(aboveEnd).multiplyByScalar(0.5).add(aboveEnd);

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

        return new HermiteSpline(points);
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
        if (typeof endDirection !== 'undefined' && typeof up !== 'undefined') {
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

        var end = ellipsoid.cartographicToCartesian(destination);
        var path = createPath3D(camera, ellipsoid, end, duration);
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

    function createPathCV(camera, ellipsoid, end, duration) {
        var start = camera.position;

        // get minimum altitude from which the whole ellipsoid is visible
        var radius = ellipsoid.getMaximumRadius();

        var frustum = camera.frustum;
        var near = frustum.near;
        var tanTheta = Math.tan(0.5 * frustum.fovy);
        var top = frustum.near * tanTheta;
        var right = frustum.aspectRatio * top;

        var dx = radius * near / right;
        var dy = radius * near / top;
        var maxStartAlt = Math.max(dx, dy);

        var dot = start.normalize().dot(end.normalize());

        var points;
        var altitude;
        var incrementPercentage;
        if (start.z > maxStartAlt) {
            altitude = radius + 0.6 * (maxStartAlt - radius);
            incrementPercentage = 0.5;
        } else {
            var tanPhi = frustum.aspectRatio * tanTheta;
            var diff = start.subtract(end);
            altitude = Math.max(Math.abs(diff.y * 0.5) / tanTheta, Math.abs(diff.x * 0.5) / tanPhi);
            incrementPercentage = CesiumMath.clamp(dot + 1.0, 0.25, 0.5);
        }

        var aboveEnd = end.clone();
        aboveEnd.z = altitude;
        var afterStart = start.clone();
        afterStart.z = altitude;

        var axis, angle, rotation;
        if (start.z > maxStartAlt && dot > 0) {
            var middle = start.subtract(aboveEnd).multiplyByScalar(0.5).add(aboveEnd);

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

        return new HermiteSpline(points);
    }

    function createOrientationsCV(camera, points, endDirection, endUp) {
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
        var projection = frameState.scene2D.projection;
        var ellipsoid = projection.getEllipsoid();

        var end = projection.project(destination);
        var path = createPathCV(camera, ellipsoid, end, duration);
        var orientations = createOrientationsCV(camera, path.getControlPoints(), direction, up);

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

    function createPath2D(camera, ellipsoid, end, duration) {
        var start = camera.position.clone();
        start.z = camera.frustum.right - camera.frustum.left;

        // get minimum altitude from which the whole ellipsoid is visible
        var radius = ellipsoid.getMaximumRadius();
        var maxStartAlt = radius * CesiumMath.TWO_PI;

        var dot = start.normalize().dot(end.normalize());

        var points;
        var altitude;
        var incrementPercentage;
        if (start.z > maxStartAlt) {
            altitude = radius + 0.6 * (maxStartAlt - radius);
            incrementPercentage = 0.5;
        } else {
            var diff = start.subtract(end);
            altitude = Math.max(Math.abs(diff.y), Math.abs(diff.x));
            incrementPercentage = CesiumMath.clamp(dot + 1.0, 0.25, 0.5);
        }

        var aboveEnd = end.clone();
        aboveEnd.z = altitude;
        var afterStart = start.clone();
        afterStart.z = altitude;

        var axis, angle, rotation;
        if (start.z > maxStartAlt && dot > 0) {
            var middle = start.subtract(aboveEnd).multiplyByScalar(0.5).add(aboveEnd);

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

        return new HermiteSpline(points);
    }

    function createUpdate2D(frameState, destination, duration, direction, up) {
        var camera = frameState.camera;
        var projection = frameState.scene2D.projection;
        var ellipsoid = projection.getEllipsoid();

        var end = projection.project(destination);
        var path = createPath2D(camera, ellipsoid, end, duration);
        var points = path.getControlPoints();
        var orientations = createOrientationsCV(camera, points, Cartesian3.UNIT_Z.negate(), up);

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

    CameraFlightPath.createAnimation = function(frameState, description) {
        description = defaultValue(description, {});
        var destination = description.destination;
        var direction = description.direction;
        var up = description.up;

        if (typeof destination === 'undefined') {
            throw new DeveloperError('destination is required.');
        }

        if (typeof frameState === 'undefined') {
            throw new DeveloperError('frameState is required.');
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
            easingFunction : Tween.Easing.Sinusoidal.EaseInOut,
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

    return CameraFlightPath;
});