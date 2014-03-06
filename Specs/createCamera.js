/*global define*/
define([
        'Core/Math',
        'Core/Cartesian3',
        'Core/defaultValue',
        'Scene/Camera'
    ], function(
        CesiumMath,
        Cartesian3,
        defaultValue,
        Camera) {
    "use strict";

    function createCamera(context, eye, target, up, near, far) {
        eye = defaultValue(eye, new Cartesian3(-1.0, 0.0, 0.0));
        target = defaultValue(target, Cartesian3.ZERO);
        up = defaultValue(up, Cartesian3.UNIT_Z);

        var camera = new Camera(context);
        camera.lookAt(eye, target, up);
        camera.frustum.fovy = CesiumMath.toRadians(60.0);
        camera.frustum.aspectRatio = 1.0;
        camera.frustum.near = defaultValue(near, 0.01);
        camera.frustum.far = defaultValue(far, 10.0);

        return camera;
    }

    return createCamera;
});
