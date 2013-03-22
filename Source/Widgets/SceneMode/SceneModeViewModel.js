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
     * The ViewModel for {@link SceneModeWidget}.
     * @alias SceneModeViewModel
     * @constructor
     *
     * @param {SceneTransitioner} transitioner The SceneTransitioner instance to use.
     *
     * @see SceneModeWidget
     */
    var SceneModeViewModel = function(transitioner) {

        var sceneMode = knockout.observable(transitioner.getScene().mode);

        transitioner.onTransitionStart.addEventListener(function(transitioner, oldMode, newMode, futureMode) {
            if (typeof futureMode !== 'undefined') {
                sceneMode(futureMode);
            } else {
                sceneMode(newMode);
            }
        });

        transitioner.onTransitionComplete.addEventListener(function(transitioner, oldMode, newMode) {
            sceneMode(newMode);
        });

        var dropDownVisible = knockout.observable(false);
        var tooltip2D = knockout.observable('2D');
        var tooltip3D = knockout.observable('3D');
        var tooltipColumbusView = knockout.observable('Columbus View');
        var tooltipMorphing = knockout.observable('Morphing');

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
         * Gets or sets whether the button dropdown is currently visible.
         * @type Observable
        */
        this.dropDownVisible = dropDownVisible;

        /**
         * Command to toggle dropDown visibility.
         * @type Command
        */
        this.toggleDropdown = createCommand(function() {
            dropDownVisible(!dropDownVisible());
        });

        /**
         * Command to morph to 2D.
         * @type Command
        */
        this.morphTo2D = createCommand(function() {
            transitioner.morphTo2D();
            dropDownVisible(false);
        });

        /**
         * Command to morph to 3D.
         * @type Command
        */
        this.morphTo3D = createCommand(function() {
            transitioner.morphTo3D();
            dropDownVisible(false);
        });

        /**
         * Command to morph to Columbus View.
         * @type Command
        */
        this.morphToColumbusView = createCommand(function() {
            transitioner.morphToColumbusView();
            dropDownVisible(false);
        });

        /**
         * Gets or sets the tooltip for 2D.
         * @type Observable
        */
        this.tooltip2D = tooltip2D;

        /**
         * Gets or sets the tooltip for 3D.
         * @type Observable
        */
        this.tooltip3D = tooltip3D;

        /**
         * Gets or sets the tooltip for Columbus View.
         * @type Observable
        */
        this.tooltipColumbusView = tooltipColumbusView;

        /**
         * Gets or sets the tooltip during morphing.
         * @type Observable
        */
        this.tooltipMorphing = tooltipMorphing;

        /**
         * Gets the current selected mode's tooltip.
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
            if (mode === SceneMode.COLUMBUS_VIEW) {
                return tooltipColumbusView();
            }
            if (mode === SceneMode.MORPHING) {
                return tooltipMorphing();
            }
            return '';
        });

        //Used by knockout
        this._sceneMode = SceneMode;
    };

    return SceneModeViewModel;
});