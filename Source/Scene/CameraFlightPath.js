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
        var viewMat = new Matrix3( right.x,      right.y,      right.z,
                                   up.x,         up.y,         up.z,
                                  -direction.x, -direction.y, -direction.z);
        return Quaternion.fromRotationMatrix(viewMat);
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

        var start = camera.position;
        var end = ellipsoid.cartographicToCartesian(destination);
        var startCart = ellipsoid.cartesianToCartographic(start);

        var halfDistance = start.subtract(end).magnitude() * 0.5;

        var midCart = new Cartographic();
        midCart.longitude = CesiumMath.lerp(startCart.longitude, destination.longitude, 0.25);
        midCart.latitude = CesiumMath.lerp(startCart.latitude, destination.latitude, 0.25);
        midCart.height = halfDistance;
        var mid0 = ellipsoid.cartographicToCartesian(midCart);
        midCart.longitude = CesiumMath.lerp(startCart.longitude, destination.longitude, 0.75);
        midCart.latitude = CesiumMath.lerp(startCart.latitude, destination.latitude, 0.75);
        midCart.height = halfDistance;
        var mid1 = ellipsoid.cartographicToCartesian(midCart);

        var points = [
            {
                point : start,
                time : 0.0
            },
            {
                point : mid0,
                time : 0.25
            },
            {
                point : mid1,
                time : 0.75
            },
            {
                point : end,
                time : 1.0
            }
        ];
        var path = new HermiteSpline(points);

        var direction = end.negate().normalize();
        var up = direction.cross(points[3].tangent).normalize();
        var orientationControlPoints = [
            {
                orientation : createQuaternion(camera.direction, camera.up),
                time : 0.0
            },
            {
                orientation : createQuaternion(direction, up),
                time : 1.0
            }
        ];
        var orientations = new OrientationInterpolator(orientationControlPoints);

        var update = function(value) {
            var time = value.time;
            var orientation = orientations.evaluate(time);
            var rotationMatrix = Matrix3.fromQuaternion(orientation);

            camera.position = path.evaluate(time);
            camera.right = rotationMatrix.getColumn(0);
            camera.up = rotationMatrix.getColumn(1);
            camera.direction = rotationMatrix.getColumn(2).negate();
        };

        return {
            duration : duration,
            easingFunction : Tween.Easing.Cubic.EaseInOut,
            startValue : {
                time : 0.0
            },
            stopValue : {
                time : 1.0
            },
            onUpdate : update,
            onComplete : onComplete
        };
    };

    return CameraFlightPath;
});