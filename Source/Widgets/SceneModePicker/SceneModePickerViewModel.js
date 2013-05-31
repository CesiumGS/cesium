/*global define*/
define(['../createCommand',
        '../../Core/DeveloperError',
        '../../Core/destroyObject',
        '../../Scene/SceneMode',
        '../../ThirdParty/knockout'
        ], function(
                createCommand,
                DeveloperError,
                destroyObject,
                SceneMode,
                knockout) {
    "use strict";

    /**
     * The ViewModel for {@link SceneModePicker}.
     * @alias SceneModePickerViewModel
     * @constructor
     *
     * @param {SceneTransitioner} transitioner The SceneTransitioner instance to use.
     *
     * @exception {DeveloperError} transitioner is required.
     */
    var SceneModePickerViewModel = function(transitioner) {
        if (typeof transitioner === 'undefined') {
            throw new DeveloperError('transitioner is required.');
        }

        var that = this;

        this._transitionStart = function(transitioner, oldMode, newMode, isMorphing) {
            that.sceneMode = newMode;
            that.dropDownVisible = false;
        };

        transitioner.onTransitionStart.addEventListener(this._transitionStart);
        this._transitioner = transitioner;

        /**
         * Gets or sets the current SceneMode.  This property is observable.
         * @type SceneMode
        */
        this.sceneMode = transitioner.getScene().mode;

        /**
         * Gets or sets whether the button drop-down is currently visible.  This property is observable.
         * @type Boolean
        */
        this.dropDownVisible = false;

        /**
         * Gets or sets the 2D tooltip.  This property is observable.
         * @type String
        */
        this.tooltip2D = '2D';

        /**
         * Gets or sets the 3D tooltip.  This property is observable.
         * @type String
        */
        this.tooltip3D = '3D';

        /**
         * Gets or sets the Columbus View tooltip.  This property is observable.
         * @type Observable
        */
        this.tooltipColumbusView = 'Columbus View';

        knockout.track(this, ['sceneMode', 'dropDownVisible', 'tooltip2D', 'tooltip3D', 'tooltipColumbusView']);

        /**
         * Gets the currently active tooltip.  This property is observable.
         * @type String
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

        /**
         * Toggles dropDown visibility.
         * @type Command
        */
        this.toggleDropDown = createCommand(function() {
            that.dropDownVisible = !that.dropDownVisible;
        });

        /**
         * Morphs to 2D.
         * @type Command
        */
        this.morphTo2D = createCommand(function() {
            transitioner.morphTo2D();
        });

        /**
         * Morphs to 3D.
         * @type Command
        */
        this.morphTo3D = createCommand(function() {
            transitioner.morphTo3D();
        });

        /**
         * Morphs to Columbus View.
         * @type Command
        */
        this.morphToColumbusView = createCommand(function() {
            transitioner.morphToColumbusView();
        });

        //Used by knockout
        this._sceneMode = SceneMode;
    };

    Object.defineProperties(SceneModePickerViewModel.prototype, {
        /**
         * Gets the scene transitioner.
         *
         * @memberof SceneModePickerViewModel.prototype
         * @type {SceneTransitioner}
         */
        transitioner : {
            get : function() {
                return this._transitioner;
            }
        },
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
        this._transitioner.onTransitionStart.removeEventListener(this._transitionStart);
        destroyObject(this);
    };

    return SceneModePickerViewModel;
});