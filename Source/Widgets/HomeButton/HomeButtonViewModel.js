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
        PerspectiveFrustum,
        SceneMode,
        createCommand,
        knockout) {
    "use strict";

    function viewHome(scene, ellipsoid, transitioner) {
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

        if (mode === SceneMode.SCENE2D) {
            camera.controller.viewExtent(Extent.MAX_VALUE);
        } else if (mode === SceneMode.SCENE3D) {
            var defaultCamera = new Camera(canvas);
            defaultCamera.position.clone(camera.position);
            defaultCamera.direction.clone(camera.direction);
            defaultCamera.up.clone(camera.up);
            defaultCamera.right.clone(camera.right);
            defaultCamera.transform.clone(camera.transform);
            defaultCamera.frustum.clone(camera.frustum);
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

    /**
     * The view model for {@link HomeButton}.
     * @alias HomeButtonViewModel
     * @constructor
     *
     * @param {Scene} scene The scene instance to use.
     * @param {SceneTransitioner} [transitioner] The scene transitioner instance to use.
     * @param {Ellipsoid} [ellipsoid=Ellipsoid.WGS84] The ellipsoid to be viewed when in home position.
     *
     * @exception {DeveloperError} scene is required.
     */
    var HomeButtonViewModel = function(scene, transitioner, ellipsoid) {
        if (typeof scene === 'undefined') {
            throw new DeveloperError('scene is required.');
        }

        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

        this._scene = scene;
        this._ellipsoid = ellipsoid;
        this._transitioner = transitioner;

        this._command = createCommand(function() {
            viewHome(scene, ellipsoid, transitioner);
        });

        /**
         * Gets or sets the tooltip.  This property is observable.
         *
         * @type String
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
        }
    });

    return HomeButtonViewModel;
});
