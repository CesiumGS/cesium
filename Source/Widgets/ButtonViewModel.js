/*global define*/
define(['../Core/DeveloperError',
        '../Core/defaultValue',
        '../ThirdParty/knockout-2.2.1'
        ], function(
         DeveloperError,
         defaultValue,
         ko) {
    "use strict";

    var ButtonViewModel = function(template) {
        var t = defaultValue(template, {});
        this.command = defaultValue(t.command, undefined);
        this.enabled = defaultValue(t.enabled, ko.observable(true));
        this.selected = defaultValue(t.selected, ko.observable(false));
        this.toolTip = defaultValue(t.toolTip, ko.observable(''));
    };

    return ButtonViewModel;
});