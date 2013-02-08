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
         * A command object which encapsulates what happens when the button is toggled.
         * @type Command
         */
        this.command = defaultValue(t.command, undefined);

        /**
         * An observable boolean indicating if the button is currently toggled.
         * @type Observable
         */
        this.toggled = defaultValue(t.toggled, ko.observable(false));

        /**
         * An observable string defining the  tool tip.
         * @type Observable
         */
        this.toolTip = defaultValue(t.toolTip, ko.observable(''));
    };

    return ToggleButtonViewModel;
});