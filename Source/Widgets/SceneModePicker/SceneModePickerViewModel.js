/*global define*/
define([
        '../../Core/defineProperties',
        '../../Core/defined',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../../Core/EventHelper',
        '../../Scene/SceneMode',
        '../createCommand',
        '../../ThirdParty/knockout'
    ], function(
        defineProperties,
        defined,
        destroyObject,
        DeveloperError,
        EventHelper,
        SceneMode,
        createCommand,
        knockout) {
    "use strict";

    /**
     * The view model for {@link SceneModePicker}.
     * @alias SceneModePickerViewModel
     * @constructor
     *
     * @param {SceneTransitioner} transitioner The SceneTransitioner instance to use.
     */
    var SceneModePickerViewModel = function(transitioner) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(transitioner)) {
            throw new DeveloperError('transitioner is required.');
        }
        //>>includeEnd('debug');

        this._transitioner = transitioner;

        var that = this;

        var transitionStart = function(transitioner, oldMode, newMode, isMorphing) {
            that.sceneMode = newMode;
            that.dropDownVisible = false;
        };

        this._eventHelper = new EventHelper();
        this._eventHelper.add(transitioner.transitionStart, transitionStart);

        /**
         * Gets or sets the current SceneMode.  This property is observable.
         * @type {SceneMode}
        */
        this.sceneMode = transitioner.scene.mode;

        /**
         * Gets or sets whether the button drop-down is currently visible.  This property is observable.
         * @type {Boolean}
         * @default false
        */
        this.dropDownVisible = false;

        /**
         * Gets or sets the 2D tooltip.  This property is observable.
         * @type {String}
         * @default '2D'
        */
        this.tooltip2D = '2D';

        /**
         * Gets or sets the 3D tooltip.  This property is observable.
         * @type {String}
         * @default '3D'
        */
        this.tooltip3D = '3D';

        /**
         * Gets or sets the Columbus View tooltip.  This property is observable.
         * @type {String}
         * @default 'Columbus View'
        */
        this.tooltipColumbusView = 'Columbus View';

        knockout.track(this, ['sceneMode', 'dropDownVisible', 'tooltip2D', 'tooltip3D', 'tooltipColumbusView']);

        /**
         * Gets the currently active tooltip.  This property is observable.
         * @type {String}
         */
        this.selectedTooltip = undefined;
        knockout.defineProperty(this, 'selectedTooltip', function() {
            var mode = that.sceneMode;
            if (mode === SceneMode.SCENE2D) {
                return that.tooltip2D;
            }
            if (mode === SceneMode.SCENE3D) {
                return that.tooltip3D;
            }
            return that.tooltipColumbusView;
        });

        this._toggleDropDown = createCommand(function() {
            that.dropDownVisible = !that.dropDownVisible;
        });

        this._morphTo2D = createCommand(function() {
            transitioner.morphTo2D();
        });

        this._morphTo3D = createCommand(function() {
            transitioner.morphTo3D();
        });

        this._morphToColumbusView = createCommand(function() {
            transitioner.morphToColumbusView();
        });

        //Used by knockout
        this._sceneMode = SceneMode;
    };

    defineProperties(SceneModePickerViewModel.prototype, {
        /**
         * Gets the scene transitioner.
         * @memberof SceneModePickerViewModel.prototype
         *
         * @type {SceneTransitioner}
         */
        sceneTransitioner : {
            get : function() {
                return this._transitioner;
            }
        },

        /**
         * Gets the command to toggle the drop down box.
         * @memberof SceneModePickerViewModel.prototype
         *
         * @type {Command}
         */
        toggleDropDown : {
            get : function() {
                return this._toggleDropDown;
            }
        },

        /**
         * Gets the command to morph to 2D.
         * @memberof SceneModePickerViewModel.prototype
         *
         * @type {Command}
         */
        morphTo2D : {
            get : function() {
                return this._morphTo2D;
            }
        },

        /**
         * Gets the command to morph to 3D.
         * @memberof SceneModePickerViewModel.prototype
         *
         * @type {Command}
         */
        morphTo3D : {
            get : function() {
                return this._morphTo3D;
            }
        },

        /**
         * Gets the command to morph to Columbus View.
         * @memberof SceneModePickerViewModel.prototype
         *
         * @type {Command}
         */
        morphToColumbusView : {
            get : function() {
                return this._morphToColumbusView;
            }
        }
    });

    /**
     * @memberof SceneModePickerViewModel
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    SceneModePickerViewModel.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the view model.
     * @memberof SceneModePickerViewModel
     */
    SceneModePickerViewModel.prototype.destroy = function() {
        this._eventHelper.removeAll();

        destroyObject(this);
    };

    return SceneModePickerViewModel;
});
