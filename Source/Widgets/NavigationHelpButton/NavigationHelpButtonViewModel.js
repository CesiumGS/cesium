/*global define*/
define([
        '../../Core/Cartesian3',
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../createCommand',
        '../../ThirdParty/knockout'
], function (
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        createCommand,
        knockout) {
    "use strict";

    /**
     * The view model for {@link NavigationHelpButton}.
     * @alias NavigationHelpButtonViewModel
     * @constructor
     *
     */
    var NavigationHelpButtonViewModel = function () {
        /**
         * Gets or sets whether the instructions are currently shown.  This property is observable.
         * @type {Boolean}
         * @default false
        */
        this.showInstructions = false;

        var that = this;
        this._command = createCommand(function () {
            that.showInstructions = !that.showInstructions;
        });

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
        command: {
            get: function () {
                return this._command;
            }
        }
    });

    return NavigationHelpButtonViewModel;
});
