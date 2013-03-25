/*global define*/
define(['../../Core/DeveloperError',
        '../../Scene/SceneMode',
        '../createCommand',
        '../../ThirdParty/knockout'
        ], function(
            DeveloperError,
            SceneMode,
            createCommand,
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

        /**
         * Gets the SceneTransitioner being used.
         * @type Observable
        */
        this.transitioner = transitioner;

        /**
         * Gets the current SceneMode
         * @type Observable
        */
        this.sceneMode = sceneMode;

        /**
         * Gets or sets whether the button dropDown is currently visible.
         * @type Observable
        */
        this.dropDownVisible = dropDownVisible;

        /**
         * Gets the command to toggle dropDown visibility.
         * @type Command
        */
        this.toggleDropDown = createCommand(function() {
            dropDownVisible(!dropDownVisible());
        });

        /**
         * Gets the command to morph to 2D.
         * @type Command
        */
        this.morphTo2D = createCommand(function() {
            transitioner.morphTo2D();
            dropDownVisible(false);
        });

        /**
         * Gets the command to morph to 3D.
         * @type Command
        */
        this.morphTo3D = createCommand(function() {
            transitioner.morphTo3D();
            dropDownVisible(false);
        });

        /**
         * Gets the command to morph to Columbus View.
         * @type Command
        */
        this.morphToColumbusView = createCommand(function() {
            transitioner.morphToColumbusView();
            dropDownVisible(false);
        });

        /**
         * Gets a writable observable for the 2D tooltip.
         * @type Observable
        */
        this.tooltip2D = tooltip2D;

        /**
         * Gets a writable observable for the 3D tooltip.
         * @type Observable
        */
        this.tooltip3D = tooltip3D;

        /**
         * Gets a writable observable for the Columbus View tooltip.
         * @type Observable
        */
        this.tooltipColumbusView = tooltipColumbusView;

        /**
         * Gets a readonly observable for the currently selected mode's tooltip.
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

    SceneModePickerViewModel.prototype.destroy = function() {
        this.transitioner.onTransitionStart.removeEventListener(this._transitionStart);
    };

    return SceneModePickerViewModel;
});