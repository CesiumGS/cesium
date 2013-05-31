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

        var sceneMode = knockout.observable(transitioner.getScene().mode);

        this._transitionStart = function(transitioner, oldMode, newMode, isMorphing) {
            sceneMode(newMode);
        };

        transitioner.onTransitionStart.addEventListener(this._transitionStart);

        var dropDownVisible = knockout.observable(false);
        var tooltip2D = knockout.observable('2D');
        var tooltip3D = knockout.observable('3D');
        var tooltipColumbusView = knockout.observable('Columbus View');

        this._transitioner = transitioner;

        /**
         * Gets an Observable whose value is the current SceneMode
         * @type Observable
        */
        this.sceneMode = sceneMode;

        /**
         * Gets an Observable indicating if the button dropDown is currently visible.
         * @type Observable
        */
        this.dropDownVisible = dropDownVisible;

        /**
         * Toggles dropDown visibility.
         * @type Command
        */
        this.toggleDropDown = createCommand(function() {
            dropDownVisible(!dropDownVisible());
        });

        /**
         * Morphs to 2D.
         * @type Command
        */
        this.morphTo2D = createCommand(function() {
            transitioner.morphTo2D();
            dropDownVisible(false);
        });

        /**
         * Morphs to 3D.
         * @type Command
        */
        this.morphTo3D = createCommand(function() {
            transitioner.morphTo3D();
            dropDownVisible(false);
        });

        /**
         * Morphs to Columbus View.
         * @type Command
        */
        this.morphToColumbusView = createCommand(function() {
            transitioner.morphToColumbusView();
            dropDownVisible(false);
        });

        /**
         * Gets an Observable for the 2D tooltip.
         * @type Observable
        */
        this.tooltip2D = tooltip2D;

        /**
         * Gets an Observable for the 3D tooltip.
         * @type Observable
        */
        this.tooltip3D = tooltip3D;

        /**
         * Gets an Observable for the Columbus View tooltip.
         * @type Observable
        */
        this.tooltipColumbusView = tooltipColumbusView;

        /**
         * Gets a readonly Observable for the currently selected mode's tooltip.
         * @type Observable
        */
        this.selectedTooltip = knockout.computed(function() {
            var mode = sceneMode();
            if (mode === SceneMode.SCENE2D) {
                return tooltip2D();
            }
            if (mode === SceneMode.SCENE3D) {
                return tooltip3D();
            }
            return tooltipColumbusView();
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