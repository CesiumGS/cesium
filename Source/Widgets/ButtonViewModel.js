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
     * A ViewModel which exposes a {@link Clock} for user interfaces.
     * @alias ButtonViewModel
     * @constructor
     *
     * @param {Object} [template] TODO
     */
    var ButtonViewModel = function(template) {
        var t = defaultValue(template, {});

        /**
         * A command object which encapsulate what happens when the button is pressed.
         * @type Command
         */
        this.command = defaultValue(t.command, undefined);

        /**
         * An observable boolean indicating if the button is currently selected.
         * @type Observable boolean
         */
        this.selected = defaultValue(t.selected, ko.observable(false));

        /**
         * An observable string defining the buttons tool tip.
         * @type Observable string
         */
        this.toolTip = defaultValue(t.toolTip, ko.observable(''));
    };

    return ButtonViewModel;
});