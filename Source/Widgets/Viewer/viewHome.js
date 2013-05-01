/*global define*/
define(['../../Core/Cartesian3',
        '../../Core/Extent',
        '../../Core/Matrix4',
        '../../Core/Math',
        '../../Scene/CameraColumbusViewMode',
        '../../Scene/PerspectiveFrustum',
        '../../Scene/SceneMode'
        ],function(
                Cartesian3,
                Extent,
                Matrix4,
                CesiumMath,
                CameraColumbusViewMode,
                PerspectiveFrustum,
                SceneMode) {
    "use strict";

    /**
     * @private
     */
    function viewHome(scene, transitioner, canvas, ellipsoid, camera3D) {
        var mode = scene.mode;

        var camera = scene.getCamera();
        camera.controller.constrainedAxis = Cartesian3.UNIT_Z;

        var controller = scene.getScreenSpaceCameraController();
        controller.enableTranslate = true;
        controller.enableTilt = true;
        controller.setEllipsoid(ellipsoid);
        controller.columbusViewMode = CameraColumbusViewMode.FREE;

        if (mode === SceneMode.MORPHING) {
            transitioner.completeMorph();
        }

        if (mode === SceneMode.SCENE2D) {
            camera.controller.viewExtent(Extent.MAX_VALUE);
        } else if (mode === SceneMode.SCENE3D) {
            camera3D.position.clone(camera.position);
            camera3D.direction.clone(camera.direction);
            camera3D.up.clone(camera.up);
            camera3D.right.clone(camera.right);
            camera3D.transform.clone(camera.transform);
            camera3D.frustum.clone(camera.frustum);
        } else if (mode === SceneMode.COLUMBUS_VIEW) {
            var transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                                        1.0, 0.0, 0.0, 0.0,
                                        0.0, 1.0, 0.0, 0.0,
                                        0.0, 0.0, 0.0, 1.0);

            var maxRadii = ellipsoid.getMaximumRadius();
            var position = new Cartesian3(0.0, -1.0, 1.0).normalize().multiplyByScalar(5.0 * maxRadii);
            var direction = Cartesian3.ZERO.subtract(position).normalize();
            var right = direction.cross(Cartesian3.UNIT_Z);
            var up = right.cross(direction);
            right = direction.cross(up);
            direction = up.cross(right);

            var frustum = new PerspectiveFrustum();
            frustum.fovy = CesiumMath.toRadians(60.0);
            frustum.aspectRatio = canvas.clientWidth / canvas.clientHeight;

            camera.position = position;
            camera.direction = direction;
            camera.up = up;
            camera.right = right;
            camera.frustum = frustum;
            camera.transform = transform;
        }
    }

    return viewHome;
});