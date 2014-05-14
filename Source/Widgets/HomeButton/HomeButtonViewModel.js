/*global define*/
define([
        '../../Core/Cartesian3',
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/Ellipsoid',
        '../../Core/Rectangle',
        '../../Core/Matrix4',
        '../../Scene/Camera',
        '../../Scene/CameraColumbusViewMode',
        '../../Scene/CameraFlightPath',
        '../../Scene/SceneMode',
        '../createCommand',
        '../../ThirdParty/knockout'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        Rectangle,
        Matrix4,
        Camera,
        CameraColumbusViewMode,
        CameraFlightPath,
        SceneMode,
        createCommand,
        knockout) {
    "use strict";

    function viewHome(scene, ellipsoid, duration) {
        var mode = scene.mode;
        var controller = scene.screenSpaceCameraController;

        controller.ellipsoid = ellipsoid;
        controller.columbusViewMode = CameraColumbusViewMode.FREE;

        if (defined(scene) && mode === SceneMode.MORPHING) {
            scene.completeMorph();
        }
        var flight;
        var description;

        if (mode === SceneMode.SCENE2D) {
            description = {
                destination : Rectangle.MAX_VALUE,
                duration : duration,
                endReferenceFrame : new Matrix4(0, 0, 1, 0,
                                                1, 0, 0, 0,
                                                0, 1, 0, 0,
                                                0, 0, 0, 1)
            };
            flight = CameraFlightPath.createAnimationRectangle(scene, description);
            scene.animations.add(flight);
        } else if (mode === SceneMode.SCENE3D) {
            var defaultCamera = new Camera(scene);
            description = {
                destination : defaultCamera.position,
                duration : duration,
                up : defaultCamera.up,
                direction : defaultCamera.direction,
                endReferenceFrame : Matrix4.IDENTITY
            };
            flight = CameraFlightPath.createAnimation(scene, description);
            scene.animations.add(flight);
        } else if (mode === SceneMode.COLUMBUS_VIEW) {
            var maxRadii = ellipsoid.maximumRadius;
            var position = Cartesian3.multiplyByScalar(Cartesian3.normalize(new Cartesian3(0.0, -1.0, 1.0)), 5.0 * maxRadii);
            var direction = Cartesian3.normalize(Cartesian3.subtract(Cartesian3.ZERO, position));
            var right = Cartesian3.cross(direction, Cartesian3.UNIT_Z);
            var up = Cartesian3.cross(right, direction);

            description = {
                destination : position,
                duration : duration,
                up : up,
                direction : direction,
                endReferenceFrame : new Matrix4(0, 0, 1, 0,
                                                1, 0, 0, 0,
                                                0, 1, 0, 0,
                                                0, 0, 0, 1)
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
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to be viewed when in home position.
     * @param {Number} [duration=1500] The duration of the camera flight in milliseconds
     */
    var HomeButtonViewModel = function(scene, ellipsoid, duration) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        duration = defaultValue(duration, 1500);

        this._scene = scene;
        this._ellipsoid = ellipsoid;
        this._duration = duration;

        var that = this;
        this._command = createCommand(function() {
            viewHome(that._scene, that._ellipsoid, that._duration);
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
        duration : {
            get : function() {
                return this._duration;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (value < 0) {
                    throw new DeveloperError('value must be positive.');
                }
                //>>includeEnd('debug');

                this._duration = value;
            }
        }
    });

    return HomeButtonViewModel;
});
