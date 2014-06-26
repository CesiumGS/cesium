/*global define*/
define([
        '../../Core/Cartesian3',
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/Ellipsoid',
        '../../Core/Matrix4',
        '../../Core/Rectangle',
        '../../Scene/Camera',
        '../../Scene/SceneMode',
        '../../ThirdParty/knockout',
        '../createCommand'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        Matrix4,
        Rectangle,
        Camera,
        SceneMode,
        knockout,
        createCommand) {
    "use strict";

    function viewHome(scene, ellipsoid, duration) {
        var mode = scene.mode;
        var controller = scene.screenSpaceCameraController;

        controller.ellipsoid = ellipsoid;

        if (defined(scene) && mode === SceneMode.MORPHING) {
            scene.completeMorph();
        }

        if (mode === SceneMode.SCENE2D) {
            scene.camera.flyToRectangle({
                destination : Rectangle.MAX_VALUE,
                duration : duration,
                endTransform : Matrix4.IDENTITY
            });
        } else if (mode === SceneMode.SCENE3D) {
            var defaultCamera = new Camera(scene);
            scene.camera.flyTo({
                destination : defaultCamera.position,
                duration : duration,
                up : defaultCamera.up,
                direction : defaultCamera.direction,
                endTransform : Matrix4.IDENTITY
            });
        } else if (mode === SceneMode.COLUMBUS_VIEW) {
            var maxRadii = ellipsoid.maximumRadius;
            var position = new Cartesian3(0.0, -1.0, 1.0);
            position = Cartesian3.multiplyByScalar(Cartesian3.normalize(position, position), 5.0 * maxRadii, position);
            var direction = new Cartesian3();
            direction = Cartesian3.normalize(Cartesian3.subtract(Cartesian3.ZERO, position, direction), direction);
            var right = Cartesian3.cross(direction, Cartesian3.UNIT_Z, new Cartesian3());
            var up = Cartesian3.cross(right, direction, new Cartesian3());

            scene.camera.flyTo({
                destination : position,
                duration : duration,
                up : up,
                direction : direction,
                endTransform : Matrix4.IDENTITY,
                convert : false
            });
        }
    }

    /**
     * The view model for {@link HomeButton}.
     * @alias HomeButtonViewModel
     * @constructor
     *
     * @param {Scene} scene The scene instance to use.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to be viewed when in home position.
     * @param {Number} [duration=1.5] The duration of the camera flight in seconds.
     */
    var HomeButtonViewModel = function(scene, ellipsoid, duration) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
        duration = defaultValue(duration, 1.5);

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
         * Gets or sets the the duration of the camera flight in seconds.
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
