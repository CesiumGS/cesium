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
        var that = this;

        if (typeof transitioner === 'undefined') {
            throw new DeveloperError('transitioner is required.');
        }

        this._transitionStart = function(transitioner, oldMode, newMode, isMorphing) {
            that.sceneMode = newMode;
            that.dropDownVisible = false;
        };

        transitioner.onTransitionStart.addEventListener(this._transitionStart);

        this._transitioner = transitioner;

        /**
         * Gets an Observable whose value is the current SceneMode
         * @type Observable
        */
        this.sceneMode = transitioner.getScene().mode;

        /**
         * Gets an Observable indicating if the button dropDown is currently visible.
         * @type Observable
        */
        this.dropDownVisible = false;

        /**
         * Gets an Observable for the 2D tooltip.
         * @type Observable
        */
        this.tooltip2D = '2D';

        /**
         * Gets an Observable for the 3D tooltip.
         * @type Observable
        */
        this.tooltip3D = '3D';

        /**
         * Gets an Observable for the Columbus View tooltip.
         * @type Observable
        */
        this.tooltipColumbusView = 'Columbus View';

        knockout.track(this, ['sceneMode', 'dropDownVisible', 'tooltip2D', 'tooltip3D', 'tooltipColumbusView']);

        /**
         * Gets the current tooltip.
         * @type String
         * @alias selectedTooltip
         */
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
            },
            set : function(value){
                var transitioner = this._transitioner;
                if (typeof transitioner !== 'undefined') {
                    transitioner.onTransitionStart.removeEventListener(this._transitionStart);
                }

                this._transitioner = value;

                if (typeof value !== 'undefined') {
                    value.onTransitionStart.addEventListener(this._transitionStart);
                }
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
        this.transitioner = undefined;
        destroyObject(this);
    };

    return SceneModePickerViewModel;
});