/*global define*/
define(['../createCommand',
        '../../Core/defaultValue',
        '../../Core/Cartesian3',
        '../../Core/DeveloperError',
        '../../Core/Ellipsoid',
        '../../Core/Extent',
        '../../Core/Math',
        '../../Core/Matrix4',
        '../../Scene/Camera',
        '../../Scene/CameraColumbusViewMode',
        '../../Scene/CameraFlightPath',
        '../../Scene/PerspectiveFrustum',
        '../../Scene/SceneMode',
        '../../ThirdParty/knockout'
        ], function(
            createCommand,
            defaultValue,
            Cartesian3,
            DeveloperError,
            Ellipsoid,
            Extent,
            CesiumMath,
            Matrix4,
            Camera,
            CameraColumbusViewMode,
            CameraFlightPath,
            PerspectiveFrustum,
            SceneMode,
            knockout) {
    "use strict";

    function viewHome(scene, ellipsoid, transitioner, flightDuration) {
        var mode = scene.mode;

        var camera = scene.getCamera();
        camera.controller.constrainedAxis = Cartesian3.UNIT_Z;

        var controller = scene.getScreenSpaceCameraController();
        controller.enableTranslate = true;
        controller.enableTilt = true;
        controller.setEllipsoid(ellipsoid);
        controller.columbusViewMode = CameraColumbusViewMode.FREE;

        var canvas = scene.getCanvas();
        if (typeof transitioner !== 'undefined' && mode === SceneMode.MORPHING) {
            transitioner.completeMorph();
        }
        var flight;
        var description;

        if (mode === SceneMode.SCENE2D) {
            camera.transform = new Matrix4(0, 0, 1, 0,
                    1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 0, 1);
            description = {
                    destination: Extent.MAX_VALUE,
                    duration: flightDuration
                };
            flight = CameraFlightPath.createAnimationExtent(scene.getFrameState(), description);
            scene.getAnimations().add(flight);
        } else if (mode === SceneMode.SCENE3D) {
            Cartesian3.add(camera.position, Matrix4.getTranslation(camera.transform), camera.position);
            var rotation = Matrix4.getRotation(camera.transform);
            rotation.multiplyByVector(camera.direction, camera.direction);
            rotation.multiplyByVector(camera.up, camera.up);
            rotation.multiplyByVector(camera.right, camera.right);
            camera.transform = Matrix4.IDENTITY.clone();
            var defaultCamera = new Camera(canvas);
            description = {
                    destination: defaultCamera.position,
                    duration: flightDuration,
                    up: defaultCamera.up,
                    direction: defaultCamera.direction
            };
            flight = CameraFlightPath.createAnimation(scene.getFrameState(), description);
            scene.getAnimations().add(flight);
        } else if (mode === SceneMode.COLUMBUS_VIEW) {
            camera.transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                    1.0, 0.0, 0.0, 0.0,
                    0.0, 1.0, 0.0, 0.0,
                    0.0, 0.0, 0.0, 1.0);
            var maxRadii = ellipsoid.getMaximumRadius();
            var position = new Cartesian3(0.0, -1.0, 1.0).normalize().multiplyByScalar(5.0 * maxRadii);
            var direction = Cartesian3.ZERO.subtract(position).normalize();
            var right = direction.cross(Cartesian3.UNIT_Z);
            var up = right.cross(direction);

            description = {
                    destination: position,
                    duration: flightDuration,
                    up: up,
                    direction: direction
            };

            flight = CameraFlightPath.createAnimation(scene.getFrameState(), description);
            scene.getAnimations().add(flight);
        }
    }

    /**
     * The ViewModel for {@link HomeButton}.
     * @alias HomeButtonViewModel
     * @constructor
     *
     * @param {Scene} scene The Scene instance to use.
     * @param {SceneTransitioner} [transitioner] The SceneTransitioner instance to use.
     * @param {Ellipsoid} [ellipsoid] The Scene's primary ellipsoid.
     * @param {Number} [flightDuration] The duration of the camera flight in milliseconds
     *
     * @exception {Scene} scene is required.
     */
    var HomeButtonViewModel = function(scene, transitioner, ellipsoid, flightDuration) {
        var that = this;

        if (typeof scene === 'undefined') {
            throw new DeveloperError('scene is required.');
        }

        /**
         * The scene.
         * @type Scene
         */
        this.scene = scene;

        /**
         * The primary ellipsoid for the scene.
         * @type Ellipsoid
         */
        this.ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

        /**
         * The scene transitioner being used by the host application.
         * If a transitioner is assigned, any running morphs will be completed
         * when the home button is pressed.
         * @type SceneTransitioner
         */
        this.transitioner = transitioner;

        /**
         * Gets an Observable whose value is the duration in milliseconds of the flight to home position.
         * @type Observable
         */
        this.flightDuration = knockout.observable(flightDuration);

        /**
         * The command for switching to home view.
         * @type Command
         */
        this.command = createCommand(function() {
            viewHome(that.scene, that.ellipsoid, that.transitioner, that.flightDuration());
        });

        /**
         * The current button tooltip.
         * @type Observable
         */
        this.tooltip = knockout.observable('View Home');
    };

    return HomeButtonViewModel;
});
