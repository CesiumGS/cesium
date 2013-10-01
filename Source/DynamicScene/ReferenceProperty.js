/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError'
       ], function(
         defaultValue,
         defined,
         DeveloperError) {
    "use strict";

    function resolve(referenceProperty) {
        var targetObject = referenceProperty._targetObject;
        if (!defined(targetObject)) {
            var resolveBuffer = referenceProperty._dynamicObjectCollection;
            targetObject = resolveBuffer.getById(referenceProperty._targetObjectId);
            referenceProperty._targetObject = targetObject;
        }
        var targetPropertyName = referenceProperty._targetPropertyName;
        if (defined(targetPropertyName)) {
            var targetProperty = referenceProperty._targetProperty;
            if (defined(targetObject) && !defined(targetProperty)) {
                targetProperty = targetObject[targetPropertyName];
                referenceProperty._targetProperty = targetProperty;
            }
            return targetProperty;
        }
        return targetObject;
    }

    /**
     * A {@link Property} which transparently links to another property on a provided object.
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
     */
    var ReferenceProperty = function(dynamicObjectCollection, targetObjectId, targetPropertyName) {
        if (!defined(dynamicObjectCollection)) {
            throw new DeveloperError('dynamicObjectCollection is required.');
        }
        if (!defined(targetObjectId)) {
            throw new DeveloperError('targetObjectId is required.');
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
     * @returns A new instance of ReferenceProperty.
     *
     * @exception {DeveloperError} dynamicObjectCollection is required.
     * @exception {DeveloperError} referenceString is required.
     * @exception {DeveloperError} referenceString must contain a single period delineating the target object ID and property name.
     */
    ReferenceProperty.fromString = function(dynamicObjectCollection, referenceString) {
        if (!defined(dynamicObjectCollection)) {
            throw new DeveloperError('dynamicObjectCollection is required.');
        }

        if (!defined(referenceString)) {
            throw new DeveloperError('referenceString is required.');
        }

        var parts = referenceString.split('.');
        return new ReferenceProperty(dynamicObjectCollection, parts[0], parts[1]);
    };

    /**
     * Gets the value of the property at the provided time.
     * @memberof ReferenceProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     *
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     *
     * @exception {DeveloperError} time is required.
     */
    ReferenceProperty.prototype.getValue = function(time, result) {
        var target = resolve(this);

        if (defined(this._targetPropertyName)) {
            return defined(target) && this._targetObject.isAvailable(time) ? target.getValue(time, result) : undefined;
        }
        return target;
    };

    return ReferenceProperty;
});
