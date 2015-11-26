/*global define*/
define([
        '../../Core/Cartesian3',
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
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
        Matrix4,
        Rectangle,
        Camera,
        SceneMode,
        knockout,
        createCommand) {
    "use strict";

    var pitchScratch = new Cartesian3();
    function viewHome(scene, duration) {
        var mode = scene.mode;

        if (defined(scene) && mode === SceneMode.MORPHING) {
            scene.completeMorph();
        }

        if (mode === SceneMode.SCENE2D) {
            scene.camera.flyTo({
                destination : Rectangle.MAX_VALUE,
                duration : duration,
                endTransform : Matrix4.IDENTITY
            });
        } else if (mode === SceneMode.SCENE3D) {
            var destination = scene.camera.getRectangleCameraCoordinates(Camera.DEFAULT_VIEW_RECTANGLE);

            var mag = Cartesian3.magnitude(destination);
            mag += mag * Camera.DEFAULT_VIEW_FACTOR;
            Cartesian3.normalize(destination, destination);
            Cartesian3.multiplyByScalar(destination, mag, destination);

            scene.camera.flyTo({
                destination : destination,
                duration : duration,
                endTransform : Matrix4.IDENTITY
            });
        } else if (mode === SceneMode.COLUMBUS_VIEW) {
            var maxRadii = scene.globe.ellipsoid.maximumRadius;
            var position = new Cartesian3(0.0, -1.0, 1.0);
            position = Cartesian3.multiplyByScalar(Cartesian3.normalize(position, position), 5.0 * maxRadii, position);
            scene.camera.flyTo({
                destination : position,
                duration : duration,
                orientation : {
                    heading : 0.0,
                    pitch : -Math.acos(Cartesian3.normalize(position, pitchScratch).z),
                    roll : 0.0
                },
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
     * @param {Number} [duration] The duration of the camera flight in seconds.
     */
    var HomeButtonViewModel = function(scene, duration) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        this._scene = scene;
        this._duration = duration;

        var that = this;
        this._command = createCommand(function() {
            viewHome(that._scene, that._duration);
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
         * The duration will be computed based on the distance when undefined.
         * @memberof HomeButtonViewModel.prototype
         *
         * @type {Number|undefined}
         */
        duration : {
            get : function() {
                return this._duration;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (defined(value) && value < 0) {
                    throw new DeveloperError('value must be positive.');
                }
                //>>includeEnd('debug');

                this._duration = value;
            }
        }
    });

    return HomeButtonViewModel;
});
