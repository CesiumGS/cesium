/*global define*/
define(['../Core/DeveloperError',
        '../Core/defaultValue',
        '../ThirdParty/knockout-2.2.1'
        ], function(
         DeveloperError,
         defaultValue,
         knockout) {
    "use strict";

    /**
     * A ViewModel which exposes the properties of a toggle button.
     * @alias ToggleButtonViewModel
     * @constructor
     *
     * @param {Object} [options] A options defining the button's properties.
     */
    var ToggleButtonViewModel = function(options) {
        options = defaultValue(options, {});

        /**
         * A command object which encapsulates what happens when the button is toggled.
         * @type Command
         */
        this.command = defaultValue(options.command, undefined);

        /**
         * An observable boolean indicating if the button is currently toggled.
         * @type Observable
         */
        this.toggled = defaultValue(options.toggled, knockout.observable(false));

        /**
         * An observable string defining the  tool tip.
         * @type Observable
         */
        this.toolTip = defaultValue(options.toolTip, knockout.observable(''));
    };

    return ToggleButtonViewModel;
});