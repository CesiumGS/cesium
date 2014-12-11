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

    function createRawProperty(value) {
        return value;
    }

    function createConstantProperty(value) {
        return new ConstantProperty(value);
    }

    function createConstantPositionProperty(value) {
        return new ConstantProperty(value);
    }

    function createPropertyDescriptor(name, configurable, createPropertyCallback) {
        return createProperty(name, '_' + name, '_' + name + 'Subscription', defaultValue(configurable, false), defaultValue(createPropertyCallback, createConstantProperty));
    }

    function createRawPropertyDescriptor(name, configurable) {
        return createPropertyDescriptor(name, configurable, createRawProperty);
    }

    function createPositionPropertyDescriptor(name) {
        return createPropertyDescriptor(name, undefined, createConstantPositionProperty);
    }

    function createPropertyTypeDescriptor(name, Type) {
        return createPropertyDescriptor(name, undefined, function(value) {
            if (value instanceof Type) {
                return value;
            }
            return new Type(value);
        });
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
        return createPropertyDescriptor(name, configurable, createMaterialProperty);
    }

    /**
     * @private
     */
    var PropertyHelper = {
        createRawPropertyDescriptor : createRawPropertyDescriptor,
        createPropertyDescriptor : createPropertyDescriptor,
        createPositionPropertyDescriptor : createPositionPropertyDescriptor,
        createMaterialPropertyDescriptor : createMaterialPropertyDescriptor,
        createPropertyTypeDescriptor : createPropertyTypeDescriptor
    };

    return PropertyHelper;
});