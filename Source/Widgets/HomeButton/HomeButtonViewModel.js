/*global define*/
define([
        '../../Core/Cartesian3',
        '../../Core/Matrix3',
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/Ellipsoid',
        '../../Core/Extent',
        '../../Core/Matrix4',
        '../../Scene/Camera',
        '../../Scene/CameraColumbusViewMode',
        '../../Scene/CameraFlightPath',
        '../../Scene/SceneMode',
        '../createCommand',
        '../../ThirdParty/knockout'
    ], function(
        Cartesian3,
        Matrix3,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        Extent,
        Matrix4,
        Camera,
        CameraColumbusViewMode,
        CameraFlightPath,
        SceneMode,
        createCommand,
        knockout) {
    "use strict";

    function viewHome(scene, ellipsoid, transitioner, flightDuration) {
        var mode = scene.mode;

        var camera = scene.camera;
        var controller = scene.screenSpaceCameraController;

        controller.setEllipsoid(ellipsoid);
        controller.columbusViewMode = CameraColumbusViewMode.FREE;

        var context = scene.context;
        if (defined(transitioner) && mode === SceneMode.MORPHING) {
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
                duration : flightDuration
            };
            flight = CameraFlightPath.createAnimationExtent(scene, description);
            scene.animations.add(flight);
        } else if (mode === SceneMode.SCENE3D) {
            Cartesian3.add(camera.position, Matrix4.getTranslation(camera.transform), camera.position);
            var rotation = Matrix4.getRotation(camera.transform);
            Matrix3.multiplyByVector(rotation, camera.direction, camera.direction);
            Matrix3.multiplyByVector(rotation, camera.up, camera.up);
            Matrix3.multiplyByVector(rotation, camera.right, camera.right);
            camera.transform = Matrix4.clone(Matrix4.IDENTITY);
            var defaultCamera = new Camera(context);
            description = {
                destination : defaultCamera.position,
                duration : flightDuration,
                up : defaultCamera.up,
                direction : defaultCamera.direction
            };
            flight = CameraFlightPath.createAnimation(scene, description);
            scene.animations.add(flight);
        } else if (mode === SceneMode.COLUMBUS_VIEW) {
            camera.transform = new Matrix4(0.0, 0.0, 1.0, 0.0,
                                           1.0, 0.0, 0.0, 0.0,
                                           0.0, 1.0, 0.0, 0.0,
                                           0.0, 0.0, 0.0, 1.0);
            var maxRadii = ellipsoid.maximumRadius;
            var position = Cartesian3.multiplyByScalar(Cartesian3.normalize(new Cartesian3(0.0, -1.0, 1.0)), 5.0 * maxRadii);
            var direction = Cartesian3.normalize(Cartesian3.subtract(Cartesian3.ZERO, position));
            var right = Cartesian3.cross(direction, Cartesian3.UNIT_Z);
            var up = Cartesian3.cross(right, direction);

            description = {
                destination : position,
                duration : flightDuration,
                up : up,
                direction : direction
            };

            flight = CameraFlightPath.createAnimation(scene, description);
            scene.animations.add(flight);
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
     * @param {Number} [flightDuration=1500] The duration of the camera flight in milliseconds
     */
    var HomeButtonViewModel = function(scene, transitioner, ellipsoid, flightDuration) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

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
                //>>includeStart('debug', pragmas.debug);
                if (value < 0) {
                    throw new DeveloperError('value must be positive.');
                }
                //>>includeEnd('debug');

                this._flightDuration = value;
            }
        }
    });

    return HomeButtonViewModel;
});
