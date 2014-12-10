/*global define*/
define([
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        './ConstantPositionProperty',
        './ConstantProperty',
        'require'
    ], function(
        Color,
        defaultValue,
        defined,
        DeveloperError,
        ConstantPositionProperty,
        ConstantProperty,
        require) {
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

    function createConstantPositionProperty(value) {
        return new ConstantProperty(value);
    }

    function createPropertyDescriptor(name, configurable) {
        return createProperty(name, '_' + name, '_' + name + 'Subscription', defaultValue(configurable, false), createConstantProperty);
    }

    function createPositionPropertyDescriptor(name, configurable) {
        return createProperty(name, '_' + name, '_' + name + 'Subscription', defaultValue(configurable, false), createConstantPositionProperty);
    }

    function createRawPropertyDescriptor(name, configurable) {
        return createProperty(name, '_' + name, '_' + name + 'Subscription', defaultValue(configurable, false), undefined);
    }

    //This file currently has a circular dependency with material property instances.
    var firstTime = true;
    var ColorMaterialProperty;
    var ImageMaterialProperty;

    function createMaterialProperty(value) {
        if (firstTime) {
            ColorMaterialProperty = require('./ColorMaterialProperty');
            ImageMaterialProperty = require('./ImageMaterialProperty');
        }

        if (value instanceof Color) {
            return new ColorMaterialProperty(value);
        }

        if (typeof value === 'string') {
            var result = new ImageMaterialProperty();
            result.image = value;
            return result;
        }

        throw new DeveloperError('Unknown material type.');
    }

    function createMaterialPropertyDescriptor(name, configurable) {
        return createProperty(name, '_' + name, '_' + name + 'Subscription', defaultValue(configurable, false), createMaterialProperty);
    }

    /**
     * @private
     */
    var PropertyHelper = {
        createRawPropertyDescriptor : createRawPropertyDescriptor,
        createPropertyDescriptor : createPropertyDescriptor,
        createPositionPropertyDescriptor : createPositionPropertyDescriptor,
        createMaterialPropertyDescriptor : createMaterialPropertyDescriptor
    };

    return PropertyHelper;
});