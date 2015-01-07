/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        './ConstantProperty'
    ], function(
        defaultValue,
        defined,
        ConstantProperty) {
    "use strict";

    function createProperty(name, privateName, subscriptionName, configurable, createPropertyCallback) {
        return {
            configurable : configurable,
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

                var hasValue = defined(value);
                if (hasValue && !defined(value.getValue) && defined(createPropertyCallback)) {
                    value = createPropertyCallback(value);
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

    function createConstantProperty(value) {
        return new ConstantProperty(value);
    }

    /**
     * Used to consistently define all DataSources graphics objects.
     * This is broken into two functions because the Chrome profiler does a better
     * job of optimizing lookups if it notices that the string is constant throughout the function.
     * @private
     */
    function createPropertyDescriptor(name, configurable, createPropertyCallback) {
        return createProperty(name, '_' + name, '_' + name + 'Subscription', defaultValue(configurable, false), defaultValue(createPropertyCallback, createConstantProperty));
    }

    return createPropertyDescriptor;
});