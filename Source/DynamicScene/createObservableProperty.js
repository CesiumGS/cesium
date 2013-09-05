/*global define*/
define(function() {
    "use strict";

    function createObservableProperty(name, privateName) {
        return {
            get : function() {
                return this[privateName];
            },
            set : function(value) {
                var oldValue = this[privateName];
                if (oldValue !== value) {
                    this[privateName] = value;
                    this._propertyAssigned.raiseEvent(this, name, value, oldValue);
                }
            }
        };
    }

    return createObservableProperty;
});