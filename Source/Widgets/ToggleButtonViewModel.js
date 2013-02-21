/*global define*/
define([
        '../Core/defaultValue',
        '../ThirdParty/knockout'
    ], function(
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
        this.command = options.command;

        /**
         * An observable boolean indicating if the button is currently toggled.
         * @type Observable
         */
        this.toggled = defaultValue(options.toggled, knockout.observable(false));

        /**
         * An observable string defining the  tool tip.
         * @type Observable
         */
        this.tooltip = defaultValue(options.tooltip, knockout.observable(''));
    };

    return ToggleButtonViewModel;
});