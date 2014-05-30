/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/RuntimeError',
        '../Core/Event',
        './Property'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        RuntimeError,
        Event,
        Property) {
    "use strict";

    function resolve(that) {
        var targetProperty = that._targetProperty;
        if (!defined(targetProperty)) {
            var targetObject = that._targetObject;

            if (!defined(targetObject)) {
                var targetCollection = that._targetCollection;

                targetObject = targetCollection.getById(that._targetId);
                if (!defined(targetObject)) {
                    throw new RuntimeError('target object could not be resolved.');
                }
                targetObject.definitionChanged.addEventListener(ReferenceProperty.prototype._onTargetObjectDefinitionChanged, that);
                that._targetObject = targetObject;
            }

            var names = that._targetPropertyNames;

            targetProperty = targetObject[names[0]];
            if (!defined(targetProperty)) {
                throw new RuntimeError('targetProperty could not be resolved.');
            }

            var length = names.length;
            for (var i = 1; i < length; i++) {
                targetProperty = targetProperty[names[i]];
                if (!defined(targetProperty)) {
                    throw new RuntimeError('targetProperty could not be resolved.');
                }
            }

            that._targetProperty = targetProperty;
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
     * @param {targetCollection} targetCollection The object collection which will be used to resolve the reference.
     * @param {String} targetId The id of the object which is being referenced.
     * @param {String} targetPropertyNames The name of the property on the target object which we will use.
     */
    var ReferenceProperty = function(targetCollection, targetId, targetPropertyNames) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(targetCollection)) {
            throw new DeveloperError('targetCollection is required.');
        }
        if (!defined(targetId)) {
            throw new DeveloperError('targetId is required.');
        }
        if (!defined(targetPropertyNames)) {
            throw new DeveloperError('targetPropertyName is required.');
        }
        //>>includeEnd('debug');

        this._targetCollection = targetCollection;
        this._targetId = targetId;
        this._targetPropertyNames = targetPropertyNames;
        this._targetProperty = undefined;
        this._targetObject = undefined;
        this._definitionChanged = new Event();

        targetCollection.collectionChanged.addEventListener(ReferenceProperty.prototype._onCollectionChanged, this);
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
                return resolve(this).referenceFrame;
            }
        },
        /**
         * Gets the reference frame that the position is defined in.
         * @memberof ReferenceProperty.prototype
         * @Type {String}
         */
        targetId : {
            get : function() {
                return this._targetId;
            }
        },
        /**
         * Gets the reference frame that the position is defined in.
         * @memberof ReferenceProperty.prototype
         * @Type {DynamicObjectCollection}
         */
        targetCollection : {
            get : function() {
                return this._targetCollection;
            }
        },
        /**
         * Gets the reference frame that the position is defined in.
         * @memberof ReferenceProperty.prototype
         * @Type {String[]}
         */
        targetPropertyNames : {
            get : function() {
                return this._targetPropertyNames;
            }
        }
    });

    /**
     * Creates a new reference property given the dynamic object collection that will
     * be used to resolve it and a string indicating the target object id and property,
     * delineated by a period.
     *
     * @param {DynamicObject} targetCollection
     * @param {String} referenceString
     *
     * @returns A new instance of ReferenceProperty.
     *
     * @exception {DeveloperError} referenceString must contain a single period delineating the target object ID and property name.
     */
    ReferenceProperty.fromString = function(targetCollection, referenceString) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(targetCollection)) {
            throw new DeveloperError('targetCollection is required.');
        }
        if (!defined(referenceString)) {
            throw new DeveloperError('referenceString is required.');
        }
        //>>includeEnd('debug');

        var tmp = trySplit(referenceString, '#');
        var identifier = tmp[0];

        //>>includeStart('debug', pragmas.debug);
        if (tmp.length !== 2 || !defined(identifier) || identifier === '') {
            throw new DeveloperError();
        }
        //>>includeEnd('debug');

        var index = findUnescaped(referenceString, 0, '#') + 1;
        var values = trySplit(referenceString.substring(index), '.');

        //>>includeStart('debug', pragmas.debug);
        for (var i = 0; i < values.length; i++) {
            var item = values[i];
            if (!defined(item) || item === '') {
                throw new DeveloperError();
            }
        }
        //>>includeEnd('debug');

        return new ReferenceProperty(targetCollection, identifier, values);
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
        return resolve(this).getValue(time, result);
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
        return resolve(this).getValueInReferenceFrame(time, referenceFrame, result);
    };

    /**
     * Gets the {@link Material} type at the provided time when the referenced property is a {@link MaterialProperty}.
     * @memberof ReferenceProperty
     *
     * @param {JulianDate} time The time for which to retrieve the type.
     * @returns {String} The type of material.
     */
    ReferenceProperty.prototype.getType = function(time) {
        return resolve(this).getType(time);
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
        if (this === other) {
            return true;
        }

        if (this._targetCollection !== other._targetCollection || //
            this._targetId !== other._targetId || //
            defined(this._targetPropertyNames) !== defined(other._targetPropertyNames) || //
            this._targetPropertyNames.length !== other._targetPropertyNames.length) {
            return false;
        }

        var names = this._targetPropertyNames;
        var otherNames = other._targetPropertyNames;

        var length = this._targetPropertyNames.length;
        for (var i = 0; i < length; i++) {
            if (names[i] !== otherNames[i]) {
                return false;
            }
        }

        return true;
    };

    ReferenceProperty.prototype._onTargetObjectDefinitionChanged = function(targetObject, name, value, oldValue) {
        if (this._targetPropertyNames[0] === name) {
            this._targetProperty = undefined;
            this._definitionChanged.raiseEvent(this);
        }
    };

    ReferenceProperty.prototype._onCollectionChanged = function(collection, added, removed) {
        var targetObject = this._targetObject;
        if (defined(targetObject)) {
            if (removed.indexOf(targetObject) === -1) {
                targetObject.definitionChanged.removeEventListener(ReferenceProperty.prototype._onTargetObjectDefinitionChanged, this);
                this._targetProperty = undefined;
                this._targetObject = undefined;
                this._definitionChanged.raiseEvent(this);
            }
        }
    };

    return ReferenceProperty;
});
