/*global define*/
define([
        '../Core/defaultValue',
        '../Core/Cartesian3',
        '../Core/Cartographic',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/HermiteSpline',
        '../Core/Math',
        '../Core/Matrix3',
        '../Core/OrientationInterpolator',
        '../Core/Quaternion',
        '../ThirdParty/Tween'
    ], function(
        defaultValue,
        Cartesian3,
        Cartographic,
        DeveloperError,
        Ellipsoid,
        HermiteSpline,
        CesiumMath,
        Matrix3,
        OrientationInterpolator,
        Quaternion,
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

    function createPath(camera, ellipsoid, end, duration) {
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

        var altitude, incrementPercentage;
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
            incrementPercentage = 0.5;
        }

        var aboveEnd = end.normalize().multiplyByScalar(altitude);
        var afterStart = start.normalize().multiplyByScalar(altitude);

        var points, axis, angle, rotation;
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

    function createOrientations(camera, end, duration) {
        var direction = end.negate().normalize();
        var right = direction.cross(Cartesian3.UNIT_Z).normalize();
        var up = right.cross(direction);
        var orientationControlPoints = [
            {
                orientation : createQuaternion(camera.direction, camera.up),
                time : 0.0
            },
            {
                orientation : createQuaternion(direction, up),
                time : duration
            }
        ];
        return new OrientationInterpolator(orientationControlPoints);
    }

    CameraFlightPath.createAnimation = function(camera, destination, ellipsoid, duration, onComplete) {
        if (typeof camera === 'undefined') {
            throw new DeveloperError('camera is required.');
        }

        if (typeof destination === 'undefined') {
            throw new DeveloperError('destination is required.');
        }

        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        duration = defaultValue(duration, 3000.0);
        var end = ellipsoid.cartographicToCartesian(destination);

        var path = createPath(camera, ellipsoid, end, duration);
        var orientations = createOrientations(camera, end, duration);

        var update = function(value) {
            var time = value.time;
            var orientation = orientations.evaluate(time);
            var rotationMatrix = Matrix3.fromQuaternion(orientation);

            camera.position = path.evaluate(time);
            camera.right = rotationMatrix.getRow(0);
            camera.up = rotationMatrix.getRow(1);
            camera.direction = rotationMatrix.getRow(2).negate();
        };

        return {
            duration : duration,
            easingFunction : Tween.Easing.Cubic.EaseInOut,
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