/*global define*/
define(function() {
    "use strict";

    /**
     * Used to consistently define all DynamicScene graphics objects.
     * @private
     */
    function createDynamicPropertyDescriptor(name, privateName) {
        return {
            get : function() {
                return this[privateName];
            },
            set : function(value) {
                var oldValue = this[privateName];
                if (oldValue !== value) {
                    this[privateName] = value;
                    this._propertyChanged.raiseEvent(this, name, value, oldValue);
                }
            }
        };
    }

    return createDynamicPropertyDescriptor;
});