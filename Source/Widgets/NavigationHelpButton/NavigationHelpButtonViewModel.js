/*global define*/
define([
        'Core/defined',
        'Core/defineProperties',
        'ThirdParty/knockout',
        '../createCommand'
    ], function(
        defined,
        defineProperties,
        knockout,
        createCommand) {
    "use strict";

    function addListeners(viewModel) {
        var touchListener = function(){
            viewModel._touch = true;
            document.removeEventListener('touchstart', touchListener, false);
            document.removeEventListener('mouseMove', mouseMoveListener, false);
        };

        var mouseMoveListener = function(){
            if (!viewModel._touch) {
                document.removeEventListener('touchstart', touchListener, false);
                document.removeEventListener('mouseMove', mouseMoveListener, false);
            }
        }

        document.addEventListener('touchstart', touchListener, false);
        document.addEventListener('mousemove', mouseMoveListener, false);

    }

    /**
     * The view model for {@link NavigationHelpButton}.
     * @alias NavigationHelpButtonViewModel
     * @constructor
     */
    var NavigationHelpButtonViewModel = function() {
        /**
         * Gets or sets whether the instructions are currently shown.  This property is observable.
         * @type {Boolean}
         * @default false
        */
        this.showInstructions = false;

        var that = this;
        this._command = createCommand(function() {
            that.showInstructions = !that.showInstructions;
        });
        this._touch = false;

        addListeners();

        /**
         * Gets or sets the tooltip.  This property is observable.
         *
         * @type {String}
         */
        this.tooltip = 'Navigation Instructions';

        knockout.track(this, ['tooltip', 'showInstructions']);
    };

    defineProperties(NavigationHelpButtonViewModel.prototype, {
        /**
         * Gets the Command that is executed when the button is clicked.
         * @memberof NavigationHelpButtonViewModel.prototype
         *
         * @type {Command}
         */
        command : {
            get : function() {
                return this._command;
            }
        },

        /**
         * True if document has been touched via a touchscreen
         * @memberof NavigationHelpButtonViewModel.prototype
         *
         * @type {Boolean}
         */
        touch : {
            get: function() {
                return this._touch;
            }
        }
    });

    return NavigationHelpButtonViewModel;
});
