/*global define*/
define([
        '../../Core/Cartesian3',
        '../../Core/defaultValue',
        '../../Core/defineProperties',
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
        '../createCommand',
        '../../ThirdParty/knockout'
    ], function(
        Cartesian3,
        defaultValue,
        defineProperties,
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
        createCommand,
        knockout) {
    "use strict";

    function viewHome(scene, ellipsoid, transitioner, flightDuration) {
        var mode = scene.mode;

        var camera = scene.getCamera();
        camera.controller.constrainedAxis = Cartesian3.UNIT_Z;

        var controller = scene.getScreenSpaceCameraController();
        var enableLook = controller.enableLook;
        var enableRotate = controller.enableRotate;
        var enableTilt = controller.enableTilt;
        var enableTranslate = controller.enableTranslate;
        var enableZoom = controller.enableZoom;

        controller.enableLook = false;
        controller.enableRotate = false;
        controller.enableTilt = false;
        controller.enableTranslate = false;
        controller.enableZoom = false;
        controller.setEllipsoid(ellipsoid);
        controller.columbusViewMode = CameraColumbusViewMode.FREE;

        function onComplete() {
            controller.enableLook = enableLook;
            controller.enableRotate = enableRotate;
            controller.enableTilt = enableTilt;
            controller.enableTranslate = enableTranslate;
            controller.enableZoom = enableZoom;
        }

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
                destination : Extent.MAX_VALUE,
                duration : flightDuration,
                onComplete : onComplete
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
                destination : defaultCamera.position,
                duration : flightDuration,
                up : defaultCamera.up,
                direction : defaultCamera.direction,
                onComplete : onComplete
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
                destination : position,
                duration : flightDuration,
                up : up,
                direction : direction,
                onComplete : onComplete
            };

            flight = CameraFlightPath.createAnimation(scene.getFrameState(), description);
            scene.getAnimations().add(flight);
        }
    }

    /**
     * The view model for {@link HomeButton}.
     * @alias HomeButtonViewModel
     * @constructor
     *
     * @param {Scene} scene The scene instance to use.
     * @param {SceneTransitioner} [transitioner] The scene transitioner instance to use.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to be viewed when in home position.
     * @param {Number} [flightDuration] The duration of the camera flight in milliseconds
     *
     * @exception {DeveloperError} scene is required.
     */
    var HomeButtonViewModel = function(scene, transitioner, ellipsoid, flightDuration) {
        if (typeof scene === 'undefined') {
            throw new DeveloperError('scene is required.');
        }

        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        flightDuration = defaultValue(flightDuration, 1500);

        this._scene = scene;
        this._ellipsoid = ellipsoid;
        this._transitioner = transitioner;
        this._flightDuration = flightDuration;

        var that = this;
        this._command = createCommand(function() {
            viewHome(that._scene, that._ellipsoid, that._transitioner, that._flightDuration);
        });

        /**
         * Gets or sets the tooltip.  This property is observable.
         *
         * @type {String}
         */
        this.tooltip = 'View Home';

        knockout.track(this, ['tooltip']);
    };

    defineProperties(HomeButtonViewModel.prototype, {
        /**
         * Gets the scene transitioner being used by the scene.
         * If a transitioner is assigned, any running morphs will be completed
         * when the home button is pressed.  The transitioner must be using
         * the same Scene instance as the scene property.
         * @memberof HomeButtonViewModel.prototype
         *
         * @type {SceneTransitioner}
         */
        sceneTransitioner : {
            get : function() {
                return this._transitioner;
            }
        },

        /**
         * Gets the scene to control.
         * @memberof HomeButtonViewModel.prototype
         *
         * @type {Scene}
         */
        scene : {
            get : function() {
                return this._scene;
            }
        },

        /**
         * Gets the ellipsoid to be viewed when in home position.
         * @memberof HomeButtonViewModel.prototype
         *
         * @type {Ellipsoid}
         */
        ellipsoid : {
            get : function() {
                return this._ellipsoid;
            }
        },

        /**
         * Gets the Command that is executed when the button is clicked.
         * @memberof HomeButtonViewModel.prototype
         *
         * @type {Command}
         */
        command : {
            get : function() {
                return this._command;
            }
        },

        /**
         * Gets or sets the the duration of the camera flight in milliseconds.
         * A value of zero causes the camera to instantly switch to home view.
         * @memberof HomeButtonViewModel.prototype
         *
         * @type {Number}
         */
        flightDuration : {
            get : function() {
                return this._flightDuration;
            },
            set : function(value) {
                if (value < 0) {
                    throw new DeveloperError('value must be positive.');
                }
                this._flightDuration = value;
            }
        }
    });

    return HomeButtonViewModel;
});
