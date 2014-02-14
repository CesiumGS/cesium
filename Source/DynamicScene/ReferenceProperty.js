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
        var targetProperty = referenceProperty._targetProperty;
        if (!defined(targetProperty)) {
            var resolveBuffer = referenceProperty._dynamicObjectCollection;
            var targetObject = resolveBuffer.getById(referenceProperty._targetObjectId);
            if (defined(targetObject)) {
                targetProperty = targetObject[referenceProperty._targetPropertyName];
                referenceProperty._targetProperty = targetProperty;
                referenceProperty._targetObject = targetObject;
            }
        }
        return targetProperty;
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
     */
    var ReferenceProperty = function(dynamicObjectCollection, targetObjectId, targetPropertyName) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(dynamicObjectCollection)) {
            throw new DeveloperError('dynamicObjectCollection is required.');
        }
        if (!defined(targetObjectId)) {
            throw new DeveloperError('targetObjectId is required.');
        }
        if (!defined(targetPropertyName)) {
            throw new DeveloperError('targetPropertyName is required.');
        }
        //>>includeEnd('debug');

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
     * @exception {DeveloperError} referenceString must contain a single period delineating the target object ID and property name.
     */
    ReferenceProperty.fromString = function(dynamicObjectCollection, referenceString) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(dynamicObjectCollection)) {
            throw new DeveloperError('dynamicObjectCollection is required.');
        }
        if (!defined(referenceString)) {
            throw new DeveloperError('referenceString is required.');
        }
        //>>includeEnd('debug');

        var parts = referenceString.split('.');

        //>>includeStart('debug', pragmas.debug);
        if (parts.length !== 2) {
            throw new DeveloperError('referenceString must contain a single . delineating the target object ID and property name.');
        }
        //>>includeEnd('debug');

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
     */
    ReferenceProperty.prototype.getValue = function(time, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        //>>includeEnd('debug');

        var targetProperty = resolve(this);
        return defined(targetProperty) && this._targetObject.isAvailable(time) ? targetProperty.getValue(time, result) : undefined;
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof ReferenceProperty
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    ReferenceProperty.prototype.equals = function(other) {
        return this === other || //
               (this._dynamicObjectCollection === other._dynamicObjectCollection && //
                this._targetObjectId === other._targetObjectId && //
                this._targetPropertyName === other._targetPropertyName);
    };

    return ReferenceProperty;
});
