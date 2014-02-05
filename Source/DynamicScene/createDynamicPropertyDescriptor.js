/*global define*/
define(['../Core/defaultValue',
        '../Core/defined'
    ], function(
        defaultValue,
        defined) {
    "use strict";

    /**
     * Used to consistently define all DynamicScene graphics objects.
     * @private
     */
    function createDynamicPropertyDescriptor(name, privateName, configurable) {
        var subscriptionName = privateName + 'Subsription';
        return {
            configurable : defaultValue(configurable, false),
            get : function() {
                return this[privateName];
            },
            set : function(value) {
                var oldValue = this[privateName];
                var subscription = this[subscriptionName];
                if (defined(subscription)) {
                    subscription();
                    this[subscriptionName] = undefined;
                }
                if (oldValue !== value) {
                    this[privateName] = value;
                    this._definitionChanged.raiseEvent(this, name, value, oldValue);
                }
                if (defined(value) && defined(value.definitionChanged)) {
                    this[subscriptionName] = value.definitionChanged.addEventListener(function() {
                        this._definitionChanged.raiseEvent(this, name, value, value);
                    }, this);
                }
            }
        };
    }

    return createDynamicPropertyDescriptor;
});