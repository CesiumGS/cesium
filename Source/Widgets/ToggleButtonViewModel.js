/*global define*/
define(['../Core/DeveloperError',
        '../Core/defaultValue',
        '../ThirdParty/knockout-2.2.1'
        ], function(
         DeveloperError,
         defaultValue,
         ko) {
    "use strict";

    /**
     * A ViewModel which exposes the properties of a toggle button.
     * @alias ToggleButtonViewModel
     * @constructor
     *
     * @param {Object} [template] A template defining the button's properties.
     */
    var ToggleButtonViewModel = function(template) {
        var t = defaultValue(template, {});

        /**
         * A command object which encapsulate what happens when the button is pressed.
         * @type Command
         */
        this.command = defaultValue(t.command, undefined);

        /**
         * An observable boolean indicating if the button is currently toggled.
         * @type Observable boolean
         */
        this.toggled = defaultValue(t.toggled, ko.observable(false));

        /**
         * An observable string defining the buttons tool tip.
         * @type Observable string
         */
        this.toolTip = defaultValue(t.toolTip, ko.observable(''));
    };

    return ToggleButtonViewModel;
});