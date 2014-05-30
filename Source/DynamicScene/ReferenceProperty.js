/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './Property'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        Event,
        Property) {
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

    function findUnescaped(value, start, delimiter) {
        var index;
        do {
            index = value.indexOf(delimiter, start);
            if (index === -1) {
                break;
            }

            var count = 0;
            var place = index - 1;
            while (place !== -1 && value[place--] === '\\') {
                count++;
            }
            if (count % 2 === 0) {
                return index;
            }
            start = index + 1;
        } while (index !== -1);
        return -1;
    }

    function trySplit(value, delimiter) {
        var indices = [];
        var start = 0;
        var index;
        do {
            index = findUnescaped(value, start, delimiter);
            if (index !== -1) {
                indices.push(index);
                start = index + 1;
            }
        } while (index !== -1);

        var lastIndex = 0;
        var result = new Array(indices.length + 1);
        for (var i = 0; i < indices.length; i++) {
            index = indices[i];
            result[i] = value.substring(lastIndex, index).replace('\\#', '#').replace('\\\\', '\\').replace('\\.', '.');
            lastIndex = index + 1;
        }
        result[indices.length] = value.substring(lastIndex).replace('\\#', '#').replace('\\\\', '\\').replace('\\.', '.');
        return result;
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
        this._definitionChanged = new Event();
    };

    defineProperties(ReferenceProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.
         * This property always returns <code>true</code>.
         * @memberof ReferenceProperty.prototype
         * @type {Boolean}
         */
        isConstant : {
            get : function() {
                return Property.isConstant(resolve(this));
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is changed whenever setValue is called with data different
         * than the current value.
         * @memberof ReferenceProperty.prototype
         * @type {Event}
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },
        /**
         * Gets the reference frame that the position is defined in.
         * @memberof ReferenceProperty.prototype
         * @Type {ReferenceFrame}
         */
        referenceFrame : {
            get : function() {
                var targetProperty = resolve(this);
                return defined(targetProperty) ? targetProperty.referenceFrame : undefined;
            }
        }
    });

    /**
     * Creates a new reference property given the dynamic object collection that will
     * be used to resolve it and a string indicating the target object id and property,
     * delineated by a period.
     *
     * @param {DynamicObject} dynamicObjectCollection
     * @param {String} referenceString
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

        var tmp = trySplit(referenceString, '#');
        if (tmp.length !== 2)
        {
            throw new DeveloperError();
        }
        var id = tmp[0];


        var index = findUnescaped(referenceString, 0, '#') + 1;
        var values = trySplit(referenceString.substring(index), '.');

        if (values.length === 0) {
            throw new DeveloperError();
        }

        for (var i = 0; i < values.length; i++) {
            var item = values[i];
            if (!defined(item) || item === '') {
                throw new DeveloperError();
            }
        }

        return new ReferenceProperty(dynamicObjectCollection, id, values[0]);
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
     * Gets the value of the property at the provided time and in the provided reference frame.
     * This method is only valid if the property being referenced is a {@link PositionProperty}.
     * @memberof ReferenceProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {ReferenceFrame} referenceFrame The desired referenceFrame of the result.
     * @param {Cartesian3} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Cartesian3} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    ReferenceProperty.prototype.getValueInReferenceFrame = function(time, referenceFrame, result) {
        var targetProperty = resolve(this);
        return defined(targetProperty) && this._targetObject.isAvailable(time) ? targetProperty.getValueInReferenceFrame(time, referenceFrame, result) : undefined;
    };

    /**
     * Gets the {@link Material} type at the provided time when the referenced property is a {@link MaterialProperty}.
     * @memberof ReferenceProperty
     *
     * @param {JulianDate} time The time for which to retrieve the type.
     * @returns {String} The type of material.
     */
    ReferenceProperty.prototype.getType = function(time) {
        var targetProperty = resolve(this);
        return defined(targetProperty) && this._targetObject.isAvailable(time) ? targetProperty.getType(time) : undefined;
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
