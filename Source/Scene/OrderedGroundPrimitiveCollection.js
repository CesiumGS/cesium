define([
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/defineProperties',
    '../Core/destroyObject',
    '../Core/Check',
    '../Core/DeveloperError',
    './PrimitiveCollection'
], function(
    defaultValue,
    defined,
    defineProperties,
    destroyObject,
    Check,
    DeveloperError,
    PrimitiveCollection) {
    'use strict';

    /**
     * A primitive collection for helping maintain the order or ground primitives based on a z-index
     *
     * @private
     */
    function OrderedGroundPrimitiveCollection() {
        this._length = 0;
        this._collections = {};
        this._collectionsArray = [];

        this.show = true;
    }

    defineProperties(OrderedGroundPrimitiveCollection.prototype, {
        /**
         * Gets the number of primitives in the collection.
         *
         * @memberof OrderedGroundPrimitiveCollection.prototype
         *
         * @type {Number}
         * @readonly
         */
        length : {
            get : function() {
                return this._length;
            }
        }
    });

    /**
     * Adds a primitive to the collection.
     *
     * @param {GroundPrimitive} primitive The primitive to add.
     * @param {Number} [zIndex = 0] The index of the primitive
     * @returns {GroundPrimitive} The primitive added to the collection.
     */
    OrderedGroundPrimitiveCollection.prototype.add = function(primitive, zIndex) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('primitive', primitive);
        if (defined(zIndex)) {
            Check.typeOf.number('zIndex', zIndex);
        }
        //>>includeEnd('debug');

        zIndex = defaultValue(zIndex, 0);
        var collection = this._collections[zIndex];
        if (!defined(collection)) {
            collection = new PrimitiveCollection({ destroyPrimitives: false });
            collection._zIndex = zIndex;
            this._collections[zIndex] = collection;
            var array = this._collectionsArray;
            var i = 0;
            while (i < array.length && array[i]._zIndex < zIndex) {
                i++;
            }
            array.splice(i, 0, collection);
        }

        collection.add(primitive);
        this._length++;
        primitive._zIndex = zIndex;

        return primitive;
    };

    /**
     * Adjusts the z-index
     * @param {GroundPrimitive} primitive
     * @param {Number} zIndex
     */
    OrderedGroundPrimitiveCollection.prototype.set = function(primitive, zIndex) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('primitive', primitive);
        Check.typeOf.number('zIndex', zIndex);
        //>>includeEnd('debug');

        if (zIndex === primitive._zIndex) {
            return primitive;
        }

        this.remove(primitive, true);
        this.add(primitive, zIndex);

        return primitive;
    };

    /**
     * Removes a primitive from the collection.
     *
     * @param {Object} primitive The primitive to remove.
     * @param {Boolean} [doNotDestroy = false]
     * @returns {Boolean} <code>true</code> if the primitive was removed; <code>false</code> if the primitive is <code>undefined</code> or was not found in the collection.
     */
    OrderedGroundPrimitiveCollection.prototype.remove = function(primitive, doNotDestroy) {
        if (this.contains(primitive)) {
            var index = primitive._zIndex;
            var collection = this._collections[index];
            var result;
            if (doNotDestroy) {
                result = collection.remove(primitive);
            } else {
                result = collection.removeAndDestroy(primitive);
            }

            if (result) {
                this._length--;
            }

            if (collection.length === 0) {
                this._collectionsArray.splice(this._collectionsArray.indexOf(collection), 1);
                this._collections[index] = undefined;
                collection.destroy();
            }

            return result;
        }

        return false;
    };

    /**
     * Removes all primitives in the collection.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see OrderedGroundPrimitiveCollection#destroyPrimitives
     */
    OrderedGroundPrimitiveCollection.prototype.removeAll = function() {
        var collections = this._collectionsArray;
        for (var i = 0; i < collections.length; i++) {
            var collection = collections[i];
            collection.destroyPrimitives = true;
            collection.destroy();
        }

        this._collections = {};
        this._collectionsArray = [];
        this._length = 0;
    };

    /**
     * Determines if this collection contains a primitive.
     *
     * @param {Object} primitive The primitive to check for.
     * @returns {Boolean} <code>true</code> if the primitive is in the collection; <code>false</code> if the primitive is <code>undefined</code> or was not found in the collection.
     */
    OrderedGroundPrimitiveCollection.prototype.contains = function(primitive) {
        if (!defined(primitive)) {
            return false;
        }
        var collection = this._collections[primitive._zIndex];
        return defined(collection) && collection.contains(primitive);
    };

    /**
     * @private
     */
    OrderedGroundPrimitiveCollection.prototype.update = function(frameState) {
        if (!this.show) {
            return;
        }

        var collections = this._collectionsArray;
        for (var i = 0 ; i < collections.length; i++) {
            collections[i].update(frameState);
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see OrderedGroundPrimitiveCollection#destroy
     */
    OrderedGroundPrimitiveCollection.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by each primitive in this collection.  Explicitly destroying this
     * collection allows for deterministic release of WebGL resources, instead of relying on the garbage
     * collector to destroy this collection.
     * <br /><br />
     * Since destroying a collection destroys all the contained primitives, only destroy a collection
     * when you are sure no other code is still using any of the contained primitives.
     * <br /><br />
     * Once this collection is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     *
     * @example
     * primitives = primitives && primitives.destroy();
     *
     * @see OrderedGroundPrimitiveCollection#isDestroyed
     */
    OrderedGroundPrimitiveCollection.prototype.destroy = function() {
        this.removeAll();
        return destroyObject(this);
    };

    return OrderedGroundPrimitiveCollection;
});
