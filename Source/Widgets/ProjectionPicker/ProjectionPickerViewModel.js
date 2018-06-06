define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../../Core/EventHelper',
        '../../Core/OrthographicFrustum',
        '../../Scene/SceneMode',
        '../../ThirdParty/knockout',
        '../createCommand'
    ], function(
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        EventHelper,
        OrthographicFrustum,
        SceneMode,
        knockout,
        createCommand) {
    'use strict';

    /**
     * The view model for {@link ProjectionPicker}.
     * @alias ProjectionPickerViewModel
     * @constructor
     *
     * @param {Scene} scene The Scene to switch projections.
     */
    function ProjectionPickerViewModel(scene) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        this._scene = scene;
        this._orthographic = scene.camera.frustum instanceof OrthographicFrustum;
        this._flightInProgress = false;

        /**
         * Gets or sets whether the button drop-down is currently visible.  This property is observable.
         * @type {Boolean}
         * @default false
         */
        this.dropDownVisible = false;

        /**
         * Gets or sets the perspective projection tooltip.  This property is observable.
         * @type {String}
         * @default 'Perspective Projection'
         */
        this.tooltipPerspective = 'Perspective Projection';

        /**
         * Gets or sets the orthographic projection tooltip.  This property is observable.
         * @type {String}
         * @default 'Orthographic Projection'
         */
        this.tooltipOrthographic = 'Orthographic Projection';

        /**
         * Gets the currently active tooltip.  This property is observable.
         * @type {String}
         */
        this.selectedTooltip = undefined;

        /**
         * Gets or sets the current SceneMode.  This property is observable.
         * @type {SceneMode}
         */
        this.sceneMode = scene.mode;

        knockout.track(this, ['_orthographic', '_flightInProgress', 'sceneMode', 'dropDownVisible', 'tooltipPerspective', 'tooltipOrthographic']);

        var that = this;
        knockout.defineProperty(this, 'selectedTooltip', function() {
            if (that._orthographic) {
                return that.tooltipOrthographic;
            }
            return that.tooltipPerspective;
        });

        this._toggleDropDown = createCommand(function() {
            if (that.sceneMode === SceneMode.SCENE2D || that._flightInProgress) {
                return;
            }

            that.dropDownVisible = !that.dropDownVisible;
        });

        this._eventHelper = new EventHelper();
        this._eventHelper.add(scene.morphComplete, function(transitioner, oldMode, newMode, isMorphing) {
            that.sceneMode = newMode;
            that._orthographic = newMode === SceneMode.SCENE2D || that._scene.camera.frustum instanceof OrthographicFrustum;
        });
        this._eventHelper.add(scene.preRender, function() {
            that._flightInProgress = defined(scene.camera._currentFlight);
        });

        this._switchToPerspective = createCommand(function() {
            if (that.sceneMode === SceneMode.SCENE2D) {
                return;
            }

            that._scene.camera.switchToPerspectiveFrustum();
            that._orthographic = false;
            that.dropDownVisible = false;
        });

        this._switchToOrthographic = createCommand(function() {
            if (that.sceneMode === SceneMode.SCENE2D) {
                return;
            }

            that._scene.camera.switchToOrthographicFrustum();
            that._orthographic = true;
            that.dropDownVisible = false;
        });

        //Used by knockout
        this._sceneMode = SceneMode;
    }

    defineProperties(ProjectionPickerViewModel.prototype, {
        /**
         * Gets the scene
         * @memberof ProjectionPickerViewModel.prototype
         * @type {Scene}
         */
        scene : {
            get : function() {
                return this._scene;
            }
        },

        /**
         * Gets the command to toggle the drop down box.
         * @memberof ProjectionPickerViewModel.prototype
         *
         * @type {Command}
         */
        toggleDropDown : {
            get : function() {
                return this._toggleDropDown;
            }
        },

        /**
         * Gets the command to switch to a perspective projection.
         * @memberof ProjectionPickerViewModel.prototype
         *
         * @type {Command}
         */
        switchToPerspective : {
            get : function() {
                return this._switchToPerspective;
            }
        },

        /**
         * Gets the command to switch to orthographic projection.
         * @memberof ProjectionPickerViewModel.prototype
         *
         * @type {Command}
         */
        switchToOrthographic : {
            get : function() {
                return this._switchToOrthographic;
            }
        },

        /**
         * Gets whether the scene is currently using an orthographic projection.
         * @memberof ProjectionPickerViewModel.prototype
         *
         * @type {Command}
         */
        isOrthographicProjection : {
            get : function() {
                return this._orthographic;
            }
        }
    });

    /**
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    ProjectionPickerViewModel.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the view model.
     */
    ProjectionPickerViewModel.prototype.destroy = function() {
        this._eventHelper.removeAll();
        destroyObject(this);
    };

    return ProjectionPickerViewModel;
});
