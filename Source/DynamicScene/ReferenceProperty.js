/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError'
       ], function(
         defaultValue,
         DeveloperError) {
    "use strict";

    function resolve(referenceProperty) {
        var targetProperty = referenceProperty._targetProperty;
        if (typeof targetProperty === 'undefined') {
            var resolveBuffer = defaultValue(referenceProperty._dynamicObjectCollection.compositeCollection, referenceProperty._dynamicObjectCollection);
            var targetObject = resolveBuffer.getObject(referenceProperty._targetObjectId);
            if (typeof targetObject !== 'undefined') {
                targetProperty = targetObject[referenceProperty._targetPropertyName];
                referenceProperty._targetProperty = targetProperty;
                referenceProperty._targetObject = targetObject;
            }
        }
        return targetProperty;
    }

    /**
     * A dynamic property which transparently links to another property, which may
     * or may not exist yet.  It is up to the caller to know which kind of property
     * is being linked to.
     *
     * @alias ReferenceProperty
     * @constructor
     *
     * @param {DynamicObjectCollection} dynamicObjectCollection The object collection which will be used to resolve the reference.
     * @param {String} targetObjectId The id of the object which is being referenced.
     * @param {String} targetPropertyName The name of the property on the target object which we will use.
     *
     * @exception {DeveloperError} dynamicObjectCollection is required.
     * @exception {DeveloperError} targetObjectId is required.
     * @exception {DeveloperError} targetPropertyName is required.
     *
     * @see ReferenceProperty#fromString
     * @see DynamicProperty
     * @see DynamicPositionProperty
     * @see DynamicDirectionsProperty
     * @see DynamicVertexPositionsProperty
     * @see DynamicObjectCollection
     * @see CompositeDynamicObjectCollection
     */
    var ReferenceProperty = function(dynamicObjectCollection, targetObjectId, targetPropertyName) {
        if (typeof dynamicObjectCollection === 'undefined') {
            throw new DeveloperError('dynamicObjectCollection is required.');
        }
        if (typeof targetObjectId === 'undefined') {
            throw new DeveloperError('targetObjectId is required.');
        }
        if (typeof targetPropertyName === 'undefined') {
            throw new DeveloperError('targetPropertyName is required.');
        }

        this._targetProperty = undefined;
        this._dynamicObjectCollection = dynamicObjectCollection;
        this._targetObjectId = targetObjectId;
        this._targetObject = undefined;
        this._targetPropertyName = targetPropertyName;
    };

    /**
     * Creates a new reference property given the dynamic object collection that will
     * be used to resolve it and a string indicating the target object id and property,
     * delineated by a period.
     *
     * @param {DynamicObject} dynamicObjectCollection
     * @param referenceString
     *
     * @exception {DeveloperError} dynamicObjectCollection is required.
     * @exception {DeveloperError} referenceString is required.
     * @exception {DeveloperError} referenceString must contain a single . delineating the target object ID and property name.
     *
     * @see ReferenceProperty#fromString
     * @see DynamicProperty
     * @see DynamicPositionProperty
     * @see DynamicDirectionsProperty
     * @see DynamicVertexPositionsProperty
     * @see DynamicObjectCollection
     * @see CompositeDynamicObjectCollection
     *
     * @returns A new instance of ReferenceProperty.
     */
    ReferenceProperty.fromString = function(dynamicObjectCollection, referenceString) {
        if (typeof dynamicObjectCollection === 'undefined') {
            throw new DeveloperError('dynamicObjectCollection is required.');
        }

        if (typeof referenceString === 'undefined') {
            throw new DeveloperError('referenceString is required.');
        }

        var parts = referenceString.split('.');
        if (parts.length !== 2) {
            throw new DeveloperError('referenceString must contain a single . delineating the target object ID and property name.');
        }

        return new ReferenceProperty(dynamicObjectCollection, parts[0], parts[1]);
    };

    /**
     * Retrieves the value of the property at the specified time.
     *
     * @param time The time to evaluate the property.
     * @param [result] The object to store the result in, if undefined a new instance will be created.
     * @returns The result parameter or a new instance if the parameter was omitted.
     */
    ReferenceProperty.prototype.getValue = function(time, result) {
        var targetProperty = resolve(this);
        return typeof targetProperty !== 'undefined' && this._targetObject.isAvailable(time) ? targetProperty.getValue(time, result) : undefined;
    };

    /**
     * Retrieves the Cartographic value or values of the property at the specified time if the linked property
     * is a DynamicPositionProperty or DynamicVertexPositionsProperty.
     *
     * @param time The time to evaluate the property.
     * @param [result] The object to store the result in, if undefined a new instance will be created.
     * @returns The result parameter or a new instance if the parameter was omitted.
     */
    ReferenceProperty.prototype.getValueCartographic = function(time, result) {
        var targetProperty = resolve(this);
        return typeof targetProperty !== 'undefined' && this._targetObject.isAvailable(time) ? targetProperty.getValueCartographic(time, result) : undefined;
    };

    /**
     * Retrieves the Cartesian value or values of the property at the specified time if the linked property
     * is a DynamicPositionProperty, DynamicVertexPositionsProperty, or DynamicDirectionsProperty.
     *
     * @param time The time to evaluate the property.
     * @param [result] The object to store the result in, if undefined a new instance will be created.
     * @returns The result parameter or a new instance if the parameter was omitted.
     */
    ReferenceProperty.prototype.getValueCartesian = function(time, result) {
        var targetProperty = resolve(this);
        return typeof targetProperty !== 'undefined' && this._targetObject.isAvailable(time) ? targetProperty.getValueCartesian(time, result) : undefined;
    };

    /**
     * Retrieves the Spherical value or values of the property at the specified time if the linked property
     * is a DynamicDirectionsProperty.
     *
     * @param time The time to evaluate the property.
     * @param [result] The object to store the result in, if undefined a new instance will be created.
     * @returns The result parameter or a new instance if the parameter was omitted.
     */
    ReferenceProperty.prototype.getValueSpherical = function(time, result) {
        var targetProperty = resolve(this);
        return typeof targetProperty !== 'undefined' && this._targetObject.isAvailable(time) ? targetProperty.getValueSpherical(time, result) : undefined;
    };

    return ReferenceProperty;
});